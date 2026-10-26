-- Ritvoeding, stap 4 (docs/ritvoeding-plan.md): de darmtraining bepaalt het
-- plafond voor eten onderweg.
--
-- Wie de darmtraining afrondde, kan zelf kiezen voor 120 g koolhydraten per uur
-- als bovenkant bij ritten vanaf 2,5 uur. Standaard uit: boven 90 g per uur
-- nooit als standaard (besluit 4). De app toont de schakelaar alleen na een
-- afgeronde darmtraining en rekent er ook alleen dan mee
-- (src/lib/nutrition/gut-training.ts).
--
-- Dezelfde tabel als lengte en gezin, met dezelfde RLS (alleen het lid zelf).
-- Zit al in de gegevensexport (select * op nutrition_profiles).

alter table public.nutrition_profiles
  add column if not exists ride_carbs_120 boolean not null default false;
