-- Livestreams via YouTube: de live stand in de overlay aan en uit (2026-11-18).
--
-- Wens eigenaar: tijdens het streamen de live stand in de OBS-overlay aan en
-- uit zetten met een schakelaar in de app. De overlay hoort voortaan bij een
-- stream (`/live/stream/<id>/overlay`) en leest deze kolom bij elke verversing
-- (elke 15 seconden). Logo en sponsors staan er altijd; de stand alleen bij een
-- ZRL-race en als deze kolom aan staat.
--
-- Schrijven blijft alleen via de service-role, na de controle in de server
-- action (eigen stream, of events.manage_all). Lezen valt onder de bestaande
-- policy van 0338 (goedgekeurde leden).
--
-- Vereist 0338. Geen ZWB-data, geen persoonsgegevens (installatie.md §7).

alter table public.event_streams
  add column if not exists overlay_stand boolean not null default true;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select column_name, data_type, column_default, is_nullable
--   from information_schema.columns
--   where table_name = 'event_streams' and column_name = 'overlay_stand';
