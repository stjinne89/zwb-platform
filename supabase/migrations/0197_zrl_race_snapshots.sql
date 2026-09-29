-- Bevroren Zwift-data van een gereden ZRL-race, per Zwift-event.
--
-- De live stand (/live/zrl/[eventId]) haalt elke 15 s de hele race bij Zwift op:
-- startlijst, uitslag en segmentpassages, ongeveer 16 aanroepen per Zwift-event.
-- Direct na de finish kijkt iedereen tegelijk, en dan knijpt Zwift het
-- serviceaccount af: de uitslag komt niet binnen en de stand blijft "Voorlopig"
-- (gezien 2026-09-29, B1).
--
-- Dus: zodra alle renners binnen zijn, schrijft de live stand de ruwe Zwift-data
-- hier één keer weg, en daarna rekent hij alleen nog uit deze rij. Ruwe data en
-- geen berekende stand, zodat een teambijstelling of een correctie in de
-- telling ook achteraf doorwerkt.
--
-- Geen policies: alleen de admin-client op de server leest en schrijft.

create table if not exists public.zrl_race_snapshots (
  zwift_event_id text primary key,
  data jsonb not null,
  frozen_at timestamptz not null default now()
);

alter table public.zrl_race_snapshots enable row level security;
