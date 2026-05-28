-- Training V2: editable AI prompts, editable workout blocks, reports,
-- daily adaptation runs and CTL projection metadata.

alter table public.training_ai_generations
  add column if not exists prompt_text text;

update public.training_ai_generations
set prompt_text = prompt_summary
where prompt_text is null;

alter table public.training_plans
  add column if not exists parent_plan_id uuid references public.training_plans(id) on delete set null,
  add column if not exists adaptation_reason text,
  add column if not exists ctl_projection_json jsonb not null default '{}'::jsonb;

alter table public.training_workouts
  add column if not exists intervals_external_id text;

create unique index if not exists training_workouts_intervals_external_id_unique
  on public.training_workouts (intervals_external_id)
  where intervals_external_id is not null;

create table if not exists public.training_workout_reports (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.training_workouts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid references public.profiles(id) on delete set null,
  athlete_rpe int check (athlete_rpe is null or (athlete_rpe >= 1 and athlete_rpe <= 10)),
  athlete_feel text check (athlete_feel is null or athlete_feel in ('goed','neutraal','zwaar','slecht')),
  athlete_report text,
  trainer_feedback text,
  paired_activity_id text,
  intervals_event_id text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists training_workout_reports_workout_profile_unique
  on public.training_workout_reports (workout_id, profile_id);

create index if not exists training_workout_reports_profile_idx
  on public.training_workout_reports (profile_id, updated_at desc);

create table if not exists public.training_adaptation_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid references public.profiles(id) on delete set null,
  source_plan_id uuid references public.training_plans(id) on delete set null,
  draft_plan_id uuid references public.training_plans(id) on delete set null,
  status text not null default 'completed'
    check (status in ('completed','skipped','failed')),
  input_json jsonb not null default '{}'::jsonb,
  response_json jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists training_adaptation_runs_profile_created_idx
  on public.training_adaptation_runs (profile_id, created_at desc);

drop trigger if exists training_workout_reports_touch on public.training_workout_reports;
create trigger training_workout_reports_touch
  before update on public.training_workout_reports
  for each row execute function public.touch_training_updated_at();

alter table public.training_workout_reports enable row level security;
alter table public.training_adaptation_runs enable row level security;

drop policy if exists "training_workout_reports_select" on public.training_workout_reports;
create policy "training_workout_reports_select" on public.training_workout_reports
  for select to authenticated
  using (public.current_user_can_train_profile(profile_id));

drop policy if exists "training_workout_reports_write" on public.training_workout_reports;
create policy "training_workout_reports_write" on public.training_workout_reports
  for all to authenticated
  using (
    profile_id = auth.uid()
    or trainer_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    profile_id = auth.uid()
    or trainer_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_adaptation_runs_select" on public.training_adaptation_runs;
create policy "training_adaptation_runs_select" on public.training_adaptation_runs
  for select to authenticated
  using (public.current_user_can_train_profile(profile_id));

drop policy if exists "training_adaptation_runs_write" on public.training_adaptation_runs;
create policy "training_adaptation_runs_write" on public.training_adaptation_runs
  for all to authenticated
  using (
    trainer_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    trainer_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );
