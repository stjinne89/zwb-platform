-- Eigen segment- en coltijden uit GPX-uploads en intervals.icu-ritten.
--
-- Keuzes van de eigenaar (2026-09-30, zie docs/segmenttijden-uit-gps-onderzoek.md):
--   * ook voor segmenten, langs de Strava-lijnen uit zwb_segment_maps;
--   * één klassement, met herkomstlabel;
--   * cols zonder Strava-segment krijgen een startpunt uit een openbare bron;
--   * ook voor intervals.icu-ritten.
--
-- Een eigen poging staat in strava_activity_segment_efforts met
-- raw.source = 'gps' en een effort_uid die met 'gps:' begint
-- (src/lib/segments/gps-sync.ts). Het klassement en de KOM's eisten tot nu toe
-- een actieve Strava-koppeling van de rijder: dat is de Strava-regel voor
-- Strava-data. Voor een eigen poging geldt hij niet. Verder is alles gelijk aan
-- 0154, 0161 en 0162.

-- ── Cols ────────────────────────────────────────────────────────────
alter table public.cols
  add column if not exists start_lat numeric(9, 6),
  add column if not exists start_lon numeric(9, 6);

-- Alleen cols zonder Strava-segment; de rest wordt langs de segmentlijn gemeten.
-- Passo Falzarego vanaf Cortina d'Ampezzo, na de brug over de Boite
-- (climbfinder.com, passo-falzarego-cortina-d-ampezzo: 15,9 km, 908 m).
update public.cols set start_lat = 46.539400, start_lon = 12.131200
  where slug = 'passo-falzarego';
-- Côte du Maquisard vanaf Marteau (climbfinder.com, maquisard; OpenStreetMap
-- "Marteau, La Reid"). De top stond ~10 km verkeerd (50.4042, 5.8625, 480 m).
-- Echte top: het Monument au Maquisard inconnu aan de Route du Maquisard
-- (OpenStreetMap), 368 m (cols-cyclisme.com). Met een exacte top kan de ruime
-- straal uit 0047 terug.
update public.cols set start_lat = 50.490400, start_lon = 5.830500,
    summit_lat = 50.489400, summit_lon = 5.808800,
    summit_elevation_m = 368, ascent_m = 154, detection_radius_m = 250
  where slug = 'cote-du-maquisard';

-- ── Herkomstlabel op de beste tijd ──────────────────────────────────
-- null = Strava, 'gps' = door ZWB gemeten.
alter table public.profile_climbed_cols
  add column if not exists best_time_source text check (best_time_source in ('gps'));
alter table public.profile_completed_segments
  add column if not exists best_time_source text check (best_time_source in ('gps'));

-- Eigen pogingen van één rit vervangen (gps-sync.ts) zonder alle pogingen te lezen.
create index if not exists segment_efforts_gps
  on public.strava_activity_segment_efforts (activity_id)
  where effort_uid like 'gps:%';

-- ── Clubklassement ──────────────────────────────────────────────────
-- Per lid de snelste poging, met de herkomst van die poging. Bij een gelijke tijd
-- wint Strava.
create or replace view public.zwb_segment_club with (security_barrier=true) as
select m.id::text as id,m.name,m.distance_m,m.average_grade,m.start_lat,m.start_lon,
  m.south,m.north,m.west,m.east,m.polyline,m.track,m.hazardous,m.geometry_status,
  greatest(m.updated_at,results.latest) as updated_at,results.rider_ids,results.leaderboard
from public.zwb_segment_maps m
cross join lateral (
  select array_agg(best.profile_id) as rider_ids,
    jsonb_agg(jsonb_build_object('profileId',best.profile_id,'name',best.display_name,'seconds',best.seconds,'source',best.source) order by best.seconds,best.profile_id) as leaderboard,
    max(best.updated_at) as latest
  from (
    select distinct on (e.profile_id) e.profile_id,p.display_name,e.elapsed_time_seconds as seconds,
      e.raw->>'source' as source,max(a.synced_at) over (partition by e.profile_id) as updated_at
    from public.strava_activity_segment_efforts e
    join public.strava_activities a on a.id=e.activity_id and a.profile_id=e.profile_id
    join public.profiles p on p.id=e.profile_id and p.is_approved and p.privacy_accepted_version >= '2026-09-13'
    where e.strava_segment_id=m.id and e.elapsed_time_seconds>0
      and (e.raw->>'source'='gps' or exists(select 1 from public.strava_connections c where c.profile_id=e.profile_id and c.revoked_at is null))
      and a.sport_type='Ride' and not a.trainer
      and coalesce(a.raw->>'private','false')='false'
      and coalesce(a.raw->>'visibility','everyone') <> 'only_me'
      and coalesce(a.raw->>'flagged','false')='false'
      and coalesce(e.raw->'segment'->>'private','false')='false'
    order by e.profile_id,e.elapsed_time_seconds,(e.raw->>'source') nulls first
  ) best
) results
where not m.private and jsonb_array_length(results.leaderboard) >= 3
and (auth.role()='service_role' or exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.is_approved and viewer.privacy_accepted_version >= '2026-09-13'));
revoke all on public.zwb_segment_club from public,anon;
grant select on public.zwb_segment_club to authenticated,service_role;

-- ── KOM/QOM ─────────────────────────────────────────────────────────
-- Gelijk aan 0162, behalve de voorwaarde op de koppeling (twee keer).
create or replace function public.refresh_segment_koms(p_limit integer) returns integer
language plpgsql security definer set search_path=public as $$
declare picked bigint[]; candidates bigint[]; previous jsonb;
begin
  select coalesce(array_agg(id),'{}') into picked from (
    select id from public.zwb_segment_maps where kom_dirty order by id limit least(greatest(p_limit,0),1000) for update skip locked
  ) dirty;
  if cardinality(picked)=0 then return 0; end if;

  select coalesce(array_agg(segment_id),'{}') into candidates from (
    select e.strava_segment_id as segment_id
    from public.strava_activity_segment_efforts e
    join public.profiles p on p.id=e.profile_id and p.is_approved and p.privacy_accepted_version >= '2026-09-13'
    where e.strava_segment_id=any(picked)
      and (e.raw->>'source'='gps' or exists(select 1 from public.strava_connections c where c.profile_id=e.profile_id and c.revoked_at is null))
    group by e.strava_segment_id having count(distinct e.profile_id) >= 3
  ) enough;

  select coalesce(jsonb_agg(jsonb_build_object('segment_id',k.segment_id,'title',k.title,'profile_id',k.profile_id,'seconds',k.seconds)),'[]')
  into previous from public.zwb_segment_koms k where k.segment_id=any(picked);

  delete from public.zwb_segment_koms where segment_id=any(picked);
  insert into public.zwb_segment_koms(segment_id,title,profile_id,seconds,riders,achieved_at,activity_id)
  with best as (
    select distinct on (e.strava_segment_id,e.profile_id) e.strava_segment_id as segment_id,e.profile_id,
      coalesce(p.sex,'')='vrouw' as woman,e.elapsed_time_seconds as seconds,e.started_at,e.activity_id
    from public.strava_activity_segment_efforts e
    join public.zwb_segment_maps m on m.id=e.strava_segment_id and not m.private
    join public.strava_activities a on a.id=e.activity_id and a.profile_id=e.profile_id
    join public.profiles p on p.id=e.profile_id and p.is_approved and p.privacy_accepted_version >= '2026-09-13'
    where e.strava_segment_id=any(candidates) and e.elapsed_time_seconds>0
      and (e.raw->>'source'='gps' or exists(select 1 from public.strava_connections c where c.profile_id=e.profile_id and c.revoked_at is null))
      and a.sport_type='Ride' and not a.trainer
      and coalesce(a.raw->>'private','false')='false'
      and coalesce(a.raw->>'visibility','everyone') <> 'only_me'
      and coalesce(a.raw->>'flagged','false')='false'
      and coalesce(e.raw->'segment'->>'private','false')='false'
    order by e.strava_segment_id,e.profile_id,e.elapsed_time_seconds,e.started_at nulls last,e.activity_id
  ), ranked as (
    select best.*, count(*) over (partition by segment_id) as riders,
      rank() over (partition by segment_id order by seconds) as place,
      rank() over (partition by segment_id, woman order by seconds) as place_sex
    from best
  )
  select segment_id,'kom',profile_id,seconds,riders,started_at,activity_id from ranked where place=1 and riders>=3
  union all
  select segment_id,'qom',profile_id,seconds,riders,started_at,activity_id from ranked where woman and place_sex=1 and riders>=3;

  insert into public.zwb_segment_kom_events(segment_id,title,profile_id,kind,seconds,holder_id)
  with old as (
    select * from jsonb_to_recordset(previous) as x(segment_id bigint,title text,profile_id uuid,seconds integer)
  ), winners as (
    select k.* from public.zwb_segment_koms k
    join public.zwb_segment_maps m on m.id=k.segment_id and m.kom_computed_at is not null
    where k.segment_id=any(picked) and k.achieved_at >= now()-interval '7 days'
      and not exists(select 1 from old o where o.segment_id=k.segment_id and o.title=k.title and o.profile_id=k.profile_id)
  )
  select w.segment_id,w.title,w.profile_id,'won',w.seconds,w.profile_id from winners w
  union all
  select o.segment_id,o.title,o.profile_id,'lost',w.seconds,w.profile_id
  from old o
  cross join lateral (
    select * from winners w where w.segment_id=o.segment_id and w.title=o.title and w.seconds<o.seconds
    order by w.achieved_at desc nulls last,w.profile_id limit 1
  ) w
  where not exists(select 1 from public.zwb_segment_koms k where k.segment_id=o.segment_id and k.title=o.title and k.profile_id=o.profile_id);

  update public.zwb_segment_maps set kom_dirty=false,kom_computed_at=now() where id=any(picked);
  return cardinality(picked);
end $$;
revoke all on function public.refresh_segment_koms(integer) from public,anon,authenticated;
grant execute on function public.refresh_segment_koms(integer) to service_role;

-- Een houder zonder Strava-koppeling blijft zichtbaar zolang zijn recordpoging
-- een eigen meting is.
create or replace view public.zwb_segment_kom_club with (security_barrier=true) as
select k.segment_id::text as segment_id,m.name as segment_name,m.distance_m,m.average_grade,
  k.profile_id,p.display_name,k.seconds,k.riders,k.achieved_at,k.title
from public.zwb_segment_koms k
join public.zwb_segment_maps m on m.id=k.segment_id and not m.private
join public.profiles p on p.id=k.profile_id and p.is_approved and p.privacy_accepted_version >= '2026-09-13'
  and (k.title='kom' or p.sex='vrouw')
where (exists(select 1 from public.strava_connections c where c.profile_id=k.profile_id and c.revoked_at is null)
    or exists(select 1 from public.strava_activity_segment_efforts e
      where e.profile_id=k.profile_id and e.strava_segment_id=k.segment_id
        and e.elapsed_time_seconds=k.seconds and e.raw->>'source'='gps'))
  and (auth.role()='service_role' or exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.is_approved and viewer.privacy_accepted_version >= '2026-09-13'));
revoke all on public.zwb_segment_kom_club from public,anon;
grant select on public.zwb_segment_kom_club to authenticated,service_role;

-- Geen herberekening van alle segmenten: wie nu meetelt, telde al mee. Een
-- nieuwe eigen poging markeert zijn segment via de bestaande trigger.

notify pgrst,'reload schema';
