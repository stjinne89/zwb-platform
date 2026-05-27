-- Repair/idempotent poll schema.
-- 0033 originally contained an invalid partial index with a subquery, which can
-- roll back the whole migration. This file safely creates the poll tables for
-- environments where that happened.

create table if not exists public.polls (
  id uuid primary key default uuid_generate_v4(),
  scope text not null check (scope in ('free', 'event', 'team')) default 'free',
  scope_id uuid,
  question text not null,
  description_md text,
  multi_select boolean not null default false,
  closes_at timestamptz,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists polls_scope_idx
  on public.polls (scope, scope_id, created_at desc);

create index if not exists polls_active_recent_idx
  on public.polls (active, created_at desc);

create table if not exists public.poll_options (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  display_order int not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists poll_options_poll_order_idx
  on public.poll_options (poll_id, display_order);

create table if not exists public.poll_votes (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists poll_votes_poll_profile_idx
  on public.poll_votes (poll_id, profile_id);

create unique index if not exists poll_votes_multi_unique
  on public.poll_votes (poll_id, option_id, profile_id);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

drop policy if exists "polls_members_read" on public.polls;
create policy "polls_members_read" on public.polls
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

drop policy if exists "poll_options_members_read" on public.poll_options;
create policy "poll_options_members_read" on public.poll_options
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

drop policy if exists "poll_votes_members_read" on public.poll_votes;
create policy "poll_votes_members_read" on public.poll_votes
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

drop policy if exists "poll_votes_own_insert" on public.poll_votes;
create policy "poll_votes_own_insert" on public.poll_votes
  for insert to authenticated with check (
    auth.uid() = profile_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
    and exists (
      select 1 from public.polls p
      where p.id = poll_id and p.active
        and (p.closes_at is null or p.closes_at > now())
    )
  );

drop policy if exists "poll_votes_own_delete" on public.poll_votes;
create policy "poll_votes_own_delete" on public.poll_votes
  for delete to authenticated using (
    auth.uid() = profile_id
    and exists (
      select 1 from public.polls p
      where p.id = poll_id and p.active
        and (p.closes_at is null or p.closes_at > now())
    )
  );

create or replace function public.set_updated_at_polls()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists polls_updated_at on public.polls;
create trigger polls_updated_at
  before update on public.polls
  for each row execute function public.set_updated_at_polls();

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
      'polls.manage'
    ]::text[]
  );

update public.community_role_permissions
set permissions = array_append(permissions, 'polls.manage')
where role in ('board', 'community_manager', 'event_organizer', 'team_captain')
  and not ('polls.manage' = any(permissions));
