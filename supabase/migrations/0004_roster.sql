-- Legacy roster van bestaande ZWB-leden (uit Google Sheet).
-- Mensen kunnen hun eigen vermelding claimen → entry wordt gelinkt aan profile
-- en lege profielvelden worden aangevuld.

create table public.roster_entries (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  zwift_id text,
  pace_category text,
  team_name text,
  claimed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index roster_entries_name_lower_idx on public.roster_entries (lower(name));
create index roster_entries_claimed_idx on public.roster_entries (claimed_by);

alter table public.roster_entries enable row level security;

create policy "roster_select_authenticated" on public.roster_entries
  for select to authenticated using (true);

create policy "roster_admin_insert" on public.roster_entries
  for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

create policy "roster_admin_update" on public.roster_entries
  for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

create policy "roster_admin_delete" on public.roster_entries
  for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- Claim function: any authenticated user can claim ONE unclaimed entry.
-- Auto-fills empty profile fields from roster data.
create or replace function public.claim_roster_entry(p_entry_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_zwift text;
  v_pace text;
begin
  update public.roster_entries
  set claimed_by = auth.uid()
  where id = p_entry_id and claimed_by is null
  returning zwift_id, pace_category into v_zwift, v_pace;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    return false;
  end if;

  -- Fill missing profile fields from the roster.
  update public.profiles
  set
    zwift_id = coalesce(zwift_id, v_zwift),
    zrl_category = coalesce(
      zrl_category,
      case when v_pace in ('A','B','C','D','E') then v_pace else null end
    )
  where id = auth.uid();

  return true;
end;
$$;

grant execute on function public.claim_roster_entry(uuid) to authenticated;

-- Inverse: unclaim (in case of mistake). Anyone may unclaim their own.
create or replace function public.unclaim_roster_entry(p_entry_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  update public.roster_entries
  set claimed_by = null
  where id = p_entry_id and claimed_by = auth.uid();
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

grant execute on function public.unclaim_roster_entry(uuid) to authenticated;
