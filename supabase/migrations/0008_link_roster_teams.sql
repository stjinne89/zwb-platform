-- Koppel roster_entries aan echte teams (uit de CSV: ZRL A, ZRL A Dev, ZRL C).
-- Bij claim wordt de gebruiker automatisch lid van het bijbehorende team.

-- 1. Maak de drie ZRL-teams aan (idempotent: alleen als ze nog niet bestaan).
insert into public.teams (name, type, division, description)
values
  ('ZRL A', 'zrl', 'A', 'ZWB ZRL A — race-categorie A'),
  ('ZRL A Dev', 'zrl', 'A Dev', 'ZWB ZRL A Development — doorgroei naar categorie A'),
  ('ZRL C', 'zrl', 'C', 'ZWB ZRL C — race-categorie C')
on conflict do nothing;

-- 2. Voeg team_id FK toe aan roster_entries (naast bestaande text-veld team_name).
alter table public.roster_entries
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists roster_entries_team_idx on public.roster_entries (team_id);

-- 3. Vul team_id in op basis van team_name (case-insensitive match op team.name).
update public.roster_entries r
set team_id = t.id
from public.teams t
where r.team_id is null
  and r.team_name is not null
  and lower(t.name) = lower(r.team_name);

-- 4. Vervang claim-functie: zet claimed_by, vul profielvelden, EN voeg
--    toe aan team_members als entry een team heeft.
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
  v_team uuid;
begin
  update public.roster_entries
  set claimed_by = auth.uid()
  where id = p_entry_id and claimed_by is null
  returning zwift_id, pace_category, team_id into v_zwift, v_pace, v_team;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    return false;
  end if;

  -- Vul lege profielvelden vanuit roster.
  update public.profiles
  set
    zwift_id = coalesce(zwift_id, v_zwift),
    zrl_category = coalesce(
      zrl_category,
      case when v_pace in ('A','B','C','D','E') then v_pace else null end
    )
  where id = auth.uid();

  -- Voeg toe aan team_members als de entry aan een team gekoppeld is.
  if v_team is not null then
    insert into public.team_members (team_id, profile_id, role)
    values (v_team, auth.uid(), 'member')
    on conflict (team_id, profile_id) do nothing;
  end if;

  return true;
end;
$$;
