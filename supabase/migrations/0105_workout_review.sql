-- Na een gereden workout krijgt het lid een scherm met de kerncijfers, vult RPE
-- en gevoel in en bevestigt; daarna komt het bij de trainer terecht.
--
-- Daarvoor missen drie dingen:
--
-- 1. Hartslag en cadans. intervals.icu levert ze wel, maar toRow() liet ze
--    liggen. Ze staan al in de bewaarde `raw`, dus we vullen de nieuwe kolommen
--    meteen daaruit — anders zou het scherm pas na de volgende sync iets tonen.
-- 2. Een snapshot van de meetwaarden bij de workout. CTL en de gereedscore
--    worden nergens bewaard en komen per request live uit intervals.icu; zonder
--    snapshot verandert het scherm elke keer dat je het opent en klopt "CTL
--    hiervoor" niet meer.
-- 3. Een bevestig- en beoordeelmoment. athlete_confirmed_at is het signaal voor
--    de trainer; trainer_reviewed_at/trainer_status sluiten de lus.

alter table public.intervals_activities
  add column if not exists average_hr numeric,
  add column if not exists max_hr numeric,
  add column if not exists average_cadence numeric;

update public.intervals_activities
set
  average_hr = coalesce(average_hr, nullif((raw ->> 'average_heartrate')::numeric, 0)),
  max_hr = coalesce(max_hr, nullif((raw ->> 'max_heartrate')::numeric, 0)),
  average_cadence = coalesce(average_cadence, nullif((raw ->> 'average_cadence')::numeric, 0))
where raw ? 'average_heartrate'
   or raw ? 'max_heartrate'
   or raw ? 'average_cadence';

alter table public.training_workout_reports
  -- Momentopname van de rit: TSS, IF, NP, gemiddelden, CTL voor/na en de
  -- gereedscore. Bewust jsonb: welke velden beschikbaar zijn hangt af van de
  -- meter van het lid, en een lege kolom per ontbrekende meting helpt niemand.
  add column if not exists metrics_json jsonb not null default '{}'::jsonb,
  add column if not exists athlete_confirmed_at timestamptz,
  add column if not exists trainer_reviewed_at timestamptz,
  add column if not exists trainer_status text
    check (trainer_status is null or trainer_status in ('approved', 'adjusted'));

-- De beoordelingsrij van de trainer zoekt op "wel bevestigd, nog niet
-- beoordeeld"; dat is een kleine deelverzameling van alle rapportages.
create index if not exists training_workout_reports_pending_review_idx
  on public.training_workout_reports (trainer_id, athlete_confirmed_at)
  where athlete_confirmed_at is not null and trainer_reviewed_at is null;

alter table public.notification_preferences
  add column if not exists on_workout_review boolean not null default true;

notify pgrst, 'reload schema';
