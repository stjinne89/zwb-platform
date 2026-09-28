-- Vermogen, cadans, hartslag en afstand bij live-posities.
--
-- Garmin en Wahoo sturen naast de positie ook sensordata mee. Op Samen
-- fietsen ziet een lid die waarden als hij op een actieve renner klikt.
-- Alleen voor ingelogde leden: de publieke eventticker selecteert deze kolommen
-- niet (src/lib/live/event-snapshot.ts).
--
-- Hartslag is een gezondheidsgegeven. Hij wordt alleen opgeslagen als het lid
-- dat zelf aanzet op Samen fietsen; profiles.live_heart_rate_consent_at is die
-- toestemming, met het moment. Uitzetten wist de opgeslagen hartslag van dat
-- lid (src/app/(app)/live/_actions.ts).

alter table public.live_positions
  add column if not exists power_w smallint check (power_w is null or power_w between 0 and 3000),
  add column if not exists cadence_rpm smallint check (cadence_rpm is null or cadence_rpm between 0 and 255),
  add column if not exists heart_rate smallint check (heart_rate is null or heart_rate between 20 and 255),
  add column if not exists distance_m integer check (distance_m is null or distance_m >= 0);

alter table public.profiles
  add column if not exists live_heart_rate_consent_at timestamptz;

notify pgrst, 'reload schema';
