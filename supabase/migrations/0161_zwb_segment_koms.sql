-- ZWB KOM: de snelste ZWB'er op een segment waar minstens drie ZWB'ers reden.
--
-- 1. Het clubklassement toont alleen nog segmenten met minstens drie rijders. Zelfde
--    view als 0154, alleen de laatste voorwaarde is strenger.
-- 2. KOM's staan in een eigen tabel, zoals badges in achievement_awards. Live berekenen
--    kan niet: het dashboard en profielen hebben alle segmenten nodig, en een volledige
--    doorloop van de pogingen liep op productie al tegen de statement timeout (0155).
--    Triggers markeren een segment als "vuil" zodra pogingen, ritprivacy, akkoord of
--    koppeling veranderen; de 5-minutentaak rekent die segmenten in kleine batches na.
--    De leesview controleert houder, akkoord en koppeling opnieuw, zodat intrekken
--    direct werkt en niet op de taak wacht.
-- 3. achieved_at is de starttijd van de recordpoging. Zo verschijnt een KOM alleen als
--    nieuw op het dashboard wanneer de rit recent is, niet wanneer een oud record na de
--    eerste doorrekening of een inhaalslag van oude ritten zichtbaar wordt.

create or replace view public.zwb_segment_club with (security_barrier=true) as
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
      and coalesce(e.raw->'segment'->>'private','false')='false'
    group by e.profile_id,p.display_name
  ) best
) results
where not m.private and jsonb_array_length(results.leaderboard) >= 3
and (auth.role()='service_role' or exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.is_approved and viewer.privacy_accepted_version >= '2026-09-13'));
revoke all on public.zwb_segment_club from public,anon;
grant select on public.zwb_segment_club to authenticated,service_role;

-- Nieuwe kolom: bestaande segmenten zijn meteen vuil, zodat de taak alles eenmaal doorrekent.
alter table public.zwb_segment_maps add column if not exists kom_dirty boolean not null default true;
create index if not exists zwb_segment_maps_kom_dirty on public.zwb_segment_maps(id) where kom_dirty;

-- Bij een gelijke snelste tijd delen leden de titel, net als de gedeelde positie in het klassement.
create table public.zwb_segment_koms (
  segment_id bigint not null references public.zwb_segment_maps(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  seconds integer not null check (seconds > 0),
  riders integer not null check (riders >= 3),
  achieved_at timestamptz,
  activity_id bigint,
  primary key (segment_id, profile_id)
);
create index zwb_segment_koms_profile on public.zwb_segment_koms(profile_id);
create index zwb_segment_koms_achieved on public.zwb_segment_koms(achieved_at desc);
alter table public.zwb_segment_koms enable row level security;
revoke all on public.zwb_segment_koms from anon, authenticated;
grant all on public.zwb_segment_koms to service_role;

-- Vuil markeren. Het where-filter houdt herhaalde pogingen op hetzelfde segment goedkoop.
create function public.mark_segment_koms_dirty(p_segments bigint[]) returns void
language sql security definer set search_path=public as $$
  update public.zwb_segment_maps set kom_dirty=true where id=any(p_segments) and not kom_dirty
$$;
revoke all on function public.mark_segment_koms_dirty(bigint[]) from public,anon,authenticated;

-- Naam begint met z: rijtriggers lopen alfabetisch, dus na register_ridden_segment.
-- Een nieuw segment krijgt daar al kom_dirty=true als standaardwaarde.
create function public.zwb_segment_kom_effort_changed() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op in ('UPDATE','DELETE') then perform public.mark_segment_koms_dirty(array[old.strava_segment_id]); end if;
  if tg_op in ('INSERT','UPDATE') then perform public.mark_segment_koms_dirty(array[new.strava_segment_id]); end if;
  return null;
end $$;
revoke all on function public.zwb_segment_kom_effort_changed() from public;
create trigger zwb_segment_kom_effort_changed after insert or update or delete on public.strava_activity_segment_efforts
for each row execute function public.zwb_segment_kom_effort_changed();

-- Ritprivacy kan wijzigen zonder dat de pogingen opnieuw worden weggeschreven.
create function public.zwb_segment_kom_activity_changed() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform public.mark_segment_koms_dirty(array(select distinct strava_segment_id from public.strava_activity_segment_efforts where activity_id=new.id));
  return null;
end $$;
revoke all on function public.zwb_segment_kom_activity_changed() from public;
create trigger zwb_segment_kom_activity_changed after update on public.strava_activities
for each row when (
  old.sport_type is distinct from new.sport_type or old.trainer is distinct from new.trainer
  or old.raw->>'private' is distinct from new.raw->>'private'
  or old.raw->>'visibility' is distinct from new.raw->>'visibility'
  or old.raw->>'flagged' is distinct from new.raw->>'flagged'
) execute function public.zwb_segment_kom_activity_changed();

-- Goedkeuring, akkoord of koppeling bepalen of een lid meetelt. Die veranderen zelden,
-- maar raken alle segmenten van dat lid.
create function public.zwb_segment_kom_rider_changed() returns trigger
language plpgsql security definer set search_path=public as $$
declare rider uuid;
begin
  -- Losse takken: een veldnaam die in deze tabel niet bestaat, geeft anders een fout.
  if tg_table_name='profiles' then rider := new.id;
  elsif tg_op='DELETE' then rider := old.profile_id;
  else rider := new.profile_id;
  end if;
  perform public.mark_segment_koms_dirty(array(select distinct strava_segment_id from public.strava_activity_segment_efforts where profile_id=rider));
  return null;
end $$;
revoke all on function public.zwb_segment_kom_rider_changed() from public;
create trigger zwb_segment_kom_rider_changed after update on public.profiles
for each row when (
  old.is_approved is distinct from new.is_approved
  or (old.privacy_accepted_version >= '2026-09-13') is distinct from (new.privacy_accepted_version >= '2026-09-13')
) execute function public.zwb_segment_kom_rider_changed();
create trigger zwb_segment_kom_connection_changed after insert or delete on public.strava_connections
for each row execute function public.zwb_segment_kom_rider_changed();
create trigger zwb_segment_kom_connection_revoked after update on public.strava_connections
for each row when ((old.revoked_at is null) is distinct from (new.revoked_at is null))
execute function public.zwb_segment_kom_rider_changed();

-- Rekent hooguit p_limit vuile segmenten na. Idempotent: per segment eerst weg, dan opnieuw.
-- Eerst een goedkope telling zonder raw-kolommen; de meeste segmenten halen geen drie
-- rijders en hoeven dan geen ritdetails te lezen. Dezelfde voorwaarden als zwb_segment_club.
create function public.refresh_segment_koms(p_limit integer) returns integer
language plpgsql security definer set search_path=public as $$
declare picked bigint[]; candidates bigint[];
begin
  select coalesce(array_agg(id),'{}') into picked from (
    select id from public.zwb_segment_maps where kom_dirty order by id limit least(greatest(p_limit,0),1000) for update skip locked
  ) dirty;
  if cardinality(picked)=0 then return 0; end if;

  select coalesce(array_agg(segment_id),'{}') into candidates from (
    select e.strava_segment_id as segment_id
    from public.strava_activity_segment_efforts e
    join public.profiles p on p.id=e.profile_id and p.is_approved and p.privacy_accepted_version >= '2026-09-13'
    join public.strava_connections c on c.profile_id=e.profile_id and c.revoked_at is null
    where e.strava_segment_id=any(picked)
    group by e.strava_segment_id having count(distinct e.profile_id) >= 3
  ) enough;

  delete from public.zwb_segment_koms where segment_id=any(picked);
  insert into public.zwb_segment_koms(segment_id,profile_id,seconds,riders,achieved_at,activity_id)
  select segment_id,profile_id,seconds,riders,started_at,activity_id from (
    select best.*, count(*) over (partition by segment_id) as riders, rank() over (partition by segment_id order by seconds) as place
    from (
      select distinct on (e.strava_segment_id,e.profile_id) e.strava_segment_id as segment_id,e.profile_id,e.elapsed_time_seconds as seconds,e.started_at,e.activity_id
      from public.strava_activity_segment_efforts e
      join public.zwb_segment_maps m on m.id=e.strava_segment_id and not m.private
      join public.strava_activities a on a.id=e.activity_id and a.profile_id=e.profile_id
      join public.profiles p on p.id=e.profile_id and p.is_approved and p.privacy_accepted_version >= '2026-09-13'
      join public.strava_connections c on c.profile_id=e.profile_id and c.revoked_at is null
      where e.strava_segment_id=any(candidates) and e.elapsed_time_seconds>0
        and a.sport_type='Ride' and not a.trainer
        and coalesce(a.raw->>'private','false')='false'
        and coalesce(a.raw->>'visibility','everyone') <> 'only_me'
        and coalesce(a.raw->>'flagged','false')='false'
        and coalesce(e.raw->'segment'->>'private','false')='false'
      order by e.strava_segment_id,e.profile_id,e.elapsed_time_seconds,e.started_at nulls last,e.activity_id
    ) best
  ) ranked
  where place=1 and riders>=3;

  update public.zwb_segment_maps set kom_dirty=false where id=any(picked);
  return cardinality(picked);
end $$;
revoke all on function public.refresh_segment_koms(integer) from public,anon,authenticated;
grant execute on function public.refresh_segment_koms(integer) to service_role;

-- Leesview voor dashboard en profielen: zelfde kijkers als het clubklassement.
create view public.zwb_segment_kom_club with (security_barrier=true) as
select k.segment_id::text as segment_id,m.name as segment_name,m.distance_m,m.average_grade,
  k.profile_id,p.display_name,k.seconds,k.riders,k.achieved_at
from public.zwb_segment_koms k
join public.zwb_segment_maps m on m.id=k.segment_id and not m.private
join public.profiles p on p.id=k.profile_id and p.is_approved and p.privacy_accepted_version >= '2026-09-13'
join public.strava_connections c on c.profile_id=k.profile_id and c.revoked_at is null
where auth.role()='service_role' or exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.is_approved and viewer.privacy_accepted_version >= '2026-09-13');
revoke all on public.zwb_segment_kom_club from public,anon;
grant select on public.zwb_segment_kom_club to authenticated,service_role;
notify pgrst,'reload schema';
