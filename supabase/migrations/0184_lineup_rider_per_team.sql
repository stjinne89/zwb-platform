-- Een renner mag in dezelfde raceweek voor meer subteams rijden.
--
-- Wens van de eigenaar (2026-09-22): subteams starten op verschillende tijden, dus
-- een renner kan op dezelfde avond voor B1 én B2 rijden. De opstelling stond één
-- regel per renner per raceweek toe (uniek op event, paraplu, renner); nu is dat
-- één regel per renner per team.

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
      and rel.relname = 'team_event_lineups'
      and con.contype = 'u'
  loop
    execute format('alter table public.team_event_lineups drop constraint %I', v_constraint);
  end loop;
end;
$$;

alter table public.team_event_lineups
  add constraint team_event_lineups_rider_per_team
    unique (event_id, parent_team_id, team_id, profile_id);

drop index if exists public.team_event_lineups_roster_unique;
create unique index if not exists team_event_lineups_roster_per_team
  on public.team_event_lineups (event_id, parent_team_id, team_id, roster_entry_id)
  where roster_entry_id is not null;

-- Claimen (0182) en koppelen op Zwift-ID (0183) ruimden een rosterregel op als het
-- profiel in dezelfde raceweek al stond; nu alleen als dat voor hetzelfde team is.
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
  -- dezelfde raceweek al zelf voor hetzelfde team opgesteld, dan wint die regel.
  delete from public.team_event_lineups l
  where l.roster_entry_id = p_entry_id
    and exists (
      select 1
      from public.team_event_lineups own
      where own.event_id = l.event_id
        and own.parent_team_id = l.parent_team_id
        and own.team_id = l.team_id
        and own.profile_id = auth.uid()
    );
  update public.team_event_lineups
  set profile_id = auth.uid(), roster_entry_id = null, updated_at = now()
  where roster_entry_id = p_entry_id;

  return true;
end;
$$;

grant execute on function public.claim_roster_entry(uuid) to authenticated;

create or replace function public.link_roster_by_zwift_id(p_profile_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_linked integer := 0;
begin
  for v_row in
    select r.id as entry_id, r.team_id, p.id as profile_id,
           public.roster_entry_team_source(r.id) as team_source
    from public.roster_entries r
    join public.profiles p on trim(p.zwift_id) = trim(r.zwift_id)
    where r.claimed_by is null
      and coalesce(trim(r.zwift_id), '') <> ''
      and (p_profile_id is null or p.id = p_profile_id)
      -- Twee accounts met hetzelfde Zwift-ID: niet raden.
      and (
        select count(*) from public.profiles other
        where trim(other.zwift_id) = trim(r.zwift_id)
      ) = 1
  loop
    update public.roster_entries
    set claimed_by = v_row.profile_id
    where id = v_row.entry_id and claimed_by is null;
    if not found then
      continue;
    end if;
    v_linked := v_linked + 1;

    if v_row.team_id is not null
      and coalesce(v_row.team_source, '') not in ('auto_zrl_category', 'manual_excluded')
      and not exists (
        select 1 from public.team_member_seed_overrides o
        where o.team_id = v_row.team_id
          and o.profile_id = v_row.profile_id
          and o.excluded
      )
    then
      insert into public.team_members (team_id, profile_id, role, assignment_source)
      values (
        v_row.team_id,
        v_row.profile_id,
        'member',
        case when v_row.team_source = 'wtrl' then 'wtrl' else 'roster_claim' end
      )
      on conflict (team_id, profile_id) do nothing;
    end if;

    -- Opstellingen van de naam naar het account; een eigen regel in dezelfde
    -- raceweek wint.
    delete from public.team_event_lineups l
    where l.roster_entry_id = v_row.entry_id
      and exists (
        select 1 from public.team_event_lineups own
        where own.event_id = l.event_id
          and own.parent_team_id = l.parent_team_id
          and own.team_id = l.team_id
          and own.profile_id = v_row.profile_id
      );
    update public.team_event_lineups
    set profile_id = v_row.profile_id, roster_entry_id = null, updated_at = now()
    where roster_entry_id = v_row.entry_id;
  end loop;

  return v_linked;
end;
$$;

revoke all on function public.link_roster_by_zwift_id(uuid) from public;

-- De omzetting van paraplu's hield één regel per renner per raceweek over; nu één
-- per renner per team.
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
  select distinct on (r.parent_event_id, l.parent_team_id, l.team_id, coalesce(l.profile_id, l.roster_entry_id))
    r.parent_event_id, l.parent_team_id, l.team_id, l.profile_id, l.roster_entry_id,
    l.slot, l.role, l.note, l.selected_by, l.updated_at
  from public.team_event_lineups l
  join zrl_week_races r on r.event_id = l.event_id
  where l.parent_team_id in (select id from zrl_umbrellas)
  order by r.parent_event_id, l.parent_team_id, l.team_id, coalesce(l.profile_id, l.roster_entry_id), l.updated_at desc
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

