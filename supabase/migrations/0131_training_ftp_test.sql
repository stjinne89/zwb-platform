-- De FTP van een lid stond tot nu toe alleen in profiles.ftp_watts: één getal dat
-- je zelf intypt bij je profiel en dat verder nooit meer wordt gemeten. Alle
-- wattages in een schema hangen er wél aan (blockToPowerTarget), dus wie acht
-- weken doortraint rijdt de laatste weken op cijfers van een FTP die niet meer
-- klopt — te laag, en dus zonder prikkel.
--
-- Voortaan kan een test als vaste afspraak in het schema staan, en de uitslag
-- ervan komt hier terecht.

-- Welke test een workout is. null is het normale geval: gewoon een training.
alter table public.training_workouts
  add column if not exists test_type text;

alter table public.training_workouts
  drop constraint if exists training_workouts_test_type_check;
alter table public.training_workouts
  add constraint training_workouts_test_type_check
    check (test_type is null or test_type in ('ramp', 'twenty_min'));

-- Het zoeken naar "de test waarvan de uitslag nog ontbreekt" gaat op deze twee.
create index if not exists training_workouts_test_idx
  on public.training_workouts (profile_id, scheduled_at)
  where test_type is not null and superseded_at is null;

-- Een nieuw schema kan met een test beginnen. De keuze wordt bij de generatie
-- vastgelegd en pas bij het aanmaken van het plan een echte workout: eerder
-- bestaat het plan waar die workout aan hangt nog niet.
alter table public.training_ai_generations
  add column if not exists ftp_test_type text;
alter table public.training_ai_generations
  add column if not exists ftp_test_date date;

alter table public.training_ai_generations
  drop constraint if exists training_ai_generations_ftp_test_type_check;
alter table public.training_ai_generations
  add constraint training_ai_generations_ftp_test_type_check
    check (ftp_test_type is null or ftp_test_type in ('ramp', 'twenty_min'));

-- De uitslagen zelf. Eén rij per test, zodat de trend zichtbaar blijft; het
-- profiel houdt alleen de laatste waarde.
--
-- result_watts is de ruwe meting (bij een ramptest het hoogste minuutvermogen,
-- bij een 20-minutentest het gemiddelde) en ftp_watts wat daaruit volgt. Beide
-- bewaren: de omrekenfactor is een afspraak, geen natuurwet, en zonder de ruwe
-- waarde kun je een oude test niet opnieuw uitrekenen.
create table if not exists public.training_ftp_tests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid references public.training_workouts(id) on delete set null,
  tested_on date not null,
  test_type text not null check (test_type in ('ramp', 'twenty_min')),
  result_watts numeric(6, 1) not null check (result_watts > 0 and result_watts < 1000),
  ftp_watts int not null check (ftp_watts > 0 and ftp_watts < 800),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists training_ftp_tests_profile_idx
  on public.training_ftp_tests (profile_id, tested_on desc);

-- Eén uitslag per testworkout; twee keer opslaan mag geen dubbele meting geven.
create unique index if not exists training_ftp_tests_workout_unique
  on public.training_ftp_tests (workout_id)
  where workout_id is not null;

alter table public.training_ftp_tests enable row level security;

-- Lezen mag het lid zelf en zijn trainer, net als bij de andere training_*-tabellen.
drop policy if exists "training_ftp_tests_select" on public.training_ftp_tests;
create policy "training_ftp_tests_select" on public.training_ftp_tests
  for select to authenticated
  using (public.current_user_can_train_profile(profile_id));

-- Schrijven doet het lid zelf: het is zijn meting. Een trainer met het
-- toewijzingsrecht mag hem invoeren voor wie dat zelf niet doet.
drop policy if exists "training_ftp_tests_insert" on public.training_ftp_tests;
create policy "training_ftp_tests_insert" on public.training_ftp_tests
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_ftp_tests_update" on public.training_ftp_tests;
create policy "training_ftp_tests_update" on public.training_ftp_tests
  for update to authenticated
  using (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_ftp_tests_delete" on public.training_ftp_tests;
create policy "training_ftp_tests_delete" on public.training_ftp_tests
  for delete to authenticated
  using (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

notify pgrst, 'reload schema';
