-- Generic ZWB Segments layer.
--
-- Legacy cols remain the source for col badges. This layer broadens the
-- collection with flat Zwift segments, Benelux segments discovered from ZWB
-- rides, and curated European candidates.

create table if not exists public.zwb_segments (
  slug text primary key,
  name text not null,
  collection text not null check (
    collection in ('cols', 'zwift_flat', 'benelux_popular', 'europe_flat')
  ),
  country text,
  region text,
  virtual boolean not null default false,
  distance_m numeric,
  elevation_gain_m numeric,
  category text,
  strava_segment_id bigint unique,
  legacy_col_slug text references public.cols(slug) on delete set null,
  active boolean not null default true,
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zwb_segments_collection_idx
  on public.zwb_segments (collection, active);
create index if not exists zwb_segments_country_idx
  on public.zwb_segments (country);

create table if not exists public.profile_completed_segments (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  segment_slug text not null references public.zwb_segments(slug) on delete cascade,
  first_activity_id bigint references public.strava_activities(id) on delete set null,
  first_completed_at timestamptz not null,
  last_activity_id bigint references public.strava_activities(id) on delete set null,
  last_completed_at timestamptz,
  times_completed int not null default 1,
  best_time_seconds int,
  best_time_activity_id bigint references public.strava_activities(id) on delete set null,
  best_time_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (profile_id, segment_slug)
);

create index if not exists profile_completed_segments_profile_idx
  on public.profile_completed_segments (profile_id);
create index if not exists profile_completed_segments_segment_idx
  on public.profile_completed_segments (segment_slug);
create index if not exists profile_completed_segments_best_time_idx
  on public.profile_completed_segments (segment_slug, best_time_seconds);

create table if not exists public.strava_activity_segment_efforts (
  effort_uid text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  activity_id bigint not null references public.strava_activities(id) on delete cascade,
  strava_segment_id bigint not null,
  segment_name text,
  elapsed_time_seconds int,
  moving_time_seconds int,
  distance_m numeric,
  elevation_gain_m numeric,
  average_grade numeric,
  start_lat numeric(9, 6),
  start_lon numeric(9, 6),
  end_lat numeric(9, 6),
  end_lon numeric(9, 6),
  started_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists strava_activity_segment_efforts_profile_idx
  on public.strava_activity_segment_efforts (profile_id);
create index if not exists strava_activity_segment_efforts_activity_idx
  on public.strava_activity_segment_efforts (activity_id);
create index if not exists strava_activity_segment_efforts_segment_idx
  on public.strava_activity_segment_efforts (strava_segment_id);

alter table public.zwb_segments enable row level security;
alter table public.profile_completed_segments enable row level security;
alter table public.strava_activity_segment_efforts enable row level security;

drop policy if exists "zwb_segments_members_read" on public.zwb_segments;
create policy "zwb_segments_members_read" on public.zwb_segments
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

drop policy if exists "profile_completed_segments_members_read" on public.profile_completed_segments;
create policy "profile_completed_segments_members_read" on public.profile_completed_segments
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

drop policy if exists "strava_activity_segment_efforts_members_read" on public.strava_activity_segment_efforts;
create policy "strava_activity_segment_efforts_members_read" on public.strava_activity_segment_efforts
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

delete from public.zwb_segments
where slug in (
  'europe-box-hill',
  'europe-coll-de-rates',
  'europe-mount-teide',
  'europe-angliru',
  'europe-lagos-de-covadonga',
  'europe-monte-zoncolan',
  'europe-tre-cime-di-lavaredo',
  'europe-passo-sella',
  'europe-passo-fedaia',
  'europe-passo-giau'
);

insert into public.zwb_segments (
  slug,
  name,
  collection,
  country,
  region,
  virtual,
  elevation_gain_m,
  category,
  strava_segment_id,
  legacy_col_slug,
  active,
  source,
  metadata
)
select
  c.slug,
  c.name,
  'cols',
  c.country,
  c.region,
  coalesce(c.virtual, false),
  c.ascent_m,
  c.category,
  c.strava_segment_id,
  c.slug,
  true,
  'legacy_cols',
  jsonb_build_object(
    'summit_lat', c.summit_lat,
    'summit_lon', c.summit_lon,
    'summit_elevation_m', c.summit_elevation_m,
    'detection_radius_m', c.detection_radius_m
  )
from public.cols c
on conflict (slug) do update set
  name = excluded.name,
  collection = excluded.collection,
  country = excluded.country,
  region = excluded.region,
  virtual = excluded.virtual,
  elevation_gain_m = excluded.elevation_gain_m,
  category = excluded.category,
  strava_segment_id = excluded.strava_segment_id,
  legacy_col_slug = excluded.legacy_col_slug,
  active = excluded.active,
  source = excluded.source,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.profile_completed_segments (
  profile_id,
  segment_slug,
  first_activity_id,
  first_completed_at,
  last_activity_id,
  last_completed_at,
  times_completed,
  best_time_seconds,
  best_time_activity_id,
  best_time_at,
  updated_at
)
select
  profile_id,
  col_slug,
  first_activity_id,
  first_climbed_at,
  last_activity_id,
  last_climbed_at,
  times_climbed,
  best_time_seconds,
  best_time_activity_id,
  best_time_at,
  updated_at
from public.profile_climbed_cols
on conflict (profile_id, segment_slug) do update set
  first_activity_id = excluded.first_activity_id,
  first_completed_at = excluded.first_completed_at,
  last_activity_id = excluded.last_activity_id,
  last_completed_at = excluded.last_completed_at,
  times_completed = excluded.times_completed,
  best_time_seconds = excluded.best_time_seconds,
  best_time_activity_id = excluded.best_time_activity_id,
  best_time_at = excluded.best_time_at,
  updated_at = excluded.updated_at;

insert into public.zwb_segments (
  slug,
  name,
  collection,
  country,
  region,
  virtual,
  distance_m,
  elevation_gain_m,
  category,
  strava_segment_id,
  active,
  source,
  metadata
)
values
  ('zwift-fuego-flats', 'Fuego Flats', 'zwift_flat', 'ZW', 'Watopia', true, 496, 0, 'sprint', 20350107, true, 'zwift-data', '{"world":"watopia"}'::jsonb),
  ('zwift-watopia-sprint', 'Watopia Sprint', 'zwift_flat', 'ZW', 'Watopia', true, 360, 0, 'sprint', 12109305, true, 'zwift-data', '{"world":"watopia"}'::jsonb),
  ('zwift-volcano-circuit', 'Volcano Circuit', 'zwift_flat', 'ZW', 'Watopia', true, 4200, 0, 'segment', 14032406, true, 'zwift-data', '{"world":"watopia"}'::jsonb),
  ('zwift-crit-city', 'Crit City', 'zwift_flat', 'ZW', 'Crit City', true, 1950, 0, 'segment', 22445564, true, 'zwift-data', '{"world":"crit-city"}'::jsonb),
  ('zwift-richmond-sprint', 'Richmond Sprint', 'zwift_flat', 'ZW', 'Richmond', true, 221, 0, 'sprint', 12128762, true, 'zwift-data', '{"world":"richmond"}'::jsonb),
  ('zwift-broad-st', 'Broad St.', 'zwift_flat', 'ZW', 'Richmond', true, 283, 0, 'sprint', 12128880, true, 'zwift-data', '{"world":"richmond"}'::jsonb),
  ('zwift-london-sprint', 'London Sprint', 'zwift_flat', 'ZW', 'London', true, 200, 0, 'sprint', 12749402, true, 'zwift-data', '{"world":"london"}'::jsonb),
  ('zwift-champs-elysees', 'Champs Elysees', 'zwift_flat', 'ZW', 'Paris', true, 6620, 0, 'segment', 24674235, true, 'zwift-data', '{"world":"paris"}'::jsonb),
  ('zwift-railway-sprint', 'Railway Sprint', 'zwift_flat', 'ZW', 'Makuri Islands', true, 490, 0, 'sprint', 30412927, true, 'zwift-data', '{"world":"makuri-islands"}'::jsonb),
  ('zwift-alley-sprint', 'Alley Sprint', 'zwift_flat', 'ZW', 'Makuri Islands', true, 480, 0, 'sprint', 30412916, true, 'zwift-data', '{"world":"makuri-islands"}'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  collection = excluded.collection,
  country = excluded.country,
  region = excluded.region,
  virtual = excluded.virtual,
  distance_m = excluded.distance_m,
  elevation_gain_m = excluded.elevation_gain_m,
  category = excluded.category,
  strava_segment_id = excluded.strava_segment_id,
  active = excluded.active,
  source = excluded.source,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.zwb_segments (
  slug,
  name,
  collection,
  country,
  region,
  active,
  source,
  metadata
)
values
  ('europe-champs-elysees', 'Champs-Elysees', 'europe_flat', 'FR', 'Paris', true, 'curated-flat-candidate', '{"search":"Champs Elysees sprint cycling","bounds":[[48.85,2.28],[48.89,2.34]]}'::jsonb),
  ('europe-roubaix-velodrome', 'Roubaix Velodrome', 'europe_flat', 'FR', 'Roubaix', true, 'curated-flat-candidate', '{"search":"Roubaix Velodrome cycling","bounds":[[50.66,3.16],[50.70,3.20]]}'::jsonb),
  ('europe-trouee-d-arenberg', 'Trouee d Arenberg', 'europe_flat', 'FR', 'Nord', true, 'curated-flat-candidate', '{"search":"Trouee d Arenberg cycling","bounds":[[50.36,3.39],[50.42,3.46]]}'::jsonb),
  ('europe-carrefour-de-l-arbre', 'Carrefour de l Arbre', 'europe_flat', 'FR', 'Nord', true, 'curated-flat-candidate', '{"search":"Carrefour de l Arbre cycling","bounds":[[50.57,3.30],[50.62,3.37]]}'::jsonb),
  ('europe-via-roma-sprint', 'Via Roma Sprint', 'europe_flat', 'IT', 'Sanremo', true, 'curated-flat-candidate', '{"search":"Via Roma sprint cycling","bounds":[[43.80,7.75],[43.83,7.80]]}'::jsonb),
  ('europe-promenade-des-anglais', 'Promenade des Anglais', 'europe_flat', 'FR', 'Nice', true, 'curated-flat-candidate', '{"search":"Promenade des Anglais cycling","bounds":[[43.68,7.20],[43.71,7.28]]}'::jsonb),
  ('europe-playa-de-palma', 'Playa de Palma', 'europe_flat', 'ES', 'Mallorca', true, 'curated-flat-candidate', '{"search":"Playa de Palma cycling","bounds":[[39.50,2.70],[39.56,2.80]]}'::jsonb),
  ('europe-tempelhofer-feld', 'Tempelhofer Feld', 'europe_flat', 'DE', 'Berlin', true, 'curated-flat-candidate', '{"search":"Tempelhofer Feld cycling","bounds":[[52.46,13.38],[52.50,13.43]]}'::jsonb),
  ('europe-amager-strandpark', 'Amager Strandpark', 'europe_flat', 'DK', 'Copenhagen', true, 'curated-flat-candidate', '{"search":"Amager Strandpark cycling","bounds":[[55.64,12.62],[55.68,12.67]]}'::jsonb),
  ('europe-the-mall-sprint', 'The Mall Sprint', 'europe_flat', 'GB', 'London', true, 'curated-flat-candidate', '{"search":"The Mall sprint cycling London","bounds":[[51.50,-0.15],[51.52,-0.12]]}'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  collection = excluded.collection,
  country = excluded.country,
  region = excluded.region,
  active = excluded.active,
  source = excluded.source,
  metadata = excluded.metadata,
  updated_at = now();
