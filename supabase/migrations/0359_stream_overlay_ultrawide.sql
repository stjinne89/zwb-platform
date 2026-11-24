-- Livestreams via YouTube: een ultrawide Zwift-beeld (2026-11-24).
--
-- Wens eigenaar: een Zwift-scherm van 21:9 (3440x1440 of 2560x1080) in de
-- overlay, zonder bijsnijden. Het canvas blijft 16:9, zo breed als Zwift; het
-- Zwift-beeld vult de volle breedte, met een balk boven en een balk onder
-- (lib/youtube-live/overlay-size.ts). overlay_size blijft het canvas: er komen
-- twee waarden bij, 2560x1440 (Zwift 2560x1080) en 3440x1935 (Zwift 3440x1440).
-- 2560x1440 was in 0348 een kadermaat; sinds 0350 staat er geen rij meer op.
--
-- Vereist 0350. Geen clubdata, geen persoonsgegevens.

alter table public.event_streams drop constraint if exists event_streams_overlay_size_check;

alter table public.event_streams
  add constraint event_streams_overlay_size_check
  check (overlay_size in ('1600x900', '1920x1080', '2400x1350', '3200x1800', '4800x2700', '2560x1440', '3440x1935'));

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select overlay_size, count(*) from public.event_streams group by 1;
