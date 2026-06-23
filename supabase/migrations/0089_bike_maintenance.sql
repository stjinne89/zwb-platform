-- Onderhoud van slijtbare fietsonderdelen op basis van Strava-kilometers.
--
-- strava_bikes  : per fiets ("gear") de totale Strava-kilometerstand, gesynct
--                 vanuit /api/v3/athlete. distance_m is de levensduur-afstand.
-- bike_components: door het lid bijgehouden onderdelen met een vervangings-
--                 drempel. Versleten km = bike.distance_m - baseline_distance_m;
--                 bij >= threshold_km is het onderdeel toe aan vervanging.
--
-- 'primary' is een gereserveerd woord → kolom heet is_primary.

create table if not exists public.strava_bikes (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text,
  brand_model text,
  distance_m numeric(12,2) not null default 0,
  is_primary boolean not null default false,
  retired boolean not null default false,
  synced_at timestamptz not null default now()
);

create index if not exists strava_bikes_profile_idx
  on public.strava_bikes (profile_id);

create table if not exists public.bike_components (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  bike_id text not null references public.strava_bikes(id) on delete cascade,
  component_type text not null,
  name text,
  wear_range text not null default 'normal'
    check (wear_range in ('low', 'normal', 'high')),
  threshold_km int not null check (threshold_km > 0),
  custom_threshold boolean not null default false,
  baseline_distance_m numeric(12,2) not null default 0,
  installed_at date,
  status text not null default 'active'
    check (status in ('active', 'replaced')),
  replaced_at date,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bike_components_profile_status_idx
  on public.bike_components (profile_id, status);
create index if not exists bike_components_bike_idx
  on public.bike_components (bike_id);

-- ──────────────────────────────────────────────────────────────────────
-- Notificatie-voorkeur: onderdeel toe aan vervanging
-- ──────────────────────────────────────────────────────────────────────

alter table public.notification_preferences
  add column if not exists on_maintenance_due boolean not null default true;

-- ──────────────────────────────────────────────────────────────────────
-- RLS — alleen eigen fietsen/onderdelen. Sync schrijft via service-role
-- (admin-client) en omzeilt RLS.
-- ──────────────────────────────────────────────────────────────────────

alter table public.strava_bikes enable row level security;
alter table public.bike_components enable row level security;

drop policy if exists "strava_bikes_own_all" on public.strava_bikes;
create policy "strava_bikes_own_all" on public.strava_bikes
  for all to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "bike_components_own_all" on public.bike_components;
create policy "bike_components_own_all" on public.bike_components
  for all to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
