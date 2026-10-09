-- Goed doel als derde soort naast training en social (wens van de eigenaar,
-- 2026-10-09): waarom de rit er is, los van de categorie. Nog steeds hooguit
-- één soort per event.

alter table public.events
  drop constraint if exists events_kind_check;

alter table public.events
  add constraint events_kind_check
  check (kind is null or kind in ('training', 'social', 'goed_doel'));
