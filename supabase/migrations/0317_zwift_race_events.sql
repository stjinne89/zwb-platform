-- ZWBeter racen: per lid de eigen Zwift-races, ook buiten de kalender.
--
-- Vraag van de eigenaar (2026-11-09): niet alle races uit de kalender stonden
-- in "Jouw races", en kunnen de afgelopen races per lid niet automatisch
-- opgehaald worden? De lijst kende alleen races met een bewaarde uitslag, en
-- die werd buiten de ZRL pas bewaard als iemand de race opende.
--
-- De ZRS-historie (0271) leest per lid al de activiteitenlijst van Zwift en
-- bewaart elke "Zwift - Race" in zwift_race_scores. Het detail van zo'n
-- activiteit noemt het Zwift-event (`eventInfo.id` en `eventInfo.name`, gemeten
-- 2026-11-09). Dat bewaren we erbij, zodat "Jouw races" de race kan tonen
-- zonder de uitslag op te halen.
--
-- 1. zwift_race_scores.zwift_event_id en event_name: het Zwift-event van de
--    race-activiteit. `event_looked_up_at` gezet en het ID null: Zwift kende
--    geen event bij de activiteit (dan zoeken we niet opnieuw).
-- 2. zwift_race_score_sync.listed_until: de start van de oudste activiteit die
--    gelezen is. Daarmee weet de racejob of de laatste 120 dagen binnen zijn,
--    zonder de hele lijst te lezen. `races_checked_at`: wanneer het lid voor
--    het laatst aan de beurt was in de racejob (eerlijke volgorde, los van de
--    ZRS-historie, die `attempted_at` gebruikt).

alter table public.zwift_race_scores
  add column if not exists zwift_event_id bigint check (zwift_event_id is null or zwift_event_id > 0),
  add column if not exists event_name text,
  add column if not exists event_looked_up_at timestamptz;

create index if not exists zwift_race_scores_rider_raced_idx
  on public.zwift_race_scores (zwift_id, raced_at desc);

alter table public.zwift_race_score_sync
  add column if not exists listed_until timestamptz,
  add column if not exists races_checked_at timestamptz;
