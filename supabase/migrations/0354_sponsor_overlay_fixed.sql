-- Een vaste sponsor in de OBS-overlay (2026-11-23).
--
-- Wens eigenaar: de online sponsor staat altijd in beeld, de andere sponsors
-- wisselen ernaast. Bij de sponsor op /sponsors staat daarvoor een vinkje;
-- er is er hooguit een tegelijk (de actie haalt het vinkje bij de rest weg).
-- Zonder vinkje wisselen alle sponsors, zoals eerst.
--
-- Welke sponsor vast staat is clubdata en staat dus niet in deze migratie.
-- Sponsors zijn publiek leesbaar (RLS); de kolom valt daaronder.

alter table public.sponsors
  add column if not exists overlay_fixed boolean not null default false;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select name from public.sponsors where overlay_fixed;
