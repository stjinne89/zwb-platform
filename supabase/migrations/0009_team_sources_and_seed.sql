-- Voeg ontbrekende ZWB race-teams toe en maak resultaat-sync idempotent.

-- Team-resultaten kunnen uit externe bronnen komen. Manual blijft de default.
alter table public.team_results
  add column if not exists external_source text not null default 'manual'
    check (external_source in ('manual', 'wtrl', 'club_ladder')),
  add column if not exists external_id text,
  add column if not exists source_url text,
  add column if not exists synced_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists team_results_external_source_id_idx
  on public.team_results (external_source, external_id)
  where external_id is not null;

create table if not exists public.team_result_sources (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  provider text not null check (provider in ('wtrl', 'club_ladder')),
  source_url text not null,
  match_name text not null,
  enabled boolean not null default true,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists team_result_sources_team_idx
  on public.team_result_sources (team_id);

create unique index if not exists team_result_sources_unique_idx
  on public.team_result_sources (team_id, provider, lower(match_name));

alter table public.team_result_sources enable row level security;

drop policy if exists "team_result_sources_select_authenticated" on public.team_result_sources;
create policy "team_result_sources_select_authenticated" on public.team_result_sources
  for select to authenticated using (true);

drop policy if exists "team_result_sources_admin_write" on public.team_result_sources;
create policy "team_result_sources_admin_write" on public.team_result_sources
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- Teams idempotent invoegen zonder unieke constraint op teams.name nodig te hebben.
insert into public.teams (name, type, division, description)
select v.name, v.type, v.division, v.description
from (
  values
    ('ZRL B', 'zrl', 'B', 'ZWB ZRL B - race-categorie B'),
    ('ZRL C', 'zrl', 'C', 'ZWB ZRL C - race-categorie C'),
    ('ZRL Zwiftladies', 'zrl', 'Women', 'ZWB Zwiftladies in ZRL'),
    ('ZWBeasts', 'ladder', 'Diamond-Ruby', 'ZWB Club Ladder team Diamond-Ruby'),
    ('ZWBullets', 'ladder', 'Ruby-Sapphire', 'ZWB Club Ladder team Ruby-Sapphire'),
    ('ZWBandits', 'ladder', null, 'ZWB Club Ladder team'),
    ('ZWB Zwiftladies', 'ladder', null, 'ZWB Zwiftladies Club Ladder team')
) as v(name, type, division, description)
where not exists (
  select 1 from public.teams t where lower(t.name) = lower(v.name)
);

-- Standaard bronnen. WTRL vereist mogelijk login-cookies; zie app-sync feedback.
insert into public.team_result_sources (team_id, provider, source_url, match_name)
select t.id, v.provider, v.source_url, v.match_name
from (
  values
    ('ZRL B', 'wtrl', 'https://www.wtrl.racing/zwift-racing-league/results/', 'ZRL B'),
    ('ZRL B', 'wtrl', 'https://www.wtrl.racing/zwift-racing-league/results/', 'ZWB Cycling B1'),
    ('ZRL C', 'wtrl', 'https://www.wtrl.racing/zwift-racing-league/results/', 'ZRL C'),
    ('ZRL C', 'wtrl', 'https://www.wtrl.racing/zwift-racing-league/results/', 'ZWB Cycling C1'),
    ('ZRL Zwiftladies', 'wtrl', 'https://www.wtrl.racing/zwift-racing-league/results/', 'ZWB Zwiftladies'),
    ('ZWBeasts', 'club_ladder', 'https://ladder.cycleracing.club/summary', 'ZWBeasts'),
    ('ZWBullets', 'club_ladder', 'https://ladder.cycleracing.club/summary', 'ZWBullets'),
    ('ZWBandits', 'club_ladder', 'https://ladder.cycleracing.club/summary', 'ZWBandits'),
    ('ZWB Zwiftladies', 'club_ladder', 'https://ladder.cycleracing.club/summary', 'ZWB Zwiftladies')
) as v(team_name, provider, source_url, match_name)
join public.teams t on lower(t.name) = lower(v.team_name)
where not exists (
  select 1
  from public.team_result_sources s
  where s.team_id = t.id
    and s.provider = v.provider
    and lower(s.match_name) = lower(v.match_name)
);
