-- Sta 'zwift_club' toe als deelnemerbron, zodat de geautoriseerde Zwift-club-sync
-- ZWB-deelnemers automatisch kan koppelen naast de handmatige bulk-invoer.

alter table public.external_event_participants
  drop constraint if exists external_event_participants_source_check;

alter table public.external_event_participants
  add constraint external_event_participants_source_check
  check (source in ('zwiftpower_text', 'manual', 'zwift_club'));
