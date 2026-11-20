-- Livestreams via YouTube: overlay en thumbnail in donker of licht (2026-11-20).
--
-- Wens eigenaar: bij een stream kiezen tussen een donkere en een lichte versie,
-- zoals de website. De OBS-overlay (`/live/stream/<id>/overlay`) leest deze
-- kolom bij elke verversing (elke 15 seconden); de thumbnail volgt bij Thumbnail
-- vernieuwen en bij het wisselen. Donker blijft de standaard, ook voor
-- bestaande streams.
--
-- Schrijven blijft alleen via de service-role, na de controle in de server
-- action (eigen stream, of events.manage_all). Lezen valt onder de bestaande
-- policy van 0338 (goedgekeurde leden).
--
-- Vereist 0338. Geen ZWB-data, geen persoonsgegevens (installatie.md §7).

alter table public.event_streams
  add column if not exists overlay_theme text not null default 'dark';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'event_streams_overlay_theme_check'
      and conrelid = 'public.event_streams'::regclass
  ) then
    alter table public.event_streams
      add constraint event_streams_overlay_theme_check
      check (overlay_theme in ('dark', 'light'));
  end if;
end $$;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select column_name, data_type, column_default, is_nullable
--   from information_schema.columns
--   where table_name = 'event_streams' and column_name = 'overlay_theme';
