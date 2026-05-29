-- Strava-segmenttijden voor cols. We bewaren de snelste effort-tijd per
-- (profiel, col) zodat /profiel/cols PR-tijden + tijd-rankings kan tonen en
-- de tijd-gebaseerde badge-tiers (A083 sub-75/sub-60) auto-detecteerbaar zijn.

alter table public.profile_climbed_cols
  add column if not exists best_time_seconds int,
  add column if not exists best_time_activity_id bigint,
  add column if not exists best_time_at timestamptz;

-- Cache-marker: welke activities we al op detailed segment-efforts hebben
-- bevraagd (Strava /activities/{id}?include_all_efforts=true). Voorkomt
-- herhaald fetchen binnen de rate-limit.
alter table public.strava_activities
  add column if not exists efforts_fetched_at timestamptz;
