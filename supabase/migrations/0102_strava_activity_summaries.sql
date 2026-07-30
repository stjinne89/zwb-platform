-- Bewaart welk ZWBeter Worden-blok we in welke Strava-beschrijving hebben
-- geschreven, plus de koppeling rit <-> geplande workout <-> intervals-activiteit.
--
-- Bewust een eigen tabel en geen kolommen op strava_activities: die tabel is
-- leesbaar voor elk ingelogd lid (nodig voor de leaderboards) en dit blok bevat
-- CTL en een gereedscore. Dat hoort achter dezelfde grens als
-- intervals_activities en profile_sport_settings.
--
-- summary_text bewaren we om een eerder geschreven blok later letterlijk uit de
-- beschrijving te kunnen knippen zonder de eigen tekst van het lid te raken.
-- written_at is tegelijk het slot: alleen een rij met written_at is null mag
-- worden geschreven, zodat de cron en een interactieve sync elkaar niet dubbel
-- in de beschrijving zetten.

create table if not exists public.strava_activity_summaries (
  activity_id bigint primary key
    references public.strava_activities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid references public.training_workouts(id) on delete set null,
  intervals_id text,
  summary_text text,
  summary_hash text,
  written_at timestamptz,
  attempts smallint not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);

create index if not exists strava_activity_summaries_profile_idx
  on public.strava_activity_summaries (profile_id, written_at);

alter table public.strava_activity_summaries enable row level security;

-- Zelfde grens als de rest van de trainingsdata: jezelf, of een trainer aan wie
-- je actief toegang hebt gegeven. Schrijven gebeurt uitsluitend met de
-- service-role, dus er is geen insert/update/delete-policy.
drop policy if exists "strava_activity_summaries_select" on public.strava_activity_summaries;
create policy "strava_activity_summaries_select" on public.strava_activity_summaries
  for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1
      from public.training_coach_assignments a
      where a.athlete_id = strava_activity_summaries.profile_id
        and a.trainer_id = auth.uid()
        and a.status = 'active'
    )
  );

notify pgrst, 'reload schema';
