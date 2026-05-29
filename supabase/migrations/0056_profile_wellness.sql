-- Wellness/herstel-data uit intervals.icu, per lid per dag. Voedt de
-- AI-trainingsplanning (belastbaarheid) en een eigen herstel-overzicht.
--
-- Privacy: gevoelige gezondheidsdata. Strikt opt-in (wellness_opt_in op de
-- intervals-koppeling) en RLS = alleen het lid zelf leest z'n eigen rijen.
-- Trainers/AI lezen via de service-role nadat de coaching-relatie in code
-- is geverifieerd (zoals de rest van de trainingsmodule).

alter table public.intervals_connections
  add column if not exists wellness_opt_in boolean not null default false;

create table if not exists public.profile_wellness (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  resting_hr int,
  hrv numeric(6, 2),          -- rMSSD of SDNN, zoals intervals.icu levert
  sleep_secs int,
  sleep_score numeric(5, 2),
  readiness numeric(5, 2),
  fatigue numeric(5, 2),
  stress numeric(5, 2),
  soreness numeric(5, 2),
  mood numeric(5, 2),
  synced_at timestamptz not null default now(),
  primary key (profile_id, date)
);

create index if not exists profile_wellness_profile_date_idx
  on public.profile_wellness (profile_id, date desc);

alter table public.profile_wellness enable row level security;

-- Alleen het lid zelf leest z'n eigen herstel-data.
drop policy if exists "profile_wellness_self_read" on public.profile_wellness;
create policy "profile_wellness_self_read"
  on public.profile_wellness for select
  to authenticated
  using (auth.uid() = profile_id);

-- Writes uitsluitend via service-role (sync). Geen insert/update/delete-policy
-- voor gewone clients = standaard geweigerd.
