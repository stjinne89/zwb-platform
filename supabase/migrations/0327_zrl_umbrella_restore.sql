-- Een hoofdteam dat zijn laatste subteam kwijtraakt, rijdt weer zelf.
--
-- Aanleiding (2026-11-13): ZRL A kreeg op 2026-11-10 de subteams A1 en A2. De
-- trigger teams_become_umbrella (migr. 0179, 0323) maakte A daarmee paraplu en
-- gooide zijn twaalf eigen races weg; beschikbaarheid, opstellingen en
-- TTT-plannen verhuisden naar het hoofdevent van elke raceweek. Er komt toch
-- alleen één A-team. Archiveren van A1/A2 hielp niet: een gearchiveerd subteam
-- telt nog als subteam.
--
-- Dit is het omgekeerde van convert_zrl_umbrella_races, voor één team:
-- 1. per raceweek een eigen race onder het hoofdevent, voor de weken waarin het
--    team iets had staan (beschikbaarheid, opstelling, TTT-plan) en voor alle
--    komende weken;
-- 2. beschikbaarheid, opstellingen en TTT-plannen van het hoofdevent terug naar
--    die race.
--
-- Wat 0179 bij het weggooien al kwijt was, komt niet terug: Zwift-link en
-- routegegevens van de race, aanmeldingen (die werden beschikbaarheid),
-- berekende teamuitslagen en pacingplannen (on delete cascade).

create or replace function public.restore_zrl_team_races(p_team_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team record;
  v_week record;
  v_race_id uuid;
  v_title text;
  v_created integer := 0;
begin
  select id, name, type into v_team from public.teams where id = p_team_id;
  -- Bestaat niet (meer), is geen ZRL-team of heeft nog subteams: niets doen.
  if v_team.id is null or v_team.type <> 'zrl' then
    return 0;
  end if;
  if exists (select 1 from public.teams where parent_team_id = p_team_id) then
    return 0;
  end if;

  for v_week in
    select p.id, p.title, p.start_at, p.created_by
    from public.events p
    where p.type = 'zrl'
      and p.team_id is null
      and p.parent_event_id is null
      -- Alleen raceweken van een seizoen: hoofdevents met teamraces eronder.
      and exists (
        select 1 from public.events c
        where c.parent_event_id = p.id and c.team_id is not null
      )
      -- Het team rijdt deze week nog niet.
      and not exists (
        select 1 from public.events own
        where own.parent_event_id = p.id and own.team_id = p_team_id
      )
      and (
        p.start_at >= now()
        or exists (select 1 from public.team_event_availability a
                   where a.event_id = p.id and a.team_id = p_team_id)
        or exists (select 1 from public.team_event_lineups l
                   where l.event_id = p.id and l.parent_team_id = p_team_id)
        or exists (select 1 from public.ttt_plans t
                   where t.event_id = p.id and t.parent_team_id = p_team_id)
      )
    order by p.start_at
  loop
    -- "ZRL 2026/27 · R1 · W1 — Race of Truth" → "… · W1 · ZRL A — Race of Truth",
    -- gelijk aan de import (zrl-season.ts) plus het formaatlabel.
    v_title := case
      when position(' — ' in v_week.title) > 0 then
        split_part(v_week.title, ' — ', 1) || ' · ' || v_team.name || ' — '
          || substr(v_week.title, position(' — ' in v_week.title) + 3)
      else v_week.title || ' · ' || v_team.name
    end;

    insert into public.events (type, title, start_at, team_id, parent_event_id, created_by)
    values ('zrl', v_title, v_week.start_at, p_team_id, v_week.id, v_week.created_by)
    returning id into v_race_id;
    v_created := v_created + 1;

    update public.team_event_availability
    set event_id = v_race_id
    where event_id = v_week.id and team_id = p_team_id;

    update public.team_event_lineups
    set event_id = v_race_id
    where event_id = v_week.id and parent_team_id = p_team_id;

    update public.ttt_plans
    set event_id = v_race_id
    where event_id = v_week.id and parent_team_id = p_team_id;
  end loop;

  return v_created;
end;
$$;

revoke all on function public.restore_zrl_team_races(uuid) from public, anon, authenticated;
grant execute on function public.restore_zrl_team_races(uuid) to service_role;

-- Laatste subteam weg (verwijderd of losgekoppeld): hoofdteam rijdt weer zelf.
create or replace function public.handle_team_leaves_umbrella()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.parent_team_id is not null
    and (tg_op = 'DELETE' or new.parent_team_id is distinct from old.parent_team_id)
  then
    perform public.restore_zrl_team_races(old.parent_team_id);
  end if;
  return null;
end;
$$;

revoke all on function public.handle_team_leaves_umbrella() from public, anon, authenticated;

drop trigger if exists teams_leave_umbrella on public.teams;
create trigger teams_leave_umbrella
  after delete or update of parent_team_id on public.teams
  for each row execute function public.handle_team_leaves_umbrella();
