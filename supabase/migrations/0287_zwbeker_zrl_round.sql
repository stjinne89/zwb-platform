-- ZWBekers: een beker voor een hele ZRL-ronde (wens eigenaar, 2026-10-28).
--
-- Een beker hing aan hooguit één event. Een ZRL-prestatie (promotie, de ronde
-- winnen) beslaat zes raceweken, dus geen enkel event dekt hem. Een ronde is in
-- de database geen rij maar een titelpatroon van de hoofdevents per raceweek
-- ("ZRL 2026/27 · R1 · W1", zie 0178); de beker bewaart daarom de ronde zelf als
-- "2026/27 R1". Zo blijft hij kloppen als raceweken later worden opgeruimd.
--
-- Een beker hangt aan een event of aan een ronde, niet aan allebei.

alter table public.zwbekers
  add column if not exists zrl_round text;

alter table public.zwbekers
  drop constraint if exists zwbekers_zrl_round_format;
alter table public.zwbekers
  add constraint zwbekers_zrl_round_format
    check (zrl_round is null or zrl_round ~ '^[0-9]{4}/[0-9]{2} R[1-4]$');

alter table public.zwbekers
  drop constraint if exists zwbekers_event_or_round;
alter table public.zwbekers
  add constraint zwbekers_event_or_round
    check (event_id is null or zrl_round is null);

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select column_name from information_schema.columns
--  where table_name = 'zwbekers' and column_name = 'zrl_round';           -- één rij
-- select conname from pg_constraint
--  where conname in ('zwbekers_zrl_round_format', 'zwbekers_event_or_round'); -- twee rijen
