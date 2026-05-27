-- Col-database voor auto-detection van col-badges (A013-A019, A095).
--
-- Werking: voor elke Strava-activity decoderen we de summary_polyline en
-- checken of er minstens één punt binnen 'detection_radius_m' van een
-- col-summit ligt. Zo ja → match → upsert in profile_climbed_cols → een
-- col-badge-evaluator kan deze info gebruiken.
--
-- Curated lijst, geen volledige col-database — focus op cols die voor
-- ZWB-leden realistisch interessant zijn (TdF + Giro + Vuelta klassiekers,
-- Marmotte-cols, Belgische Ardennen, Limburg-heuvels, Mallorca, Dolomieten).

-- ──────────────────────────────────────────────────────────────────────
-- Tabellen
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.cols (
  slug text primary key,
  name text not null,
  country text not null,              -- ISO-2: FR, IT, BE, NL, ES, CH, AT
  region text,
  summit_lat numeric(9, 6) not null,
  summit_lon numeric(9, 6) not null,
  summit_elevation_m int,
  ascent_m int,
  category text,                      -- 'HC', 'C1', 'C2', 'C3', 'C4', 'local'
  detection_radius_m int not null default 500,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists cols_country_idx on public.cols (country);
create index if not exists cols_region_idx on public.cols (region);

create table if not exists public.profile_climbed_cols (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  col_slug text not null references public.cols(slug) on delete cascade,
  first_activity_id bigint references public.strava_activities(id) on delete set null,
  first_climbed_at timestamptz not null,
  times_climbed int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (profile_id, col_slug)
);

create index if not exists profile_climbed_cols_profile_idx
  on public.profile_climbed_cols (profile_id);

-- ──────────────────────────────────────────────────────────────────────
-- RLS — leden zien alle climbed-cols (consistent met badges + rider-stats)
-- ──────────────────────────────────────────────────────────────────────

alter table public.cols enable row level security;
alter table public.profile_climbed_cols enable row level security;

drop policy if exists "cols_members_read" on public.cols;
create policy "cols_members_read" on public.cols
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

drop policy if exists "profile_climbed_cols_members_read" on public.profile_climbed_cols;
create policy "profile_climbed_cols_members_read" on public.profile_climbed_cols
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

-- Writes lopen via service-role (zie src/lib/cols/detector.ts) - geen
-- direct-write-policy nodig.

-- ──────────────────────────────────────────────────────────────────────
-- Seed: ~40 ZWB-relevante cols
-- ──────────────────────────────────────────────────────────────────────

insert into public.cols (slug, name, country, region, summit_lat, summit_lon, summit_elevation_m, ascent_m, category, detection_radius_m)
values
  -- ── Tour de France klassiekers (10) ─────────────────────────────────
  ('alpe-d-huez', 'Alpe d''Huez', 'FR', 'Alpen', 45.091700, 6.070300, 1860, 1130, 'HC', 500),
  ('mont-ventoux', 'Mont Ventoux', 'FR', 'Provence', 44.173900, 5.278300, 1909, 1610, 'HC', 500),
  ('col-du-galibier', 'Col du Galibier', 'FR', 'Alpen', 45.064100, 6.407900, 2642, 1245, 'HC', 500),
  ('col-du-tourmalet', 'Col du Tourmalet', 'FR', 'Pyreneeën', 42.909800, 0.144800, 2115, 1268, 'HC', 500),
  ('col-de-la-madeleine', 'Col de la Madeleine', 'FR', 'Alpen', 45.429600, 6.394600, 1993, 1500, 'HC', 500),
  ('col-de-la-croix-de-fer', 'Col de la Croix de Fer', 'FR', 'Alpen', 45.227800, 6.183200, 2067, 1500, 'HC', 500),
  ('col-d-izoard', 'Col d''Izoard', 'FR', 'Alpen', 44.820000, 6.735000, 2360, 1100, 'HC', 500),
  ('col-d-aubisque', 'Col d''Aubisque', 'FR', 'Pyreneeën', 42.976400, -0.337200, 1709, 1190, 'HC', 500),
  ('col-du-telegraphe', 'Col du Télégraphe', 'FR', 'Alpen', 45.199200, 6.450000, 1566, 850, 'C1', 500),
  ('col-du-glandon', 'Col du Glandon', 'FR', 'Alpen', 45.244400, 6.168300, 1924, 1450, 'HC', 500),

  -- ── Giro / Dolomieten klassiekers (5) ───────────────────────────────
  ('passo-dello-stelvio', 'Passo dello Stelvio', 'IT', 'Alpen', 46.528600, 10.454400, 2758, 1808, 'HC', 500),
  ('passo-del-mortirolo', 'Passo del Mortirolo', 'IT', 'Alpen', 46.217800, 10.292900, 1852, 1300, 'HC', 500),
  ('passo-gavia', 'Passo Gavia', 'IT', 'Alpen', 46.338200, 10.492800, 2618, 1404, 'HC', 500),
  ('passo-pordoi', 'Passo Pordoi', 'IT', 'Dolomieten', 46.488600, 11.812500, 2239, 637, 'C1', 500),
  ('passo-falzarego', 'Passo Falzarego', 'IT', 'Dolomieten', 46.519700, 12.008600, 2105, 1000, 'HC', 500),

  -- ── Belgische Ardennen (5) ──────────────────────────────────────────
  ('mur-de-huy', 'Mur de Huy', 'BE', 'Ardennen', 50.516700, 5.234700, 178, 128, 'C3', 250),
  ('cote-de-la-redoute', 'Côte de la Redoute', 'BE', 'Ardennen', 50.493600, 5.703600, 290, 165, 'C3', 250),
  ('cote-de-stockeu', 'Côte de Stockeu', 'BE', 'Ardennen', 50.425300, 5.838900, 410, 120, 'C3', 250),
  ('cote-de-wanne', 'Côte de Wanne', 'BE', 'Ardennen', 50.378900, 5.911900, 510, 220, 'C2', 250),
  ('cote-du-maquisard', 'Côte du Maquisard', 'BE', 'Ardennen', 50.404200, 5.862500, 480, 180, 'C3', 250),

  -- ── Limburg / Nederlandse heuvels (5) ───────────────────────────────
  ('cauberg', 'Cauberg', 'NL', 'Limburg', 50.859700, 5.823300, 130, 65, 'local', 200),
  ('keutenberg', 'Keutenberg', 'NL', 'Limburg', 50.849200, 5.854200, 110, 90, 'local', 200),
  ('vaalserberg', 'Vaalserberg', 'NL', 'Limburg', 50.754400, 6.021100, 322, 105, 'local', 250),
  ('camerig', 'Camerig', 'NL', 'Limburg', 50.753100, 5.993900, 268, 110, 'local', 200),
  ('eyserbosweg', 'Eyserbosweg', 'NL', 'Limburg', 50.815600, 5.884700, 198, 65, 'local', 200),

  -- ── Overige bekende cols (15) — Pyreneeën, Alpen, Mallorca, Italië ─
  ('col-de-l-iseran', 'Col de l''Iseran', 'FR', 'Alpen', 45.417800, 7.030600, 2770, 1900, 'HC', 500),
  ('col-d-ornon', 'Col d''Ornon', 'FR', 'Alpen', 44.988600, 5.984400, 1371, 800, 'C1', 500),
  ('col-du-grand-saint-bernard', 'Col du Grand-Saint-Bernard', 'CH', 'Alpen', 45.869400, 7.170600, 2469, 1500, 'HC', 500),
  ('madonna-del-ghisallo', 'Madonna del Ghisallo', 'IT', 'Lombardije', 45.833600, 9.262500, 754, 545, 'C1', 400),
  ('sa-calobra', 'Sa Calobra', 'ES', 'Mallorca', 39.855600, 2.798900, 682, 682, 'HC', 500),
  ('col-de-la-loze', 'Col de la Loze', 'FR', 'Alpen', 45.425300, 6.638300, 2304, 1605, 'HC', 500),
  ('col-du-soulor', 'Col du Soulor', 'FR', 'Pyreneeën', 42.975000, -0.260300, 1474, 1090, 'C1', 500),
  ('col-de-peyresourde', 'Col de Peyresourde', 'FR', 'Pyreneeën', 42.796900, 0.452500, 1569, 940, 'C1', 500),
  ('col-d-aspin', 'Col d''Aspin', 'FR', 'Pyreneeën', 42.935800, 0.322500, 1490, 800, 'C1', 500),
  ('cipressa', 'Cipressa', 'IT', 'Ligurië', 43.858900, 7.911700, 240, 240, 'C2', 250),
  ('poggio-di-sanremo', 'Poggio di San Remo', 'IT', 'Ligurië', 43.819700, 7.784200, 162, 120, 'C3', 200),
  ('col-de-vars', 'Col de Vars', 'FR', 'Alpen', 44.539400, 6.705800, 2109, 990, 'HC', 500),
  ('col-de-joux-plane', 'Col de Joux Plane', 'FR', 'Alpen', 46.154700, 6.677200, 1691, 990, 'HC', 500),
  ('col-de-port-de-bales', 'Col de Port de Balès', 'FR', 'Pyreneeën', 42.907500, 0.528600, 1755, 1185, 'HC', 500),
  ('col-du-mont-cenis', 'Col du Mont Cenis', 'FR', 'Alpen', 45.243300, 6.913600, 2083, 1330, 'C1', 500)

on conflict (slug) do nothing;
