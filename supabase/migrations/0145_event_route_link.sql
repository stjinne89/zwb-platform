-- Koppeling van een event aan een Zwift-event en -route.
--
-- Tot nu toe was een Zwift-event alleen herkenbaar aan `type = 'zwift'` en een
-- `external_url` naar zwift.com. Dat is genoeg om naartoe te linken, maar niet
-- om iets uit te rekenen: welke route, hoeveel ronden. Met deze drie kolommen
-- vult een beheerder het event door de Zwift-eventlink te plakken, en kan het
-- pacingplan het profiel uit `zwift_routes` halen zonder dat een lid een .gpx
-- uploadt.
--
-- `laps` staat los van `zwift_route_id` omdat een event dezelfde route meerdere
-- keren rijdt; het profiel wordt dan per ronde herhaald. Voor een event met een
-- afstands- of tijdslimiet in plaats van ronden blijft `laps` leeg en telt
-- `distance_km`.
--
-- `omnium_edition_events` heeft al eigen zwift_event_id/laps-velden voor de
-- onderdelen binnen één editie; die blijven ongemoeid.

alter table public.events
  add column if not exists zwift_event_id bigint;

alter table public.events
  add column if not exists zwift_route_id bigint
    references public.zwift_routes(route_id) on delete set null;

alter table public.events
  add column if not exists laps int;

create index if not exists events_zwift_event_idx
  on public.events (zwift_event_id)
  where zwift_event_id is not null;
