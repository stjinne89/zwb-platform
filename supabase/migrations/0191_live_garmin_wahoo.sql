-- Live volgen via Garmin LiveTrack en Wahoo Live Track.
--
-- De renner zet één keer een persoonlijk clubadres als ontvanger van de
-- LiveTrack-mail. /api/live/inbound-mail (Resend) maakt bij elke rit een
-- live_sessions-rij met de link; src/lib/live/external-refresh.ts haalt bij
-- Garmin de posities op zolang iemand kijkt en sluit de sessie aan het eind
-- van de rit. Zie docs/garmin-wahoo-live-tracking-onderzoek.md.
--
-- - source: 'garmin' en 'wahoo' naast manual/owntracks/external.
-- - external_last_fetch_at: slot, hooguit één ophaalronde per 30 s per sessie.
-- - external_last_point_at: tijdstip van het laatst opgeslagen punt.
-- - external_status: live | ended | error | link (alleen link, geen posities).
-- - live_tracker_tokens.provider 'mail': hash van de code in het adres.

alter table public.live_sessions
  drop constraint if exists live_sessions_source_check;
alter table public.live_sessions
  add constraint live_sessions_source_check
    check (source in ('manual', 'owntracks', 'external', 'garmin', 'wahoo'));

alter table public.live_sessions
  add column if not exists external_last_fetch_at timestamptz,
  add column if not exists external_last_point_at timestamptz,
  add column if not exists external_status text
    check (external_status is null or external_status in ('live', 'ended', 'error', 'link'));

create index if not exists live_sessions_external_open_idx
  on public.live_sessions (source, started_at)
  where ended_at is null and source in ('garmin', 'wahoo');

alter table public.live_tracker_tokens
  drop constraint if exists live_tracker_tokens_provider_check;
alter table public.live_tracker_tokens
  add constraint live_tracker_tokens_provider_check
    check (provider in ('owntracks', 'mail'));

notify pgrst, 'reload schema';
