-- Livestreams via YouTube, fase 2 (2026-11-18): live-status en pushmelding.
--
-- Een cron (`POST /api/youtube/status`) kijkt rond een race met een geplande
-- stream bij YouTube of de uitzending live is, en zet de status in
-- event_streams. Gaat de eerste stream van een race live, dan krijgen leden met
-- de melding Liverace één pushbericht (besluit eigenaar 2026-11-18); latere
-- streams van dezelfde race sturen er geen meer.
--
-- - notification_preferences.on_race_stream_live: standaard aan, zoals de
--   melding voor live meerijden (on_live_started).
-- - event_streams.status krijgt 'weg': YouTube kent de video niet (meer), of
--   hij staat op privé. De speler slaat zo'n stream over.
-- - event_streams.status_checked_at: wanneer de cron voor het laatst keek.
--
-- Vereist 0338. Geen ZWB-data, geen persoonsgegevens (installatie.md §7).

alter table public.notification_preferences
  add column if not exists on_race_stream_live boolean not null default true;

alter table public.event_streams
  add column if not exists status_checked_at timestamptz;

alter table public.event_streams drop constraint if exists event_streams_status_check;
alter table public.event_streams
  add constraint event_streams_status_check
  check (status in ('gepland', 'live', 'afgelopen', 'weg'));

-- De cron zoekt streams die nog niet klaar zijn, op geplande start.
create index if not exists event_streams_open_idx
  on public.event_streams (scheduled_start_at)
  where status in ('gepland', 'live');

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select column_name, column_default from information_schema.columns
--   where table_name = 'notification_preferences' and column_name = 'on_race_stream_live';
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conname = 'event_streams_status_check';
