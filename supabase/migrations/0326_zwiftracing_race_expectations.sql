-- ZwiftRacing: de verwachte plek van vóór de race naast de echte, per lid
-- (2026-11-12). Voor ZWBeter racen ("ZwiftRacing verwachtte je 16e").
--
-- ZwiftRacing bewaart op de uitslagpagina van een event per renner de verwachte
-- plek van vóór de start (`expectedPosition`) naast de plek. De sync
-- (`POST /api/zwiftracing/sync`, lib/zwiftracing/race-expectations.ts) haalt die
-- pagina één keer op voor de bewaarde races (zrl_race_snapshots) en schrijft
-- alleen de rijen van renners met een profiel in ZWB; van anderen niets.
--
-- * zwiftracing_race_expectations: per race en lid de verwachte plek, de echte
--   plek (null bij een DNF) en het aantal finishers in zijn pen.
-- * zwiftracing_event_fetches: welke races al gedaan zijn, zodat de sync ze niet
--   opnieuw vraagt. status: 'results' (gedaan), 'unknown' (404 bij ZwiftRacing),
--   'none' (geen uitslag, ook na drie dagen niet), 'pending' (nog geen
--   definitieve uitslag; de sync probeert het zes uur na fetched_at opnieuw).
-- * Alleen de server leest en schrijft: RLS aan zonder policies, zoals
--   zwift_rider_metrics (0260) en de laddertabellen.
-- Opnieuw draaien doet niets.

create table if not exists public.zwiftracing_race_expectations (
  zwift_event_id text not null,
  zwift_id bigint not null,
  expected_position integer not null check (expected_position > 0),
  position integer check (position > 0),
  pen_size integer not null check (pen_size > 0),
  fetched_at timestamptz not null default now(),
  primary key (zwift_event_id, zwift_id)
);

create index if not exists zwiftracing_race_expectations_zwift_id_idx
  on public.zwiftracing_race_expectations (zwift_id);

alter table public.zwiftracing_race_expectations enable row level security;

create table if not exists public.zwiftracing_event_fetches (
  zwift_event_id text primary key,
  status text not null check (status in ('results', 'unknown', 'none', 'pending')),
  fetched_at timestamptz not null default now()
);

alter table public.zwiftracing_event_fetches enable row level security;
