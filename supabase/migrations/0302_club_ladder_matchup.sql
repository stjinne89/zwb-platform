-- Club Ladder: matchup op de eventpagina (2026-11-02).
--
-- Vraag eigenaar: op het event van een ladderwedstrijd het ZWB-team en de
-- tegenstander naast elkaar, met de vermogens tegen elkaar afgezet. Daarvoor
-- moet het event weten wie de tegenstander is, en de opstelling van beide
-- kanten (tot nu bewaarde de sync alleen de eigen renners, in
-- team_event_lineups).
--
-- club_ladder_opponent: de ladder-naam van de tegenstander, uit de summary
-- (openbaar), dus ook zonder LADDER_COOKIE.
--
-- club_ladder_fixture_signups: wie zich op de wedstrijdpagina (/fixture/<id>,
-- achter login) heeft aangemeld, voor beide ploegen, met de startplek die de
-- captain gaf. Zwift-ID's van renners buiten ZWB: RLS aan zonder policies, net
-- als club_ladder_match_riders; de eventpagina leest via de admin-client.

alter table public.events
  add column if not exists club_ladder_opponent text;

create table if not exists public.club_ladder_fixture_signups (
  fixture_id integer not null,
  zwift_id bigint not null,
  team text not null,
  name text not null,
  position integer,
  updated_at timestamptz not null default now(),
  primary key (fixture_id, zwift_id)
);

alter table public.club_ladder_fixture_signups enable row level security;
