-- Segmentlijnen met voorrang: zonder hoogteprofiel geen haalbaarheidsinschatting, en op
-- 2026-09-13 stonden alle 19.781 segmenten nog op pending. Eerst segmenten met de meeste
-- ZWB-rijders (daar ontstaat een clubdoeltijd), dan het aantal pogingen.
-- Telt goedgekeurde leden met een actieve koppeling, ongeacht privacyversie: zo liggen de
-- lijnen al klaar als leden opnieuw tekenen. Er wordt niets aan leden getoond.
-- De token komt van een rijder van dat segment, net als bij segment_geometry_candidates.
create function public.segment_geometry_priority(p_limit integer)
returns table(id text, profile_id uuid)
language sql stable security definer set search_path=public as $$
  select m.id::text, (array_agg(e.profile_id order by e.started_at desc nulls last))[1]
  from public.zwb_segment_maps m
  join public.strava_activity_segment_efforts e on e.strava_segment_id=m.id
  join public.strava_activities a on a.id=e.activity_id and a.profile_id=e.profile_id
  join public.profiles p on p.id=e.profile_id and p.is_approved
  join public.strava_connections c on c.profile_id=e.profile_id and c.revoked_at is null
  where not m.private
    and (m.geometry_status='pending' or (m.geometry_status='error' and m.geometry_checked_at < now()-interval '7 days'))
    and a.sport_type='Ride' and not a.trainer
  group by m.id
  order by count(distinct e.profile_id) desc, count(*) desc, m.id
  limit least(greatest(p_limit,0),10)
$$;
revoke all on function public.segment_geometry_priority(integer) from public,anon,authenticated;
grant execute on function public.segment_geometry_priority(integer) to service_role;
notify pgrst,'reload schema';
