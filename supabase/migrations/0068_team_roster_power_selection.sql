-- Teamrooster v2: subteams, Intervals powerprofielen, racebeschikbaarheid,
-- lineups en persoonlijke ZRL-resultaten.

alter table public.teams
  add column if not exists parent_team_id uuid references public.teams(id) on delete set null;

create index if not exists teams_parent_team_idx
  on public.teams (parent_team_id);

alter table public.events
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists events_team_start_idx
  on public.events (team_id, start_at);

create table if not exists public.rider_power_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  athlete_id text,
  period text not null default '90d',
  source text not null default 'intervals',
  ftp_watts int check (ftp_watts is null or (ftp_watts > 0 and ftp_watts < 1200)),
  weight_kg numeric(5,2) check (weight_kg is null or (weight_kg > 0 and weight_kg < 300)),
  watts_15s int,
  watts_30s int,
  watts_1m int,
  watts_2m int,
  watts_5m int,
  watts_10m int,
  watts_20m int,
  wkg_15s numeric(6,2),
  wkg_30s numeric(6,2),
  wkg_1m numeric(6,2),
  wkg_2m numeric(6,2),
  wkg_5m numeric(6,2),
  wkg_10m numeric(6,2),
  wkg_20m numeric(6,2),
  ftp_wkg numeric(6,2),
  rider_type text not null default 'unknown'
    check (rider_type in ('sprinter','puncher','tter','climber','allrounder','unknown')),
  sync_status text not null default 'pending'
    check (sync_status in ('pending','ok','partial','error')),
  sync_error text,
  synced_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.rider_power_profiles enable row level security;

drop policy if exists "rider_power_profiles_select_authenticated" on public.rider_power_profiles;
create policy "rider_power_profiles_select_authenticated"
  on public.rider_power_profiles for select to authenticated using (true);

drop policy if exists "rider_power_profiles_self_or_team_sync_write" on public.rider_power_profiles;
create policy "rider_power_profiles_self_or_team_sync_write"
  on public.rider_power_profiles for all to authenticated
  using (
    profile_id = auth.uid()
    or public.current_user_has_permission('teams.sync_sources')
  )
  with check (
    profile_id = auth.uid()
    or public.current_user_has_permission('teams.sync_sources')
  );

create table if not exists public.team_event_availability (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('available','maybe','unavailable')),
  note text,
  updated_at timestamptz not null default now(),
  unique (event_id, team_id, profile_id)
);

create index if not exists team_event_availability_team_event_idx
  on public.team_event_availability (team_id, event_id, status);

alter table public.team_event_availability enable row level security;

drop policy if exists "team_event_availability_select_authenticated" on public.team_event_availability;
create policy "team_event_availability_select_authenticated"
  on public.team_event_availability for select to authenticated using (true);

drop policy if exists "team_event_availability_self_write" on public.team_event_availability;
create policy "team_event_availability_self_write"
  on public.team_event_availability for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create table if not exists public.team_event_lineups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  parent_team_id uuid not null references public.teams(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  slot int,
  role text,
  note text,
  selected_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (event_id, parent_team_id, profile_id)
);

create index if not exists team_event_lineups_event_team_idx
  on public.team_event_lineups (event_id, team_id, slot);

alter table public.team_event_lineups enable row level security;

drop policy if exists "team_event_lineups_select_authenticated" on public.team_event_lineups;
create policy "team_event_lineups_select_authenticated"
  on public.team_event_lineups for select to authenticated using (true);

drop policy if exists "team_event_lineups_captain_write" on public.team_event_lineups;
create policy "team_event_lineups_captain_write"
  on public.team_event_lineups for all to authenticated
  using (
    public.current_user_has_permission('teams.manage_roster')
    or exists (
      select 1 from public.team_members tm
      where tm.team_id in (team_event_lineups.parent_team_id, team_event_lineups.team_id)
        and tm.profile_id = auth.uid()
        and tm.role in ('captain','co-captain')
    )
  )
  with check (
    public.current_user_has_permission('teams.manage_roster')
    or exists (
      select 1 from public.team_members tm
      where tm.team_id in (team_event_lineups.parent_team_id, team_event_lineups.team_id)
        and tm.profile_id = auth.uid()
        and tm.role in ('captain','co-captain')
    )
  );

create table if not exists public.zrl_rider_results (
  id uuid primary key default gen_random_uuid(),
  team_result_id uuid references public.team_results(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  roster_entry_id uuid references public.roster_entries(id) on delete set null,
  external_source text not null default 'wtrl',
  external_id text not null,
  rider_name text not null,
  zwift_id text,
  category text,
  position int,
  points numeric(7,2),
  time_text text,
  time_seconds int,
  matched_via text not null default 'unmatched'
    check (matched_via in ('zwift_id','roster','profile_name','unmatched')),
  round_label text,
  round_at timestamptz,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists zrl_rider_results_external_idx
  on public.zrl_rider_results (external_source, external_id);

create index if not exists zrl_rider_results_profile_idx
  on public.zrl_rider_results (profile_id, round_at desc);

create index if not exists zrl_rider_results_team_idx
  on public.zrl_rider_results (team_id, round_at desc);

alter table public.zrl_rider_results enable row level security;

drop policy if exists "zrl_rider_results_select_authenticated" on public.zrl_rider_results;
create policy "zrl_rider_results_select_authenticated"
  on public.zrl_rider_results for select to authenticated using (true);

drop policy if exists "zrl_rider_results_team_sync_write" on public.zrl_rider_results;
create policy "zrl_rider_results_team_sync_write"
  on public.zrl_rider_results for all to authenticated
  using (public.current_user_has_permission('teams.sync_sources'))
  with check (public.current_user_has_permission('teams.sync_sources'));

create or replace function public.touch_team_roster_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rider_power_profiles_touch on public.rider_power_profiles;
create trigger rider_power_profiles_touch
  before update on public.rider_power_profiles
  for each row execute function public.touch_team_roster_updated_at();

drop trigger if exists team_event_availability_touch on public.team_event_availability;
create trigger team_event_availability_touch
  before update on public.team_event_availability
  for each row execute function public.touch_team_roster_updated_at();

drop trigger if exists team_event_lineups_touch on public.team_event_lineups;
create trigger team_event_lineups_touch
  before update on public.team_event_lineups
  for each row execute function public.touch_team_roster_updated_at();
