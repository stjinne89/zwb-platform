-- Beschikbaarheid zat tot nu toe in training_goals.available_days: een lijst
-- weekdag-slugs die je één keer invulde bij het aanmaken van je doel. Daarmee
-- weet de planner wél dat je dinsdag kunt, maar niet of dat 45 of 120 minuten is,
-- en het lid kan het niet per week bijstellen.
--
-- Deze tabel houdt minuten per weekdag bij. Eén rij per week (week_start =
-- maandag) plus één standaardrij (week_start is null) die geldt voor elke week
-- waarvoor niets is ingevuld.
--
-- minutes_by_day is jsonb en geen zeven kolommen: het is één geheel dat altijd in
-- z'n geheel wordt gelezen en geschreven, en zo blijft de vorm gelijk aan wat de
-- AI-input verwacht.

create table if not exists public.training_availability (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  week_start date,
  minutes_by_day jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

-- Eén rij per lid per week, en daarnaast hoogstens één standaardrij. Twee
-- partiële indexen, omdat null in een gewone unieke index niet met zichzelf
-- botst en het lid dus eindeloos standaardrijen zou kunnen stapelen.
create unique index if not exists training_availability_week_unique
  on public.training_availability (profile_id, week_start)
  where week_start is not null;

create unique index if not exists training_availability_default_unique
  on public.training_availability (profile_id)
  where week_start is null;

drop trigger if exists training_availability_touch on public.training_availability;
create trigger training_availability_touch
  before update on public.training_availability
  for each row execute function public.touch_training_updated_at();

alter table public.training_availability enable row level security;

-- Lezen mag het lid zelf en zijn trainer, net als bij de andere training_*-tabellen.
drop policy if exists "training_availability_select" on public.training_availability;
create policy "training_availability_select" on public.training_availability
  for select to authenticated
  using (public.current_user_can_train_profile(profile_id));

-- Schrijven doet het lid zelf. Anders dan bij plannen en workouts is dit geen
-- trainerswerk: het gaat over de agenda van het lid.
drop policy if exists "training_availability_insert" on public.training_availability;
create policy "training_availability_insert" on public.training_availability
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_availability_update" on public.training_availability;
create policy "training_availability_update" on public.training_availability
  for update to authenticated
  using (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_availability_delete" on public.training_availability;
create policy "training_availability_delete" on public.training_availability
  for delete to authenticated
  using (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

notify pgrst, 'reload schema';
