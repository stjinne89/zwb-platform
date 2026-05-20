-- Persistente achievement badges en week-awards.

create table if not exists public.achievement_badges (
  id text primary key,
  title text not null,
  description text not null,
  metric text not null,
  icon text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.achievement_awards (
  id uuid primary key default uuid_generate_v4(),
  badge_id text not null references public.achievement_badges(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  value numeric(12,2) not null,
  rank int not null default 1,
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists achievement_awards_unique_idx
  on public.achievement_awards (badge_id, profile_id, period_start);

create index if not exists achievement_awards_profile_idx
  on public.achievement_awards (profile_id, awarded_at desc);

create index if not exists achievement_awards_period_idx
  on public.achievement_awards (period_start desc, badge_id);

alter table public.achievement_badges enable row level security;
alter table public.achievement_awards enable row level security;

drop policy if exists "achievement_badges_select_authenticated" on public.achievement_badges;
create policy "achievement_badges_select_authenticated" on public.achievement_badges
  for select to authenticated using (true);

drop policy if exists "achievement_awards_select_authenticated" on public.achievement_awards;
create policy "achievement_awards_select_authenticated" on public.achievement_awards
  for select to authenticated using (true);

drop policy if exists "achievement_awards_admin_write" on public.achievement_awards;
create policy "achievement_awards_admin_write" on public.achievement_awards
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

insert into public.achievement_badges (id, title, description, metric, icon, color)
values
  ('climber_week', 'Klimmer van de week', 'Meeste hoogtemeters in een ZWB-week.', 'elevation_m', 'mountain', 'gold'),
  ('distance_week', 'Kilometervreter', 'Meeste kilometers in een ZWB-week.', 'distance_m', 'route', 'petrol'),
  ('kudos_received_week', 'Kudo-magneet', 'Meeste ontvangen kudos op gesyncte Strava-ritten.', 'kudos_received', 'heart', 'sage'),
  ('consistency_week', 'Meest actief', 'Meeste gesyncte fietsritten in een week.', 'activity_count', 'refresh', 'steel')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  metric = excluded.metric,
  icon = excluded.icon,
  color = excluded.color;
