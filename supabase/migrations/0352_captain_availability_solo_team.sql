-- Captain zet beschikbaarheid ook bij een team zonder subteams (2026-11-23).
--
-- 0332 liet dit alleen toe op de raceweek van een hoofdteam met subteams (ZRL B).
-- ZRL A en C hebben geen subteams: hun beschikbaarheid staat op de eigen race
-- van het team, dus daar kon een captain niets aantikken.
--
-- - Hoofdteam met subteams: ongewijzigd, alleen op een raceweek (hoofdevent).
-- - Hoofdteam zonder subteams: alleen op een ZRL-race van dat team zelf.
-- - Een subteam blijft geweigerd; zijn beschikbaarheid hoort bij het hoofdteam.
-- - Een eigen keuze van de renner blijft staan, zoals in 0332.

create or replace function public.set_team_availability_for(
  p_event_id uuid,
  p_team_id uuid,
  p_profile_id uuid,
  p_roster_entry_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_existing public.team_event_availability;
  v_has_subteams boolean;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd.';
  end if;
  if num_nonnulls(p_profile_id, p_roster_entry_id) <> 1 then
    raise exception 'Kies één renner.';
  end if;
  if p_status is not null and p_status not in ('available', 'maybe', 'unavailable') then
    raise exception 'Onbekende status.';
  end if;
  if not public.can_set_team_availability(p_team_id) then
    raise exception 'Alleen captains van dit team.';
  end if;
  if not exists (
    select 1 from public.teams t
    where t.id = p_team_id and t.parent_team_id is null
  ) then
    raise exception 'Alleen voor een hoofdteam.';
  end if;

  select exists (select 1 from public.teams c where c.parent_team_id = p_team_id)
  into v_has_subteams;

  if v_has_subteams then
    if not exists (
      select 1 from public.events e
      where e.id = p_event_id and e.type = 'zrl' and e.parent_event_id is null
    ) then
      raise exception 'Alleen voor een raceweek.';
    end if;
  elsif not exists (
    select 1 from public.events e
    where e.id = p_event_id and e.type = 'zrl' and e.team_id = p_team_id
  ) then
    raise exception 'Alleen voor een race van dit team.';
  end if;

  select * into v_existing
  from public.team_event_availability a
  where a.event_id = p_event_id
    and a.team_id = p_team_id
    and (
      (p_profile_id is not null and a.profile_id = p_profile_id)
      or (p_roster_entry_id is not null and a.roster_entry_id = p_roster_entry_id)
    );

  -- Een eigen keuze van de renner gaat voor.
  if found and v_existing.profile_id is not null and v_existing.set_by is null
    and v_existing.profile_id <> auth.uid()
  then
    return false;
  end if;

  if p_status is null then
    if found then
      delete from public.team_event_availability where id = v_existing.id;
    end if;
    return true;
  end if;

  if found then
    update public.team_event_availability
    set status = p_status, set_by = auth.uid(), updated_at = now()
    where id = v_existing.id;
  else
    insert into public.team_event_availability
      (event_id, team_id, profile_id, roster_entry_id, status, set_by, updated_at)
    values
      (p_event_id, p_team_id, p_profile_id, p_roster_entry_id, p_status, auth.uid(), now());
  end if;
  return true;
end;
$$;

revoke all on function public.set_team_availability_for(uuid, uuid, uuid, uuid, text) from public, anon;
grant execute on function public.set_team_availability_for(uuid, uuid, uuid, uuid, text) to authenticated;

-- Controle na het toepassen (verwacht: true).
-- select pg_get_functiondef('public.set_team_availability_for(uuid, uuid, uuid, uuid, text)'::regprocedure)
--   like '%Alleen voor een race van dit team%' as toegepast;
