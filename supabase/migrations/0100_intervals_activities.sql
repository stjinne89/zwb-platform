-- Belasting per rit uit intervals.icu. Tot nu toe zag de app alleen de dagelijkse
-- CTL/ATL uit wellness en de afstand/tijd uit Strava; TSS, intensiteit, NP en
-- arbeid per rit werden nooit bewaard. Dit is de basis onder de gevraagde
-- analyses (aerobe/anaerobe verdeling, belastingtrends per week).
--
-- raw bewaren we bewust: intervals.icu levert meer velden dan we vandaag
-- gebruiken, en dat scheelt een migratie zodra we er een nodig hebben.

create table if not exists public.intervals_activities (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  intervals_id text not null,
  start_date_local date not null,
  name text,
  type text,
  moving_time_seconds int,
  distance_m numeric,
  elevation_gain_m numeric,
  training_load numeric,     -- icu_training_load (TSS)
  intensity numeric,         -- icu_intensity (IF)
  average_watts numeric,
  normalized_watts numeric,  -- weighted_average_watts (NP)
  kilojoules numeric,
  ftp_watts numeric,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  primary key (profile_id, intervals_id)
);

create index if not exists intervals_activities_profile_date_idx
  on public.intervals_activities (profile_id, start_date_local desc);

alter table public.intervals_activities enable row level security;

-- Zelfde grens als de rest van de trainingsdata: jezelf, of een trainer aan wie
-- je actief toegang hebt gegeven. Schrijven gebeurt met de service-role.
drop policy if exists "intervals_activities_select" on public.intervals_activities;
create policy "intervals_activities_select" on public.intervals_activities
  for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1
      from public.training_coach_assignments a
      where a.athlete_id = intervals_activities.profile_id
        and a.trainer_id = auth.uid()
        and a.status = 'active'
    )
  );

notify pgrst, 'reload schema';
