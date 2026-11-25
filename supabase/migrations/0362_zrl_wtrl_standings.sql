-- Competitiestand per ZRL-divisie uit WTRL (2026-11-25).
--
-- Het WTRL-script op de pc van de eigenaar (`npm run wtrl`, zie 0361) haalt
-- naast de uitslagen ook de stand van elke divisie met een ZWB-team op
-- (`/api/zrl/league/{seizoen}/{klasse}/{race}`). Eén rij per divisie, met de
-- hele tabel: de teampagina toont hem bovenaan. Teams staan erin met hun
-- WTRL-team-ID, het tweede deel van `wtrl_teams.trc_ref`.
--
-- Lezen mag elk ingelogd lid, zoals wtrl_teams (0180); schrijven alleen de
-- import met de service-rol.

create table if not exists public.zrl_wtrl_standings (
  season integer not null,
  -- WTRL-klasse, bijvoorbeeld "2420B40" (Open Aqua B4).
  class text not null check (class ~ '^[0-9]{4}[A-E][0-9]+[0-9]$'),
  -- De stand na deze race.
  race integer not null check (race > 0),
  -- WTRL noemde de uitslag van die race "Finalized".
  final boolean not null default false,
  -- [{ rank, teamId, name, points, perRace: [..], races, fin, fal, fts, pbp }]
  rows jsonb not null default '[]'::jsonb,
  imported_at timestamptz not null default now(),
  primary key (season, class)
);

alter table public.zrl_wtrl_standings enable row level security;

drop policy if exists "zrl_wtrl_standings_select_authenticated" on public.zrl_wtrl_standings;
create policy "zrl_wtrl_standings_select_authenticated"
  on public.zrl_wtrl_standings for select to authenticated using (true);

revoke all on public.zrl_wtrl_standings from anon;
grant select on public.zrl_wtrl_standings to authenticated;
grant all on public.zrl_wtrl_standings to service_role;

notify pgrst, 'reload schema';
