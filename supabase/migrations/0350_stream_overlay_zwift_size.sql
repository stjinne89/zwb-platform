-- Livestreams via YouTube: de maat van de overlay volgt het Zwift-beeld
-- (2026-11-20).
--
-- Wens eigenaar: kies de grootte van het Zwift-beeld, zodat dat in OBS op
-- 100% kan staan en alleen de positie nog gezet hoeft te worden. Het canvas
-- volgt daaruit: het Zwift-beeld is 80% ervan, met de balken links en boven
-- (lib/youtube-live/overlay-size.ts). overlay_size blijft het canvas, dus
-- 1920x1080 (Zwift 1536x864, het ontwerp) blijft de standaard en bestaande
-- streams veranderen niet.
--
-- Was (0348): 1280x720, 1600x900, 1920x1080, 2560x1440, 3840x2160.
-- Nu, per Zwift-beeld 1280x720, 1536x864, 1920x1080, 2560x1440, 3840x2160:
-- 1600x900, 1920x1080, 2400x1350, 3200x1800, 4800x2700. Een rij met een maat
-- die vervalt, gaat terug naar 1920x1080 (op 2026-11-20 stonden alle vier op
-- 1920x1080).
--
-- Vereist 0348. Geen ZWB-data, geen persoonsgegevens (installatie.md §7).

alter table public.event_streams drop constraint if exists event_streams_overlay_size_check;

update public.event_streams
  set overlay_size = '1920x1080'
  where overlay_size not in ('1600x900', '1920x1080', '2400x1350', '3200x1800', '4800x2700');

alter table public.event_streams
  add constraint event_streams_overlay_size_check
  check (overlay_size in ('1600x900', '1920x1080', '2400x1350', '3200x1800', '4800x2700'));

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select overlay_size, count(*) from public.event_streams group by 1;
