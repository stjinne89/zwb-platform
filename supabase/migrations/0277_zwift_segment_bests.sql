-- Racebriefje: de beste tijd per renner per Zwift-segment, als richttijd.
--
-- Vraag van de eigenaar (2026-10-26): op het briefje per sprint en KOM de eigen
-- PR van onze renners, de snelste PR van het startveld als richttijd, en de watt
-- en w/kg die je daarvoor nodig hebt.
--
-- zwift_segment_bests: per Zwift-ID en Zwift-segment-ID de snelste passage van de
-- laatste 90 dagen (keuze eigenaar), zoals Zwift die geeft via `/segment-results`
-- met `player_id`: tijd, gemiddeld vermogen en gewicht op dat moment. Ook van
-- renners van andere clubs in dezelfde groep, net als de passages van de live
-- ZRL-stand (zrl_race_snapshots). `best_seconds` null: opgezocht, geen passage in
-- het venster; dan zoeken we niet opnieuw tot de rij een dag oud is. Een cache:
-- wat ouder is dan 90 dagen, gooit de app weg bij het verversen. Het segment-ID is
-- tekst: Zwifts segment-ID's passen niet in een JavaScript-getal en kunnen
-- negatief zijn. Alleen de server leest en schrijft (admin-client): RLS aan zonder
-- policies, net als zwift_rider_metrics (0260).

create table if not exists public.zwift_segment_bests (
  zwift_id bigint not null,
  segment_id text not null check (segment_id ~ '^-?[0-9]+$'),
  best_seconds numeric(8, 3) check (best_seconds is null or best_seconds > 0),
  best_watts integer check (best_watts is null or best_watts > 0),
  best_weight_kg numeric(5, 1) check (best_weight_kg is null or best_weight_kg > 0),
  best_at timestamptz,
  fetched_at timestamptz not null default now(),
  primary key (zwift_id, segment_id)
);

create index if not exists zwift_segment_bests_fetched_idx on public.zwift_segment_bests (fetched_at);

alter table public.zwift_segment_bests enable row level security;
