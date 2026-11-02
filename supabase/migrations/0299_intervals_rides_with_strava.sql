-- Ritten via intervals.icu, ook met een Strava-koppeling.
--
-- Tot nu toe won Strava altijd: wie beide had, kreeg zijn ritten van Strava
-- (lib/intervals/rides.ts, rideSourceFor). Met deze vlag komen de ritten van
-- intervals.icu, en blijft Strava alleen gekoppeld voor wat een token nodig
-- heeft: de ZWBeter-samenvatting in de beschrijving, de Zwift-routes en de
-- fietsen. Ritten die al van Strava binnenkwamen, blijven staan.
--
-- Op intervals_connections en niet op strava_connections: de keuze moet een
-- nieuwe Strava-koppeling overleven, en verdwijnt terecht met de
-- intervals-koppeling.

alter table public.intervals_connections
  add column if not exists rides_via_intervals boolean not null default false;

notify pgrst, 'reload schema';
