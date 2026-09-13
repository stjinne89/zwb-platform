-- 0155 liep op productie tegen de statement timeout (2026-09-13): de rangorde las alle
-- ~70.000 pogingen en ~20.000 ritten inclusief hun brede raw-kolommen, en sorteerde per
-- segment alle rijders voor array_agg. Nu:
--   * de rangorde leest alleen twee smalle indexen (segment/rit/lid en buitenritten);
--   * de token-rijder wordt pas gezocht voor de hooguit tien segmenten die terugkomen.
-- Zelfde uitkomst als 0155: goedgekeurde leden met actieve koppeling, alleen Ride zonder
-- trainer, meeste rijders eerst.
create index if not exists segment_efforts_priority
  on public.strava_activity_segment_efforts(strava_segment_id, activity_id, profile_id);
create index if not exists strava_activities_outdoor_ride
  on public.strava_activities(id) where sport_type='Ride' and not trainer;

create or replace function public.segment_geometry_priority(p_limit integer)
returns table(id text, profile_id uuid)
language sql stable security definer set search_path=public as $$
  with riders as (
    select p.id from public.profiles p
    join public.strava_connections c on c.profile_id=p.id and c.revoked_at is null
    where p.is_approved
  ), ranked as (
    select e.strava_segment_id as id, count(distinct e.profile_id) as riders, count(*) as efforts
    from public.strava_activity_segment_efforts e
    join public.strava_activities a on a.id=e.activity_id and a.sport_type='Ride' and not a.trainer
    where e.profile_id in (select id from riders)
    group by e.strava_segment_id
  ), top as (
    select r.id, r.riders, r.efforts
    from ranked r
    join public.zwb_segment_maps m on m.id=r.id
    where not m.private
      and (m.geometry_status='pending' or (m.geometry_status='error' and m.geometry_checked_at < now()-interval '7 days'))
    order by r.riders desc, r.efforts desc, r.id
    limit least(greatest(p_limit,0),10)
  )
  select t.id::text, pick.profile_id
  from top t
  cross join lateral (
    select e.profile_id
    from public.strava_activity_segment_efforts e
    join public.strava_activities a on a.id=e.activity_id and a.profile_id=e.profile_id and a.sport_type='Ride' and not a.trainer
    where e.strava_segment_id=t.id and e.profile_id in (select id from riders)
    order by e.started_at desc nulls last
    limit 1
  ) pick
  order by t.riders desc, t.efforts desc, t.id
$$;
revoke all on function public.segment_geometry_priority(integer) from public,anon,authenticated;
grant execute on function public.segment_geometry_priority(integer) to service_role;
notify pgrst,'reload schema';
