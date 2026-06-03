-- Automatische ZRL-parentteamindeling op basis van profielcategorie.
-- Handmatige keuzes blijven leidend via assignment_source + seed-overrides.

alter table public.profiles
  add column if not exists zrl_division text not null default 'open'
    check (zrl_division in ('open', 'women'));

alter table public.team_members
  add column if not exists assignment_source text not null default 'manual'
    check (assignment_source in ('manual', 'roster_claim', 'auto_zrl_category'));

alter table public.roster_entries
  add column if not exists team_assignment_source text not null default 'auto_zrl_category'
    check (team_assignment_source in ('manual', 'manual_excluded', 'roster_sync', 'auto_zrl_category'));

update public.roster_entries
set team_assignment_source = 'manual'
where team_id is not null
  and team_assignment_source = 'auto_zrl_category';

create table if not exists public.team_member_seed_overrides (
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  excluded boolean not null default true,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

alter table public.team_member_seed_overrides enable row level security;

drop policy if exists "team_seed_overrides_select_authenticated" on public.team_member_seed_overrides;
create policy "team_seed_overrides_select_authenticated"
  on public.team_member_seed_overrides
  for select to authenticated using (true);

drop policy if exists "team_seed_overrides_manage_roster" on public.team_member_seed_overrides;
create policy "team_seed_overrides_manage_roster"
  on public.team_member_seed_overrides
  for all to authenticated
  using (public.current_user_has_permission('teams.manage_roster'))
  with check (public.current_user_has_permission('teams.manage_roster'));

insert into public.teams (name, type, division, description)
select v.name, 'zrl', v.division, v.description
from (
  values
    ('ZRL A', 'A', 'ZWB ZRL A - race-categorie A'),
    ('ZRL B', 'B', 'ZWB ZRL B - race-categorie B'),
    ('ZRL C', 'C', 'ZWB ZRL C - race-categorie C'),
    ('ZRL Zwiftladies', 'Women', 'ZWB Zwiftladies in ZRL')
) as v(name, division, description)
where not exists (
  select 1 from public.teams t where lower(t.name) = lower(v.name)
);

-- Bestaande Zwiftladies-bronnen/leden markeren als damesdivisie.
update public.profiles p
set zrl_division = 'women'
where zrl_division <> 'women'
  and (
    exists (
      select 1
      from public.roster_entries r
      where r.claimed_by = p.id
        and (
          r.name ilike '%zwiftladies%'
          or coalesce(r.team_name, '') ilike '%zwiftladies%'
        )
    )
    or exists (
      select 1
      from public.team_members tm
      join public.teams t on t.id = tm.team_id
      where tm.profile_id = p.id
        and t.name ilike '%zwiftladies%'
    )
  );

create or replace function public.sync_zrl_parent_team_membership(p_profile_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_target_name text;
  v_target_team_id uuid;
  v_inserted int := 0;
begin
  select * into v_profile
  from public.profiles
  where id = p_profile_id;

  if not found then
    return 0;
  end if;

  if not coalesce(v_profile.is_approved, false)
     or v_profile.zrl_category not in ('A', 'B', 'C') then
    delete from public.team_members tm
    using public.teams t
    where t.id = tm.team_id
      and tm.profile_id = p_profile_id
      and tm.assignment_source = 'auto_zrl_category'
      and lower(t.name) in ('zrl a', 'zrl b', 'zrl c', 'zrl zwiftladies');
    return 0;
  end if;

  v_target_name := case
    when v_profile.zrl_division = 'women' then 'ZRL Zwiftladies'
    else 'ZRL ' || v_profile.zrl_category
  end;

  select id into v_target_team_id
  from public.teams
  where lower(name) = lower(v_target_name)
    and parent_team_id is null
  order by created_at
  limit 1;

  if v_target_team_id is null then
    return 0;
  end if;

  delete from public.team_members tm
  using public.teams t
  where t.id = tm.team_id
    and tm.profile_id = p_profile_id
    and tm.assignment_source = 'auto_zrl_category'
    and lower(t.name) in ('zrl a', 'zrl b', 'zrl c', 'zrl zwiftladies')
    and tm.team_id <> v_target_team_id;

  if exists (
    select 1
    from public.team_member_seed_overrides o
    where o.team_id = v_target_team_id
      and o.profile_id = p_profile_id
      and o.excluded
  ) then
    return 0;
  end if;

  insert into public.team_members (team_id, profile_id, role, assignment_source)
  values (v_target_team_id, p_profile_id, 'member', 'auto_zrl_category')
  on conflict (team_id, profile_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.sync_all_zrl_parent_team_memberships()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_inserted int := 0;
begin
  for v_profile_id in select id from public.profiles loop
    v_inserted := v_inserted + public.sync_zrl_parent_team_membership(v_profile_id);
  end loop;
  return v_inserted;
end;
$$;

create or replace function public.sync_zrl_parent_roster_entries()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry record;
  v_category text;
  v_target_name text;
  v_target_team_id uuid;
  v_changed int := 0;
  v_row_count int := 0;
begin
  for v_entry in
    select id, name, team_name, pace_category, team_id, team_assignment_source
    from public.roster_entries
    where claimed_by is null
      and team_assignment_source in ('auto_zrl_category')
  loop
    v_category := case
      when upper(coalesce(v_entry.pace_category, '')) like 'A%' then 'A'
      when upper(coalesce(v_entry.pace_category, '')) = 'B' then 'B'
      when upper(coalesce(v_entry.pace_category, '')) = 'C' then 'C'
      else null
    end;

    if v_category is null then
      update public.roster_entries
      set team_id = null
      where id = v_entry.id
        and team_id is not null;
      get diagnostics v_row_count = row_count;
      v_changed := v_changed + v_row_count;
      continue;
    end if;

    v_target_name := case
      when v_entry.name ilike '%zwiftladies%'
        or coalesce(v_entry.team_name, '') ilike '%zwiftladies%'
        then 'ZRL Zwiftladies'
      else 'ZRL ' || v_category
    end;

    select id into v_target_team_id
    from public.teams
    where lower(name) = lower(v_target_name)
      and parent_team_id is null
    order by created_at
    limit 1;

    if v_target_team_id is null then
      continue;
    end if;

    update public.roster_entries
    set team_id = v_target_team_id,
        team_name = coalesce(team_name, v_target_name),
        team_assignment_source = 'auto_zrl_category'
    where id = v_entry.id
      and team_id is distinct from v_target_team_id;
    get diagnostics v_row_count = row_count;
    v_changed := v_changed + v_row_count;
  end loop;

  return v_changed;
end;
$$;

create or replace function public.handle_zrl_parent_team_seed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_zrl_parent_team_membership(new.id);
  return new;
end;
$$;

drop trigger if exists profiles_zrl_parent_team_seed on public.profiles;
create trigger profiles_zrl_parent_team_seed
  after insert or update of zrl_category, zrl_division, is_approved on public.profiles
  for each row execute function public.handle_zrl_parent_team_seed();

create or replace function public.claim_roster_entry(p_entry_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_name text;
  v_zwift text;
  v_pace text;
  v_team uuid;
  v_team_name text;
begin
  update public.roster_entries
  set claimed_by = auth.uid()
  where id = p_entry_id and claimed_by is null
  returning name, zwift_id, pace_category, team_id, team_name
    into v_name, v_zwift, v_pace, v_team, v_team_name;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    return false;
  end if;

  update public.profiles
  set
    zwift_id = coalesce(zwift_id, v_zwift),
    zrl_category = coalesce(
      zrl_category,
      case when v_pace in ('A','B','C','D','E') then v_pace else null end
    ),
    zrl_division = case
      when v_name ilike '%zwiftladies%' or coalesce(v_team_name, '') ilike '%zwiftladies%'
        then 'women'
      else zrl_division
    end
  where id = auth.uid();

  if v_team is not null then
    insert into public.team_members (team_id, profile_id, role, assignment_source)
    values (v_team, auth.uid(), 'member', 'roster_claim')
    on conflict (team_id, profile_id) do nothing;
  end if;

  perform public.sync_zrl_parent_team_membership(auth.uid());
  return true;
end;
$$;

grant execute on function public.sync_zrl_parent_team_membership(uuid) to authenticated;
grant execute on function public.sync_all_zrl_parent_team_memberships() to authenticated;
grant execute on function public.sync_zrl_parent_roster_entries() to authenticated;
grant execute on function public.claim_roster_entry(uuid) to authenticated;

select public.sync_all_zrl_parent_team_memberships();
select public.sync_zrl_parent_roster_entries();
