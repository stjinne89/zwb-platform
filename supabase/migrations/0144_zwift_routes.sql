-- Routebibliotheek voor Zwift: één rij per Zwift-route, met het hoogteprofiel en
-- de vorm.
--
-- Waarom deze tabel bestaat: voor een pacingplan is een hoogteprofiel nodig, en
-- bij een Zwift-event is er geen .gpx die een lid kan uploaden. De publieke
-- Zwift-event-API geeft wél een `routeId`, en die is via de `zwift-data`-package
-- te vertalen naar een route met een Strava-segment-ID. Uit de streams van dat
-- segment leiden we het profiel en de routevorm af — één keer per route, want
-- Watopia is voor iedereen gelijk. Daarna is er geen API-verkeer meer per lid.
-- De spike die dit bewees staat in docs/zwift-routeprofiel-spike.md.
--
-- Wat hier NIET in staat: naam, afstand, hoogtemeters en de klim-/sprintsegmenten
-- van een route komen uit de `zwift-data`-package en worden daar gelezen, niet
-- gekopieerd. Alleen wat we zelf moeten ophalen (profiel, vorm) staat hier, plus
-- genoeg identificatie om een rij zonder de package te kunnen tonen.

create table if not exists public.zwift_routes (
  -- Gelijk aan `routeId` uit de publieke Zwift-event-API en aan `id` in zwift-data.
  route_id bigint primary key,
  slug text not null,
  name text not null,
  world text,
  strava_segment_id bigint,

  -- Hoogteprofiel op een vast raster van 25 m, al gesmoothd (80 m-venster,
  -- gelijk aan route-sample.ts): {"distanceM": [...], "altitudeM": [...]}.
  profile jsonb,
  -- Routevorm op 100 m voor de SVG-plattegrond: {"lat": [...], "lon": [...]}.
  -- Zwift-coördinaten zijn virtueel; hier hoort geen kaartlaag bij.
  shape jsonb,
  -- Waar het profiel vandaan komt, zodat een latere bron te onderscheiden is.
  profile_source text check (profile_source in ('strava_segment')),

  -- Afstand en hoogtemeters zoals afgeleid uit de stream. Bewust náást de
  -- waarden uit zwift-data bewaard: wijkt het af, dan is dat zichtbaar in beheer
  -- in plaats van stil verwerkt in een pacingplan.
  profile_distance_m numeric(9, 1),
  profile_elevation_m numeric(7, 1),

  synced_at timestamptz,
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zwift_routes_slug_idx on public.zwift_routes (slug);
create index if not exists zwift_routes_synced_idx
  on public.zwift_routes (synced_at nulls first);

-- ──────────────────────────────────────────────────────────────────────
-- RLS — elk ingelogd lid leest de bibliotheek (het pacingplan van een lid
-- heeft het profiel nodig); schrijven gebeurt uitsluitend via de service-role
-- admin-client na een permissiecheck in de server action, zoals bij
-- event_climbs en event_results.
-- ──────────────────────────────────────────────────────────────────────

alter table public.zwift_routes enable row level security;

drop policy if exists "zwift_routes_read" on public.zwift_routes;
create policy "zwift_routes_read" on public.zwift_routes
  for select to authenticated
  using (true);
