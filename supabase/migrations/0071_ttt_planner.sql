-- TTT planner: saved ZwiftGopher plans per team/event.

create table if not exists public.ttt_plans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  parent_team_id uuid not null references public.teams(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  name text not null,
  route text not null default 'next_zrl',
  target_speed numeric(5,2),
  intensity int not null default 0 check (intensity between -3 and 3),
  efficiency int not null default 0 check (efficiency between -2 and 2),
  allow_zero_pulls boolean not null default false,
  min_pull_duration int not null default 30 check (min_pull_duration between 10 and 120),
  max_pull_duration int not null default 180 check (max_pull_duration between 30 and 600),
  duration_interval int not null default 15 check (duration_interval in (10, 15)),
  optimization_strategy text not null default 'variable'
    check (optimization_strategy in ('variable', 'fixed')),
  status text not null default 'draft'
    check (status in ('draft', 'optimized', 'error')),
  api_response jsonb,
  export_snapshot jsonb not null default '{}'::jsonb,
  last_error text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  optimized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ttt_plans_team_event_idx
  on public.ttt_plans (parent_team_id, event_id, updated_at desc);

create table if not exists public.ttt_plan_riders (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.ttt_plans(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  is_manual boolean not null default false,
  zwift_id text,
  name text not null,
  ftp_watts int check (ftp_watts is null or (ftp_watts > 0 and ftp_watts < 1200)),
  weight_kg numeric(5,2) check (weight_kg is null or (weight_kg > 0 and weight_kg < 300)),
  height_cm int check (height_cm is null or (height_cm between 100 and 230)),
  power_300_watts int check (power_300_watts is null or (power_300_watts > 0 and power_300_watts < 2000)),
  pull_watts int check (pull_watts is null or (pull_watts > 0 and pull_watts < 2000)),
  pull_duration_seconds int check (pull_duration_seconds is null or (pull_duration_seconds between 0 and 1200)),
  display_order int not null default 0,
  role text,
  notes text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ttt_plan_riders_plan_order_idx
  on public.ttt_plan_riders (plan_id, display_order);

alter table public.ttt_plans enable row level security;
alter table public.ttt_plan_riders enable row level security;

create or replace function public.can_read_ttt_plan(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ttt_plans p
    where p.id = p_plan_id
      and (
        public.current_user_has_permission('teams.manage_roster')
        or exists (
          select 1
          from public.team_members tm
          where tm.profile_id = auth.uid()
            and tm.team_id in (p.parent_team_id, coalesce(p.team_id, p.parent_team_id))
        )
      )
  );
$$;

create or replace function public.can_manage_ttt_plan(p_parent_team_id uuid, p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_has_permission('teams.manage_roster')
    or exists (
      select 1
      from public.team_members tm
      where tm.profile_id = auth.uid()
        and tm.team_id in (p_parent_team_id, coalesce(p_team_id, p_parent_team_id))
        and tm.role in ('captain', 'co-captain')
    );
$$;

drop policy if exists "ttt_plans_select_team" on public.ttt_plans;
create policy "ttt_plans_select_team" on public.ttt_plans
  for select to authenticated
  using (public.can_read_ttt_plan(id));

drop policy if exists "ttt_plans_insert_captain" on public.ttt_plans;
create policy "ttt_plans_insert_captain" on public.ttt_plans
  for insert to authenticated
  with check (public.can_manage_ttt_plan(parent_team_id, team_id));

drop policy if exists "ttt_plans_update_captain" on public.ttt_plans;
create policy "ttt_plans_update_captain" on public.ttt_plans
  for update to authenticated
  using (public.can_manage_ttt_plan(parent_team_id, team_id))
  with check (public.can_manage_ttt_plan(parent_team_id, team_id));

drop policy if exists "ttt_plans_delete_captain" on public.ttt_plans;
create policy "ttt_plans_delete_captain" on public.ttt_plans
  for delete to authenticated
  using (public.can_manage_ttt_plan(parent_team_id, team_id));

drop policy if exists "ttt_plan_riders_select_team" on public.ttt_plan_riders;
create policy "ttt_plan_riders_select_team" on public.ttt_plan_riders
  for select to authenticated
  using (public.can_read_ttt_plan(plan_id));

drop policy if exists "ttt_plan_riders_insert_captain" on public.ttt_plan_riders;
create policy "ttt_plan_riders_insert_captain" on public.ttt_plan_riders
  for insert to authenticated
  with check (
    exists (
      select 1 from public.ttt_plans p
      where p.id = plan_id and public.can_manage_ttt_plan(p.parent_team_id, p.team_id)
    )
  );

drop policy if exists "ttt_plan_riders_update_captain" on public.ttt_plan_riders;
create policy "ttt_plan_riders_update_captain" on public.ttt_plan_riders
  for update to authenticated
  using (
    exists (
      select 1 from public.ttt_plans p
      where p.id = plan_id and public.can_manage_ttt_plan(p.parent_team_id, p.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.ttt_plans p
      where p.id = plan_id and public.can_manage_ttt_plan(p.parent_team_id, p.team_id)
    )
  );

drop policy if exists "ttt_plan_riders_delete_captain" on public.ttt_plan_riders;
create policy "ttt_plan_riders_delete_captain" on public.ttt_plan_riders
  for delete to authenticated
  using (
    exists (
      select 1 from public.ttt_plans p
      where p.id = plan_id and public.can_manage_ttt_plan(p.parent_team_id, p.team_id)
    )
  );

drop trigger if exists ttt_plans_touch on public.ttt_plans;
create trigger ttt_plans_touch
  before update on public.ttt_plans
  for each row execute function public.touch_team_roster_updated_at();

drop trigger if exists ttt_plan_riders_touch on public.ttt_plan_riders;
create trigger ttt_plan_riders_touch
  before update on public.ttt_plan_riders
  for each row execute function public.touch_team_roster_updated_at();
