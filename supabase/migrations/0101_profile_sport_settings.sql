-- Critical power, W' en de zone-instellingen uit intervals.icu. Die velden
-- zitten al in het athlete-antwoord dat we ophalen, maar werden weggegooid.
-- CP en W' zijn de basis voor W'bal-achtige analyses; de zones maken het
-- mogelijk intervallen op persoonlijke zones te richten in plaats van op een
-- clubbreed percentage van FTP.
--
-- Bewust een aparte tabel en niet rider_power_profiles: die is leesbaar voor
-- elk ingelogd lid (nodig voor de clubpercentielen), en LTHR en maxHR horen
-- dichter bij gezondheidsdata. Zelfde grens als intervals_activities.

create table if not exists public.profile_sport_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  ftp_watts numeric,
  cp_watts numeric,
  w_prime_joules numeric,
  lthr int,
  max_hr int,
  -- Zonegrenzen zoals intervals ze teruggeeft; de eenheid (percentage of watt)
  -- is per instelling verschillend, dus we bewaren ze onbewerkt.
  power_zones jsonb,
  hr_zones jsonb,
  power_zone_names jsonb,
  synced_at timestamptz not null default now()
);

alter table public.profile_sport_settings enable row level security;

drop policy if exists "profile_sport_settings_select" on public.profile_sport_settings;
create policy "profile_sport_settings_select" on public.profile_sport_settings
  for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1
      from public.training_coach_assignments a
      where a.athlete_id = profile_sport_settings.profile_id
        and a.trainer_id = auth.uid()
        and a.status = 'active'
    )
  );

notify pgrst, 'reload schema';
