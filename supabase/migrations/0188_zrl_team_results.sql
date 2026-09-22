-- Bevroren teamuitslag van een gereden ZRL-race, voor de raceweekpagina.
--
-- De live stand (/live/zrl/[eventId]) bewaart niets: hij rekent elke 15 s
-- opnieuw uit Zwift-data. Dat kan niet voor een overzicht, want één teamuitslag
-- kost 16 Zwift-aanroepen en ~8 seconden, en zeven ploegen tegelijk knijpt Zwift
-- het serviceaccount af (gemeten 2026-09-22).
--
-- Dus: zodra de stand definitief is, schrijft de live stand de plaats van ons
-- team hier één keer weg, en de raceweek leest alleen nog deze rij. Daarmee
-- blijft de uitslag ook staan als Zwift de segmentpassages niet meer teruggeeft.
--
-- Eén rij per teamevent. Lezen mag elk ingelogd lid (het staat op de
-- raceweekpagina); schrijven gaat alleen via de admin-client op de server.

create table if not exists public.zrl_team_results (
  event_id uuid primary key references public.events(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  rank integer not null check (rank > 0),
  teams integer not null check (teams > 0),
  points integer not null default 0,
  riders integer not null default 0,
  computed_at timestamptz not null default now()
);

create index if not exists zrl_team_results_team_id_idx on public.zrl_team_results (team_id);

alter table public.zrl_team_results enable row level security;

drop policy if exists "zrl_team_results_read" on public.zrl_team_results;
create policy "zrl_team_results_read" on public.zrl_team_results
  for select to authenticated
  using (true);
