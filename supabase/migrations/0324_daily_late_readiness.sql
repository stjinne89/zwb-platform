-- Late herkansing op de readiness van vandaag, naast het ochtendvoorstel.
--
-- Whoop en Polar zetten de meting van de nacht pas na het wakker worden door
-- naar intervals.icu, vaak na acht uur. Het dagvoorstel gaat om negen uur in elk
-- geval uit; van 6 tot en met 9 november 2026 had het die meting bij geen van de
-- Whoop-leden. De cron zet daarom later op de dag hooguit één extra dagvoorstel
-- uit, als de meting alsnog binnenkomt en laag is (zie
-- src/lib/training/late-readiness.ts).
--
-- De unieke index uit 0153 staat één dagvoorstel per schema per dag toe en
-- weigerde die tweede. Nu telt `late_readiness` mee in de sleutel: één gewoon
-- voorstel en één late herkansing per schema per dag. Twee overlappende runs
-- houdt de index nog steeds uit elkaar.
--
-- Volgorde: kan vóór of na de code. Zonder deze migratie stuurt de code de
-- kolom alleen bij de herkansing mee; PostgREST weigert die insert, de cron meldt
-- `late_readiness_unavailable` en het gewone voorstel werkt zoals voorheen.

alter table public.training_ai_generations
  add column if not exists late_readiness boolean not null default false;

drop index if exists public.training_ai_generations_one_daily_per_plan_day;

create unique index if not exists training_ai_generations_one_daily_per_plan_day
  on public.training_ai_generations (parent_plan_id, adapt_from_date, late_readiness)
  where adaptation_kind = 'daily'
    and adapt_from_date >= date '2026-09-14';

-- Verificatie (handmatig, na uitvoeren):
--
-- 1. De kolom en de nieuwe index bestaan:
--    select column_name, data_type, column_default from information_schema.columns
--    where table_name = 'training_ai_generations' and column_name = 'late_readiness';
--    select indexdef from pg_indexes
--    where indexname = 'training_ai_generations_one_daily_per_plan_day';
--
-- 2. Hooguit één gewoon voorstel en één herkansing per schema per dag (moet leeg zijn):
--    select parent_plan_id, adapt_from_date, late_readiness, count(*)
--    from public.training_ai_generations
--    where adaptation_kind = 'daily' and adapt_from_date >= date '2026-09-14'
--    group by 1, 2, 3 having count(*) > 1;
