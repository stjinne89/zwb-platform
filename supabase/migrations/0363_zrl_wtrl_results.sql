-- ZRL-uitslag per divisie en race uit WTRL (2026-11-25).
--
-- Het WTRL-script (`npm run wtrl`, 0361) haalt de uitslagen al op om
-- tegenstanders in te delen. Nu bewaart de import ook de hele uitslag: per team
-- plaats en punten, per renner de punten (FAL, FTS, FIN, PBP). De teampagina
-- toont hem uitklapbaar onder de competitiestand (0362). Eigen renners die op
-- rittijd gevonden zijn, krijgen hun Zwift-ID mee (`zwiftId`), zodat de pagina
-- naar hun profiel linkt.
--
-- Lezen mag elk ingelogd lid, zoals zrl_wtrl_standings; schrijven alleen de
-- import met de service-rol.

create table if not exists public.zrl_wtrl_results (
  season integer not null,
  -- WTRL-klasse, bijvoorbeeld "2420B40" (Open Aqua B4).
  class text not null check (class ~ '^[0-9]{4}[A-E][0-9]+[0-9]$'),
  race integer not null check (race > 0),
  -- WTRL noemde de uitslag "Finalized".
  final boolean not null default false,
  -- [{ rank, name, points, fal, fts, fin, pbp, leaguePoints, dq, zwiftEventId,
  --    riders: [{ rank, name, points, fal, fts, fin, pbp, timeMs, wkg, dq, zwiftId }] }]
  teams jsonb not null default '[]'::jsonb,
  imported_at timestamptz not null default now(),
  primary key (season, class, race)
);

alter table public.zrl_wtrl_results enable row level security;

drop policy if exists "zrl_wtrl_results_select_authenticated" on public.zrl_wtrl_results;
create policy "zrl_wtrl_results_select_authenticated"
  on public.zrl_wtrl_results for select to authenticated using (true);

revoke all on public.zrl_wtrl_results from anon;
grant select on public.zrl_wtrl_results to authenticated;
grant all on public.zrl_wtrl_results to service_role;

notify pgrst, 'reload schema';
