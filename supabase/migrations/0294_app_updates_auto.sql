-- De app-update van elke week vanzelf uit PLAN.md (wens eigenaar, 2026-10-30:
-- "Ik wil dit nooit zelf schrijven"). Zie src/lib/app-updates/auto.ts.
--
-- * Claude maakt de update in een achtergrondopdracht, net als schema's en
--   pacingplannen; ai_jobs krijgt daarvoor de soort 'app_updates'. De invoer is
--   PLAN.md, geen ledendata.
-- * Krachttraining uit intervals.icu (0292) is op 28 oktober gebouwd maar pas
--   op 30 oktober live gegaan. De automatische update van week 45 kijkt naar de
--   bouwdatum en slaat hem dus over; daarom hier alsnog bij week 44.

alter table public.ai_jobs drop constraint if exists ai_jobs_feature_check;
alter table public.ai_jobs add constraint ai_jobs_feature_check
  check (feature in ('training', 'coach', 'pacing', 'nutrition', 'app_updates'));

update public.app_updates
set changes = changes || array['Krachttraining uit intervals.icu telt mee in je week; tik op het figuur aan welke spieren je trainde.'],
    updated_at = now()
where week_start = '2026-10-26'
  and not ('Krachttraining uit intervals.icu telt mee in je week; tik op het figuur aan welke spieren je trainde.' = any (changes))
  and cardinality(changes) + cardinality(fixes) < 30;
