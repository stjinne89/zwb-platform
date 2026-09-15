-- Kilometers per Zwift-wereld, als beslisser voor de titels.
--
-- In de Zwift-werelden hebben actieve leden al snel (bijna) alle blokken; dan
-- staan meerdere leden gelijk. Wie in die wereld de meeste kilometers reed,
-- neemt dan de titel, zodat hij nog over te nemen is. Pas bij ook gelijke
-- kilometers telt wie het blokkenaantal het eerst bereikte.
--
-- De wereld van een rit volgt uit zijn routelijn (src/lib/zwblokken/zwift.ts) en
-- wordt door de Zwift-sync hier vastgelegd. Een rit ligt altijd in één wereld.

alter table public.strava_activities
  add column if not exists zwift_world text;

create index if not exists strava_activities_zwift_world_idx
  on public.strava_activities (zwift_world, profile_id)
  where zwift_world is not null;

-- security_invoker: de leesregels van strava_activities blijven gelden.
drop view if exists public.zwift_world_distances;
create view public.zwift_world_distances with (security_invoker = on) as
  select profile_id, zwift_world as world, sum(distance_m)::bigint as distance_m
  from public.strava_activities
  where zwift_world is not null
  group by profile_id, zwift_world;

-- De ritten van vóór deze kolom hebben al Zwift-blokken, maar nog geen wereld.
-- Opnieuw door de sync halen: blokken en hun datum blijven gelijk, de wereld komt
-- erbij. Daarna eenmalig /api/zwblokken/backfill?zwift=1 draaien.
update public.strava_activities
  set zwift_blocks_processed_at = null
  where sport_type = 'VirtualRide' and zwift_world is null;

notify pgrst, 'reload schema';
