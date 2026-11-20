-- Livestreams via YouTube: de resolutie van de OBS-overlay per stream
-- (2026-11-20).
--
-- Wens eigenaar: leden zwiften en streamen op een ander OBS-canvas
-- (Basisresolutie). Het lid kiest die bij Stream klaarzetten, en later onder
-- de stream; de overlay schaalt naar dat formaat. Alleen 16:9. Een nieuwe
-- stream neemt de resolutie over van de vorige stream van het lid, net als de
-- stijl (0346). Standaard 1920x1080, het formaat waarop de overlay ontworpen
-- is.
--
-- Schrijven blijft alleen via de service-role, na de controle in de server
-- action (eigen stream, of events.manage_all). Lezen valt onder de bestaande
-- policy van 0338 (goedgekeurde leden).
--
-- Vereist 0338. Geen ZWB-data, geen persoonsgegevens (installatie.md §7).

alter table public.event_streams
  add column if not exists overlay_size text not null default '1920x1080';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'event_streams_overlay_size_check'
      and conrelid = 'public.event_streams'::regclass
  ) then
    alter table public.event_streams
      add constraint event_streams_overlay_size_check
      check (overlay_size in ('1280x720', '1600x900', '1920x1080', '2560x1440', '3840x2160'));
  end if;
end $$;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select overlay_size, count(*) from public.event_streams group by 1;
