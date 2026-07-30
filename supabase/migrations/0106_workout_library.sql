-- Workout-bibliotheek voor de trainer. Tot nu toe kon een workout alleen
-- ontstaan uit een AI-gegenereerd schema: er is nergens een insert in
-- training_workouts buiten createPlanFromAiGeneration. Met deze tabel kan een
-- trainer een standaardworkout in een schema zetten en eigen varianten bewaren.
--
-- `form` is de trainingsvorm (slug uit src/lib/training/training-forms.ts) en
-- staat los van `intensity`: sweet spot en tempo delen dezelfde intensiteit maar
-- zijn verschillende sessies, net als sprint en anaeroob.
--
-- is_standard markeert de meegeleverde set. Die is voor elke trainer leesbaar en
-- door niemand aanpasbaar; eigen workouts horen bij hun maker.

create table if not exists public.training_workout_templates (
  id uuid primary key default gen_random_uuid(),
  form text not null
    check (form in (
      'herstel','duur','tempo','sweetspot','drempel','vo2max','anaeroob','sprint','test'
    )),
  title text not null,
  description text,
  duration_minutes int not null
    check (duration_minutes > 0 and duration_minutes <= 480),
  intensity text not null
    check (intensity in (
      'recovery','endurance','tempo','threshold','vo2max','anaerobic','race','rest'
    )),
  target_type text not null default 'power'
    check (target_type in ('power','heart_rate','rpe','free')),
  structure_json jsonb not null default '[]'::jsonb,
  is_standard boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- De bibliotheek wordt altijd per vorm gefilterd en op lengte gesorteerd.
create index if not exists training_workout_templates_form_duration_idx
  on public.training_workout_templates (form, duration_minutes);

-- Voorkomt dat de seed bij een herhaalde migratie dubbele rijen oplevert.
create unique index if not exists training_workout_templates_standard_title_unique
  on public.training_workout_templates (form, title)
  where is_standard;

drop trigger if exists training_workout_templates_touch on public.training_workout_templates;
create trigger training_workout_templates_touch
  before update on public.training_workout_templates
  for each row execute function public.touch_training_updated_at();

alter table public.training_workout_templates enable row level security;

-- Lezen mag iedereen die schema's maakt: de standaardset én de eigen workouts
-- van andere trainers, zodat de club één bibliotheek deelt.
drop policy if exists "training_workout_templates_select" on public.training_workout_templates;
create policy "training_workout_templates_select" on public.training_workout_templates
  for select to authenticated
  using (public.current_user_has_permission('training.create_plans'));

-- Schrijven alleen op je eigen, niet-standaard rijen. De standaardset komt uit
-- deze migratie en blijft daarmee voor iedereen gelijk.
drop policy if exists "training_workout_templates_insert" on public.training_workout_templates;
create policy "training_workout_templates_insert" on public.training_workout_templates
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and is_standard = false
    and public.current_user_has_permission('training.create_plans')
  );

drop policy if exists "training_workout_templates_update" on public.training_workout_templates;
create policy "training_workout_templates_update" on public.training_workout_templates
  for update to authenticated
  using (created_by = auth.uid() and is_standard = false)
  with check (created_by = auth.uid() and is_standard = false);

drop policy if exists "training_workout_templates_delete" on public.training_workout_templates;
create policy "training_workout_templates_delete" on public.training_workout_templates
  for delete to authenticated
  using (created_by = auth.uid() and is_standard = false);

notify pgrst, 'reload schema';
