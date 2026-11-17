-- Onderdelen per ledengroep afsluiten, en per lid verbergen.
--
-- Wens eigenaar (2026-11-17): leden raken overweldigd door alle onderdelen.
-- Twee lagen:
--
-- 1. community_role_permissions.blocked_modules: de modules (src/lib/modules.ts)
--    die een ledengroep niet mag gebruiken. Een lid is buitengesloten als ELKE
--    groep van dat lid de module dicht heeft; beheerders nooit. De middleware
--    geeft dan een 404, net als bij een module die de club uitzet (0313).
--    Standaard leeg: alles open. Geen check-constraint op de sleutels, net als
--    bij club_modules: de app laat onbekende sleutels vallen. Schrijven gaat via
--    de bestaande beheerpolicies van deze tabel (0024).
--
-- 2. profile_stats_tiles.module_hidden: wat een lid zelf verborgen heeft, als
--    lijst van modulesleutels en ZWBeter-paden (src/lib/member-view.ts).
--    Verbergen, geen slot: een directe link blijft werken. In de tabel van 0241,
--    die alleen het lid zelf leest en schrijft, naast dashboard_hidden (0318).

alter table public.community_role_permissions
  add column if not exists blocked_modules text[] not null default '{}'::text[];

alter table public.profile_stats_tiles
  add column if not exists module_hidden jsonb not null default '[]'::jsonb;

alter table public.profile_stats_tiles
  drop constraint if exists profile_stats_tiles_module_hidden_array;
alter table public.profile_stats_tiles
  add constraint profile_stats_tiles_module_hidden_array
  check (jsonb_typeof(module_hidden) = 'array');
