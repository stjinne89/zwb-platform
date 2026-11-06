-- Club Ladder: de verwachting van vóór de start bewaren, om na de race naast de
-- uitslag te zetten (2026-11-06).
--
-- Vraag eigenaar: op het event van een gereden ladderrace per renner het
-- verschil tussen verwachting en uitslag. Achteraf uitrekenen schuift: de
-- 90 dagen van ZwiftRacing en intervals.icu lopen na de race door en kunnen de
-- race zelf bevatten. Daarom legt de app bij elke opening van het event of het
-- racebriefje vóór de start vast waarmee de verwachting rekent, en schrijft
-- daarna niet meer.
--
-- * riders: per renner het vermogen waarop de verwachting hem zet, zoals het
--   racebriefje (W/kg per duur, met gewicht omgerekend als dat meetelt):
--   [{ "zwiftId": 1, "name": "…", "own": true, "wkg": { "s15": …, "m1": …,
--   "m5": …, "m20": … } }]. Van alle renners die de matchup kende (opstelling,
--   aanmeldingen, en per type de vijf van de tegenstander), zodat een wissel na
--   de opstelling nog een verwachting heeft.
-- * weights: weging per duur van het parcours, of null zonder route.
-- * Alleen de server leest en schrijft: RLS aan zonder policies, zoals de
--   andere laddertabellen (0285, 0290, 0298).
-- Opnieuw draaien doet niets.

create table if not exists public.club_ladder_event_expectations (
  event_id uuid primary key references public.events(id) on delete cascade,
  riders jsonb not null default '[]'::jsonb,
  weights jsonb,
  computed_at timestamptz not null default now()
);

alter table public.club_ladder_event_expectations enable row level security;
