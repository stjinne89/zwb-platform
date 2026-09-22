-- De WTRL-import (migr. 0180) deelt renners ook echt in.
--
-- Wens van de eigenaar (2026-09-22): wie bij WTRL in een team staat, hoort ook in
-- het gekoppelde ZWB-team. Een renner met een ZWB-account wordt lid; een renner
-- zonder account komt in het rooster ("Nog niet geregistreerd") en wordt lid
-- zodra hij die naam claimt. Staat iemand niet meer bij WTRL in het team, dan gaat
-- hij eruit — maar alleen als hij er via WTRL in kwam.
--
-- Daarvoor een eigen herkomst 'wtrl', op lidmaatschappen en op rosternamen. Alleen
-- die rijen raakt de import bij het opruimen; 'manual', 'roster_claim' en
-- 'event_availability' blijven altijd staan.

-- team_members.assignment_source: de check op definitie vervangen, zoals 0171 en
-- 0172 dat deden.
do $$
declare
  v_constraint text;
begin
  for v_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'team_members'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%assignment_source%'
  loop
    execute format('alter table public.team_members drop constraint %I', v_constraint);
  end loop;
end;
$$;

alter table public.team_members
  add constraint team_members_assignment_source_check
    check (assignment_source in ('manual', 'roster_claim', 'event_availability', 'wtrl'));

-- roster_entries.team_assignment_source idem.
do $$
declare
  v_constraint text;
begin
  for v_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'roster_entries'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%team_assignment_source%'
  loop
    execute format('alter table public.roster_entries drop constraint %I', v_constraint);
  end loop;
end;
$$;

alter table public.roster_entries
  add constraint roster_entries_team_assignment_source_check
    check (team_assignment_source in (
      'manual',
      'manual_excluded',
      'roster_sync',
      'auto_zrl_category',
      'wtrl'
    ));

-- Claimen van een rosternaam: gelijk aan 0172, behalve de herkomst van het
-- lidmaatschap bij een naam uit de WTRL-import.
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
  v_team_source text;
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

  v_team_source := public.roster_entry_team_source(p_entry_id);

  if v_team is not null and coalesce(v_team_source, '') <> 'auto_zrl_category' then
    -- Een rosternaam uit de WTRL-import geeft een WTRL-lidmaatschap, zodat de
    -- volgende import hem ook weer kan opruimen als hij daar vertrekt.
    insert into public.team_members (team_id, profile_id, role, assignment_source)
    values (
      v_team,
      auth.uid(),
      'member',
      case when v_team_source = 'wtrl' then 'wtrl' else 'roster_claim' end
    )
    on conflict (team_id, profile_id) do nothing;
  end if;

  return true;
end;
$$;

grant execute on function public.claim_roster_entry(uuid) to authenticated;
