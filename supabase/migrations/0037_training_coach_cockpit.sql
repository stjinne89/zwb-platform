-- Training coach-cockpit: trainer role, permissions, opt-in assignments,
-- goals, plans, workouts and AI generation audit trail.

alter table public.profiles
  drop constraint if exists profiles_community_roles_allowed;

alter table public.profiles
  add constraint profiles_community_roles_allowed
  check (
    cardinality(community_roles) > 0
    and community_roles <@ array[
      'board',
      'team_captain',
      'event_organizer',
      'community_manager',
      'trainer',
      'paying_member',
      'community_member'
    ]::text[]
  );

alter table public.community_role_permissions
  drop constraint if exists community_role_permissions_role_allowed;

alter table public.community_role_permissions
  add constraint community_role_permissions_role_allowed
  check (
    role in (
      'board',
      'team_captain',
      'event_organizer',
      'community_manager',
      'trainer',
      'paying_member',
      'community_member'
    )
  );

alter table public.community_role_permissions
  drop constraint if exists community_role_permissions_allowed;

alter table public.community_role_permissions
  add constraint community_role_permissions_allowed
  check (
    permissions <@ array[
      'events.create',
      'events.manage_all',
      'teams.create',
      'teams.manage_roster',
      'teams.manage_results',
      'teams.sync_sources',
      'content.create_posts',
      'content.moderate_posts',
      'media.manage',
      'community.manage',
      'members.approve',
      'members.manage_roles',
      'roles.manage_permissions',
      'achievements.finalize',
      'live.start',
      'live.manage',
      'sponsors.manage',
      'polls.manage',
      'training.view_assigned',
      'training.manage_assignments',
      'training.create_plans',
      'training.publish_plans',
      'training.ai_generate'
    ]::text[]
  );

insert into public.community_role_permissions (role, permissions)
values (
  'trainer',
  array[
    'training.view_assigned',
    'training.create_plans',
    'training.publish_plans',
    'training.ai_generate',
    'content.create_posts'
  ]::text[]
)
on conflict (role) do update
set permissions = (
  select array_agg(distinct permission order by permission)
  from unnest(
    public.community_role_permissions.permissions ||
    excluded.permissions
  ) as permissions(permission)
);

update public.community_role_permissions
set permissions = (
  select array_agg(distinct permission order by permission)
  from unnest(
    permissions ||
    array[
      'training.view_assigned',
      'training.manage_assignments',
      'training.create_plans',
      'training.publish_plans',
      'training.ai_generate'
    ]::text[]
  ) as permissions(permission)
)
where role in ('board', 'community_manager');

alter table public.notification_preferences
  add column if not exists on_training_plan boolean not null default true;

create table if not exists public.training_coach_assignments (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  notes text,
  granted_by uuid references public.profiles(id) on delete set null,
  revoked_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (athlete_id <> trainer_id)
);

create unique index if not exists training_coach_assignments_active_unique
  on public.training_coach_assignments (athlete_id, trainer_id)
  where status = 'active';

create index if not exists training_coach_assignments_trainer_idx
  on public.training_coach_assignments (trainer_id, status);

create table if not exists public.training_goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  goal_type text not null
    check (goal_type in ('zrl','ladder','outdoor_event','gran_fondo','ftp','base_fitness','rebuild')),
  target_date date,
  target_event_id uuid references public.events(id) on delete set null,
  available_days text[] not null default array[]::text[],
  max_hours_per_week numeric(4,1),
  preferred_mode text not null default 'mixed'
    check (preferred_mode in ('indoor','outdoor','mixed')),
  experience_level text not null default 'intermediate'
    check (experience_level in ('beginner','intermediate','advanced')),
  desired_intensity text not null default 'balanced'
    check (desired_intensity in ('easy','balanced','hard')),
  risk_notes text,
  status text not null default 'active'
    check (status in ('active','completed','archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_goals_profile_status_idx
  on public.training_goals (profile_id, status, target_date);

create table if not exists public.training_ai_generations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid references public.profiles(id) on delete set null,
  goal_id uuid references public.training_goals(id) on delete set null,
  model text not null,
  status text not null default 'completed'
    check (status in ('completed','failed')),
  prompt_summary text not null,
  response_json jsonb,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid references public.profiles(id) on delete set null,
  goal_id uuid references public.training_goals(id) on delete set null,
  ai_generation_id uuid references public.training_ai_generations(id) on delete set null,
  title text not null,
  summary text,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft'
    check (status in ('draft','review','approved','published','archived')),
  source text not null default 'manual'
    check (source in ('manual','ai')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_plans_profile_status_idx
  on public.training_plans (profile_id, status, start_date desc);

create table if not exists public.training_workouts (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.training_plans(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid references public.profiles(id) on delete set null,
  scheduled_at timestamptz not null,
  title text not null,
  description text,
  duration_minutes int not null default 60 check (duration_minutes > 0 and duration_minutes <= 480),
  intensity text not null default 'endurance'
    check (intensity in ('recovery','endurance','tempo','threshold','vo2max','anaerobic','race','rest')),
  target_type text not null default 'power'
    check (target_type in ('power','heart_rate','rpe','free')),
  structure_json jsonb not null default '[]'::jsonb,
  status text not null default 'planned'
    check (status in ('planned','completed','skipped')),
  intervals_event_id text,
  publish_status text not null default 'pending'
    check (publish_status in ('pending','published','failed')),
  publish_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_workouts_plan_idx
  on public.training_workouts (plan_id, scheduled_at);

create index if not exists training_workouts_profile_idx
  on public.training_workouts (profile_id, scheduled_at);

create or replace function public.touch_training_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists training_assignments_touch on public.training_coach_assignments;
create trigger training_assignments_touch
  before update on public.training_coach_assignments
  for each row execute function public.touch_training_updated_at();

drop trigger if exists training_goals_touch on public.training_goals;
create trigger training_goals_touch
  before update on public.training_goals
  for each row execute function public.touch_training_updated_at();

drop trigger if exists training_plans_touch on public.training_plans;
create trigger training_plans_touch
  before update on public.training_plans
  for each row execute function public.touch_training_updated_at();

drop trigger if exists training_workouts_touch on public.training_workouts;
create trigger training_workouts_touch
  before update on public.training_workouts
  for each row execute function public.touch_training_updated_at();

create or replace function public.current_user_can_train_profile(target_profile uuid)
returns boolean language sql stable as $$
  select
    auth.uid() = target_profile
    or public.current_user_has_permission('training.manage_assignments')
    or exists (
      select 1
      from public.training_coach_assignments tca
      where tca.athlete_id = target_profile
        and tca.trainer_id = auth.uid()
        and tca.status = 'active'
    );
$$;

alter table public.training_coach_assignments enable row level security;
alter table public.training_goals enable row level security;
alter table public.training_ai_generations enable row level security;
alter table public.training_plans enable row level security;
alter table public.training_workouts enable row level security;

drop policy if exists "training_assignments_select" on public.training_coach_assignments;
create policy "training_assignments_select" on public.training_coach_assignments
  for select to authenticated
  using (
    athlete_id = auth.uid()
    or trainer_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_assignments_write" on public.training_coach_assignments;
create policy "training_assignments_write" on public.training_coach_assignments
  for all to authenticated
  using (
    athlete_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    athlete_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_goals_select" on public.training_goals;
create policy "training_goals_select" on public.training_goals
  for select to authenticated
  using (public.current_user_can_train_profile(profile_id));

drop policy if exists "training_goals_write" on public.training_goals;
create policy "training_goals_write" on public.training_goals
  for all to authenticated
  using (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_ai_select" on public.training_ai_generations;
create policy "training_ai_select" on public.training_ai_generations
  for select to authenticated
  using (public.current_user_can_train_profile(profile_id));

drop policy if exists "training_ai_write" on public.training_ai_generations;
create policy "training_ai_write" on public.training_ai_generations
  for all to authenticated
  using (
    trainer_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    trainer_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_plans_select" on public.training_plans;
create policy "training_plans_select" on public.training_plans
  for select to authenticated
  using (public.current_user_can_train_profile(profile_id));

drop policy if exists "training_plans_write" on public.training_plans;
create policy "training_plans_write" on public.training_plans
  for all to authenticated
  using (
    trainer_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    trainer_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_workouts_select" on public.training_workouts;
create policy "training_workouts_select" on public.training_workouts
  for select to authenticated
  using (public.current_user_can_train_profile(profile_id));

drop policy if exists "training_workouts_write" on public.training_workouts;
create policy "training_workouts_write" on public.training_workouts
  for all to authenticated
  using (
    trainer_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    trainer_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );
