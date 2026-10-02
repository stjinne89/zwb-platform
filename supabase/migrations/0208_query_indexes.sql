-- Indexen voor queries die op productie de hele tabel lazen (gemeten 2026-09-30,
-- zie docs/prestatie-onderzoek-2026-09-30.md).
--
-- * Het dashboard en de clubstatistieken filteren strava_activities op start_date
--   (laatste 7 dagen, laatste 13 weken). Zonder index las elke dashboardweergave
--   alle ~25.600 ritten: 377 ms, en tot 3 s onder load.
-- * De opruimjob van /api/live/cleanup verwijdert elke 15 minuten posities ouder
--   dan 30 dagen op recorded_at. De bestaande index begint met session_id, dus
--   dat was ook een volledige scan (gemiddeld 0,8 s).
--
-- Beide tabellen zijn klein genoeg voor een gewone create index (seconden).

create index if not exists strava_activities_start_date
  on public.strava_activities (start_date desc);

create index if not exists live_positions_recorded_at
  on public.live_positions (recorded_at);
