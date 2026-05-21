-- Communityrollen voor leden.
-- is_admin blijft voorlopig de technische beheerknop; community_roles is de
-- inhoudelijke rolstructuur waar we later fijnmazige rechten aan kunnen hangen.

alter table public.profiles
  add column if not exists community_roles text[] not null default array['community_member']::text[];

alter table public.profiles
  drop constraint if exists profiles_community_roles_allowed;

update public.profiles
set community_roles = array['community_member']::text[]
where community_roles is null or cardinality(community_roles) = 0;

alter table public.profiles
  add constraint profiles_community_roles_allowed
  check (
    cardinality(community_roles) > 0
    and community_roles <@ array[
      'board',
      'team_captain',
      'event_organizer',
      'community_manager',
      'paying_member',
      'community_member'
    ]::text[]
  );

-- Bestaande technische admins krijgen een inhoudelijke beheerrol als startpunt.
update public.profiles
set community_roles = (
  select array_agg(distinct role_name order by role_name)
  from unnest(community_roles || array['community_manager']::text[]) as roles(role_name)
)
where is_admin
  and not ('community_manager' = any(community_roles));

create index if not exists profiles_community_roles_idx
  on public.profiles using gin (community_roles);

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

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

  if new.is_admin is distinct from old.is_admin
    or new.community_roles is distinct from old.community_roles
    or new.is_approved is distinct from old.is_approved
    or new.approved_at is distinct from old.approved_at
    or new.approved_by is distinct from old.approved_by then
    raise exception 'Alleen admins kunnen ledenrollen en goedkeuringsvelden wijzigen.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_admin_fields on public.profiles;
create trigger profiles_protect_admin_fields
  before update on public.profiles
  for each row execute function public.protect_profile_admin_fields();
