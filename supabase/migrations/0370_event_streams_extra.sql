-- Livestreams via YouTube: extra streams bij een race (2026-11-25).
--
-- Wens eigenaar: een lid voegt met een link een stream toe die niet de zijne
-- is, van een ander lid of van een tegenstander. event_streams.source krijgt
-- 'extra': profile_id is dan wie hem toevoegde, niet wie streamt. De naam op de
-- tegel is de kanaalnaam (channel_title). Een extra stream stuurt geen
-- melding, krijgt geen overlay of thumbnail, en ZWB raakt de video op YouTube
-- nooit aan (app-laag).
--
-- - Eén eigen stream per lid per race blijft, maar geldt niet meer voor extra
--   streams: de unieke sleutel event_streams_one_per_rider wordt een unieke
--   index met `where source <> 'extra'`.
-- - Dezelfde video staat hooguit één keer bij een race.
--
-- Vereist 0360. Geen clubdata, geen persoonsgegevens.

alter table public.event_streams drop constraint if exists event_streams_source_check;

alter table public.event_streams
  add constraint event_streams_source_check check (source in ('zwb', 'eigen', 'extra'));

alter table public.event_streams drop constraint if exists event_streams_one_per_rider;
drop index if exists public.event_streams_one_per_rider;

create unique index if not exists event_streams_one_per_rider
  on public.event_streams (event_id, profile_id)
  where source <> 'extra';

create unique index if not exists event_streams_one_per_video
  on public.event_streams (event_id, youtube_video_id);

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select indexname, indexdef from pg_indexes where tablename = 'event_streams';
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'event_streams_source_check';
