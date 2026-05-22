-- Externe link bij events (bv. naar Strava-route, Komoot tour, RideWithGPS).
-- Detail-pagina toont een nette "Open op X"-knop met platform-icoon.

alter table public.events
  add column if not exists external_url text;
