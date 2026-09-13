-- Strava's effort.hidden is a display default ("verborgen segmenten tonen"), not a member
-- privacy choice: it mostly follows the segment, and hidden efforts still receive a pr_rank.
-- Filtering on it dropped 41% of all efforts and halved the shared leaderboards.
-- Identical to 0152 except for that one condition; privacy, visibility and flags still apply.
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
where not m.private and results.leaderboard is not null
and (auth.role()='service_role' or exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.is_approved and viewer.privacy_accepted_version >= '2026-09-13'));
revoke all on public.zwb_segment_club from public,anon;
grant select on public.zwb_segment_club to authenticated,service_role;
notify pgrst,'reload schema';
