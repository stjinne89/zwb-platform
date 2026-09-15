-- Krachtreeksen in het core- en mobiliteitsspoor (wens 19 uit het plannenboek).
--
-- Een lid vroeg om krachttraining naast core, gericht op doelen als klimmen. De
-- eigenaar koos om die in dit spoor te zetten en níét in het fietsschema: net als
-- core telt een krachtsessie niet mee in TSS, CTL of naleving (zie 0109).
--
-- Deze migratie verruimt alleen de toegestane waarden; de inhoud staat in 0160.
-- De code kan vóór of na deze migratie live: zonder deze waarden bestaan er
-- simpelweg geen krachtoefeningen of -series.

alter table public.mobility_exercises
  drop constraint if exists mobility_exercises_category_check;
alter table public.mobility_exercises
  add constraint mobility_exercises_category_check
  check (category in ('core', 'mobiliteit', 'activatie', 'kracht'));

alter table public.mobility_exercises
  drop constraint if exists mobility_exercises_region_check;
alter table public.mobility_exercises
  add constraint mobility_exercises_region_check
  check (region in ('lumbaal', 'heup', 'thoracaal', 'schouder', 'enkel', 'been'));

alter table public.mobility_series
  drop constraint if exists mobility_series_goal_check;
alter table public.mobility_series
  add constraint mobility_series_goal_check
  check (goal in ('stabiliteit', 'mobiliteit', 'houding', 'kracht'));

notify pgrst, 'reload schema';

-- Verificatie (na het draaien):
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conname in ('mobility_exercises_category_check',
--                     'mobility_exercises_region_check',
--                     'mobility_series_goal_check');
