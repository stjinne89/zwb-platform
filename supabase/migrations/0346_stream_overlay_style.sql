-- Livestreams via YouTube: een stijl voor overlay en thumbnail per stream
-- (2026-11-20).
--
-- Wens eigenaar: leden onderscheiden zich met een eigen stijl, allemaal in
-- ZWB-kleuren. Vier stijlen: tegels (het kader van 2026-11-19, standaard),
-- rugnummer, zeefdruk en strip. Donker of licht (0345) blijft een losse
-- keuze; die geldt bij tegels en zeefdruk, de andere twee hebben één versie.
-- De OBS-overlay leest deze kolom bij elke verversing (elke 15 seconden); de
-- thumbnail volgt bij het wisselen en bij Thumbnail vernieuwen.
--
-- Schrijven blijft alleen via de service-role, na de controle in de server
-- action (eigen stream, of events.manage_all). Lezen valt onder de bestaande
-- policy van 0338 (goedgekeurde leden).
--
-- Vereist 0338. Geen ZWB-data, geen persoonsgegevens (installatie.md §7).

alter table public.event_streams
  add column if not exists overlay_style text not null default 'tegels';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'event_streams_overlay_style_check'
      and conrelid = 'public.event_streams'::regclass
  ) then
    alter table public.event_streams
      add constraint event_streams_overlay_style_check
      check (overlay_style in ('tegels', 'rugnummer', 'zeefdruk', 'strip'));
  end if;
end $$;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select overlay_style, count(*) from public.event_streams group by 1;
