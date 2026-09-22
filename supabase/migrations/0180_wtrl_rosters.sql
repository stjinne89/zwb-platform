-- zFTP, zMAP en divisie per ZRL-renner, zoals WTRL ze toont.
--
-- Zwift geeft zFTP en zMAP alleen van je eigen account (gemeten 2026-09-22 met
-- "Test zFTP": power-profile negeert profileId). WTRL heeft ze wel, want elke
-- deelnemer koppelt daar zijn Zwift-account. WTRL verbiedt scraping, dus een
-- beheerder plakt de tekst van "My Teams" op /beheer/wtrl-teams.
--
-- Een momentopname per WTRL-team (TRC-referentie), met de renners zoals WTRL ze
-- op dat moment toonde. Opnieuw plakken vervangt de renners van dat team. De
-- koppeling aan een ZWB-team blijft staan, zodat de volgende plak vanzelf goed
-- landt.
--
-- Lezen mag elk ingelogd lid (de teampagina toont het, zoals het vermogen dat er
-- al staat); schrijven alleen via de serveractie met de admin-client.

create table if not exists public.wtrl_teams (
  trc_ref text primary key,
  name text not null,
  season text,
  division text,
  captain text,
  team_id uuid references public.teams(id) on delete set null,
  imported_at timestamptz not null default now(),
  imported_by uuid references public.profiles(id) on delete set null
);

create index if not exists wtrl_teams_team_id_idx on public.wtrl_teams (team_id);

create table if not exists public.wtrl_team_riders (
  trc_ref text not null references public.wtrl_teams(trc_ref) on delete cascade,
  zwift_id text not null,
  name text not null,
  category text check (category in ('A','B','C','D','E')),
  status text not null check (status in ('member','invited')),
  zftp_w integer,
  zftp_wkg numeric(4,2),
  zmap_wkg numeric(4,2),
  primary key (trc_ref, zwift_id)
);

create index if not exists wtrl_team_riders_zwift_id_idx on public.wtrl_team_riders (zwift_id);

alter table public.wtrl_teams enable row level security;
alter table public.wtrl_team_riders enable row level security;

drop policy if exists "wtrl_teams_select_authenticated" on public.wtrl_teams;
create policy "wtrl_teams_select_authenticated"
  on public.wtrl_teams for select to authenticated using (true);

drop policy if exists "wtrl_team_riders_select_authenticated" on public.wtrl_team_riders;
create policy "wtrl_team_riders_select_authenticated"
  on public.wtrl_team_riders for select to authenticated using (true);
