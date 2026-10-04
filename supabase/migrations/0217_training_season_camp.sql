-- Jaarplanning: een trainingskamp als derde soort periode.
--
-- 'rust' en 'rustig' zeggen dat het lid niet of minder traint. Een trainingskamp
-- is het omgekeerde: een week waarin het volume bewust ver boven normaal gaat.
-- Zonder eigen soort kon een lid dat alleen als notitie kwijt en plande het
-- schema er gewoon doorheen, met het gewone weekplafond.

alter table public.training_season_periods
  drop constraint if exists training_season_periods_kind_check;

alter table public.training_season_periods
  add constraint training_season_periods_kind_check
  check (kind in ('rust', 'rustig', 'kamp'));

notify pgrst, 'reload schema';
