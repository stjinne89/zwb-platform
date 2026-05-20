-- Strava-koppeling en wekelijkse achievement leaderboards.

create table if not exists public.strava_connections (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  strava_athlete_id bigint not null unique,
  athlete_username text,
  athlete_name text,
  access_token text not null,
  refresh_token text not null,
  expires_at int not null,
  scope text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.strava_activities (
  id bigint primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  strava_athlete_id bigint not null,
  name text not null,
  sport_type text,
  start_date timestamptz not null,
  achievement_week date not null,
  distance_m numeric(10,2) not null default 0,
  total_elevation_gain_m numeric(10,2) not null default 0,
  kudos_count int not null default 0,
  moving_time_seconds int not null default 0,
  elapsed_time_seconds int not null default 0,
  trainer boolean not null default false,
  commute boolean not null default false,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create index if not exists strava_activities_profile_week_idx
  on public.strava_activities (profile_id, achievement_week);

create index if not exists strava_activities_week_idx
  on public.strava_activities (achievement_week);

alter table public.strava_connections enable row level security;
alter table public.strava_activities enable row level security;

drop policy if exists "strava_connections_select_own" on public.strava_connections;
create policy "strava_connections_select_own" on public.strava_connections
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "strava_connections_write_own" on public.strava_connections;
create policy "strava_connections_write_own" on public.strava_connections
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "strava_activities_select_authenticated" on public.strava_activities;
create policy "strava_activities_select_authenticated" on public.strava_activities
  for select to authenticated using (true);

drop policy if exists "strava_activities_write_own" on public.strava_activities;
create policy "strava_activities_write_own" on public.strava_activities
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
