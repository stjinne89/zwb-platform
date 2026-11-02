-- Club Ladder: geplande wedstrijden als event in de kalender (2026-11-02).
--
-- Vraag eigenaar: de wedstrijden van ladder.cycleracing.club/summary scannen,
-- er een event van maken en de renners die de captain opstelt aan dat event
-- koppelen. De team-results-sync maakt per wedstrijd van een ZWB-ladderteam een
-- event van type 'ladder' en vindt het terug op het wedstrijdnummer van de
-- ladder (/fixture/<id>).
--
-- Eén event per wedstrijd per team: spelen twee ZWB-teams tegen elkaar, dan
-- krijgt elk team zijn eigen event met zijn eigen opstelling.
--
-- De opstelling staat in team_event_lineups (parent_team_id = team_id, het
-- ladderteam heeft geen hoofdteam), dus deze migratie voegt alleen de koppeling
-- toe.

alter table public.events
  add column if not exists club_ladder_fixture_id integer;

create unique index if not exists events_club_ladder_fixture_team
  on public.events (club_ladder_fixture_id, team_id)
  where club_ladder_fixture_id is not null;
