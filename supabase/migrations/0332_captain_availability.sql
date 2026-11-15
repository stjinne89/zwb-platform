-- Captain zet beschikbaarheid voor een raceweek (2026-11-15).
--
-- Niet iedereen gebruikt de app: een captain hoort via WhatsApp wie kan en zet
-- dat in de ZRL-ranglijst. Tot nu toe kon alleen de renner zelf schrijven
-- (team_event_availability_self_write) en had elke regel een profiel, dus een
-- rosternaam zonder account kon geen beschikbaarheid hebben.
--
-- - roster_entry_id: beschikbaarheid van een rosternaam; precies één van
--   profile_id en roster_entry_id, zoals team_event_lineups.
-- - set_by: wie het zette als dat niet de renner zelf was. Leeg = eigen keuze.
--   Schrijft de renner zelf, dan maakt een trigger set_by weer leeg.
-- - set_team_availability_for(): alleen voor captains en co-captains van het
--   hoofdteam of een subteam, en voor teams.manage_roster. Alleen op een
--   ZRL-raceweek (hoofdevent). Een eigen keuze van de renner blijft staan.
-- - Claimt iemand zijn rosternaam, dan gaat de beschikbaarheid mee (nog steeds
--   als gezet door de captain); een eigen regel voor dezelfde week wint.
-- - De team-join-trigger (0171) slaat regels zonder profiel over.

alter table public.team_event_availability
  alter column profile_id drop not null,
  add column if not exists roster_entry_id uuid references public.roster_entries(id) on delete cascade,
  add column if not exists set_by uuid references public.profiles(id) on delete set null;

alter table public.team_event_availability
  drop constraint if exists team_event_availability_one_rider;
alter table public.team_event_availability
  add constraint team_event_availability_one_rider
  check (num_nonnulls(profile_id, roster_entry_id) = 1);

create unique index if not exists team_event_availability_roster_key
  on public.team_event_availability (event_id, team_id, roster_entry_id)
  where roster_entry_id is not null;

-- Schrijft de renner zelf, dan is het zijn eigen keuze. Niet bij het
-- verhuizen van een rosterregel naar het profiel bij een claim: dan blijft
-- zichtbaar dat de captain het zette.
create or replace function public.team_event_availability_own_choice()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if tg_op = 'UPDATE' and old.roster_entry_id is not null then
    return new;
  end if;
  if new.profile_id is not null and new.profile_id = auth.uid() then
    new.set_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists team_event_availability_own_choice on public.team_event_availability;
create trigger team_event_availability_own_choice
  before insert or update on public.team_event_availability
  for each row execute function public.team_event_availability_own_choice();

-- 0171: alleen een profiel kan lid worden van een team.
create or replace function public.handle_team_availability_team_join()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Alleen 'available'. Misschien is geen toezegging, en 'unavailable' haalt een
  -- bestaand lidmaatschap er niet af: uit het team gaan doe je niet door één
  -- race te missen. Een rosternaam zonder account wordt geen lid.
  if new.status = 'available' and new.profile_id is not null then
    perform public.join_event_team_for_member(new.profile_id, new.event_id, new.team_id);
  end if;
  return new;
end;
$$;

-- Mag de ingelogde gebruiker de beschikbaarheid van dit hoofdteam zetten?
create or replace function public.can_set_team_availability(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    public.current_user_has_permission('teams.manage_roster')
    or exists (
      select 1
      from public.team_members tm
      join public.teams t on t.id = tm.team_id
      where tm.profile_id = auth.uid()
        and tm.role in ('captain', 'co-captain')
        and (t.id = p_team_id or t.parent_team_id = p_team_id)
    );
$$;

-- Zet (of wist, met p_status null) de beschikbaarheid van één renner voor een
-- raceweek. Geeft false als de renner het zelf al koos.
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
      and exists (select 1 from public.teams c where c.parent_team_id = t.id)
  ) then
    raise exception 'Alleen voor een hoofdteam met subteams.';
  end if;
  if not exists (
    select 1 from public.events e
    where e.id = p_event_id and e.type = 'zrl' and e.parent_event_id is null
  ) then
    raise exception 'Alleen voor een raceweek.';
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
revoke all on function public.can_set_team_availability(uuid) from public, anon;
grant execute on function public.can_set_team_availability(uuid) to authenticated;

-- Claim van een rosternaam: zijn beschikbaarheid gaat naar het profiel. Een
-- eigen regel van het profiel voor dezelfde week en hetzelfde team wint.
create or replace function public.move_roster_availability_on_claim()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if old.claimed_by is null and new.claimed_by is not null then
    delete from public.team_event_availability a
    where a.roster_entry_id = new.id
      and exists (
        select 1 from public.team_event_availability own
        where own.event_id = a.event_id
          and own.team_id = a.team_id
          and own.profile_id = new.claimed_by
      );
    update public.team_event_availability
    set profile_id = new.claimed_by, roster_entry_id = null, updated_at = now()
    where roster_entry_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists roster_entries_move_availability on public.roster_entries;
create trigger roster_entries_move_availability
  after update of claimed_by on public.roster_entries
  for each row execute function public.move_roster_availability_on_claim();

-- Controle na het toepassen (verwacht: de twee kolommen, de constraint en de
-- functies bestaan; bestaande regels hebben allemaal een profiel).
-- select count(*) filter (where profile_id is null) as zonder_profiel,
--        count(*) filter (where set_by is not null) as door_captain
-- from public.team_event_availability;
-- select proname from pg_proc
-- where proname in ('set_team_availability_for', 'can_set_team_availability',
--                   'move_roster_availability_on_claim', 'team_event_availability_own_choice');
