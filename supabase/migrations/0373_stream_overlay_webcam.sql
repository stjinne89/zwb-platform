-- Livestreams via YouTube: ruimte voor een webcam in de OBS-overlay (2026-11-26).
--
-- Wens eigenaar: wie met een webcam streamt, wil dat beeld linksonder kwijt
-- zonder dat de stand of de route eroverheen valt. Per stream een schakelaar;
-- de overlay laat dan een gat van 16:9 vrij (bij het kader linksonder, naast
-- Zwift; bij ultrawide links in de balk onder) en de stand wordt korter. De
-- maten staan in src/lib/youtube-live/overlay-size.ts. Een nieuwe stream neemt
-- de schakelaar over van de vorige stream van het lid (app-laag).
--
-- Geen clubdata, geen persoonsgegevens.

alter table public.event_streams
  add column if not exists overlay_webcam boolean not null default false;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select overlay_webcam, count(*) from public.event_streams group by 1;
