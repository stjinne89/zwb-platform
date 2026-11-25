-- WTRL-import vanaf de eigen pc (2026-11-25).
--
-- Een script op de pc van de eigenaar (`npm run wtrl`) haalt met zijn eigen
-- WTRL-sessie My Teams, de teamgegevens en de uitslagen van de lopende ronde op
-- en stuurt ze naar /api/zrl/wtrl-import. Het platform zelf roept WTRL niet aan.
--
-- 1. `zrl_team_assignments.source`: 'manual' is door een ploegleider gezet en
--    gaat altijd voor; 'wtrl' komt uit de WTRL-uitslag (gekoppeld op rittijd)
--    en wordt bij elke import bijgewerkt.
-- 2. `zrl_race_passes.source` krijgt 'wtrl': de pass uit My Teams. De import
--    van de clubsite overschrijft die niet meer, maar vult hem aan waar WTRL
--    geen pass gaf.
-- 3. `zrl_wtrl_result_imports`: welke WTRL-uitslagen al verwerkt zijn, zodat
--    het script een definitieve uitslag niet nog eens ophaalt.

alter table public.zrl_team_assignments
  add column if not exists source text not null default 'manual';

alter table public.zrl_team_assignments
  drop constraint if exists zrl_team_assignments_source_check;
alter table public.zrl_team_assignments
  add constraint zrl_team_assignments_source_check check (source in ('manual', 'wtrl'));

alter table public.zrl_race_passes
  drop constraint if exists zrl_race_passes_source_check;
alter table public.zrl_race_passes
  add constraint zrl_race_passes_source_check check (source in ('site', 'manual', 'wtrl'));

create table if not exists public.zrl_wtrl_result_imports (
  season integer not null,
  -- WTRL-klasse, bijvoorbeeld "2420B40" (Open Aqua B4).
  class text not null check (class ~ '^[0-9]{4}[A-E][0-9]+[0-9]$'),
  race integer not null check (race > 0),
  -- WTRL noemde de uitslag "Finalized" en alle renners van ons eigen event
  -- konden worden gezocht: dan hoeft hij niet nog eens.
  done boolean not null default false,
  riders integer not null default 0,
  matched integer not null default 0,
  imported_at timestamptz not null default now(),
  primary key (season, class, race)
);

alter table public.zrl_wtrl_result_imports enable row level security;

revoke all on public.zrl_wtrl_result_imports from anon, authenticated;
grant all on public.zrl_wtrl_result_imports to service_role;

notify pgrst, 'reload schema';
