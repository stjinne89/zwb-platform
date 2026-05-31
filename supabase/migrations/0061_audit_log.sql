-- F7 — Audit-log voor gevoelige wijzigingen (rol-permissies, admin-/goedkeurings-
-- vlaggen). Geeft naspeurbaarheid wie wat wanneer wijzigde. Read-only voor
-- beheerders; rijen worden alleen door triggers (security definer) geschreven.

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,        -- bv. 'community_role_permissions.update'
  entity text not null,        -- tabel/entiteit
  entity_id text,              -- sleutel van de geraakte rij
  details jsonb,               -- oude/nieuwe waarden (beknopt)
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id);

alter table public.audit_log enable row level security;

-- Alleen wie rollen/permissies mag beheren (of admin) leest de audit-log.
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.current_user_has_permission('roles.manage_permissions'));

-- Wijzigingen aan rol-permissies loggen.
create or replace function public.log_role_permission_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (
    auth.uid(),
    'community_role_permissions.' || lower(tg_op),
    'community_role_permissions',
    coalesce(new.role, old.role),
    jsonb_build_object(
      'old', case when old is null then null else to_jsonb(old) end,
      'new', case when new is null then null else to_jsonb(new) end
    )
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_role_permissions on public.community_role_permissions;
create trigger trg_audit_role_permissions
  after insert or update or delete on public.community_role_permissions
  for each row execute function public.log_role_permission_change();

-- Wijzigingen aan profiel-machtsvelden (is_admin / is_approved) loggen.
create or replace function public.log_profile_privilege_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.is_admin is distinct from old.is_admin)
     or (new.is_approved is distinct from old.is_approved) then
    insert into public.audit_log (actor_id, action, entity, entity_id, details)
    values (
      auth.uid(),
      'profiles.privilege_change',
      'profiles',
      new.id::text,
      jsonb_build_object(
        'is_admin', jsonb_build_object('old', old.is_admin, 'new', new.is_admin),
        'is_approved', jsonb_build_object('old', old.is_approved, 'new', new.is_approved)
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_profile_privileges on public.profiles;
create trigger trg_audit_profile_privileges
  after update on public.profiles
  for each row execute function public.log_profile_privilege_change();
