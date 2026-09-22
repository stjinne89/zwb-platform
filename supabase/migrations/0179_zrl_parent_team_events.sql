-- ZRL-hoofdteams zijn paraplu's: ze rijden geen races, ze organiseren.
--
-- Regel van de eigenaar (2026-09-22): een ZRL-team met subteams (B met B1/B2,
-- de Zwiftladies, en straks A en C zodra die subteams krijgen) start zelf niet in
-- een wedstrijd; dat doen de subteams. Leden melden zich per raceweek
-- beschikbaar bij het hoofdteam en de captain deelt ze in bij een subteam.
--
-- De import zette toch races neer voor hoofdteams, en daar hing het organiseren
-- aan (beschikbaarheid met team_id = hoofdteam, opstellingen met
-- parent_team_id = hoofdteam). Dat verhuist naar het hoofdevent van de raceweek
-- (migr. 0178); daarna gaan de races van het hoofdteam weg.
--
-- Een "ja" op een race van het hoofdteam wordt beschikbaarheid bij het hoofdteam
-- voor die raceweek (misschien blijft misschien, nee wordt niet beschikbaar),
-- tenzij het lid daar al iets had opgegeven. Trainingsblokken die aan zo'n race
-- hingen blijven in het schema staan, zonder koppeling (`on delete set null`).
--
-- Als functie, omdat het niet eenmalig is: krijgt een team later zijn eerste
-- subteam, dan zet de trigger onderaan zijn races op dezelfde manier om.

create or replace function public.convert_zrl_umbrella_races(p_team_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Hoofdteams: teams met minstens één subteam (of alleen het opgegeven team).
  create temporary table if not exists zrl_umbrellas (id uuid primary key) on commit drop;
  delete from zrl_umbrellas;
  insert into zrl_umbrellas (id)
  select distinct parent.id
  from public.teams parent
  join public.teams child on child.parent_team_id = parent.id
  where p_team_id is null or parent.id = p_team_id;

  -- ZRL-races onder een hoofdevent: die van het hoofdteam zelf en die van zijn
  -- subteams (beschikbaarheid op de pagina van het hoofdteam kon op beide).
  create temporary table if not exists zrl_week_races (
    event_id uuid primary key,
    parent_event_id uuid not null,
    team_id uuid not null
  ) on commit drop;
  delete from zrl_week_races;
  insert into zrl_week_races (event_id, parent_event_id, team_id)
  select e.id, e.parent_event_id, e.team_id
  from public.events e
  where e.type = 'zrl'
    and e.parent_event_id is not null
    and e.team_id is not null;

  -- 1. Beschikbaarheid bij het hoofdteam → hoofdevent. Bij dubbele opgave (race
  --    van B en van B1 in dezelfde week) wint de laatste.
  insert into public.team_event_availability
    (event_id, team_id, profile_id, status, note, updated_at)
  select distinct on (r.parent_event_id, a.team_id, a.profile_id)
    r.parent_event_id, a.team_id, a.profile_id, a.status, a.note, a.updated_at
  from public.team_event_availability a
  join zrl_week_races r on r.event_id = a.event_id
  where a.team_id in (select id from zrl_umbrellas)
  order by r.parent_event_id, a.team_id, a.profile_id, a.updated_at desc
  on conflict (event_id, team_id, profile_id) do nothing;

  delete from public.team_event_availability a
  using zrl_week_races r
  where r.event_id = a.event_id
    and a.team_id in (select id from zrl_umbrellas);

  -- 2. RSVP op een race van het hoofdteam → beschikbaarheid bij het hoofdteam.
  insert into public.team_event_availability
    (event_id, team_id, profile_id, status, updated_at)
  select distinct on (r.parent_event_id, r.team_id, v.profile_id)
    r.parent_event_id,
    r.team_id,
    v.profile_id,
    case v.status
      when 'yes' then 'available'
      when 'maybe' then 'maybe'
      else 'unavailable'
    end,
    v.updated_at
  from public.event_rsvps v
  join zrl_week_races r on r.event_id = v.event_id
  where r.team_id in (select id from zrl_umbrellas)
  order by r.parent_event_id, r.team_id, v.profile_id, v.updated_at desc
  on conflict (event_id, team_id, profile_id) do nothing;

  -- 3. Opstellingen van het hoofdteam → hoofdevent.
  insert into public.team_event_lineups
    (event_id, parent_team_id, team_id, profile_id, slot, role, note, selected_by, updated_at)
  select distinct on (r.parent_event_id, l.parent_team_id, l.profile_id)
    r.parent_event_id, l.parent_team_id, l.team_id, l.profile_id,
    l.slot, l.role, l.note, l.selected_by, l.updated_at
  from public.team_event_lineups l
  join zrl_week_races r on r.event_id = l.event_id
  where l.parent_team_id in (select id from zrl_umbrellas)
  order by r.parent_event_id, l.parent_team_id, l.profile_id, l.updated_at desc
  on conflict (event_id, parent_team_id, profile_id) do nothing;

  delete from public.team_event_lineups l
  using zrl_week_races r
  where r.event_id = l.event_id
    and l.parent_team_id in (select id from zrl_umbrellas);

  -- 4. TTT-plannen van het hoofdteam → hoofdevent.
  update public.ttt_plans p
  set event_id = r.parent_event_id
  from zrl_week_races r
  where r.event_id = p.event_id
    and p.parent_team_id in (select id from zrl_umbrellas);

  -- 5. De races van de hoofdteams zelf.
  delete from public.events e
  using zrl_week_races r
  where r.event_id = e.id
    and r.team_id in (select id from zrl_umbrellas);

  delete from zrl_week_races;
  delete from zrl_umbrellas;
end;
$$;

-- Alleen de trigger en deze migratie roepen de functie aan.
revoke all on function public.convert_zrl_umbrella_races(uuid) from public;

-- Een team dat een subteam krijgt, wordt paraplu.
create or replace function public.handle_team_becomes_umbrella()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_team_id is not null
    and (tg_op = 'INSERT' or new.parent_team_id is distinct from old.parent_team_id)
  then
    perform public.convert_zrl_umbrella_races(new.parent_team_id);
  end if;
  return new;
end;
$$;

drop trigger if exists teams_become_umbrella on public.teams;
create trigger teams_become_umbrella
  after insert or update of parent_team_id on public.teams
  for each row execute function public.handle_team_becomes_umbrella();

-- De bestaande hoofdteams (B, Zwiftladies) nu omzetten.
select public.convert_zrl_umbrella_races(null);
