-- Dashboard: welke onderdelen een lid verborgen heeft.
--
-- Wens eigenaar (2026-11-09): op het profiel kiezen wat je op het dashboard
-- ziet; wie niet met ZWBeter traint, hoeft de trainingstegels niet te zien.
-- Een lijst van verborgen sleutels (src/lib/dashboard-parts.ts), zodat een nieuw
-- onderdeel vanzelf zichtbaar is. De app laat onbekende sleutels vallen, dus
-- hier alleen de vorm.
--
-- In profile_stats_tiles (0241): die tabel houdt al de tegelkeuze van Stats per
-- lid bij, en RLS laat alleen het lid zelf de eigen rij lezen en schrijven.

alter table public.profile_stats_tiles
  add column if not exists dashboard_hidden jsonb not null default '[]'::jsonb;

alter table public.profile_stats_tiles
  drop constraint if exists profile_stats_tiles_dashboard_hidden_array;
alter table public.profile_stats_tiles
  add constraint profile_stats_tiles_dashboard_hidden_array
  check (jsonb_typeof(dashboard_hidden) = 'array');
