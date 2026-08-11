-- De trainingsplanner kreeg tot nu toe élk aankomend clubevent mee, zonder te
-- kijken of het lid zich had opgegeven. Daardoor verscheen een clubrit als
-- geplande sessie in het schema van iemand die er niet heen ging.
--
-- Voortaan telt alleen een event waar het lid 'ja' op heeft staan. Zo'n toezegging
-- wordt een vast blok in het schema, net als een zelf ingeplande rit — vandaar
-- 'event' als nieuwe origin. event_id houdt de koppeling vast, zodat we weten
-- welk blok bij welk event hoort en hetzelfde event niet twee keer inplannen.

alter table public.training_workouts
  drop constraint if exists training_workouts_origin_check;
alter table public.training_workouts
  add constraint training_workouts_origin_check
    check (origin in ('ai', 'member', 'trainer', 'event'));

alter table public.training_workouts
  add column if not exists event_id uuid
    references public.events(id) on delete set null;

-- Eén blok per event per lid; een tweede 'ja' mag geen dubbele sessie opleveren.
create unique index if not exists training_workouts_event_unique
  on public.training_workouts (profile_id, event_id)
  where event_id is not null and superseded_at is null;

-- De keuzemodule en het herplannen zoeken de vaste blokken van een lid op datum.
drop index if exists training_workouts_member_origin_idx;
create index if not exists training_workouts_fixed_idx
  on public.training_workouts (profile_id, scheduled_at)
  where origin in ('member', 'event') and superseded_at is null;

notify pgrst, 'reload schema';
