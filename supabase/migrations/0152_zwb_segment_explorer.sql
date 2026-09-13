-- ZWB-only map: catalog from ridden segment IDs, independent of curated/legacy lists.
-- Owner confirms permission for club display and analysis (2026-09-13).
create table public.zwb_segment_maps (
  id bigint primary key,
  name text not null,
  distance_m double precision,
  average_grade double precision,
  start_lat double precision,
  start_lon double precision,
  south double precision,
  west double precision,
  north double precision,
  east double precision,
  polyline text,
  track jsonb not null default '[]'::jsonb,
  private boolean not null default false,
  hazardous boolean not null default false,
  geometry_status text not null default 'pending' check (geometry_status in ('pending','ready','error','unavailable')),
  geometry_checked_at timestamptz,
  geometry_error text,
  updated_at timestamptz not null default now()
);
create index zwb_segment_maps_bounds on public.zwb_segment_maps(south,north,west,east);
create index zwb_segment_maps_pending on public.zwb_segment_maps(geometry_status,geometry_checked_at);
create index segment_efforts_club_best on public.strava_activity_segment_efforts(strava_segment_id,profile_id,elapsed_time_seconds);
alter table public.zwb_segment_maps enable row level security;
-- No direct member access to the registry: only the guarded club projection below.
revoke all on public.zwb_segment_maps from anon, authenticated;
grant all on public.zwb_segment_maps to service_role;

create function public.register_ridden_segment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.zwb_segment_maps(id,name,distance_m,average_grade,start_lat,start_lon,south,north,west,east)
  values(new.strava_segment_id,coalesce(new.segment_name,'Segment ' || new.strava_segment_id),new.distance_m,new.average_grade,new.start_lat,new.start_lon,
    least(new.start_lat,new.end_lat),greatest(new.start_lat,new.end_lat),least(new.start_lon,new.end_lon),greatest(new.start_lon,new.end_lon))
  on conflict(id) do nothing;
  return new;
end $$;
revoke all on function public.register_ridden_segment() from public;
create trigger register_ridden_segment after insert on public.strava_activity_segment_efforts
for each row execute function public.register_ridden_segment();

insert into public.zwb_segment_maps(id,name,distance_m,average_grade,start_lat,start_lon,south,north,west,east)
select distinct on (strava_segment_id) strava_segment_id,coalesce(segment_name,'Segment ' || strava_segment_id),distance_m,average_grade,start_lat,start_lon,
  least(start_lat,end_lat),greatest(start_lat,end_lat),least(start_lon,end_lon),greatest(start_lon,end_lon)
from public.strava_activity_segment_efforts order by strava_segment_id,started_at desc nulls last
on conflict(id) do nothing;

-- Owner-executed view is intentional: underlying tokens/raw activities are never exposed.
-- Viewer AND participants must be approved, and participants must still have a live connection.
-- Compute directly from efforts: edits/deletes/revocation cannot leave stale podiums.
create view public.zwb_segment_club with (security_barrier=true) as
select m.id::text as id,m.name,m.distance_m,m.average_grade,m.start_lat,m.start_lon,
  m.south,m.north,m.west,m.east,m.polyline,m.track,m.hazardous,m.geometry_status,
  greatest(m.updated_at,results.latest) as updated_at,results.rider_ids,results.leaderboard
from public.zwb_segment_maps m
cross join lateral (
  select array_agg(best.profile_id) as rider_ids,
    jsonb_agg(jsonb_build_object('profileId',best.profile_id,'name',best.display_name,'seconds',best.seconds) order by best.seconds,best.profile_id) as leaderboard,
    max(best.updated_at) as latest
  from (
    select e.profile_id,p.display_name,min(e.elapsed_time_seconds) as seconds,max(a.synced_at) as updated_at
    from public.strava_activity_segment_efforts e
    join public.strava_activities a on a.id=e.activity_id and a.profile_id=e.profile_id
    join public.profiles p on p.id=e.profile_id and p.is_approved and p.privacy_accepted_version >= '2026-09-13'
    join public.strava_connections c on c.profile_id=e.profile_id and c.revoked_at is null
    where e.strava_segment_id=m.id and e.elapsed_time_seconds>0
      and a.sport_type='Ride' and not a.trainer
      and coalesce(a.raw->>'private','false')='false'
      and coalesce(a.raw->>'visibility','everyone') <> 'only_me'
      and coalesce(a.raw->>'flagged','false')='false'
      and coalesce(e.raw->>'hidden','false')='false'
      and coalesce(e.raw->'segment'->>'private','false')='false'
    group by e.profile_id,p.display_name
  ) best
) results
where not m.private and results.leaderboard is not null
and (auth.role()='service_role' or exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.is_approved and viewer.privacy_accepted_version >= '2026-09-13'));
revoke all on public.zwb_segment_club from public,anon;
grant select on public.zwb_segment_club to authenticated,service_role;

-- Atomic replacement also removes efforts absent from an updated activity response.
create function public.replace_activity_segment_efforts(p_profile uuid,p_activity bigint,p_rows jsonb) returns integer
language plpgsql security definer set search_path=public as $$
declare inserted integer;
begin
  if not exists(select 1 from public.strava_activities where id=p_activity and profile_id=p_profile) then
    raise exception 'Activity does not belong to profile';
  end if;
  if exists(select 1 from jsonb_array_elements(p_rows) r where (r->>'profile_id')::uuid is distinct from p_profile or (r->>'activity_id')::bigint is distinct from p_activity) then
    raise exception 'Invalid effort owner';
  end if;
  delete from public.strava_activity_segment_efforts where profile_id=p_profile and activity_id=p_activity;
  insert into public.strava_activity_segment_efforts(effort_uid,profile_id,activity_id,strava_segment_id,segment_name,elapsed_time_seconds,moving_time_seconds,distance_m,elevation_gain_m,average_grade,start_lat,start_lon,end_lat,end_lon,started_at,raw)
  select r.effort_uid,r.profile_id,r.activity_id,r.strava_segment_id,r.segment_name,r.elapsed_time_seconds,r.moving_time_seconds,r.distance_m,r.elevation_gain_m,r.average_grade,r.start_lat,r.start_lon,r.end_lat,r.end_lon,r.started_at,r.raw
  from jsonb_populate_recordset(null::public.strava_activity_segment_efforts,p_rows) r;
  get diagnostics inserted=row_count;
  return inserted;
end $$;
revoke all on function public.replace_activity_segment_efforts(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.replace_activity_segment_efforts(uuid,bigint,jsonb) to service_role;

create function public.segment_geometry_candidates(p_profile uuid,p_limit integer) returns table(id text)
language sql security definer set search_path=public as $$
  select m.id::text from public.zwb_segment_maps m
  where (m.geometry_checked_at is null or m.geometry_checked_at < now()-interval '7 days')
    and exists(select 1 from public.strava_activity_segment_efforts e join public.strava_activities a on a.id=e.activity_id
      where e.strava_segment_id=m.id and e.profile_id=p_profile and a.sport_type='Ride' and not a.trainer)
  order by m.geometry_checked_at nulls first,m.id limit least(greatest(p_limit,0),10)
$$;
revoke all on function public.segment_geometry_candidates(uuid,integer) from public,anon,authenticated;
grant execute on function public.segment_geometry_candidates(uuid,integer) to service_role;

create function public.segment_map_clusters(p_south float8,p_west float8,p_north float8,p_east float8,p_cell float8,p_search text default '',p_own boolean default false,p_min float8 default 0,p_max float8 default 1000000,p_grade float8 default -100)
returns table(lat float8,lon float8,count bigint)
language sql stable security invoker set search_path=public as $$
  select avg(start_lat),avg(start_lon),count(*)
  from public.zwb_segment_club
  where south<=p_north and north>=p_south and west<=p_east and east>=p_west
    and name ilike '%' || replace(replace(p_search,'%','\%'),'_','\_') || '%'
    and (not p_own or auth.uid()=any(rider_ids))
    and distance_m between p_min and p_max and average_grade>=p_grade
    and start_lat is not null and start_lon is not null
  group by floor(start_lat/greatest(p_cell,0.02)),floor(start_lon/greatest(p_cell,0.02))
  order by count(*) desc limit 500
$$;
revoke all on function public.segment_map_clusters(float8,float8,float8,float8,float8,text,boolean,float8,float8,float8) from public,anon;
grant execute on function public.segment_map_clusters(float8,float8,float8,float8,float8,text,boolean,float8,float8,float8) to authenticated,service_role;
notify pgrst,'reload schema';
