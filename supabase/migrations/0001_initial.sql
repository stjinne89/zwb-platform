-- ZWB Platform — initial schema
-- Profiles, teams, events, RSVPs + RLS policies.

create extension if not exists "uuid-ossp";

-- ---------- profiles ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  region text,
  zwift_id text,
  strava_id text,
  zrl_category text check (zrl_category in ('A','B','C','D','E')),
  ftp_watts int check (ftp_watts > 0 and ftp_watts < 800),
  weight_kg numeric(4,1) check (weight_kg > 0 and weight_kg < 300),
  bio text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.profiles (region);

-- Auto-create profile row on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- teams ----------

create table public.teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('zrl','ladder','social','outdoor')),
  division text,
  captain_id uuid references public.profiles(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','captain','co-captain')),
  joined_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

create index on public.team_members (profile_id);

-- ---------- events ----------

create table public.events (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('outdoor','zrl','ladder','flamme_rouge','social','training')),
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  start_lat numeric(9,6),
  start_lon numeric(9,6),
  gpx_path text, -- supabase storage path
  distance_km numeric(6,2),
  elevation_m int,
  team_id uuid references public.teams(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  weather_cache jsonb,
  created_at timestamptz not null default now()
);

create index on public.events (start_at);
create index on public.events (team_id);

create table public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('yes','maybe','no')),
  note text,
  updated_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

-- ---------- RLS ----------

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

-- profiles: every authenticated user sees minimal info of others; own profile editable.
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- teams: everyone authenticated can read; only admins can modify.
create policy "teams_select_authenticated" on public.teams
  for select to authenticated using (true);

create policy "teams_admin_write" on public.teams
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

create policy "team_members_select_authenticated" on public.team_members
  for select to authenticated using (true);

create policy "team_members_admin_write" on public.team_members
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- events: everyone authenticated reads; creator and admin can modify.
create policy "events_select_authenticated" on public.events
  for select to authenticated using (true);

create policy "events_insert_authenticated" on public.events
  for insert to authenticated with check (auth.uid() = created_by);

create policy "events_update_own_or_admin" on public.events
  for update to authenticated
  using (
    auth.uid() = created_by
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

create policy "events_delete_own_or_admin" on public.events
  for delete to authenticated
  using (
    auth.uid() = created_by
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

-- rsvps: each user sees all, only own writable.
create policy "rsvps_select_authenticated" on public.event_rsvps
  for select to authenticated using (true);

create policy "rsvps_upsert_own" on public.event_rsvps
  for all to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
