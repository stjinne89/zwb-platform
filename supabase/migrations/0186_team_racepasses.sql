-- WTRL-racepass per team per ZRL-ronde. Wens van de eigenaar (2026-09-22): bij
-- de ZRL meld je je niet op Zwift aan maar via de racepass van je team, die WTRL
-- per ronde uitgeeft. De racepagina toont de pass van het team waarvan de ronde
-- de racedatum dekt (valid_from t/m valid_until). Schrijven gaat via de
-- service-role admin-client na de permissiecheck in de server-action.

create table if not exists public.team_racepasses (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  season text not null,
  round int not null check (round between 1 and 4),
  valid_from date not null,
  valid_until date not null check (valid_until >= valid_from),
  url text not null check (url ~ '^https://'),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (team_id, season, round)
);

create index if not exists team_racepasses_team_idx
  on public.team_racepasses (team_id, valid_from);

alter table public.team_racepasses enable row level security;

drop policy if exists "team_racepasses_read" on public.team_racepasses;
create policy "team_racepasses_read" on public.team_racepasses
  for select to authenticated
  using (true);
