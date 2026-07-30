-- Een schema-aanpassing maakt een NIEUW plan (met parent_plan_id) en pusht de
-- nieuwe workouts naar intervals.icu. De oude workout van diezelfde dag bleef
-- daar staan, waardoor een lid twee trainingen op één dag zag.
--
-- Vandaar deze twee kolommen: bij het publiceren van een plan markeren we de
-- workouts van ándere plannen op dezelfde datums als vervangen, verwijderen we
-- hun intervals.icu-event, en filteren we ze uit de weergaven. Bewust geen
-- delete: zo blijft zichtbaar wat er oorspronkelijk gepland stond.
--
-- Niet via status: 'skipped' betekent in de UI "rustdag genomen", en dat is iets
-- anders dan "vervangen door een aanpassing".

alter table public.training_workouts
  add column if not exists superseded_at timestamptz;

alter table public.training_workouts
  add column if not exists superseded_by_plan_id uuid
    references public.training_plans(id) on delete set null;

-- Weergavequeries filteren op superseded_at is null binnen een profiel/datum.
create index if not exists training_workouts_profile_active_idx
  on public.training_workouts (profile_id, scheduled_at)
  where superseded_at is null;

notify pgrst, 'reload schema';
