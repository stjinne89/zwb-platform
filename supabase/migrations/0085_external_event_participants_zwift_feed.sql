-- Sta 'zwift_feed' toe als deelnemerbron: events (ook niet-club) waar ZWB'ers
-- zich op inschrijven, ontdekt via de member-feed + entrants-endpoint.

alter table public.external_event_participants
  drop constraint if exists external_event_participants_source_check;

alter table public.external_event_participants
  add constraint external_event_participants_source_check
  check (source in ('zwiftpower_text', 'manual', 'zwift_club', 'zwift_feed'));
