-- Club Ladder: favoriete parcoursen per team en ladderuitslagen voor het
-- route-advies (2026-11-02).
--
-- Vraag eigenaar: per ladderteam een pagina met de uitdaagbare teams, een lijst
-- favoriete parcoursen (uit alle Zwift-routes die aan de ladderregel voldoen,
-- aan te merken door captains) en een route-advies per tegenstander.
--
-- * club_ladder_favorite_routes: favoriet per route (zwift-data slug), niet per
--   rondental; de pagina toont de rondes die binnen 15–25 km vallen.
-- * club_ladder_matches: de uitslagentab van ladder.cycleracing.club/summary
--   toont alleen de laatste week. De sync bewaart elke wedstrijd, zodat er een
--   geschiedenis per team ontstaat. Sleutel is het ID van de openbare
--   uitslagpagina (/public/result/<id>).
-- * club_ladder_match_riders: de renners van een wedstrijd, van die openbare
--   uitslagpagina, aangevuld met Zwift-ID, gewicht, ZRS en het beste vermogen
--   over 15 s, 1, 5 en 20 minuten uit de Zwift-uitslag van hetzelfde event.
--   Alleen opgehaald voor teams die iemand analyseert.
-- * Alleen de server leest en schrijft: RLS aan zonder policies, zoals de
--   andere laddertabellen (0285, 0290, 0291).
--
-- Startvulling: de 14 routes uit de sheet "Zwiftladies ladder parcours" van de
-- eigenaar als favoriet bij ZWBeauties en ZWBandits (op naam; beide bestaan
-- sinds 0295). Opnieuw draaien doet niets.

create table if not exists public.club_ladder_favorite_routes (
  team_id uuid not null references public.teams(id) on delete cascade,
  route_slug text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (team_id, route_slug)
);

create table if not exists public.club_ladder_matches (
  result_id integer primary key,
  raced_on date not null,
  raced_at time not null,
  route_name text,
  route_slug text,
  challenger text not null,
  challenger_score integer not null,
  opponent text not null,
  opponent_score integer not null,
  stage text,
  zwift_event_id bigint,
  first_seen_at timestamptz not null default now(),
  riders_fetched_at timestamptz
);

create index if not exists club_ladder_matches_raced_on_idx on public.club_ladder_matches (raced_on desc);

create table if not exists public.club_ladder_match_riders (
  result_id integer not null references public.club_ladder_matches(result_id) on delete cascade,
  position integer not null,
  name text not null,
  team text not null,
  points integer not null,
  time_s numeric,
  avg_wkg numeric,
  zwift_id bigint,
  weight_kg numeric,
  racing_score numeric,
  -- {s15, m1, m5, m20} in W/kg, uit criticalP van de Zwift-uitslag.
  power_wkg jsonb,
  primary key (result_id, position)
);

alter table public.club_ladder_favorite_routes enable row level security;
alter table public.club_ladder_matches enable row level security;
alter table public.club_ladder_match_riders enable row level security;

insert into public.club_ladder_favorite_routes (team_id, route_slug)
select t.id, r.slug
from public.teams t
cross join (values
  ('the-highline'),
  ('neokyo-all-nighter'),
  ('castle-to-castle'),
  ('countryside-tour'),
  ('flat-route-rev'),
  ('sukis-playground'),
  ('handful-of-gravel'),
  ('castle-crit'),
  ('loop-de-loop'),
  ('rolling-highlands'),
  ('the-classic'),
  ('loopin-lava'),
  ('cobbled-climbs'),
  ('queens-highway-after-party')
) as r(slug)
where t.type = 'ladder' and t.name in ('ZWBeauties', 'ZWBandits')
on conflict do nothing;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select t.name, count(*) from public.club_ladder_favorite_routes f
--   join public.teams t on t.id = f.team_id group by t.name;
--   -- ZWBandits 14, ZWBeauties 14
-- select count(*) from pg_policies
--   where tablename in ('club_ladder_favorite_routes', 'club_ladder_matches', 'club_ladder_match_riders');
--   -- 0
