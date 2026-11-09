-- ZWBeter racen: de eigen klimmen uit het hoogteprofiel, om met eerdere keren
-- te vergelijken.
--
-- Vraag van de eigenaar (2026-11-09): alle blokken uit het onderzoek naar een
-- diepere race-analyse bouwen, waaronder "klimmen tegenover eerdere keren".
-- Op routes zonder klimsegmenten van Zwift haalt de analyse de klimmen uit het
-- hoogteprofiel van de eigen rit (intervals.icu). Die tijden bestaan nergens
-- anders, dus bewaren we per klim de tijd en het vermogen bij het openen van
-- de race. Dezelfde klim herkennen we aan de route en de kilometer waar hij
-- begint.
--
-- Alleen voor het lid zelf: RLS laat alleen de eigen rijen lezen; schrijven
-- doet de server met de servicerol.

create table if not exists public.race_climb_efforts (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  zwift_event_id bigint not null check (zwift_event_id > 0),
  climb_index smallint not null check (climb_index >= 0),
  route_id bigint,
  raced_at timestamptz not null,
  start_km numeric(6, 2) not null,
  length_m integer not null check (length_m > 0),
  gain_m integer not null,
  seconds integer not null check (seconds > 0),
  avg_watts integer not null check (avg_watts >= 0),
  wkg numeric(4, 2),
  created_at timestamptz not null default now(),
  primary key (profile_id, zwift_event_id, climb_index)
);

create index if not exists race_climb_efforts_route_idx
  on public.race_climb_efforts (profile_id, route_id, start_km);

alter table public.race_climb_efforts enable row level security;

drop policy if exists race_climb_efforts_select_own on public.race_climb_efforts;
create policy race_climb_efforts_select_own
  on public.race_climb_efforts for select
  to authenticated
  using (profile_id = (select auth.uid()));
