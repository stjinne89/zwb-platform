-- Opstellingen voor renners zonder account.
--
-- Wens van de eigenaar (2026-09-22): de app is nog in opbouw, veel renners hebben
-- nog geen account, maar ze rijden wel. De captain moet ze kunnen opstellen, en
-- zodra zo'n renner zich aanmeldt en zijn rosternaam claimt, hoort de opstelling
-- bij zijn profiel.
--
-- Een regel in team_event_lineups hangt daarom aan een profiel óf aan een
-- rosternaam. Claimen zet de rosterregels om naar het profiel.

alter table public.team_event_lineups
  alter column profile_id drop not null;

alter table public.team_event_lineups
  add column if not exists roster_entry_id uuid
    references public.roster_entries(id) on delete cascade;

alter table public.team_event_lineups
  drop constraint if exists team_event_lineups_one_rider;
alter table public.team_event_lineups
  add constraint team_event_lineups_one_rider
    check (num_nonnulls(profile_id, roster_entry_id) = 1);

-- Zelfde regel als (event_id, parent_team_id, profile_id): één keer per raceweek.
create unique index if not exists team_event_lineups_roster_unique
  on public.team_event_lineups (event_id, parent_team_id, roster_entry_id)
  where roster_entry_id is not null;

-- Claimen: gelijk aan 0181, plus het omzetten van de opstellingen.
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

  -- Opstellingen van de rosternaam gaan naar het profiel. Stond het profiel in
  -- dezelfde raceweek al zelf opgesteld, dan wint die regel.
  delete from public.team_event_lineups l
  where l.roster_entry_id = p_entry_id
    and exists (
      select 1
      from public.team_event_lineups own
      where own.event_id = l.event_id
        and own.parent_team_id = l.parent_team_id
        and own.profile_id = auth.uid()
    );
  update public.team_event_lineups
  set profile_id = auth.uid(), roster_entry_id = null, updated_at = now()
  where roster_entry_id = p_entry_id;

  return true;
end;
$$;

grant execute on function public.claim_roster_entry(uuid) to authenticated;

-- De omzetting van paraplu's (0179) kende alleen regels met een profiel; een
-- rosterregel zou daar stuklopen op de check hierboven.
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
  -- Een regel hangt aan een profiel of aan een rosternaam (migr. 0182).
  insert into public.team_event_lineups
    (event_id, parent_team_id, team_id, profile_id, roster_entry_id,
     slot, role, note, selected_by, updated_at)
  select distinct on (r.parent_event_id, l.parent_team_id, coalesce(l.profile_id, l.roster_entry_id))
    r.parent_event_id, l.parent_team_id, l.team_id, l.profile_id, l.roster_entry_id,
    l.slot, l.role, l.note, l.selected_by, l.updated_at
  from public.team_event_lineups l
  join zrl_week_races r on r.event_id = l.event_id
  where l.parent_team_id in (select id from zrl_umbrellas)
  order by r.parent_event_id, l.parent_team_id, coalesce(l.profile_id, l.roster_entry_id), l.updated_at desc
  on conflict do nothing;

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

