-- Jaarplanning: reisdagen binnen een trainingskamp.
--
-- De heen- of terugreis valt meestal op de eerste of laatste dag van het kamp.
-- Zonder markering plande het schema daar een volle kampdag. Een reisdag is een
-- dag binnen het kamp waarop het lid niet kan trainen; de planner laat hem leeg
-- en het kampvolume van die week gaat er evenredig door omlaag.

alter table public.training_season_periods
  add column if not exists travel_days date[] not null default '{}';

notify pgrst, 'reload schema';
