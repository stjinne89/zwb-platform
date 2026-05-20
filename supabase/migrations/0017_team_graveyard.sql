-- WTRL Club Ladder kent een "graveyard" voor teams die niet meer actief
-- meedoen aan de huidige rondes. Markeer dat zichtbaar op het platform.

alter table public.teams
  add column if not exists is_graveyard boolean not null default false;

-- Initieel: alle ladder-teams staan in de graveyard.
-- (Admin kan later individuele teams weer activeren via de UI.)
update public.teams
set is_graveyard = true
where type = 'ladder'
  and is_graveyard = false;

create index if not exists teams_graveyard_idx
  on public.teams (is_graveyard);
