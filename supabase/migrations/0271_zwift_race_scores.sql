-- ZWBriljant: de ZRS van vroeger per race bewaard, met een leescursor per renner.
--
-- Vraag van de eigenaar (2026-10-23): de historie liep vast. De job las de
-- activiteitenlijst van Zwift elke run opnieuw vanaf het begin; een maand ver
-- terug paste niet meer in het budget en kwam dus nooit af. En omdat alleen het
-- niveau in de terugblik stond, gooide elke nieuwe schaal (`SCALE_VERSION`) de
-- gevonden ZRS weg en begon het opzoeken opnieuw.
--
-- 1. zwift_race_scores: per renner per race de ZRS vóór en na die race, zoals
--    Zwift die in de uitslag geeft (`scoreHistory`). `looked_up_at` null: de race
--    staat in de lijst maar is nog niet opgezocht; gezet: opgezocht, ook als
--    Zwift geen score gaf (dan blijven de scores null en zoeken we niet opnieuw).
--    Het activiteit-ID is tekst: Zwift-ID's van activiteiten passen niet in een
--    JavaScript-getal.
-- 2. zwift_race_score_sync: waar de job in de lijst (nieuw naar oud) verder leest,
--    of de lijst tot de eerste activiteit gelezen is, en wanneer de renner voor
--    het laatst aan de beurt was (eerlijke volgorde tussen leden).
--
-- De maand-ZRS wordt hieruit afgeleid (`zrsAtMonthEnd` in src/lib/briljant), dus
-- een nieuwe schaal hoeft niets opnieuw op te halen. Zonder beslissing blijft de
-- actuele ZRS de terugval. Alleen de server leest en schrijft (admin-client):
-- RLS aan zonder policies, net als zwift_rider_metrics (0260).

create table if not exists public.zwift_race_scores (
  zwift_id bigint not null,
  activity_id text not null check (activity_id ~ '^[0-9]+$'),
  raced_at timestamptz not null,
  -- De dag in Amsterdam; daarop vergelijken we met het maandeinde.
  raced_on date not null,
  score_before integer check (score_before is null or score_before >= 0),
  score_after integer check (score_after is null or score_after >= 0),
  looked_up_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (zwift_id, activity_id)
);

create index if not exists zwift_race_scores_rider_day_idx
  on public.zwift_race_scores (zwift_id, raced_on desc);

create table if not exists public.zwift_race_score_sync (
  zwift_id bigint primary key,
  -- Positie in de activiteitenlijst waar de volgende pagina begint.
  next_start integer not null default 0 check (next_start >= 0),
  -- De lijst is gelezen tot de eerste activiteit (of Zwift weigerde).
  list_complete boolean not null default false,
  -- Zwift gaf 401/403/404 op de lijst: niet blijven proberen.
  refused boolean not null default false,
  -- De nieuwste activiteit die we kennen; nieuwere komen bovenaan de lijst erbij.
  newest_at timestamptz,
  -- Alle maanden van de terugblik zijn uit deze tabel beslist.
  settled_at timestamptz,
  attempted_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.zwift_race_scores enable row level security;
alter table public.zwift_race_score_sync enable row level security;

revoke all on public.zwift_race_scores, public.zwift_race_score_sync from anon, authenticated;
