-- Rechten per communityrol.
-- Deze tabel maakt rollen configureerbaar in de app. is_admin blijft voorlopig
-- de technische superuser en mag deze matrix beheren.

create table if not exists public.community_role_permissions (
  role text primary key,
  permissions text[] not null default array[]::text[],
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
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
      'live.manage'
    ]::text[]
  );

insert into public.community_role_permissions (role, permissions)
values
  (
    'board',
    array[
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
      'live.manage'
    ]::text[]
  ),
  (
    'team_captain',
    array[
      'events.create',
      'teams.manage_roster',
      'teams.manage_results',
      'content.create_posts',
      'live.start'
    ]::text[]
  ),
  (
    'event_organizer',
    array[
      'events.create',
      'content.create_posts',
      'live.start'
    ]::text[]
  ),
  (
    'community_manager',
    array[
      'events.create',
      'events.manage_all',
      'content.create_posts',
      'content.moderate_posts',
      'media.manage',
      'community.manage',
      'members.approve',
      'members.manage_roles',
      'achievements.finalize',
      'live.start',
      'live.manage'
    ]::text[]
  ),
  (
    'paying_member',
    array[
      'events.create',
      'content.create_posts',
      'live.start'
    ]::text[]
  ),
  (
    'community_member',
    array[
      'content.create_posts',
      'live.start'
    ]::text[]
  )
on conflict (role) do nothing;

create index if not exists community_role_permissions_permissions_idx
  on public.community_role_permissions using gin (permissions);

alter table public.community_role_permissions enable row level security;

drop policy if exists "community_role_permissions_select_authenticated" on public.community_role_permissions;
create policy "community_role_permissions_select_authenticated"
  on public.community_role_permissions
  for select to authenticated using (true);

drop policy if exists "community_role_permissions_admin_insert" on public.community_role_permissions;
create policy "community_role_permissions_admin_insert"
  on public.community_role_permissions
  for insert to authenticated
  with check (public.current_user_is_admin());

drop policy if exists "community_role_permissions_admin_update" on public.community_role_permissions;
create policy "community_role_permissions_admin_update"
  on public.community_role_permissions
  for update to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create or replace function public.touch_community_role_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists community_role_permissions_touch on public.community_role_permissions;
create trigger community_role_permissions_touch
  before insert or update on public.community_role_permissions
  for each row execute function public.touch_community_role_permissions();

create or replace function public.current_user_permissions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct permission), array[]::text[])
  from public.profiles p
  cross join lateral unnest(p.community_roles) as role_name(role)
  join public.community_role_permissions rp on rp.role = role_name.role
  cross join lateral unnest(rp.permissions) as permission_name(permission)
  where p.id = auth.uid();
$$;

create or replace function public.current_user_has_permission(permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_admin()
    or permission = any(public.current_user_permissions());
$$;

-- ---------- RLS koppelen aan configureerbare rechten ----------

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using (
    public.current_user_has_permission('members.approve')
    or public.current_user_has_permission('members.manage_roles')
  )
  with check (
    public.current_user_has_permission('members.approve')
    or public.current_user_has_permission('members.manage_roles')
  );

create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_is_admin() then
    return new;
  end if;

  if (new.is_admin is distinct from old.is_admin
      or new.community_roles is distinct from old.community_roles)
    and not public.current_user_has_permission('members.manage_roles') then
    raise exception 'Geen recht om ledenrollen te wijzigen.';
  end if;

  if (new.is_approved is distinct from old.is_approved
      or new.approved_at is distinct from old.approved_at
      or new.approved_by is distinct from old.approved_by)
    and not public.current_user_has_permission('members.approve') then
    raise exception 'Geen recht om leden goed te keuren.';
  end if;

  return new;
end;
$$;

drop policy if exists "events_insert_authenticated" on public.events;
create policy "events_insert_with_permission" on public.events
  for insert to authenticated
  with check (
    auth.uid() = created_by
    and public.current_user_has_permission('events.create')
  );

drop policy if exists "events_update_own_or_admin" on public.events;
create policy "events_update_own_or_permission" on public.events
  for update to authenticated
  using (
    auth.uid() = created_by
    or public.current_user_has_permission('events.manage_all')
  );

drop policy if exists "events_delete_own_or_admin" on public.events;
create policy "events_delete_own_or_permission" on public.events
  for delete to authenticated
  using (
    auth.uid() = created_by
    or public.current_user_has_permission('events.manage_all')
  );

drop policy if exists "teams_admin_write" on public.teams;
create policy "teams_permission_write" on public.teams
  for all to authenticated
  using (
    public.current_user_has_permission('teams.create')
    or public.current_user_has_permission('teams.manage_roster')
  )
  with check (
    public.current_user_has_permission('teams.create')
    or public.current_user_has_permission('teams.manage_roster')
  );

drop policy if exists "team_members_admin_or_captain_write" on public.team_members;
create policy "team_members_permission_or_captain_write" on public.team_members
  for all to authenticated
  using (
    public.current_user_has_permission('teams.manage_roster')
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id
        and tm.profile_id = auth.uid()
        and tm.role in ('captain','co-captain')
    )
  )
  with check (
    public.current_user_has_permission('teams.manage_roster')
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id
        and tm.profile_id = auth.uid()
        and tm.role in ('captain','co-captain')
    )
  );

drop policy if exists "team_results_admin_or_captain_write" on public.team_results;
create policy "team_results_permission_or_captain_write" on public.team_results
  for all to authenticated
  using (
    public.current_user_has_permission('teams.manage_results')
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = team_results.team_id
        and tm.profile_id = auth.uid()
        and tm.role in ('captain','co-captain')
    )
  )
  with check (
    public.current_user_has_permission('teams.manage_results')
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = team_results.team_id
        and tm.profile_id = auth.uid()
        and tm.role in ('captain','co-captain')
    )
  );

drop policy if exists "roster_admin_insert" on public.roster_entries;
create policy "roster_members_permission_insert" on public.roster_entries
  for insert to authenticated
  with check (public.current_user_has_permission('members.manage_roles'));

drop policy if exists "roster_admin_update" on public.roster_entries;
create policy "roster_members_permission_update" on public.roster_entries
  for update to authenticated
  using (public.current_user_has_permission('members.manage_roles'))
  with check (public.current_user_has_permission('members.manage_roles'));

drop policy if exists "roster_admin_delete" on public.roster_entries;
create policy "roster_members_permission_delete" on public.roster_entries
  for delete to authenticated
  using (public.current_user_has_permission('members.manage_roles'));

drop policy if exists "team_result_sources_admin_write" on public.team_result_sources;
create policy "team_result_sources_permission_write" on public.team_result_sources
  for all to authenticated
  using (public.current_user_has_permission('teams.sync_sources'))
  with check (public.current_user_has_permission('teams.sync_sources'));

drop policy if exists "wa_groups_admin_write" on public.whatsapp_groups;
create policy "wa_groups_permission_write" on public.whatsapp_groups
  for all to authenticated
  using (public.current_user_has_permission('community.manage'))
  with check (public.current_user_has_permission('community.manage'));

drop policy if exists "announcements_admin_write" on public.announcements;
create policy "announcements_permission_write" on public.announcements
  for all to authenticated
  using (public.current_user_has_permission('community.manage'))
  with check (public.current_user_has_permission('community.manage'));

drop policy if exists "posts_update_own_or_admin" on public.posts;
create policy "posts_update_own_or_moderator" on public.posts
  for update to authenticated
  using (
    auth.uid() = author_id
    or public.current_user_has_permission('content.moderate_posts')
  );

drop policy if exists "posts_delete_own_or_admin" on public.posts;
create policy "posts_delete_own_or_moderator" on public.posts
  for delete to authenticated
  using (
    auth.uid() = author_id
    or public.current_user_has_permission('content.moderate_posts')
  );

drop policy if exists "comments_delete_own_or_admin" on public.post_comments;
create policy "comments_delete_own_or_moderator" on public.post_comments
  for delete to authenticated
  using (
    auth.uid() = author_id
    or public.current_user_has_permission('content.moderate_posts')
  );

drop policy if exists "achievement_awards_admin_write" on public.achievement_awards;
create policy "achievement_awards_permission_write" on public.achievement_awards
  for all to authenticated
  using (public.current_user_has_permission('achievements.finalize'))
  with check (public.current_user_has_permission('achievements.finalize'));

drop policy if exists "media_admin_write" on public.media_items;
create policy "media_permission_write" on public.media_items
  for all to authenticated
  using (public.current_user_has_permission('media.manage'))
  with check (public.current_user_has_permission('media.manage'));

drop policy if exists "community_role_permissions_admin_insert" on public.community_role_permissions;
create policy "community_role_permissions_permission_insert"
  on public.community_role_permissions
  for insert to authenticated
  with check (public.current_user_has_permission('roles.manage_permissions'));

drop policy if exists "community_role_permissions_admin_update" on public.community_role_permissions;
create policy "community_role_permissions_permission_update"
  on public.community_role_permissions
  for update to authenticated
  using (public.current_user_has_permission('roles.manage_permissions'))
  with check (public.current_user_has_permission('roles.manage_permissions'));

drop policy if exists "live_sessions_insert_own" on public.live_sessions;
create policy "live_sessions_insert_with_permission" on public.live_sessions
  for insert to authenticated with check (
    auth.uid() = profile_id
    and visibility = 'members'
    and public.current_user_has_permission('live.start')
  );
