-- Baseline voor een nieuwe installatie: het schema na migratie 0320.
-- Gemaakt door scripts/build-baseline.mjs; niet met de hand aanpassen.
--
-- Alleen voor een leeg Supabase-project. Daarna de seed (0320_seed.sql) en dan
-- elke migratie na 0320 op volgorde (docs/installatie.md). ZWB zelf gebruikt
-- dit bestand niet: daar staan de migraties al.

create extension if not exists "uuid-ossp" with schema extensions;

--
-- PostgreSQL database dump
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: sponsor_tier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sponsor_tier AS ENUM (
    'hoofd',
    'sub',
    'team',
    'web',
    'vriend'
);


--
-- Name: bokaal_answer_bonus(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bokaal_answer_bonus(p_race uuid, p_choice integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  me uuid := auth.uid();
  r public.bokaal_races;
begin
  if me is null or not public.bokaal_member() then
    raise exception 'Alleen goedgekeurde leden kunnen antwoorden.';
  end if;
  select * into r from public.bokaal_races where id = p_race;
  if r.id is null or r.status <> 'open' or r.starts_at <= now() or r.bonus is null then
    raise exception 'Deze bonusvraag is dicht.';
  end if;
  if not exists (select 1 from public.bokaal_players where profile_id = me and season = r.season) then
    raise exception 'Doe eerst mee aan voorZpWelBokaal.';
  end if;
  if p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(r.bonus->'options') then
    raise exception 'Kies een van de antwoorden.';
  end if;
  insert into public.bokaal_bonus_answers (race_id, profile_id, season, choice)
    values (p_race, me, r.season, p_choice)
    on conflict (race_id, profile_id) do update set choice = excluded.choice, answered_at = now();
end $$;


--
-- Name: bokaal_balance(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bokaal_balance(p_profile uuid, p_season text) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select case
    when not exists (select 1 from public.bokaal_players where profile_id = p_profile and season = p_season)
      then 0::numeric
    else 10
      - coalesce((select sum(stake) from public.bokaal_bets where profile_id = p_profile and season = p_season), 0)
      + coalesce((select sum(payout) from public.bokaal_bets where profile_id = p_profile and season = p_season), 0)
      + (select count(*) from public.bokaal_bonus_answers where profile_id = p_profile and season = p_season and correct)
  end
$$;


--
-- Name: bokaal_cancel_bet(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bokaal_cancel_bet(p_bet uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  delete from public.bokaal_bets b
    using public.bokaal_races r
    where b.id = p_bet and b.profile_id = auth.uid() and b.outcome = 'open'
      and r.id = b.race_id and r.status = 'open' and r.starts_at > now();
  if not found then raise exception 'Dit briefje kan niet meer weg.'; end if;
end $$;


--
-- Name: bokaal_member(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bokaal_member() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved)
$$;


--
-- Name: bokaal_place_bet(uuid, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bokaal_place_bet(p_race uuid, p_market text, p_rider text, p_vs text, p_stake integer) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  me uuid := auth.uid();
  r public.bokaal_races;
  entry jsonb;
  duel jsonb;
  v_odds numeric;
  v_name text;
  v_vs text;
  v_vs_name text;
  used integer;
  new_id uuid;
begin
  if me is null or not public.bokaal_member() then
    raise exception 'Alleen goedgekeurde leden kunnen inzetten.';
  end if;
  select * into r from public.bokaal_races where id = p_race;
  if r.id is null or r.status <> 'open' or r.starts_at <= now() then
    raise exception 'Dit bord is dicht.';
  end if;
  perform 1 from public.bokaal_players where profile_id = me and season = r.season for update;
  if not found then raise exception 'Doe eerst mee aan voorZpWelBokaal.'; end if;
  if p_stake is null or p_stake < 1 or p_stake > 5 then
    raise exception 'Je zet 1 tot 5 ballen in.';
  end if;

  if p_market in ('win', 'pod', 'top') then
    select e into entry from jsonb_array_elements(r.board->'riders') e where e->>'slug' = p_rider;
    if entry is null then raise exception 'Deze renner staat niet op het bord.'; end if;
    v_odds := (entry->>p_market)::numeric;
    v_name := entry->>'name';
  elsif p_market = 'duel' then
    select e into duel from jsonb_array_elements(r.board->'duels') e
      where (e->>'a' = p_rider and e->>'b' = p_vs) or (e->>'b' = p_rider and e->>'a' = p_vs);
    if duel is null then raise exception 'Dit duel staat niet op het bord.'; end if;
    v_odds := case when duel->>'a' = p_rider then (duel->>'oa')::numeric else (duel->>'ob')::numeric end;
    select e->>'name' into v_name from jsonb_array_elements(r.board->'riders') e where e->>'slug' = p_rider;
    select e->>'name' into v_vs_name from jsonb_array_elements(r.board->'riders') e where e->>'slug' = p_vs;
    v_vs := p_vs;
    if v_name is null or v_vs_name is null then raise exception 'Dit duel staat niet op het bord.'; end if;
  else
    raise exception 'Onbekende inzet.';
  end if;
  if v_odds is null then raise exception 'Hier staat geen quotering op het bord.'; end if;

  select coalesce(sum(stake), 0) into used from public.bokaal_bets where race_id = p_race and profile_id = me;
  if used + p_stake > 5 then
    raise exception 'Per wedstrijd zet je hoogstens 5 ballen in.';
  end if;
  if public.bokaal_balance(me, r.season) < p_stake then
    raise exception 'Je hebt niet genoeg ZWBallen.';
  end if;

  insert into public.bokaal_bets (race_id, profile_id, season, market, rider_slug, rider_name, vs_slug, vs_name, odds, stake)
    values (p_race, me, r.season, p_market, p_rider, v_name, v_vs, v_vs_name, v_odds, p_stake)
    returning id into new_id;
  return new_id;
end $$;


--
-- Name: bokaal_standings(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bokaal_standings(p_season text) RETURNS TABLE(profile_id uuid, display_name text, balance numeric, open_stake bigint, hits bigint, bets bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select pl.profile_id, p.display_name,
    public.bokaal_balance(pl.profile_id, p_season),
    coalesce((select sum(stake) from public.bokaal_bets b where b.profile_id = pl.profile_id and b.season = p_season and b.outcome = 'open'), 0),
    (select count(*) from public.bokaal_bets b where b.profile_id = pl.profile_id and b.season = p_season and b.outcome = 'raak'),
    (select count(*) from public.bokaal_bets b where b.profile_id = pl.profile_id and b.season = p_season)
  from public.bokaal_players pl
  join public.profiles p on p.id = pl.profile_id and p.is_approved
  where pl.season = p_season and public.bokaal_member()
$$;


--
-- Name: can_manage_ttt_plan(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_manage_ttt_plan(p_parent_team_id uuid, p_team_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    public.current_user_has_permission('teams.manage_roster')
    or exists (
      select 1
      from public.team_members tm
      where tm.profile_id = auth.uid()
        and tm.team_id in (p_parent_team_id, coalesce(p_team_id, p_parent_team_id))
        and tm.role in ('captain', 'co-captain')
    );
$$;


--
-- Name: can_read_ttt_plan(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_read_ttt_plan(p_plan_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.ttt_plans p
    where p.id = p_plan_id
      and (
        public.can_manage_ttt_plan(p.parent_team_id, p.team_id)
        or (
          p.published_at is not null
          and exists (
            select 1
            from public.team_members tm
            where tm.profile_id = auth.uid()
              and tm.team_id in (p.parent_team_id, coalesce(p.team_id, p.parent_team_id))
          )
        )
      )
  );
$$;


--
-- Name: claim_roster_entry(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_roster_entry(p_entry_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: claim_zwb_ds_budget(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_zwb_ds_budget(want integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  available real;
  granted integer;
begin
  select least(10, tokens + extract(epoch from now() - updated_at) * 30.0 / 60)
    into available
    from zwb_ds_budget
   where id = 1
     for update;
  if available is null then
    return 0;
  end if;
  granted := least(greatest(want, 0), floor(available)::integer);
  update zwb_ds_budget
     set tokens = available - granted,
         updated_at = now()
   where id = 1;
  delete from zwb_ds_rider_states where checked_at < now() - interval '6 hours';
  return granted;
end;
$$;


--
-- Name: close_knowledge_thread(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.close_knowledge_thread(thread uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.knowledge_threads
     set status = 'closed'
   where id = thread and auth.uid() in (asker_id, expert_id);
end;
$$;


--
-- Name: convert_zrl_umbrella_races(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.convert_zrl_umbrella_races(p_team_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: current_user_answers_questions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_answers_questions() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select public.current_user_has_permission('qa.answer');
$$;


--
-- Name: current_user_can_train_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_can_train_profile(target_profile uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select
    auth.uid() = target_profile
    or public.current_user_has_permission('training.manage_assignments')
    or exists (
      select 1
      from public.training_coach_assignments tca
      where tca.athlete_id = target_profile
        and tca.trainer_id = auth.uid()
        and tca.status = 'active'
    );
$$;


--
-- Name: current_user_has_permission(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_has_permission(permission text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.current_user_is_admin()
    or permission = any(public.current_user_permissions());
$$;


--
-- Name: current_user_in_training_chat(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_in_training_chat(target_profile uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select
    auth.uid() = target_profile
    or exists (
      select 1
      from public.training_coach_assignments tca
      where tca.athlete_id = target_profile
        and tca.trainer_id = auth.uid()
        and tca.status = 'active'
    );
$$;


--
-- Name: current_user_is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;


--
-- Name: current_user_is_team_captain(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_is_team_captain(target_team_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.profile_id = auth.uid()
      and tm.role in ('captain','co-captain')
  );
$$;


--
-- Name: current_user_moderates_member_tips(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_moderates_member_tips() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select public.current_user_has_permission('community.manage')
      or public.current_user_has_permission('content.moderate_posts');
$$;


--
-- Name: current_user_permissions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_permissions() RETURNS text[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(array_agg(distinct permission), array[]::text[])
  from public.profiles p
  cross join lateral unnest(p.community_roles) as role_name(role)
  join public.community_role_permissions rp on rp.role = role_name.role
  cross join lateral unnest(rp.permissions) as permission_name(permission)
  where p.id = auth.uid();
$$;


--
-- Name: frr_class_riders(uuid, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.frr_class_riders(p_tour_id uuid, p_gender_classes text[]) RETURNS TABLE(zwift_id text, gender_class text, class_code text, name text, club text, penalty_s numeric)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  select l.zwift_id, l.gender_class, l.class_code, l.name, l.club, l.penalty_s
  from (
    select distinct on (h.zwift_id)
           h.zwift_id, h.gender_class, h.class_code, h.name, h.club, h.penalty_s
    from frr_gc_history h
    where h.tour_id = p_tour_id
    order by h.zwift_id, h.after_stage desc, h.position
  ) l
  where l.gender_class = any (p_gender_classes)
  order by l.gender_class, l.zwift_id;
$$;


--
-- Name: frr_class_stage_results(uuid, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.frr_class_stage_results(p_tour_id uuid, p_gender_classes text[]) RETURNS TABLE(slot_event_id uuid, zwift_id text, stage integer, pen text, time_s numeric)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  select r.slot_event_id, r.zwift_id, r.stage, r.pen, r.time_s
  from frr_stage_results r
  where r.tour_id = p_tour_id
    and r.zwift_id in (
      select l.zwift_id
      from (
        select distinct on (h.zwift_id) h.zwift_id, h.gender_class
        from frr_gc_history h
        where h.tour_id = p_tour_id
        order by h.zwift_id, h.after_stage desc, h.position
      ) l
      where l.gender_class = any (p_gender_classes)
    )
  order by r.slot_event_id, r.zwift_id;
$$;


--
-- Name: frr_replace_gc(uuid, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.frr_replace_gc(p_tour_id uuid, p_after_stage integer, p_rows jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Leeg of ongeldig klassement.';
  end if;
  perform 1 from frr_tours where id = p_tour_id for update;
  delete from frr_gc_standings where tour_id = p_tour_id;
  insert into frr_gc_standings (
    tour_id, gender_class, class_code, gender, zwift_id, position, name, club,
    age_cat, stages_ridden, tour_time_s, egap_s, penalty_s, after_stage
  )
  select p_tour_id, r.gender_class, r.class_code, r.gender, r.zwift_id, r.position,
         r.name, r.club, r.age_cat, r.stages_ridden, r.tour_time_s, r.egap_s,
         coalesce(r.penalty_s, 0), p_after_stage
  from jsonb_to_recordset(p_rows) as r(
    gender_class text, class_code text, gender text, zwift_id text, position int,
    name text, club text, age_cat text, stages_ridden int, tour_time_s numeric, egap_s numeric,
    penalty_s numeric
  )
  on conflict (tour_id, gender_class, zwift_id) do nothing;
  update frr_tours
     set gc_after_stage = p_after_stage, gc_scraped_at = clock_timestamp(), gc_error = null
   where id = p_tour_id;
end $$;


--
-- Name: frr_replace_gc_history(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.frr_replace_gc_history(p_tour_id uuid, p_rows jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Leeg of ongeldig klassement.';
  end if;
  perform 1 from frr_tours where id = p_tour_id for update;
  delete from frr_gc_history where tour_id = p_tour_id;
  insert into frr_gc_history (
    tour_id, after_stage, gender_class, class_code, zwift_id, position, name, club,
    stages_ridden, tour_time_s, egap_s, penalty_s, stage_time_s, stage_egap_s
  )
  select p_tour_id, r.after_stage, r.gender_class, r.class_code, r.zwift_id, r.position,
         r.name, r.club, r.stages_ridden, r.tour_time_s, r.egap_s, coalesce(r.penalty_s, 0),
         r.stage_time_s, r.stage_egap_s
  from jsonb_to_recordset(p_rows) as r(
    after_stage int, gender_class text, class_code text, zwift_id text, position int,
    name text, club text, stages_ridden int, tour_time_s numeric, egap_s numeric,
    penalty_s numeric, stage_time_s numeric, stage_egap_s numeric
  )
  on conflict (tour_id, after_stage, gender_class, zwift_id) do nothing;
end $$;


--
-- Name: get_member_profile_bikes(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_member_profile_bikes(target_profile_id uuid) RETURNS TABLE(id text, name text, brand_model text, distance_m numeric, retired boolean, image_url text, show_on_profile boolean, source text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    b.id,
    b.name,
    b.brand_model,
    b.distance_m,
    b.retired,
    b.image_url,
    b.show_on_profile,
    b.source
  from public.profiles p
  join public.strava_bikes b on b.profile_id = p.id
  where p.id = target_profile_id
    and p.is_approved = true
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = (select auth.uid()) and viewer.is_approved
    )
    and coalesce(b.show_on_profile, not b.retired)
  order by b.is_primary desc, b.distance_m desc;
$$;


--
-- Name: get_public_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_profile(target_profile_id uuid) RETURNS TABLE(id uuid, display_name text, avatar_url text, region text, zwift_id text, strava_id text, intervals_id text, zrl_category text, ftp_watts integer, weight_kg numeric, bio text, is_admin boolean, community_roles text[], public_profile_enabled boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    p.id,
    p.display_name,
    case when public.profile_visible(p.id, 'avatar') then p.avatar_url else null end,
    case when public.profile_visible(p.id, 'region') then p.region else null end,
    case when public.profile_visible(p.id, 'zwift_id') then p.zwift_id else null end,
    case when public.profile_visible(p.id, 'strava_id') then p.strava_id else null end,
    case when public.profile_visible(p.id, 'intervals_id') then p.intervals_id else null end,
    case when public.profile_visible(p.id, 'zrl_category') then p.zrl_category else null end,
    case when public.profile_visible(p.id, 'ftp_watts') then p.ftp_watts else null end,
    case when public.profile_visible(p.id, 'weight_kg') then p.weight_kg else null end,
    case when public.profile_visible(p.id, 'bio') then p.bio else null end,
    case when public.profile_visible(p.id, 'roles') then p.is_admin else false end,
    case when public.profile_visible(p.id, 'roles') then p.community_roles else null end,
    p.public_profile_enabled
  from public.profiles p
  where p.id = target_profile_id
    and p.is_approved = true
    and p.public_profile_enabled = true
$$;


--
-- Name: get_public_profile_bikes(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_profile_bikes(target_profile_id uuid) RETURNS TABLE(id text, name text, brand_model text, distance_m numeric, retired boolean, image_url text, show_on_profile boolean, source text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    b.id,
    b.name,
    b.brand_model,
    b.distance_m,
    b.retired,
    b.image_url,
    b.show_on_profile,
    b.source
  from public.profiles p
  join public.strava_bikes b on b.profile_id = p.id
  where p.id = target_profile_id
    and p.is_approved = true
    and p.public_profile_enabled = true
    and coalesce(b.show_on_profile, not b.retired)
  order by b.is_primary desc, b.distance_m desc;
$$;


--
-- Name: get_public_profile_milestone_badges(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_profile_milestone_badges(target_profile_id uuid) RETURNS TABLE(id text, title text, description text, icon text, color text, achievement_code text, tier text, visual_hint text, trigger_source text, trigger_config jsonb, sort_order integer, earned boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    b.id,
    b.title,
    b.description,
    b.icon,
    b.color,
    b.achievement_code,
    b.tier,
    b.visual_hint,
    b.trigger_source,
    b.trigger_config,
    b.sort_order,
    exists (
      select 1
      from public.achievement_awards a
      where a.profile_id = target_profile_id
        and a.badge_id = b.id
        and a.award_scope = 'milestone'
    ) as earned
  from public.profiles p
  join public.achievement_badges b on b.kind = 'milestone'
  where p.id = target_profile_id
    and p.is_approved = true
    and p.public_profile_enabled = true
    and public.profile_visible(p.id, 'badges')
    and (
      b.trigger_source = 'auto'
      or b.id like 'custom\_%' escape '\'
      or exists (
        select 1
        from public.achievement_awards a
        where a.profile_id = target_profile_id
          and a.badge_id = b.id
          and a.award_scope = 'milestone'
      )
    )
  order by b.sort_order
$$;


--
-- Name: get_public_profile_weekly_awards(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_profile_weekly_awards(target_profile_id uuid) RETURNS TABLE(id uuid, period_start date, value numeric, badge_title text, badge_description text, badge_icon text, badge_color text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    a.id,
    a.period_start,
    a.value,
    b.title,
    b.description,
    b.icon,
    b.color
  from public.profiles p
  join public.achievement_awards a on a.profile_id = p.id
  join public.achievement_badges b on b.id = a.badge_id
  where p.id = target_profile_id
    and p.is_approved = true
    and p.public_profile_enabled = true
    and public.profile_visible(p.id, 'badges')
    and a.award_scope = 'weekly'
  order by a.period_start desc
$$;


--
-- Name: handle_event_rsvp_team_join(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_event_rsvp_team_join() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.status = 'yes' then
    perform public.join_event_team_for_member(new.profile_id, new.event_id, null);
  end if;
  return new;
end;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, display_name, privacy_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data->>'privacy_accepted' = 'true' then now()
      else null
    end
  );
  return new;
end;
$$;


--
-- Name: handle_profile_zwift_id_link(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_profile_zwift_id_link() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if coalesce(trim(new.zwift_id), '') <> ''
    and (tg_op = 'INSERT' or new.zwift_id is distinct from old.zwift_id)
  then
    perform public.link_roster_by_zwift_id(new.id);
  end if;
  return new;
end;
$$;


--
-- Name: handle_roster_claim_ladder(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_roster_claim_ladder() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_team uuid;
begin
  if new.claimed_by is null or old.claimed_by is not null then
    return new;
  end if;

  select team_id into v_team
  from public.ladder_roster_riders
  where roster_entry_id = new.id;
  if not found then
    return new;
  end if;

  if v_team is not null then
    insert into public.team_members (team_id, profile_id, role, assignment_source)
    values (v_team, new.claimed_by, 'member', 'manual')
    on conflict (team_id, profile_id) do nothing;
  else
    insert into public.ladder_pool (profile_id)
    values (new.claimed_by)
    on conflict (profile_id) do nothing;
  end if;

  delete from public.ladder_roster_riders where roster_entry_id = new.id;
  return new;
end;
$$;


--
-- Name: handle_team_availability_team_join(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_team_availability_team_join() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  -- Alleen 'available'. Misschien is geen toezegging, en 'unavailable' haalt een
  -- bestaand lidmaatschap er niet af: uit het team gaan doe je niet door één
  -- race te missen.
  if new.status = 'available' then
    perform public.join_event_team_for_member(new.profile_id, new.event_id, new.team_id);
  end if;
  return new;
end;
$$;


--
-- Name: handle_team_becomes_umbrella(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_team_becomes_umbrella() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.parent_team_id is not null
    and (tg_op = 'INSERT' or new.parent_team_id is distinct from old.parent_team_id)
  then
    perform public.convert_zrl_umbrella_races(new.parent_team_id);
  end if;
  return new;
end;
$$;


--
-- Name: join_event_team_for_member(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.join_event_team_for_member(p_profile_id uuid, p_event_id uuid, p_fallback_team_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_team_id uuid;
begin
  if p_profile_id is null or p_event_id is null then
    return null;
  end if;

  -- Alleen ZRL-races. Een teamrit of social met een team eraan is geen
  -- toezegging aan een raceteam, en een Ja daarop hoort je nergens lid van te
  -- maken.
  select coalesce(e.team_id, p_fallback_team_id)
  into v_team_id
  from public.events e
  where e.id = p_event_id
    and e.type = 'zrl';

  if v_team_id is null then
    return null;
  end if;

  -- Wie nog op goedkeuring wacht, komt nergens in een rooster; gelijk aan
  -- sync_zrl_parent_team_membership() in 0070.
  if not exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and coalesce(p.is_approved, false)
  ) then
    return null;
  end if;

  -- Een captain die dit lid uit dit team haalde, wint. removeMember() legt die
  -- keuze vast als seed-override; anders kwam het lid bij de eerstvolgende
  -- aanmelding gewoon weer terug.
  if exists (
    select 1
    from public.team_member_seed_overrides o
    where o.team_id = v_team_id
      and o.profile_id = p_profile_id
      and o.excluded
  ) then
    return null;
  end if;

  insert into public.team_members (team_id, profile_id, role, assignment_source)
  values (v_team_id, p_profile_id, 'member', 'event_availability')
  on conflict (team_id, profile_id) do nothing;

  return v_team_id;
end;
$$;


--
-- Name: knowledge_messages_after_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.knowledge_messages_after_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.knowledge_threads
     set last_message_at = new.created_at,
         last_author_id = new.author_id,
         asker_read_at = case when asker_id = new.author_id then new.created_at else asker_read_at end,
         expert_read_at = case when expert_id = new.author_id then new.created_at else expert_read_at end
   where id = new.thread_id;
  return new;
end;
$$;


--
-- Name: knowledge_threads_before_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.knowledge_threads_before_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (
    select count(*) from public.knowledge_threads
    where asker_id = new.asker_id and created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'Daglimiet voor nieuwe vragen bereikt';
  end if;
  new.last_message_at := now();
  new.last_author_id := new.asker_id;
  new.asker_read_at := now();
  new.expert_read_at := null;
  return new;
end;
$$;


--
-- Name: knowledge_topics_before_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.knowledge_topics_before_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  new.label := btrim(new.label);
  if (select auth.uid()) is null or public.current_user_moderates_member_tips() then
    return new;
  end if;
  if (
    select count(*) from public.knowledge_topics
    where created_by = new.created_by and created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'Daglimiet voor nieuwe onderwerpen bereikt';
  end if;
  return new;
end;
$$;


--
-- Name: limit_start_points(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.limit_start_points() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if (select count(*) from public.profile_start_points where profile_id = new.profile_id) >= 10 then
    raise exception 'Je kunt hoogstens 10 vertrekpunten bewaren.';
  end if;
  return new;
end;
$$;


--
-- Name: link_roster_by_zwift_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_roster_by_zwift_id(p_profile_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: log_profile_privilege_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_profile_privilege_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (new.is_admin is distinct from old.is_admin)
     or (new.is_approved is distinct from old.is_approved) then
    insert into public.audit_log (actor_id, action, entity, entity_id, details)
    values (
      auth.uid(),
      'profiles.privilege_change',
      'profiles',
      new.id::text,
      jsonb_build_object(
        'is_admin', jsonb_build_object('old', old.is_admin, 'new', new.is_admin),
        'is_approved', jsonb_build_object('old', old.is_approved, 'new', new.is_approved)
      )
    );
  end if;
  return new;
end;
$$;


--
-- Name: log_role_permission_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_role_permission_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (
    auth.uid(),
    'community_role_permissions.' || lower(tg_op),
    'community_role_permissions',
    coalesce(new.role, old.role),
    jsonb_build_object(
      'old', case when old is null then null else to_jsonb(old) end,
      'new', case when new is null then null else to_jsonb(new) end
    )
  );
  return coalesce(new, old);
end;
$$;


--
-- Name: mark_knowledge_thread_read(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_knowledge_thread_read(thread uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.knowledge_threads
     set asker_read_at = case when asker_id = auth.uid() then now() else asker_read_at end,
         expert_read_at = case when expert_id = auth.uid() then now() else expert_read_at end
   where id = thread and auth.uid() in (asker_id, expert_id);
end;
$$;


--
-- Name: member_last_seen(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.member_last_seen() RETURNS TABLE(profile_id uuid, last_seen_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select
    u.id as profile_id,
    greatest(u.last_sign_in_at, s.last_session_at, r.last_refresh_at) as last_seen_at
  from auth.users u
  left join lateral (
    select max(ses.updated_at) as last_session_at
    from auth.sessions ses
    where ses.user_id = u.id
  ) s on true
  left join lateral (
    select max(rt.updated_at) as last_refresh_at
    from auth.refresh_tokens rt
    where rt.user_id = u.id::text
  ) r on true;
$$;


--
-- Name: member_question_askers_before_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.member_question_askers_before_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if exists (
    select 1 from public.member_questions
    where id = new.question_id and profile_id = new.profile_id
  ) then
    raise exception 'Je eigen vraag telt al';
  end if;
  new.created_at := now();
  return new;
end;
$$;


--
-- Name: member_question_askers_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.member_question_askers_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  target uuid := coalesce(new.question_id, old.question_id);
begin
  update public.member_questions q
     set asked_count = 1 + (
       select count(*) from public.member_question_askers a where a.question_id = target
     )
   where q.id = target;
  return null;
end;
$$;


--
-- Name: member_questions_before_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.member_questions_before_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (
    select count(*) from public.member_questions
    where profile_id = new.profile_id and created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'Daglimiet voor nieuwe vragen bereikt';
  end if;
  new.created_at := now();
  new.updated_at := now();
  -- Een vraag begint altijd open, buiten de FAQ en door één lid gesteld.
  new.answer := null;
  new.answered_by := null;
  new.answered_at := null;
  new.faq_at := null;
  new.asked_count := 1;
  return new;
end;
$$;


--
-- Name: member_questions_before_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.member_questions_before_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.profile_id is distinct from old.profile_id
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at then
    raise exception 'De vraag zelf verandert niet';
  end if;
  -- De teller zet alleen de trigger op member_question_askers (die draait een
  -- niveau dieper).
  if pg_trigger_depth() < 2 then
    new.asked_count := old.asked_count;
  end if;
  new.updated_at := now();
  if new.answer is null then
    -- Antwoord weggehaald: de vraag staat weer open.
    new.answered_by := null;
    new.answered_at := null;
  elsif old.answer is null or new.answer is distinct from old.answer then
    -- Wie het antwoord schrijft of aanpast, staat erbij. Zonder sessie (service
    -- role) blijft staan wat er werd meegegeven.
    new.answered_by := coalesce((select auth.uid()), new.answered_by);
    new.answered_at := coalesce(old.answered_at, now());
  else
    -- Leeg mag: zo zet "on delete set null" het als wie antwoordde zijn
    -- account opheft. Een andere naam invullen niet.
    if new.answered_by is not null then
      new.answered_by := old.answered_by;
    end if;
    new.answered_at := old.answered_at;
  end if;
  -- Zonder antwoord of afgeschermd: uit de FAQ. Erin zetten krijgt de tijd
  -- van de database.
  if new.answer is null or new.visibility <> 'club' then
    new.faq_at := null;
  elsif new.faq_at is not null and old.faq_at is null then
    new.faq_at := now();
  elsif new.faq_at is not null then
    new.faq_at := old.faq_at;
  end if;
  return new;
end;
$$;


--
-- Name: member_tips_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.member_tips_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at := now();
  if (select auth.uid()) is null or public.current_user_moderates_member_tips() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.source is distinct from old.source
     or new.profile_id is distinct from old.profile_id
     or new.created_by is distinct from old.created_by
     or new.message_id is distinct from old.message_id then
    raise exception 'Alleen de moderatie wijzigt status, bron of auteur van een tip';
  end if;
  return new;
end;
$$;


--
-- Name: mobility_pre_ride_hold_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mobility_pre_ride_hold_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  series_timing text;
begin
  select timing into series_timing
  from public.mobility_series
  where id = new.series_id;

  if series_timing = 'pre_ride' and coalesce(new.hold_seconds, 0) > 60 then
    raise exception
      'Een serie vóór de rit mag geen hold langer dan 60 seconden bevatten (kreeg %).',
      new.hold_seconds;
  end if;

  return new;
end;
$$;


--
-- Name: mobility_series_timing_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mobility_series_timing_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  offending int;
begin
  if new.timing <> 'pre_ride' then
    return new;
  end if;

  select count(*) into offending
  from public.mobility_series_items
  where series_id = new.id and coalesce(hold_seconds, 0) > 60;

  if offending > 0 then
    raise exception
      'Deze serie heeft % oefening(en) met een hold langer dan 60 seconden en kan niet op pre_ride staan.',
      offending;
  end if;

  return new;
end;
$$;


--
-- Name: nutrition_log_trainer_can_read(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.nutrition_log_trainer_can_read(target_profile uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.nutrition_log_settings s
    join public.training_coach_assignments tca on tca.athlete_id = s.profile_id
    where s.profile_id = target_profile
      and s.trainer_visible
      and tca.trainer_id = auth.uid()
      and tca.status = 'active'
  );
$$;


--
-- Name: omnium_award_prize(uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.omnium_award_prize(p_prize_id uuid, p_edition_id uuid, p_rider_id uuid, p_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare prize omnium_prizes; award omnium_prize_awards; code_id uuid; eligible boolean;
begin
  -- Serialiseert ook twee toekenningen voor dezelfde prijs, vóórdat er een code gepakt wordt.
  select * into strict prize from omnium_prizes where id = p_prize_id for update;
  if (prize.scope = 'edition') <> (p_edition_id is not null) then raise exception 'Kies de juiste prijsscope.'; end if;
  if p_edition_id is not null and not exists(select 1 from omnium_editions where id = p_edition_id and season_id = prize.season_id) then raise exception 'Editie hoort niet bij het seizoen.'; end if;
  select * into award from omnium_prize_awards where prize_id = prize.id and edition_id is not distinct from p_edition_id and league is not distinct from prize.league;
  if found then
    if award.rider_id <> p_rider_id then raise exception 'Deze prijs is al aan een andere renner toegekend.'; end if;
    return award.id;
  end if;
  if prize.scope = 'edition' then
    select exists(select 1 from omnium_edition_standings where edition_id = p_edition_id and rider_id = p_rider_id and rank = 1 and not is_provisional and (prize.league is null or league = prize.league)) into eligible;
  else
    select exists(select 1 from omnium_season_standings where season_id = prize.season_id and rider_id = p_rider_id and rank = 1 and (prize.league is null or league = prize.league)) into eligible;
    if exists(select 1 from omnium_editions e where e.season_id = prize.season_id and
      (select count(*) from omnium_edition_events ee where ee.edition_id = e.id and ee.discipline <> 'recon' and ee.results_state = 'final') <> 4) then
      raise exception 'Het seizoen is nog niet compleet.';
    end if;
  end if;
  if not coalesce(eligible,false) then raise exception 'Kies een winnaar uit de definitieve stand.'; end if;
  insert into omnium_prize_awards(prize_id,edition_id,league,rider_id,awarded_by)
    values(prize.id,p_edition_id,prize.league,p_rider_id,p_user_id) returning * into award;
  if prize.kind = 'zwift_kit' then
    select id into code_id from omnium_kit_codes where season_id = prize.season_id and issued_at is null and award_id is null
      order by created_at,id limit 1 for update skip locked;
    if code_id is null then raise exception 'Geen vrije kitcodes voor dit seizoen.'; end if;
    update omnium_kit_codes set award_id = award.id, issued_at = now() where id = code_id;
  end if;
  return award.id;
end $$;


--
-- Name: omnium_invalidate_entrants(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.omnium_invalidate_entrants() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if new.zwift_event_id is distinct from old.zwift_event_id
     or new.subgroup_leagues is distinct from old.subgroup_leagues then
    new.entrants_synced_at := null;
    delete from omnium_entrants where edition_event_id = new.id and source = 'zwift_entrants';
  end if;
  return new;
end $$;


--
-- Name: omnium_merge_riders(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.omnium_merge_riders(p_from_rider_id uuid, p_into_rider_id uuid) RETURNS uuid[]
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  source_rider omnium_riders;
  target_rider omnium_riders;
  affected uuid[];
begin
  if p_from_rider_id = p_into_rider_id then
    raise exception 'Kies twee verschillende renners.';
  end if;

  select * into strict source_rider
  from omnium_riders where id = p_from_rider_id for update;
  select * into strict target_rider
  from omnium_riders where id = p_into_rider_id for update;

  if source_rider.merged_into_id is not null or target_rider.merged_into_id is not null then
    raise exception 'Een geselecteerde renner is al samengevoegd.';
  end if;
  if source_rider.zwift_id is not null and target_rider.zwift_id is not null then
    raise exception 'Beide renners hebben een verschillend Zwift-ID.';
  end if;
  if source_rider.public_profile_id is not null
     and target_rider.public_profile_id is not null
     and source_rider.public_profile_id <> target_rider.public_profile_id then
    raise exception 'Beide renners zijn aan een ander openbaar profiel gekoppeld.';
  end if;

  select coalesce(array_agg(distinct edition_id), '{}') into affected
  from omnium_results
  where rider_id in (p_from_rider_id, p_into_rider_id);

  delete from omnium_results source
  using omnium_results target
  where source.rider_id = p_from_rider_id
    and target.rider_id = p_into_rider_id
    and source.edition_event_id = target.edition_event_id;
  update omnium_results set rider_id = p_into_rider_id
  where rider_id = p_from_rider_id;

  delete from omnium_entrants source
  using omnium_entrants target
  where source.rider_id = p_from_rider_id
    and target.rider_id = p_into_rider_id
    and source.edition_event_id = target.edition_event_id;
  update omnium_entrants set rider_id = p_into_rider_id
  where rider_id = p_from_rider_id;

  update omnium_prize_awards set rider_id = p_into_rider_id
  where rider_id = p_from_rider_id;

  if exists (select 1 from omnium_rider_links where rider_id = p_into_rider_id) then
    delete from omnium_rider_links where rider_id = p_from_rider_id;
  else
    update omnium_rider_links set rider_id = p_into_rider_id
    where rider_id = p_from_rider_id;
  end if;

  -- Eerst de unieke identiteit van de bron vrijgeven, daarna overnemen.
  update omnium_riders
  set zwift_id = null,
      public_profile_id = null,
      merged_into_id = p_into_rider_id
  where id = p_from_rider_id;
  update omnium_riders
  set zwift_id = coalesce(target_rider.zwift_id, source_rider.zwift_id),
      public_profile_id = coalesce(target_rider.public_profile_id, source_rider.public_profile_id)
  where id = p_into_rider_id;

  return affected;
end
$$;


--
-- Name: omnium_replace_entrants(uuid, text, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.omnium_replace_entrants(p_event_id uuid, p_zwift_event_id text, p_league_map jsonb, p_rows jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare part omnium_edition_events; r jsonb; rider uuid; known omnium_riders;
begin
  select * into strict part from omnium_edition_events where id = p_event_id for update;
  if part.zwift_event_id is distinct from p_zwift_event_id
     or part.subgroup_leagues is distinct from p_league_map then
    raise exception 'Zwift-instellingen gewijzigd; haal de startlijst opnieuw op.';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Ongeldige startlijst'; end if;
  delete from omnium_entrants where edition_event_id = p_event_id and source = 'zwift_entrants';
  for r in select * from jsonb_array_elements(p_rows) loop
    -- Een geanonimiseerde identiteit nooit via een volgende sync opnieuw openbaar maken.
    insert into omnium_riders(zwift_id,name_key,display_name,last_league)
      values(r->>'zwift_id',r->>'name_key',r->>'display_name',r->>'league')
      on conflict (zwift_id) where zwift_id is not null do nothing;
    select * into strict known from omnium_riders where zwift_id = r->>'zwift_id';
    if known.merged_into_id is not null then
      raise exception 'Samengevoegde Zwift-identiteit moet eerst worden hersteld.';
    end if;
    rider := known.id;
    if known.anonymised_at is null then
      update omnium_riders set display_name = r->>'display_name', name_key = r->>'name_key', last_league = r->>'league' where id = rider;
    end if;
    insert into omnium_entrants(edition_event_id,rider_id,league,subgroup_label,source)
      values(p_event_id,rider,r->>'league',r->>'subgroup_label','zwift_entrants')
      on conflict (edition_event_id,rider_id) do nothing;
  end loop;
  update omnium_edition_events set entrants_synced_at = clock_timestamp() where id = p_event_id;
end $$;


--
-- Name: omnium_replace_results(uuid, jsonb, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.omnium_replace_results(p_event_id uuid, p_rows jsonb, p_state text, p_expected_sync timestamp with time zone) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare part omnium_edition_events;
begin
  select * into strict part from omnium_edition_events where id = p_event_id for update;
  if part.entrants_synced_at is distinct from p_expected_sync then raise exception 'Startlijst gewijzigd; maak opnieuw een voorbeeld.'; end if;
  if p_state not in ('partial','final') or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then raise exception 'Ongeldige uitslag'; end if;
  delete from omnium_results where edition_event_id = p_event_id;
  insert into omnium_results(edition_id,edition_event_id,rider_id,league,status,position,overall_position,time_seconds,time_text,segment_seconds,finish_points,sprint_points,points,points_raw,voided_reason,matched_via,source,entered_by)
    select part.edition_id,part.id,r.rider_id,r.league,r.status,r.position,r.overall_position,r.time_seconds,r.time_text,r.segment_seconds,r.finish_points,r.sprint_points,r.points,r.points_raw,r.voided_reason,r.matched_via,r.source,r.entered_by
    from jsonb_populate_recordset(null::omnium_results,p_rows) r;
  update omnium_edition_events set results_state = p_state where id = p_event_id;
end $$;


--
-- Name: profile_has_community_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.profile_has_community_role(p_profile_id uuid, p_role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.profiles
     where id = p_profile_id
       and p_role = any(coalesce(community_roles, array[]::text[]))
  );
$$;


--
-- Name: profile_visible(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.profile_visible(target_profile_id uuid, field_name text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce((p.profile_visibility ->> field_name)::boolean, true)
  from public.profiles p
  where p.id = target_profile_id
$$;


--
-- Name: protect_profile_admin_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_profile_admin_fields() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  -- Kolommen die beheer bij een ander profiel mag wijzigen.
  managed text[] := array['is_approved', 'approved_at', 'approved_by', 'community_roles', 'updated_at'];
begin
  if public.current_user_is_admin() then
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin then
    raise exception 'Alleen een beheerder kan beheerdersrechten geven of afnemen.';
  end if;

  if new.community_roles is distinct from old.community_roles then
    if not public.current_user_has_permission('members.manage_roles') then
      raise exception 'Geen recht om ledenrollen te wijzigen.';
    end if;
    if ('board' = any(coalesce(new.community_roles, array[]::text[])))
       is distinct from ('board' = any(coalesce(old.community_roles, array[]::text[])))
       and not public.current_user_has_permission('roles.manage_permissions') then
      raise exception 'Geen recht om de rol Bestuur te geven of af te nemen.';
    end if;
  end if;

  if (new.is_approved is distinct from old.is_approved
      or new.approved_at is distinct from old.approved_at
      or new.approved_by is distinct from old.approved_by)
    and not public.current_user_has_permission('members.approve') then
    raise exception 'Geen recht om leden goed te keuren.';
  end if;

  -- Andermans profiel (de service-role heeft geen auth.uid()): alleen de
  -- beheervelden mogen veranderen.
  if auth.uid() is not null and auth.uid() <> old.id
     and (to_jsonb(new) - managed) is distinct from (to_jsonb(old) - managed) then
    raise exception 'Bij een ander profiel kun je alleen goedkeuring en rollen wijzigen.';
  end if;

  return new;
end;
$$;


--
-- Name: prune_superseded_training_workouts(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prune_superseded_training_workouts(keep_days integer DEFAULT 30) RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with gone as (
    delete from public.training_workouts w
    where w.superseded_at < now() - make_interval(days => keep_days)
      and w.status = 'planned'
      and w.intervals_event_id is null
      and not exists (select 1 from public.training_workout_reports r where r.workout_id = w.id)
      and not exists (select 1 from public.training_ftp_tests f where f.workout_id = w.id)
      and not exists (select 1 from public.strava_activity_summaries s where s.workout_id = w.id)
    returning 1
  )
  select count(*)::integer from gone;
$$;


--
-- Name: rate_limit_cleanup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rate_limit_cleanup() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;


--
-- Name: rate_limit_hit(text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rate_limit_hit(p_bucket text, p_key text, p_window_seconds integer, p_max integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  v_count int;
begin
  insert into public.rate_limits (bucket, key, window_start, count)
  values (p_bucket, p_key, v_window, 1)
  on conflict (bucket, key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;
  return v_count <= p_max;
end;
$$;


--
-- Name: record_profile_ftp_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_profile_ftp_history() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  watts int;
begin
  if new.ftp_watts is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.ftp_watts is not distinct from old.ftp_watts then
    return new;
  end if;
  watts := round(new.ftp_watts)::int;
  if watts <= 0 or watts >= 1200 then
    return new;
  end if;
  -- Meerdere wijzigingen op één dag: de laatste telt.
  insert into public.profile_ftp_history (profile_id, effective_from, ftp_watts)
  values (new.id, (now() at time zone 'Europe/Amsterdam')::date, watts)
  on conflict (profile_id, effective_from) do update set ftp_watts = excluded.ftp_watts;
  return new;
end;
$$;


--
-- Name: review_shared_nutrition_recipe(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.review_shared_nutrition_recipe(p_recipe_id uuid, p_approve boolean, p_slug text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.current_user_has_permission('training.create_plans') then
    raise exception 'Geen rechten om recepten te beoordelen.' using errcode = '42501';
  end if;

  if p_approve then
    update public.nutrition_recipes
       set is_standard = true,
           contributed_by = owner_id,
           owner_id = null,
           share_status = null,
           visibility = 'prive',
           show_owner = false,
           slug = coalesce(nullif(p_slug, ''), slug)
     where id = p_recipe_id and share_status = 'voorgesteld';
  else
    update public.nutrition_recipes
       set share_status = 'afgewezen'
     where id = p_recipe_id and share_status = 'voorgesteld';
  end if;
  return found;
end $$;


--
-- Name: roster_entry_team_source(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.roster_entry_team_source(p_entry_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  v_source text;
begin
  execute 'select team_assignment_source from public.roster_entries where id = $1'
    into v_source
    using p_entry_id;
  return v_source;
exception
  when undefined_column then
    return null;
end;
$_$;


--
-- Name: round_start_point(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.round_start_point() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.lat := round(new.lat::numeric, 3);
  new.lon := round(new.lon::numeric, 3);
  new.updated_at := now();
  return new;
end;
$$;


--
-- Name: set_activity_col_scans(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_activity_col_scans(p_rows jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Ongeldige scanrijen.';
  end if;
  update strava_activities a
     set col_slugs = r.col_slugs,
         col_scan_key = r.col_scan_key
    from jsonb_to_recordset(p_rows) as r(id bigint, col_slugs text[], col_scan_key text)
   where a.id = r.id;
end $$;


--
-- Name: set_updated_at_birthday_rides(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_birthday_rides() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: set_updated_at_polls(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_polls() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end$$;


--
-- Name: set_updated_at_sponsors(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_sponsors() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end$$;


--
-- Name: src_replace_results(uuid, text, text, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.src_replace_results(p_event_id uuid, p_result_event_id text, p_status text, p_rows jsonb, p_teams jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_typeof(p_teams) <> 'array' then
    raise exception 'Ongeldige uitslag.';
  end if;
  perform 1 from src_races where event_id = p_event_id for update;
  delete from src_results where race_event_id = p_event_id;
  delete from src_team_results where race_event_id = p_event_id;
  insert into src_results (
    race_event_id, mywhoosh_user_id, name, mywhoosh_team_id, team_name, category,
    category_rank, finished_ms, gap_ms, status, profile_id, suggested_profile_id
  )
  select p_event_id, r.mywhoosh_user_id, r.name, r.mywhoosh_team_id, r.team_name, r.category,
         r.category_rank, r.finished_ms, r.gap_ms, r.status, r.profile_id, r.suggested_profile_id
  from jsonb_to_recordset(p_rows) as r(
    mywhoosh_user_id text, name text, mywhoosh_team_id text, team_name text, category int,
    category_rank int, finished_ms bigint, gap_ms bigint, status text, profile_id uuid,
    suggested_profile_id uuid
  )
  on conflict (race_event_id, mywhoosh_user_id) do nothing;
  insert into src_team_results (
    race_event_id, category, mywhoosh_team_id, team_name, time_ms, rank, finishers
  )
  select p_event_id, t.category, t.mywhoosh_team_id, t.team_name, t.time_ms, t.rank, t.finishers
  from jsonb_to_recordset(p_teams) as t(
    category int, mywhoosh_team_id text, team_name text, time_ms bigint, rank int, finishers int
  )
  on conflict (race_event_id, category, mywhoosh_team_id) do nothing;
  update src_races
     set result_event_id = p_result_event_id,
         results_status = p_status,
         results_synced_at = clock_timestamp(),
         results_error = null
   where event_id = p_event_id;
end $$;


--
-- Name: strava_activities_set_has_gps_times(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.strava_activities_set_has_gps_times() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.has_gps_times := coalesce(new.raw ? 'gps_col_times' or new.raw ? 'gps_segment_times', false);
  return new;
end $$;


--
-- Name: touch_community_role_permissions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_community_role_permissions() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;


--
-- Name: touch_intervals_connections_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_intervals_connections_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: touch_team_roster_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_team_roster_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: touch_training_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_training_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: training_ai_generations_store_prompt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.training_ai_generations_store_prompt() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.prompt_text is not null then
    new.prompt_hash := md5(new.prompt_text);
    insert into public.training_ai_prompts (hash, prompt_text)
    values (new.prompt_hash, new.prompt_text)
    on conflict (hash) do nothing;
    new.prompt_text := null;
  end if;
  return new;
end;
$$;


--
-- Name: unclaim_roster_entry(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unclaim_roster_entry(p_entry_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_count int;
begin
  update public.roster_entries
  set claimed_by = null
  where id = p_entry_id and claimed_by = auth.uid();
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;


--
-- Name: zwbgame_check_rider_consent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.zwbgame_check_rider_consent() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare pref public.zwbgame_preferences;
begin
  select * into pref from public.zwbgame_preferences where profile_id = new.profile_id for update;
  if pref.profile_id is null or pref.data_consent_version is distinct from '2026-09-17'
    or pref.revision is distinct from new.consent_revision then
    raise exception 'Speltoestemming is gewijzigd. Probeer opnieuw.';
  end if;
  return new;
end $$;


--
-- Name: zwbgame_disconnect_intervals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.zwbgame_disconnect_intervals() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  delete from public.zwbgame_riders where profile_id = old.profile_id and attributes->>'source' = 'intervals';
  return old;
end $$;


--
-- Name: zwbgame_invalidate_rider(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.zwbgame_invalidate_rider() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  new.revision := gen_random_uuid();
  new.updated_at := now();
  delete from public.zwbgame_riders where profile_id = new.profile_id;
  return new;
end $$;


--
-- Name: zwbriljant_shares(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.zwbriljant_shares(p_profile uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.zwbriljant_preferences pref
    join public.profiles p on p.id = pref.profile_id
    where pref.profile_id = p_profile
      and pref.visible
      and p.is_approved
  )
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievement_awards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievement_awards (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    badge_id text NOT NULL,
    profile_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    value numeric(12,2) NOT NULL,
    rank integer DEFAULT 1 NOT NULL,
    awarded_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    award_scope text DEFAULT 'weekly'::text NOT NULL,
    CONSTRAINT achievement_awards_award_scope_check CHECK ((award_scope = ANY (ARRAY['weekly'::text, 'milestone'::text])))
);


--
-- Name: achievement_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievement_badges (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    metric text NOT NULL,
    icon text NOT NULL,
    color text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text DEFAULT 'weekly'::text NOT NULL,
    achievement_code text,
    tier text,
    visual_hint text,
    trigger_source text DEFAULT 'manual'::text NOT NULL,
    trigger_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT achievement_badges_kind_check CHECK ((kind = ANY (ARRAY['weekly'::text, 'milestone'::text]))),
    CONSTRAINT achievement_badges_tier_check CHECK ((tier = ANY (ARRAY['bronze'::text, 'silver'::text, 'gold'::text, 'platinum'::text]))),
    CONSTRAINT achievement_badges_trigger_source_check CHECK ((trigger_source = ANY (ARRAY['auto'::text, 'manual'::text, 'future'::text])))
);


--
-- Name: ai_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feature text NOT NULL,
    model text NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    request jsonb,
    output_text text,
    error text,
    usage jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    CONSTRAINT ai_jobs_feature_check CHECK ((feature = ANY (ARRAY['training'::text, 'coach'::text, 'pacing'::text, 'nutrition'::text, 'app_updates'::text]))),
    CONSTRAINT ai_jobs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'in_progress'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: ai_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    profile_id uuid,
    feature text NOT NULL,
    kind text NOT NULL,
    trigger text NOT NULL,
    model text NOT NULL,
    stop_reason text,
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    cache_write_tokens integer DEFAULT 0 NOT NULL,
    cache_read_tokens integer DEFAULT 0 NOT NULL,
    cost_usd numeric(10,5),
    CONSTRAINT ai_usage_trigger_check CHECK ((trigger = ANY (ARRAY['member'::text, 'follow_up'::text, 'automatic'::text])))
);


--
-- Name: ai_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ai_usage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    body_md text NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    author_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    week_start date NOT NULL,
    publish_at timestamp with time zone NOT NULL,
    summary text NOT NULL,
    changes text[] DEFAULT '{}'::text[] NOT NULL,
    fixes text[] DEFAULT '{}'::text[] NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT app_updates_check CHECK ((((cardinality(changes) + cardinality(fixes)) >= 1) AND ((cardinality(changes) + cardinality(fixes)) <= 30))),
    CONSTRAINT app_updates_summary_check CHECK (((length(btrim(summary)) >= 10) AND (length(btrim(summary)) <= 400))),
    CONSTRAINT app_updates_week_start_check CHECK ((EXTRACT(isodow FROM week_start) = (1)::numeric))
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bike_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bike_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    bike_id text NOT NULL,
    component_type text NOT NULL,
    name text,
    wear_range text DEFAULT 'normal'::text NOT NULL,
    threshold_km integer NOT NULL,
    custom_threshold boolean DEFAULT false NOT NULL,
    baseline_distance_m numeric(12,2) DEFAULT 0 NOT NULL,
    installed_at date,
    status text DEFAULT 'active'::text NOT NULL,
    replaced_at date,
    notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    wear_metric text DEFAULT 'km'::text NOT NULL,
    threshold_value integer NOT NULL,
    CONSTRAINT bike_components_status_check CHECK ((status = ANY (ARRAY['active'::text, 'replaced'::text]))),
    CONSTRAINT bike_components_threshold_km_check CHECK ((threshold_km > 0)),
    CONSTRAINT bike_components_wear_metric_check CHECK ((wear_metric = ANY (ARRAY['km'::text, 'months'::text]))),
    CONSTRAINT bike_components_wear_range_check CHECK ((wear_range = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text])))
);


--
-- Name: birthday_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.birthday_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    birthday_profile_id uuid NOT NULL,
    author_profile_id uuid NOT NULL,
    celebration_year integer NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT birthday_messages_body_check CHECK (((char_length(btrim(body)) >= 1) AND (char_length(btrim(body)) <= 500))),
    CONSTRAINT birthday_messages_celebration_year_check CHECK (((celebration_year >= 2000) AND (celebration_year <= 2100)))
);


--
-- Name: birthday_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.birthday_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    birthday_profile_id uuid NOT NULL,
    uploader_profile_id uuid NOT NULL,
    celebration_year integer NOT NULL,
    storage_path text NOT NULL,
    caption text,
    width integer,
    height integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT birthday_photos_caption_check CHECK (((caption IS NULL) OR (char_length(caption) <= 300))),
    CONSTRAINT birthday_photos_celebration_year_check CHECK (((celebration_year >= 2000) AND (celebration_year <= 2100))),
    CONSTRAINT birthday_photos_height_check CHECK (((height IS NULL) OR (height > 0))),
    CONSTRAINT birthday_photos_width_check CHECK (((width IS NULL) OR (width > 0)))
);


--
-- Name: birthday_ride_rsvps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.birthday_ride_rsvps (
    birthday_profile_id uuid NOT NULL,
    celebration_year integer NOT NULL,
    profile_id uuid NOT NULL,
    status text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT birthday_ride_rsvps_celebration_year_check CHECK (((celebration_year >= 2000) AND (celebration_year <= 2100))),
    CONSTRAINT birthday_ride_rsvps_status_check CHECK ((status = ANY (ARRAY['yes'::text, 'maybe'::text, 'no'::text])))
);


--
-- Name: birthday_rides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.birthday_rides (
    birthday_profile_id uuid NOT NULL,
    celebration_year integer NOT NULL,
    ride_date date NOT NULL,
    ride_time time without time zone NOT NULL,
    location text NOT NULL,
    invitation text NOT NULL,
    gpx_path text,
    distance_km numeric(7,2),
    elevation_m integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT birthday_rides_celebration_year_check CHECK (((celebration_year >= 2000) AND (celebration_year <= 2100))),
    CONSTRAINT birthday_rides_distance_km_check CHECK (((distance_km IS NULL) OR (distance_km >= (0)::numeric))),
    CONSTRAINT birthday_rides_elevation_m_check CHECK (((elevation_m IS NULL) OR (elevation_m >= 0))),
    CONSTRAINT birthday_rides_invitation_check CHECK (((char_length(btrim(invitation)) >= 1) AND (char_length(btrim(invitation)) <= 1000))),
    CONSTRAINT birthday_rides_location_check CHECK (((char_length(btrim(location)) >= 1) AND (char_length(btrim(location)) <= 160)))
);


--
-- Name: bokaal_bets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bokaal_bets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    race_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    season text NOT NULL,
    market text NOT NULL,
    rider_slug text NOT NULL,
    rider_name text NOT NULL,
    vs_slug text,
    vs_name text,
    odds numeric(6,2) NOT NULL,
    stake integer NOT NULL,
    outcome text DEFAULT 'open'::text NOT NULL,
    payout numeric(8,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bokaal_bets_check CHECK (((market = 'duel'::text) = (vs_slug IS NOT NULL))),
    CONSTRAINT bokaal_bets_check1 CHECK (((outcome = 'open'::text) = (payout IS NULL))),
    CONSTRAINT bokaal_bets_market_check CHECK ((market = ANY (ARRAY['win'::text, 'pod'::text, 'top'::text, 'duel'::text]))),
    CONSTRAINT bokaal_bets_odds_check CHECK (((odds >= 1.05) AND (odds <= (50)::numeric))),
    CONSTRAINT bokaal_bets_outcome_check CHECK ((outcome = ANY (ARRAY['open'::text, 'raak'::text, 'mis'::text, 'terug'::text]))),
    CONSTRAINT bokaal_bets_payout_check CHECK (((payout IS NULL) OR (payout >= (0)::numeric))),
    CONSTRAINT bokaal_bets_stake_check CHECK (((stake >= 1) AND (stake <= 5)))
);


--
-- Name: bokaal_bonus_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bokaal_bonus_answers (
    race_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    season text NOT NULL,
    choice smallint NOT NULL,
    correct boolean,
    answered_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bokaal_bonus_answers_choice_check CHECK (((choice >= 0) AND (choice <= 5)))
);


--
-- Name: bokaal_players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bokaal_players (
    profile_id uuid NOT NULL,
    season text NOT NULL,
    consent_version text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bokaal_players_consent_version_check CHECK ((consent_version = '2026-10-19'::text)),
    CONSTRAINT bokaal_players_season_check CHECK ((season ~ '^[0-9]{4}-[0-9]{4}$'::text))
);


--
-- Name: bokaal_races; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bokaal_races (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season text NOT NULL,
    category text NOT NULL,
    event_slug text NOT NULL,
    event_name text NOT NULL,
    race_slug text NOT NULL,
    location text,
    starts_at timestamp with time zone NOT NULL,
    status text DEFAULT 'concept'::text NOT NULL,
    board jsonb DEFAULT '{"duels": [], "riders": []}'::jsonb NOT NULL,
    bonus jsonb,
    result jsonb,
    odds_at timestamp with time zone,
    settled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bokaal_races_board_check CHECK (((jsonb_typeof((board -> 'riders'::text)) = 'array'::text) AND (jsonb_typeof((board -> 'duels'::text)) = 'array'::text))),
    CONSTRAINT bokaal_races_bonus_check CHECK (((bonus IS NULL) OR (jsonb_typeof((bonus -> 'options'::text)) = 'array'::text))),
    CONSTRAINT bokaal_races_category_check CHECK ((category = ANY (ARRAY['w'::text, 'm'::text]))),
    CONSTRAINT bokaal_races_event_name_check CHECK (((length(event_name) >= 1) AND (length(event_name) <= 160))),
    CONSTRAINT bokaal_races_event_slug_check CHECK ((event_slug ~ '^[a-z0-9-]{1,160}$'::text)),
    CONSTRAINT bokaal_races_location_check CHECK (((location IS NULL) OR (length(location) <= 120))),
    CONSTRAINT bokaal_races_race_slug_check CHECK ((race_slug ~ '^[a-z0-9-]{1,160}$'::text)),
    CONSTRAINT bokaal_races_result_check CHECK (((result IS NULL) OR (jsonb_typeof(result) = 'array'::text))),
    CONSTRAINT bokaal_races_season_check CHECK ((season ~ '^[0-9]{4}-[0-9]{4}$'::text)),
    CONSTRAINT bokaal_races_status_check CHECK ((status = ANY (ARRAY['concept'::text, 'open'::text, 'afgerekend'::text, 'geannuleerd'::text])))
);


--
-- Name: bokaal_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bokaal_ratings (
    category text NOT NULL,
    rider_slug text NOT NULL,
    rider_name text NOT NULL,
    rating integer NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bokaal_ratings_category_check CHECK ((category = ANY (ARRAY['w'::text, 'm'::text]))),
    CONSTRAINT bokaal_ratings_rating_check CHECK (((rating >= 0) AND (rating <= 3000))),
    CONSTRAINT bokaal_ratings_rider_name_check CHECK (((length(rider_name) >= 1) AND (length(rider_name) <= 120))),
    CONSTRAINT bokaal_ratings_rider_slug_check CHECK ((rider_slug ~ '^[a-z0-9-]{1,160}$'::text))
);


--
-- Name: calendar_feed_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_feed_tokens (
    profile_id uuid NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_fetched_at timestamp with time zone
);


--
-- Name: profile_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_blocks (
    profile_id uuid NOT NULL,
    z smallint DEFAULT 14 NOT NULL,
    x integer NOT NULL,
    y integer NOT NULL,
    first_activity_id bigint,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    country text,
    province text
);


--
-- Name: club_blocks; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.club_blocks WITH (security_invoker='on') AS
 SELECT z,
    x,
    y,
    country,
    province,
    (count(DISTINCT profile_id))::integer AS rider_count
   FROM public.profile_blocks
  GROUP BY z, x, y, country, province;


--
-- Name: club_ladder_event_expectations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_ladder_event_expectations (
    event_id uuid NOT NULL,
    riders jsonb DEFAULT '[]'::jsonb NOT NULL,
    weights jsonb,
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: club_ladder_favorite_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_ladder_favorite_routes (
    team_id uuid NOT NULL,
    route_slug text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: club_ladder_fixture_signups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_ladder_fixture_signups (
    fixture_id integer NOT NULL,
    zwift_id bigint NOT NULL,
    team text NOT NULL,
    name text NOT NULL,
    "position" integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: club_ladder_match_riders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_ladder_match_riders (
    result_id integer NOT NULL,
    "position" integer NOT NULL,
    name text NOT NULL,
    team text NOT NULL,
    points integer NOT NULL,
    time_s numeric,
    avg_wkg numeric,
    zwift_id bigint,
    weight_kg numeric,
    racing_score numeric,
    power_wkg jsonb
);


--
-- Name: club_ladder_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_ladder_matches (
    result_id integer NOT NULL,
    raced_on date NOT NULL,
    raced_at time without time zone NOT NULL,
    route_name text,
    route_slug text,
    challenger text NOT NULL,
    challenger_score integer NOT NULL,
    opponent text NOT NULL,
    opponent_score integer NOT NULL,
    stage text,
    zwift_event_id bigint,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    riders_fetched_at timestamp with time zone
);


--
-- Name: club_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_modules (
    module_key text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    label text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: club_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_settings (
    id boolean DEFAULT true NOT NULL,
    name text NOT NULL,
    short_name text NOT NULL,
    member_noun text,
    member_noun_plural text,
    contact_email text,
    website_url text,
    instagram_handle text,
    youtube_handle text,
    setup_completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    color_primary text,
    color_secondary text,
    color_neutral text,
    color_accent text,
    color_ink text,
    font text,
    logo_url text,
    mark_url text,
    app_name text,
    advice_name text,
    currency_noun text,
    currency_noun_plural text,
    cup_noun text,
    better_word text,
    event_markers text[],
    team_tag text,
    CONSTRAINT club_settings_colors_hex CHECK ((((color_primary IS NULL) OR (color_primary ~ '^#[0-9a-f]{6}$'::text)) AND ((color_secondary IS NULL) OR (color_secondary ~ '^#[0-9a-f]{6}$'::text)) AND ((color_neutral IS NULL) OR (color_neutral ~ '^#[0-9a-f]{6}$'::text)) AND ((color_accent IS NULL) OR (color_accent ~ '^#[0-9a-f]{6}$'::text)) AND ((color_ink IS NULL) OR (color_ink ~ '^#[0-9a-f]{6}$'::text)))),
    CONSTRAINT club_settings_font_known CHECK (((font IS NULL) OR (font = ANY (ARRAY['barlow'::text, 'archivo'::text, 'inter'::text, 'schibsted'::text])))),
    CONSTRAINT club_settings_id_check CHECK (id)
);


--
-- Name: club_stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_stories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid,
    chapter text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    happened_year smallint,
    beker_id uuid,
    status text DEFAULT 'ingestuurd'::text NOT NULL,
    review_note text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scenes jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT club_stories_body_check CHECK (((length(btrim(body)) >= 20) AND (length(btrim(body)) <= 5000))),
    CONSTRAINT club_stories_chapter_check CHECK ((chapter = ANY (ARRAY['basis'::text, 'anders'::text, 'team'::text, 'nu'::text]))),
    CONSTRAINT club_stories_check CHECK (((status = 'ingestuurd'::text) = (reviewed_at IS NULL))),
    CONSTRAINT club_stories_happened_year_check CHECK (((happened_year IS NULL) OR ((happened_year >= 2000) AND (happened_year <= 2100)))),
    CONSTRAINT club_stories_review_note_check CHECK (((review_note IS NULL) OR ((length(btrim(review_note)) >= 1) AND (length(btrim(review_note)) <= 500)))),
    CONSTRAINT club_stories_scenes_check CHECK (((jsonb_typeof(scenes) = 'array'::text) AND (jsonb_array_length(scenes) <= 8))),
    CONSTRAINT club_stories_status_check CHECK ((status = ANY (ARRAY['ingestuurd'::text, 'geplaatst'::text, 'teruggestuurd'::text]))),
    CONSTRAINT club_stories_title_check CHECK (((length(btrim(title)) >= 3) AND (length(btrim(title)) <= 80)))
);


--
-- Name: club_story_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_story_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    path text NOT NULL,
    caption text,
    "position" smallint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT club_story_photos_caption_check CHECK (((caption IS NULL) OR ((length(btrim(caption)) >= 1) AND (length(btrim(caption)) <= 140)))),
    CONSTRAINT club_story_photos_path_check CHECK ((length(path) <= 300)),
    CONSTRAINT club_story_photos_position_check CHECK ((("position" >= 0) AND ("position" <= 5)))
);


--
-- Name: profile_zwift_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_zwift_blocks (
    profile_id uuid NOT NULL,
    world text NOT NULL,
    z smallint DEFAULT 16 NOT NULL,
    x integer NOT NULL,
    y integer NOT NULL,
    first_activity_id bigint,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: club_zwift_blocks; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.club_zwift_blocks WITH (security_invoker='on') AS
 SELECT world,
    z,
    x,
    y,
    (count(DISTINCT profile_id))::integer AS rider_count
   FROM public.profile_zwift_blocks
  GROUP BY world, z, x, y;


--
-- Name: cols; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cols (
    slug text NOT NULL,
    name text NOT NULL,
    country text NOT NULL,
    region text,
    summit_lat numeric(9,6),
    summit_lon numeric(9,6),
    summit_elevation_m integer,
    ascent_m integer,
    category text,
    detection_radius_m integer DEFAULT 500 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    strava_segment_id bigint,
    virtual boolean DEFAULT false NOT NULL,
    start_lat numeric(9,6),
    start_lon numeric(9,6)
);


--
-- Name: community_role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_role_permissions (
    role text NOT NULL,
    permissions text[] DEFAULT ARRAY[]::text[] NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT community_role_permissions_allowed CHECK ((permissions <@ ARRAY['events.create'::text, 'events.manage_all'::text, 'calendar.sources'::text, 'competitions.manage'::text, 'teams.create'::text, 'teams.manage_roster'::text, 'teams.manage_results'::text, 'teams.sync_sources'::text, 'content.create_posts'::text, 'content.moderate_posts'::text, 'media.manage'::text, 'community.manage'::text, 'notifications.broadcast'::text, 'integrations.manage'::text, 'members.approve'::text, 'members.manage_roles'::text, 'roles.manage_permissions'::text, 'achievements.finalize'::text, 'live.start'::text, 'sponsors.manage'::text, 'polls.manage'::text, 'qa.answer'::text, 'training.view_assigned'::text, 'training.manage_assignments'::text, 'training.create_plans'::text, 'training.publish_plans'::text, 'training.ai_generate'::text, 'omnium.manage'::text, 'src.manage'::text, 'zwbgame.manage'::text])),
    CONSTRAINT community_role_permissions_role_allowed CHECK ((role = ANY (ARRAY['board'::text, 'team_captain'::text, 'event_organizer'::text, 'community_manager'::text, 'trainer'::text, 'paying_member'::text, 'community_member'::text])))
);


--
-- Name: event_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    profile_id uuid,
    guest_name text,
    body text NOT NULL,
    internal_only boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    to_riders boolean DEFAULT false NOT NULL
);


--
-- Name: event_climbs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_climbs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    name text,
    category text,
    start_km numeric(7,3) NOT NULL,
    end_km numeric(7,3) NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_climbs_category_check CHECK ((category = ANY (ARRAY['4e'::text, '3e'::text, '2e'::text, '1e'::text, 'HC'::text])))
);


--
-- Name: event_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    kind text NOT NULL,
    label text,
    url text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_links_kind_check CHECK ((kind = ANY (ARRAY['recon'::text, 'zwiftinsider'::text, 'zwb'::text, 'overig'::text]))),
    CONSTRAINT event_links_url_check CHECK ((url ~ '^https://'::text))
);


--
-- Name: event_pacing_generations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_pacing_generations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    model text NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    openai_response_id text,
    prompt_summary text,
    prompt_text text,
    response_json jsonb,
    error text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_pacing_generations_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'in_progress'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: event_pacing_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_pacing_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    source text DEFAULT 'baseline'::text NOT NULL,
    segments jsonb DEFAULT '[]'::jsonb NOT NULL,
    route_snapshot jsonb,
    assumptions jsonb,
    summary jsonb,
    notes text,
    shared boolean DEFAULT false NOT NULL,
    ai_generation_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_pacing_plans_source_check CHECK ((source = ANY (ARRAY['ai'::text, 'baseline'::text, 'manual'::text])))
);


--
-- Name: event_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    storage_path text NOT NULL,
    caption text,
    taken_at timestamp with time zone,
    width integer,
    height integer,
    lat numeric(9,6),
    lon numeric(9,6),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: event_pois; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_pois (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    type text NOT NULL,
    label text,
    lat numeric(9,6) NOT NULL,
    lng numeric(9,6) NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_pois_type_check CHECK ((type = ANY (ARRAY['water'::text, 'food'::text, 'danger'::text, 'view'::text, 'info'::text])))
);


--
-- Name: event_program_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_program_links (
    program_id uuid NOT NULL,
    event_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: event_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    archived_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_programs_name_check CHECK ((length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT event_programs_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))
);


--
-- Name: event_reminder_sends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_reminder_sends (
    event_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    reminder_kind text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_reminder_sends_reminder_kind_check CHECK ((reminder_kind = ANY (ARRAY['24h'::text, '2h'::text, 'src_registration'::text, 'src_weighin'::text])))
);


--
-- Name: event_report_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_report_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: event_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    body_md text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    preparation_md text,
    course_md text,
    result_md text,
    lessons_md text
);


--
-- Name: event_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    profile_id uuid,
    scraped_name text NOT NULL,
    "position" integer,
    time_text text,
    time_seconds integer,
    matched_via text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_manual boolean DEFAULT false NOT NULL,
    category text,
    category_rank integer
);


--
-- Name: event_rsvps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_rsvps (
    event_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    status text NOT NULL,
    note text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_rsvps_status_check CHECK ((status = ANY (ARRAY['yes'::text, 'maybe'::text, 'no'::text])))
);


--
-- Name: event_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    label text,
    start_km numeric(7,3) NOT NULL,
    end_km numeric(7,3) NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone,
    location text,
    start_lat numeric(9,6),
    start_lon numeric(9,6),
    gpx_path text,
    distance_km numeric(6,2),
    elevation_m integer,
    team_id uuid,
    created_by uuid NOT NULL,
    weather_cache jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    external_url text,
    results_url text,
    last_results_scrape_at timestamp with time zone,
    results_scrape_error text,
    cover_image_path text,
    live_timing_url text,
    zwift_event_id bigint,
    zwift_route_id bigint,
    laps integer,
    zwift_event_type text,
    zwift_rules text[],
    zwift_tags text[],
    zwift_bike_hash bigint,
    parent_event_id uuid,
    frr_tour_id uuid,
    frr_stage integer,
    src_sunday date,
    kind text,
    duration_minutes integer,
    club_ladder_fixture_id integer,
    club_ladder_opponent text,
    CONSTRAINT events_duration_minutes_check CHECK (((duration_minutes IS NULL) OR ((duration_minutes >= 1) AND (duration_minutes <= 1440)))),
    CONSTRAINT events_frr_stage_check CHECK (((frr_stage IS NULL) OR (frr_stage > 0))),
    CONSTRAINT events_kind_check CHECK (((kind IS NULL) OR (kind = ANY (ARRAY['training'::text, 'social'::text, 'goed_doel'::text])))),
    CONSTRAINT events_parent_not_self CHECK (((parent_event_id IS NULL) OR (parent_event_id <> id))),
    CONSTRAINT events_type_check CHECK ((type = ANY (ARRAY['outdoor'::text, 'gran_fondo'::text, 'toertocht'::text, 'gravel_race'::text, 'zrl'::text, 'ladder'::text, 'flamme_rouge'::text, 'zwift'::text, 'mywhoosh'::text, 'omnium'::text, 'src'::text, 'overig'::text])))
);


--
-- Name: COLUMN events.duration_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.duration_minutes IS 'Koersduur in minuten (rijden tot de tijd op is); gaat in het schema voor eindtijd en afstand.';


--
-- Name: external_event_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_event_candidates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    source text NOT NULL,
    external_id text NOT NULL,
    external_url text NOT NULL,
    title text NOT NULL,
    start_at timestamp with time zone NOT NULL,
    distance_km numeric(10,2),
    elevation_m integer,
    zwb_match_status text DEFAULT 'unknown'::text NOT NULL,
    raw_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    ignored_at timestamp with time zone,
    published_event_id uuid,
    published_at timestamp with time zone,
    published_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT external_event_candidates_source_check CHECK ((source = ANY (ARRAY['mywhoosh'::text, 'zwift'::text]))),
    CONSTRAINT external_event_candidates_zwb_match_status_check CHECK ((zwb_match_status = ANY (ARRAY['unknown'::text, 'likely'::text, 'confirmed'::text, 'manual'::text])))
);


--
-- Name: external_event_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_event_participants (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    candidate_id uuid NOT NULL,
    source text NOT NULL,
    external_name text NOT NULL,
    category text,
    profile_id uuid,
    raw_text text,
    matched_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT external_event_participants_source_check CHECK ((source = ANY (ARRAY['zwiftpower_text'::text, 'manual'::text, 'zwift_club'::text, 'zwift_feed'::text])))
);


--
-- Name: frr_gc_exclusions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.frr_gc_exclusions (
    profile_id uuid NOT NULL,
    tour_id uuid NOT NULL,
    zwift_id text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frr_gc_exclusions_zwift_id_check CHECK ((zwift_id ~ '^\d+$'::text))
);


--
-- Name: frr_gc_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.frr_gc_history (
    tour_id uuid NOT NULL,
    after_stage integer NOT NULL,
    gender_class text NOT NULL,
    class_code text NOT NULL,
    zwift_id text NOT NULL,
    "position" integer NOT NULL,
    name text NOT NULL,
    club text,
    stages_ridden integer,
    tour_time_s numeric(12,3),
    egap_s numeric(12,3),
    penalty_s numeric(8,3) DEFAULT 0 NOT NULL,
    stage_time_s numeric(12,3),
    stage_egap_s numeric(12,3),
    CONSTRAINT frr_gc_history_after_stage_check CHECK ((after_stage > 0)),
    CONSTRAINT frr_gc_history_penalty_s_check CHECK ((penalty_s >= (0)::numeric)),
    CONSTRAINT frr_gc_history_position_check CHECK (("position" > 0)),
    CONSTRAINT frr_gc_history_zwift_id_check CHECK ((zwift_id ~ '^\d+$'::text))
);


--
-- Name: frr_gc_standings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.frr_gc_standings (
    tour_id uuid NOT NULL,
    gender_class text NOT NULL,
    class_code text NOT NULL,
    gender text NOT NULL,
    zwift_id text NOT NULL,
    "position" integer NOT NULL,
    name text NOT NULL,
    club text,
    age_cat text,
    stages_ridden integer,
    tour_time_s numeric(12,3),
    egap_s numeric(12,3),
    after_stage integer NOT NULL,
    scraped_at timestamp with time zone DEFAULT now() NOT NULL,
    penalty_s numeric(8,3) DEFAULT 0 NOT NULL,
    CONSTRAINT frr_gc_standings_gender_check CHECK ((gender = ANY (ARRAY['M'::text, 'F'::text]))),
    CONSTRAINT frr_gc_standings_penalty_s_check CHECK ((penalty_s >= (0)::numeric)),
    CONSTRAINT frr_gc_standings_position_check CHECK (("position" > 0)),
    CONSTRAINT frr_gc_standings_zwift_id_check CHECK ((zwift_id ~ '^\d+$'::text))
);


--
-- Name: frr_slot_entrants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.frr_slot_entrants (
    event_id uuid NOT NULL,
    zwift_id text NOT NULL,
    name text NOT NULL,
    subgroup_label text,
    profile_id uuid,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frr_slot_entrants_zwift_id_check CHECK ((zwift_id ~ '^\d+$'::text))
);


--
-- Name: frr_stage_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.frr_stage_results (
    slot_event_id uuid NOT NULL,
    zwift_id text NOT NULL,
    tour_id uuid NOT NULL,
    stage integer NOT NULL,
    pen text,
    time_s numeric(12,3) NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frr_stage_results_stage_check CHECK ((stage > 0)),
    CONSTRAINT frr_stage_results_time_s_check CHECK ((time_s > (0)::numeric)),
    CONSTRAINT frr_stage_results_zwift_id_check CHECK ((zwift_id ~ '^\d+$'::text))
);


--
-- Name: frr_tours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.frr_tours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    zwift_tag text NOT NULL,
    gc_code text,
    starts_on date,
    ends_on date,
    gc_after_stage integer,
    gc_scraped_at timestamp with time zone,
    gc_error text,
    synced_at timestamp with time zone,
    sync_error text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frr_tours_gc_code_check CHECK (((gc_code IS NULL) OR (gc_code ~ '^[A-Za-z0-9]+(\.[A-Za-z0-9]+)?$'::text))),
    CONSTRAINT frr_tours_zwift_tag_check CHECK ((zwift_tag ~ '^frr[a-z0-9]+$'::text))
);


--
-- Name: frr_watch_riders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.frr_watch_riders (
    profile_id uuid NOT NULL,
    zwift_id text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frr_watch_riders_zwift_id_check CHECK ((zwift_id ~ '^\d+$'::text))
);


--
-- Name: integration_health; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_health (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    source text NOT NULL,
    ok boolean NOT NULL,
    detail text,
    checked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: integration_notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    integration text NOT NULL,
    body text NOT NULL,
    sent_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    seen_at timestamp with time zone,
    resolved_at timestamp with time zone,
    CONSTRAINT integration_notices_body_check CHECK (((length(btrim(body)) >= 1) AND (length(btrim(body)) <= 600))),
    CONSTRAINT integration_notices_integration_check CHECK ((integration = ANY (ARRAY['strava'::text, 'intervals'::text, 'telegram'::text, 'push'::text, 'agenda'::text, 'live'::text])))
);


--
-- Name: intervals_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intervals_activities (
    profile_id uuid NOT NULL,
    intervals_id text NOT NULL,
    start_date_local date NOT NULL,
    name text,
    type text,
    moving_time_seconds integer,
    distance_m numeric,
    elevation_gain_m numeric,
    training_load numeric,
    intensity numeric,
    average_watts numeric,
    normalized_watts numeric,
    kilojoules numeric,
    ftp_watts numeric,
    raw jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    average_hr numeric,
    max_hr numeric,
    average_cadence numeric
);


--
-- Name: intervals_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intervals_connections (
    profile_id uuid NOT NULL,
    athlete_id text,
    athlete_name text,
    api_key text NOT NULL,
    scope text DEFAULT 'ACTIVITY:READ,WELLNESS:READ'::text,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    wellness_opt_in boolean DEFAULT false NOT NULL,
    last_ride_sync_error text,
    rides_backfilled_at timestamp with time zone,
    visit_confirmed_at timestamp with time zone,
    visit_reminded_at timestamp with time zone,
    rides_via_intervals boolean DEFAULT false NOT NULL
);


--
-- Name: intervals_strength_muscles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intervals_strength_muscles (
    profile_id uuid NOT NULL,
    intervals_id text NOT NULL,
    muscles text[] DEFAULT '{}'::text[] NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT intervals_strength_muscles_groups_check CHECK ((muscles <@ ARRAY['schouders'::text, 'borst'::text, 'biceps'::text, 'triceps'::text, 'onderarmen'::text, 'nek'::text, 'bovenrug'::text, 'onderrug'::text, 'buik'::text, 'schuin'::text, 'heupbuigers'::text, 'bilspieren'::text, 'adductoren'::text, 'quadriceps'::text, 'hamstrings'::text, 'kuiten'::text]))
);


--
-- Name: knowledge_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    author_id uuid,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT knowledge_messages_body_check CHECK (((length(btrim(body)) >= 1) AND (length(btrim(body)) <= 2000)))
);


--
-- Name: knowledge_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asker_id uuid NOT NULL,
    expert_id uuid NOT NULL,
    topic_slug text NOT NULL,
    tip_id uuid,
    status text DEFAULT 'open'::text NOT NULL,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL,
    last_author_id uuid,
    asker_read_at timestamp with time zone,
    expert_read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT knowledge_threads_check CHECK ((asker_id <> expert_id)),
    CONSTRAINT knowledge_threads_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text]))),
    CONSTRAINT knowledge_threads_topic_slug_check CHECK ((topic_slug ~ '^[a-z0-9-]{2,40}$'::text))
);


--
-- Name: knowledge_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_topics (
    slug text NOT NULL,
    label text NOT NULL,
    kind text DEFAULT 'kennis'::text NOT NULL,
    sort_order integer DEFAULT 1000 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT knowledge_topics_kind_check CHECK ((kind = ANY (ARRAY['kennis'::text, 'spullen'::text]))),
    CONSTRAINT knowledge_topics_label_check CHECK (((length(btrim(label)) >= 2) AND (length(btrim(label)) <= 40))),
    CONSTRAINT knowledge_topics_slug_check CHECK ((slug ~ '^[a-z0-9-]{2,40}$'::text)),
    CONSTRAINT knowledge_topics_status_check CHECK ((status = ANY (ARRAY['active'::text, 'hidden'::text])))
);


--
-- Name: ladder_pool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ladder_pool (
    profile_id uuid NOT NULL,
    added_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ladder_ranks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ladder_ranks (
    zwift_id text NOT NULL,
    rank smallint NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ladder_ranks_rank_check CHECK (((rank >= 1) AND (rank <= 10))),
    CONSTRAINT ladder_ranks_zwift_id_check CHECK ((zwift_id ~ '^[0-9]+$'::text))
);


--
-- Name: ladder_roster_riders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ladder_roster_riders (
    roster_entry_id uuid NOT NULL,
    team_id uuid,
    sex text,
    added_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ladder_roster_riders_sex_check CHECK ((sex = ANY (ARRAY['man'::text, 'vrouw'::text])))
);


--
-- Name: ladder_withdrawn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ladder_withdrawn (
    profile_id uuid NOT NULL,
    withdrawn_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: live_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_positions (
    id bigint NOT NULL,
    session_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    lat numeric(9,6) NOT NULL,
    lng numeric(9,6) NOT NULL,
    altitude numeric(7,2),
    speed_kmh numeric(5,1),
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    power_w smallint,
    cadence_rpm smallint,
    heart_rate smallint,
    distance_m integer,
    CONSTRAINT live_positions_cadence_rpm_check CHECK (((cadence_rpm IS NULL) OR ((cadence_rpm >= 0) AND (cadence_rpm <= 255)))),
    CONSTRAINT live_positions_distance_m_check CHECK (((distance_m IS NULL) OR (distance_m >= 0))),
    CONSTRAINT live_positions_heart_rate_check CHECK (((heart_rate IS NULL) OR ((heart_rate >= 20) AND (heart_rate <= 255)))),
    CONSTRAINT live_positions_power_w_check CHECK (((power_w IS NULL) OR ((power_w >= 0) AND (power_w <= 3000))))
);


--
-- Name: live_positions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.live_positions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: live_positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.live_positions_id_seq OWNED BY public.live_positions.id;


--
-- Name: live_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_sessions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    profile_id uuid NOT NULL,
    mode text NOT NULL,
    status_text text,
    external_track_url text,
    visibility text DEFAULT 'members'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    source text DEFAULT 'manual'::text NOT NULL,
    external_last_fetch_at timestamp with time zone,
    external_last_point_at timestamp with time zone,
    external_status text,
    tracker_token_id uuid,
    CONSTRAINT live_sessions_external_status_check CHECK (((external_status IS NULL) OR (external_status = ANY (ARRAY['live'::text, 'ended'::text, 'error'::text, 'link'::text])))),
    CONSTRAINT live_sessions_mode_check CHECK ((mode = ANY (ARRAY['outdoor'::text, 'zwift'::text, 'mywhoosh'::text, 'wahoo_indoor'::text, 'other_indoor'::text]))),
    CONSTRAINT live_sessions_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'owntracks'::text, 'external'::text, 'garmin'::text, 'wahoo'::text]))),
    CONSTRAINT live_sessions_visibility_check CHECK ((visibility = ANY (ARRAY['members'::text, 'public'::text, 'private'::text])))
);


--
-- Name: live_tracker_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_tracker_tokens (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    profile_id uuid NOT NULL,
    provider text DEFAULT 'owntracks'::text NOT NULL,
    token_hash text NOT NULL,
    label text DEFAULT 'OwnTracks'::text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    last_seen_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    external_url text,
    last_checked_at timestamp with time zone,
    CONSTRAINT live_tracker_tokens_external_url_check CHECK (((provider <> 'wahoo_link'::text) OR (external_url ~ '^https://(www\.)?wahooligan\.com/users/live/[A-Za-z0-9_-]{10,64}$'::text))),
    CONSTRAINT live_tracker_tokens_provider_check CHECK ((provider = ANY (ARRAY['owntracks'::text, 'mail'::text, 'wahoo_link'::text])))
);


--
-- Name: maintenance_tips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_tips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    component_type text NOT NULL,
    discipline text,
    body text NOT NULL,
    source_type text NOT NULL,
    source_name text,
    source_url text,
    profile_id uuid,
    status text DEFAULT 'published'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT maintenance_tips_body_check CHECK (((length(btrim(body)) >= 3) AND (length(btrim(body)) <= 600))),
    CONSTRAINT maintenance_tips_discipline_check CHECK (((discipline IS NULL) OR (discipline = ANY (ARRAY['race'::text, 'gravel'::text, 'mtb'::text, 'indoor'::text, 'stad'::text, 'overig'::text])))),
    CONSTRAINT maintenance_tips_member_has_profile CHECK (((source_type <> 'lid'::text) OR (profile_id IS NOT NULL))),
    CONSTRAINT maintenance_tips_source_type_check CHECK ((source_type = ANY (ARRAY['pro'::text, 'lid'::text, 'algemeen'::text]))),
    CONSTRAINT maintenance_tips_status_check CHECK ((status = ANY (ARRAY['published'::text, 'hidden'::text])))
);


--
-- Name: media_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    body_md text,
    apple_url text,
    spotify_url text,
    rss_url text,
    youtube_url text,
    web_url text,
    cover_url text,
    pinned boolean DEFAULT false NOT NULL,
    author_id uuid NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    external_id text,
    source text,
    CONSTRAINT media_items_kind_check CHECK ((kind = ANY (ARRAY['mededeling'::text, 'nieuwsbrief'::text, 'podcast'::text, 'video'::text, 'artikel'::text, 'instagram'::text])))
);


--
-- Name: member_benefits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_benefits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sponsor_id uuid,
    title text NOT NULL,
    description_md text,
    discount_code text,
    redeem_url text,
    valid_from date,
    valid_until date,
    active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: member_knowledge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_knowledge (
    profile_id uuid NOT NULL,
    consent_version text NOT NULL,
    consented_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT member_knowledge_consent_version_check CHECK ((consent_version = '2026-10-15'::text))
);


--
-- Name: member_knowledge_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_knowledge_topics (
    profile_id uuid NOT NULL,
    topic_slug text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT member_knowledge_topics_note_check CHECK (((note IS NULL) OR (length(note) <= 140))),
    CONSTRAINT member_knowledge_topics_topic_slug_check CHECK ((topic_slug ~ '^[a-z0-9-]{2,40}$'::text))
);


--
-- Name: member_protocol_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_protocol_checks (
    protocol_id uuid NOT NULL,
    day date NOT NULL,
    task_key text NOT NULL,
    done_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT member_protocol_checks_task_key_check CHECK ((task_key ~ '^[a-z0-9-]{1,60}$'::text))
);


--
-- Name: member_protocol_core_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_protocol_core_sessions (
    protocol_id uuid NOT NULL,
    intervals_id text NOT NULL,
    day date NOT NULL,
    max_core_c numeric(4,2),
    minutes_above integer,
    auto_checked boolean DEFAULT false NOT NULL,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    ride_minutes integer,
    minutes_to_threshold integer,
    coverage_pct integer,
    CONSTRAINT member_protocol_core_sessions_check CHECK (((max_core_c IS NULL) = (minutes_above IS NULL))),
    CONSTRAINT member_protocol_core_sessions_coverage_pct_check CHECK (((coverage_pct IS NULL) OR ((coverage_pct >= 0) AND (coverage_pct <= 100)))),
    CONSTRAINT member_protocol_core_sessions_intervals_id_check CHECK (((char_length(intervals_id) >= 1) AND (char_length(intervals_id) <= 64))),
    CONSTRAINT member_protocol_core_sessions_max_core_c_check CHECK (((max_core_c IS NULL) OR ((max_core_c >= (34)::numeric) AND (max_core_c <= (43)::numeric)))),
    CONSTRAINT member_protocol_core_sessions_minutes_above_check CHECK (((minutes_above IS NULL) OR ((minutes_above >= 0) AND (minutes_above <= 1440)))),
    CONSTRAINT member_protocol_core_sessions_minutes_to_threshold_check CHECK (((minutes_to_threshold IS NULL) OR ((minutes_to_threshold >= 0) AND (minutes_to_threshold <= 1440)))),
    CONSTRAINT member_protocol_core_sessions_ride_minutes_check CHECK (((ride_minutes IS NULL) OR ((ride_minutes >= 0) AND (ride_minutes <= 1440))))
);


--
-- Name: member_protocols; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_protocols (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    protocol_slug text NOT NULL,
    start_date date NOT NULL,
    race_date date,
    status text DEFAULT 'actief'::text NOT NULL,
    consent_version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    stopped_at timestamp with time zone,
    CONSTRAINT member_protocols_check CHECK (((race_date IS NULL) OR (race_date >= start_date))),
    CONSTRAINT member_protocols_consent_version_check CHECK ((consent_version = ANY (ARRAY['2026-10-14'::text, '2026-10-14-core'::text]))),
    CONSTRAINT member_protocols_protocol_slug_check CHECK ((protocol_slug ~ '^[a-z0-9-]{2,60}$'::text)),
    CONSTRAINT member_protocols_status_check CHECK ((status = ANY (ARRAY['actief'::text, 'gestopt'::text, 'afgerond'::text])))
);


--
-- Name: member_question_askers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_question_askers (
    question_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: member_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    body text NOT NULL,
    visibility text DEFAULT 'club'::text NOT NULL,
    answer text,
    answered_by uuid,
    answered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    activity_at timestamp with time zone GENERATED ALWAYS AS (COALESCE(answered_at, created_at)) STORED,
    faq_at timestamp with time zone,
    asked_count integer DEFAULT 1 NOT NULL,
    CONSTRAINT member_questions_answer_check CHECK (((answer IS NULL) OR ((length(btrim(answer)) >= 1) AND (length(btrim(answer)) <= 4000)))),
    CONSTRAINT member_questions_body_check CHECK (((length(btrim(body)) >= 3) AND (length(btrim(body)) <= 1000))),
    CONSTRAINT member_questions_check CHECK (((answer IS NULL) = (answered_at IS NULL))),
    CONSTRAINT member_questions_faq_check CHECK (((faq_at IS NULL) OR ((answered_at IS NOT NULL) AND (visibility = 'club'::text)))),
    CONSTRAINT member_questions_visibility_check CHECK ((visibility = ANY (ARRAY['club'::text, 'bestuur'::text])))
);


--
-- Name: member_tips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_tips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid,
    topic_slug text NOT NULL,
    event_id uuid,
    col_slug text,
    body text NOT NULL,
    source text DEFAULT 'lid'::text NOT NULL,
    status text DEFAULT 'published'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    message_id uuid,
    source_name text,
    source_url text,
    CONSTRAINT member_tips_body_check CHECK (((length(btrim(body)) >= 3) AND (length(btrim(body)) <= 300))),
    CONSTRAINT member_tips_source_check CHECK ((source = ANY (ARRAY['lid'::text, 'import'::text, 'gesprek'::text, 'bron'::text]))),
    CONSTRAINT member_tips_source_owner_check CHECK ((((source = 'bron'::text) = (profile_id IS NULL)) AND ((source <> 'bron'::text) OR (((length(btrim(source_name)) >= 2) AND (length(btrim(source_name)) <= 60)) AND (source_url ~ '^https://'::text))))),
    CONSTRAINT member_tips_status_check CHECK ((status = ANY (ARRAY['published'::text, 'hidden'::text]))),
    CONSTRAINT member_tips_topic_slug_check CHECK ((topic_slug ~ '^[a-z0-9-]{2,40}$'::text))
);


--
-- Name: member_zwift_bikes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_zwift_bikes (
    profile_id uuid NOT NULL,
    part text NOT NULL,
    name text NOT NULL,
    stage smallint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT member_zwift_bikes_check CHECK (((part = 'frame'::text) OR (stage = 0))),
    CONSTRAINT member_zwift_bikes_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 120))),
    CONSTRAINT member_zwift_bikes_part_check CHECK ((part = ANY (ARRAY['frame'::text, 'wheel'::text]))),
    CONSTRAINT member_zwift_bikes_stage_check CHECK (((stage >= 0) AND (stage <= 5)))
);


--
-- Name: mobility_exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    category text NOT NULL,
    region text NOT NULL,
    cue_md text NOT NULL,
    illustration_slug text,
    media_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    default_hold_seconds integer,
    default_reps integer,
    is_unilateral boolean DEFAULT false NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    is_standard boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mobility_exercises_category_check CHECK ((category = ANY (ARRAY['core'::text, 'mobiliteit'::text, 'activatie'::text, 'kracht'::text]))),
    CONSTRAINT mobility_exercises_default_hold_seconds_check CHECK (((default_hold_seconds > 0) AND (default_hold_seconds <= 300))),
    CONSTRAINT mobility_exercises_default_reps_check CHECK (((default_reps > 0) AND (default_reps <= 100))),
    CONSTRAINT mobility_exercises_dosage CHECK (((default_hold_seconds IS NOT NULL) OR (default_reps IS NOT NULL))),
    CONSTRAINT mobility_exercises_level_check CHECK (((level >= 1) AND (level <= 3))),
    CONSTRAINT mobility_exercises_media_json_check CHECK ((jsonb_typeof(media_json) = 'array'::text)),
    CONSTRAINT mobility_exercises_region_check CHECK ((region = ANY (ARRAY['lumbaal'::text, 'heup'::text, 'thoracaal'::text, 'schouder'::text, 'enkel'::text, 'been'::text])))
);


--
-- Name: mobility_series; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_series (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    subtitle text,
    goal text NOT NULL,
    timing text NOT NULL,
    duration_minutes integer NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    is_standard boolean DEFAULT false NOT NULL,
    owner_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mobility_series_duration_minutes_check CHECK (((duration_minutes > 0) AND (duration_minutes <= 60))),
    CONSTRAINT mobility_series_goal_check CHECK ((goal = ANY (ARRAY['stabiliteit'::text, 'mobiliteit'::text, 'houding'::text, 'kracht'::text]))),
    CONSTRAINT mobility_series_level_check CHECK (((level >= 1) AND (level <= 3))),
    CONSTRAINT mobility_series_owner CHECK (((is_standard AND (owner_id IS NULL)) OR ((NOT is_standard) AND (owner_id IS NOT NULL)))),
    CONSTRAINT mobility_series_timing_check CHECK ((timing = ANY (ARRAY['pre_ride'::text, 'post_ride'::text, 'rustdag'::text])))
);


--
-- Name: mobility_series_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_series_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    series_id uuid NOT NULL,
    exercise_id uuid NOT NULL,
    sort_order integer NOT NULL,
    sets integer DEFAULT 1 NOT NULL,
    reps integer,
    hold_seconds integer,
    rest_seconds integer DEFAULT 20 NOT NULL,
    CONSTRAINT mobility_series_items_dosage CHECK (((reps IS NOT NULL) OR (hold_seconds IS NOT NULL))),
    CONSTRAINT mobility_series_items_hold_seconds_check CHECK (((hold_seconds > 0) AND (hold_seconds <= 300))),
    CONSTRAINT mobility_series_items_reps_check CHECK (((reps > 0) AND (reps <= 100))),
    CONSTRAINT mobility_series_items_rest_seconds_check CHECK (((rest_seconds >= 0) AND (rest_seconds <= 300))),
    CONSTRAINT mobility_series_items_sets_check CHECK (((sets >= 1) AND (sets <= 10))),
    CONSTRAINT mobility_series_items_sort_order_check CHECK ((sort_order >= 0))
);


--
-- Name: mobility_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    series_id uuid NOT NULL,
    completed_on date NOT NULL,
    minutes integer,
    feel text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mobility_sessions_feel_check CHECK ((feel = ANY (ARRAY['goed'::text, 'neutraal'::text, 'zwaar'::text]))),
    CONSTRAINT mobility_sessions_minutes_check CHECK (((minutes > 0) AND (minutes <= 120)))
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    profile_id uuid NOT NULL,
    on_new_event boolean DEFAULT true NOT NULL,
    on_live_started boolean DEFAULT true NOT NULL,
    on_new_badge boolean DEFAULT false NOT NULL,
    on_admin_broadcast boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    on_training_plan boolean DEFAULT true NOT NULL,
    on_event_reminder boolean DEFAULT true NOT NULL,
    on_maintenance_due boolean DEFAULT true NOT NULL,
    on_workout_review boolean DEFAULT true NOT NULL,
    on_member_pending boolean DEFAULT true NOT NULL,
    on_strava_link_expiring boolean DEFAULT true NOT NULL,
    on_training_chat boolean DEFAULT true NOT NULL,
    on_intervals_visit_reminder boolean DEFAULT true NOT NULL,
    on_nutrition_reminder boolean DEFAULT true NOT NULL,
    on_knowledge_message boolean DEFAULT true NOT NULL,
    on_ride_message boolean DEFAULT true NOT NULL,
    on_qa_question boolean DEFAULT true NOT NULL,
    on_qa_answer boolean DEFAULT true NOT NULL,
    on_zwbeker_nomination boolean DEFAULT true NOT NULL,
    on_zwbeker_awarded boolean DEFAULT true NOT NULL,
    on_story_submitted boolean DEFAULT true NOT NULL,
    on_story_reviewed boolean DEFAULT true NOT NULL
);


--
-- Name: nutrition_foods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_foods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nevo_code integer NOT NULL,
    name_nl text NOT NULL,
    quantity_unit text DEFAULT 'g'::text NOT NULL,
    kcal numeric,
    carbs_g numeric,
    sugars_g numeric,
    protein_g numeric,
    fat_g numeric,
    fiber_g numeric,
    sodium_mg numeric,
    nevo_version text NOT NULL,
    food_group text,
    calcium_mg numeric,
    iron_mg numeric,
    magnesium_mg numeric,
    zinc_mg numeric,
    vitamin_d_ug numeric,
    vitamin_c_mg numeric,
    epa_g numeric,
    dha_g numeric,
    CONSTRAINT nutrition_foods_quantity_unit_check CHECK ((quantity_unit = ANY (ARRAY['g'::text, 'ml'::text])))
);


--
-- Name: nutrition_log_ai_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_log_ai_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    kind text NOT NULL,
    response_id text NOT NULL,
    used_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nutrition_log_ai_usage_kind_check CHECK ((kind = ANY (ARRAY['foto'::text, 'tekst'::text])))
);


--
-- Name: nutrition_log_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_log_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meal_id uuid NOT NULL,
    food_id uuid,
    sort_order integer NOT NULL,
    grams numeric NOT NULL,
    product_barcode text,
    CONSTRAINT nutrition_log_items_grams_check CHECK (((grams > (0)::numeric) AND (grams <= (5000)::numeric))),
    CONSTRAINT nutrition_log_items_one_source_check CHECK (((food_id IS NULL) <> (product_barcode IS NULL))),
    CONSTRAINT nutrition_log_items_sort_order_check CHECK ((sort_order >= 0))
);


--
-- Name: nutrition_log_meals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_log_meals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    eaten_on date NOT NULL,
    meal_moment text NOT NULL,
    source text NOT NULL,
    recipe_id uuid,
    title text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nutrition_log_meals_meal_moment_check CHECK ((meal_moment = ANY (ARRAY['ontbijt'::text, 'lunch'::text, 'diner'::text, 'tussendoor'::text, 'voor_rit'::text, 'tijdens_rit'::text, 'na_rit'::text, 'voor_slapen'::text]))),
    CONSTRAINT nutrition_log_meals_source_check CHECK ((source = ANY (ARRAY['recept'::text, 'handmatig'::text, 'foto'::text, 'tekst'::text]))),
    CONSTRAINT nutrition_log_meals_title_check CHECK (((length(title) >= 1) AND (length(title) <= 120)))
);


--
-- Name: nutrition_log_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_log_settings (
    profile_id uuid NOT NULL,
    consent_version text NOT NULL,
    consented_at timestamp with time zone DEFAULT now() NOT NULL,
    paused boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ai_consent_at timestamp with time zone,
    trainer_visible boolean DEFAULT false NOT NULL,
    trainer_consent_at timestamp with time zone,
    reminders boolean DEFAULT false NOT NULL,
    CONSTRAINT nutrition_log_settings_consent_version_check CHECK ((consent_version = '2026-10-14'::text)),
    CONSTRAINT nutrition_log_settings_trainer_consent_check CHECK (((NOT trainer_visible) OR (trainer_consent_at IS NOT NULL)))
);


--
-- Name: nutrition_menu_choices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_menu_choices (
    profile_id uuid NOT NULL,
    day date NOT NULL,
    meal_moment text NOT NULL,
    recipe_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nutrition_menu_choices_meal_moment_check CHECK ((meal_moment = ANY (ARRAY['ontbijt'::text, 'lunch'::text, 'diner'::text, 'tussendoor'::text, 'voor_rit'::text, 'tijdens_rit'::text, 'na_rit'::text, 'voor_slapen'::text])))
);


--
-- Name: nutrition_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_products (
    barcode text NOT NULL,
    name text NOT NULL,
    brand text,
    quantity_unit text DEFAULT 'g'::text NOT NULL,
    carbs_g numeric,
    protein_g numeric,
    serving_g numeric,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nutrition_products_barcode_check CHECK ((barcode ~ '^[0-9]{8,14}$'::text)),
    CONSTRAINT nutrition_products_brand_check CHECK (((brand IS NULL) OR (length(brand) <= 120))),
    CONSTRAINT nutrition_products_carbs_g_check CHECK (((carbs_g IS NULL) OR ((carbs_g >= (0)::numeric) AND (carbs_g <= (100)::numeric)))),
    CONSTRAINT nutrition_products_name_check CHECK (((length(name) >= 1) AND (length(name) <= 160))),
    CONSTRAINT nutrition_products_protein_g_check CHECK (((protein_g IS NULL) OR ((protein_g >= (0)::numeric) AND (protein_g <= (100)::numeric)))),
    CONSTRAINT nutrition_products_quantity_unit_check CHECK ((quantity_unit = ANY (ARRAY['g'::text, 'ml'::text]))),
    CONSTRAINT nutrition_products_serving_g_check CHECK (((serving_g IS NULL) OR ((serving_g > (0)::numeric) AND (serving_g <= (2000)::numeric))))
);


--
-- Name: nutrition_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_profiles (
    profile_id uuid NOT NULL,
    height_cm smallint,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    household_adults smallint DEFAULT 0 NOT NULL,
    household_children_full smallint DEFAULT 0 NOT NULL,
    household_children_half smallint DEFAULT 0 NOT NULL,
    household_moments text[] DEFAULT ARRAY['diner'::text] NOT NULL,
    ride_carbs_120 boolean DEFAULT false NOT NULL,
    CONSTRAINT nutrition_profiles_height_cm_check CHECK (((height_cm >= 120) AND (height_cm <= 230))),
    CONSTRAINT nutrition_profiles_household_adults_check CHECK (((household_adults >= 0) AND (household_adults <= 10))),
    CONSTRAINT nutrition_profiles_household_children_full_check CHECK (((household_children_full >= 0) AND (household_children_full <= 10))),
    CONSTRAINT nutrition_profiles_household_children_half_check CHECK (((household_children_half >= 0) AND (household_children_half <= 10))),
    CONSTRAINT nutrition_profiles_household_moments_check CHECK ((household_moments <@ ARRAY['ontbijt'::text, 'lunch'::text, 'tussendoor'::text, 'diner'::text]))
);


--
-- Name: nutrition_recipe_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_recipe_ingredients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipe_id uuid NOT NULL,
    food_id uuid,
    sort_order integer NOT NULL,
    grams numeric NOT NULL,
    role text NOT NULL,
    product_barcode text,
    scoop_g numeric,
    CONSTRAINT nutrition_recipe_ingredients_grams_check CHECK (((grams > (0)::numeric) AND (grams <= (5000)::numeric))),
    CONSTRAINT nutrition_recipe_ingredients_one_source_check CHECK (((food_id IS NULL) <> (product_barcode IS NULL))),
    CONSTRAINT nutrition_recipe_ingredients_role_check CHECK ((role = ANY (ARRAY['kh_bron'::text, 'eiwit_bron'::text, 'vast'::text]))),
    CONSTRAINT nutrition_recipe_ingredients_scoop_g_check CHECK (((scoop_g IS NULL) OR ((scoop_g > (0)::numeric) AND (scoop_g <= (200)::numeric)))),
    CONSTRAINT nutrition_recipe_ingredients_sort_order_check CHECK ((sort_order >= 0))
);


--
-- Name: nutrition_recipe_prefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_recipe_prefs (
    profile_id uuid NOT NULL,
    recipe_id uuid NOT NULL,
    pref text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nutrition_recipe_prefs_pref_check CHECK ((pref = ANY (ARRAY['favoriet'::text, 'verborgen'::text])))
);


--
-- Name: nutrition_recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    meal_moment text NOT NULL,
    fuel_profile text NOT NULL,
    diet_tags text[] DEFAULT '{}'::text[] NOT NULL,
    servings integer DEFAULT 1 NOT NULL,
    prep_minutes integer,
    steps_md text DEFAULT ''::text NOT NULL,
    is_standard boolean DEFAULT false NOT NULL,
    owner_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    source_name text,
    source_url text,
    share_status text,
    contributed_by uuid,
    visibility text DEFAULT 'prive'::text NOT NULL,
    show_owner boolean DEFAULT false NOT NULL,
    image_url text,
    CONSTRAINT nutrition_recipes_contributed_check CHECK (((contributed_by IS NULL) OR is_standard)),
    CONSTRAINT nutrition_recipes_diet_tags_check CHECK ((diet_tags <@ ARRAY['vegetarisch'::text, 'vegan'::text, 'glutenvrij'::text, 'lactosevrij'::text])),
    CONSTRAINT nutrition_recipes_fuel_profile_check CHECK ((fuel_profile = ANY (ARRAY['hoog_kh'::text, 'gemengd'::text, 'eiwitrijk'::text]))),
    CONSTRAINT nutrition_recipes_image_check CHECK (((image_url IS NULL) OR ((image_url ~ '^https://'::text) AND (length(image_url) <= 1000)))),
    CONSTRAINT nutrition_recipes_meal_moment_check CHECK ((meal_moment = ANY (ARRAY['ontbijt'::text, 'lunch'::text, 'diner'::text, 'tussendoor'::text, 'voor_rit'::text, 'tijdens_rit'::text, 'na_rit'::text, 'voor_slapen'::text]))),
    CONSTRAINT nutrition_recipes_owner CHECK (((is_standard AND (owner_id IS NULL)) OR ((NOT is_standard) AND (owner_id IS NOT NULL)))),
    CONSTRAINT nutrition_recipes_prep_minutes_check CHECK (((prep_minutes >= 0) AND (prep_minutes <= 600))),
    CONSTRAINT nutrition_recipes_servings_check CHECK (((servings >= 1) AND (servings <= 20))),
    CONSTRAINT nutrition_recipes_share_status_check CHECK (((share_status IS NULL) OR ((share_status = ANY (ARRAY['voorgesteld'::text, 'afgewezen'::text])) AND (NOT is_standard)))),
    CONSTRAINT nutrition_recipes_show_owner_check CHECK (((NOT show_owner) OR (visibility = 'leden'::text))),
    CONSTRAINT nutrition_recipes_source_check CHECK ((((source_url IS NULL) OR (source_name IS NOT NULL)) AND ((source_url IS NULL) OR (source_url ~ '^https://'::text)) AND ((source_name IS NULL) OR ((length(source_name) >= 1) AND (length(source_name) <= 120))))),
    CONSTRAINT nutrition_recipes_title_check CHECK (((length(title) >= 1) AND (length(title) <= 120))),
    CONSTRAINT nutrition_recipes_visibility_check CHECK (((visibility = ANY (ARRAY['prive'::text, 'leden'::text])) AND ((visibility = 'prive'::text) OR (NOT is_standard))))
);


--
-- Name: nutrition_reminder_sends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_reminder_sends (
    profile_id uuid NOT NULL,
    sent_on date NOT NULL,
    kind text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nutrition_reminder_sends_kind_check CHECK ((kind = ANY (ARRAY['morgen_zwaar'::text, 'herstel'::text])))
);


--
-- Name: nutrition_sweat_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_sweat_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    tested_on date NOT NULL,
    duration_minutes smallint NOT NULL,
    sweat_ml_per_hour smallint NOT NULL,
    setting text NOT NULL,
    warm boolean DEFAULT false NOT NULL,
    consent_version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nutrition_sweat_tests_consent_version_check CHECK ((consent_version = '2026-10-25'::text)),
    CONSTRAINT nutrition_sweat_tests_duration_minutes_check CHECK (((duration_minutes >= 45) AND (duration_minutes <= 600))),
    CONSTRAINT nutrition_sweat_tests_setting_check CHECK ((setting = ANY (ARRAY['binnen'::text, 'buiten'::text]))),
    CONSTRAINT nutrition_sweat_tests_sweat_ml_per_hour_check CHECK (((sweat_ml_per_hour >= 200) AND (sweat_ml_per_hour <= 3000)))
);


--
-- Name: omnium_edition_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.omnium_edition_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edition_id uuid NOT NULL,
    discipline text NOT NULL,
    order_index integer NOT NULL,
    title text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    duration_minutes integer,
    break_minutes integer DEFAULT 5 NOT NULL,
    route_name text,
    route_url text,
    world text,
    distance_km numeric(6,2),
    laps integer,
    drafting boolean,
    bike_rule text,
    notes_md text,
    map_image_path text,
    zwift_event_id text,
    zwift_subgroup_ids text[] DEFAULT '{}'::text[] NOT NULL,
    subgroup_leagues jsonb DEFAULT '{}'::jsonb NOT NULL,
    sprint_count integer DEFAULT 0 NOT NULL,
    results_state text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    entrants_synced_at timestamp with time zone,
    zwift_segment_id text,
    CONSTRAINT omnium_edition_events_break_minutes_check CHECK ((break_minutes >= 0)),
    CONSTRAINT omnium_edition_events_discipline_check CHECK ((discipline = ANY (ARRAY['prologue'::text, 'scratch'::text, 'sprint'::text, 'crit'::text, 'recon'::text]))),
    CONSTRAINT omnium_edition_events_duration_minutes_check CHECK (((duration_minutes IS NULL) OR (duration_minutes > 0))),
    CONSTRAINT omnium_edition_events_results_state_check CHECK ((results_state = ANY (ARRAY['pending'::text, 'partial'::text, 'final'::text]))),
    CONSTRAINT omnium_edition_events_sprint_count_check CHECK ((sprint_count >= 0)),
    CONSTRAINT omnium_edition_events_zwift_segment_id_check CHECK (((zwift_segment_id IS NULL) OR (zwift_segment_id ~ '^-?[0-9]{1,20}$'::text)))
);


--
-- Name: omnium_edition_standings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.omnium_edition_standings (
    edition_id uuid NOT NULL,
    rider_id uuid NOT NULL,
    league text NOT NULL,
    prologue_points numeric(7,2) DEFAULT 0 NOT NULL,
    scratch_points numeric(7,2) DEFAULT 0 NOT NULL,
    sprint_points numeric(7,2) DEFAULT 0 NOT NULL,
    crit_points numeric(7,2) DEFAULT 0 NOT NULL,
    total_points numeric(8,2) DEFAULT 0 NOT NULL,
    rank integer NOT NULL,
    rank_shared boolean DEFAULT false NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    positions integer[] DEFAULT '{}'::integer[] NOT NULL,
    is_provisional boolean DEFAULT false NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: omnium_editions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.omnium_editions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid NOT NULL,
    number integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    subtitle text,
    starts_at timestamp with time zone NOT NULL,
    status text DEFAULT 'concept'::text NOT NULL,
    event_id uuid,
    recon_event_id uuid,
    intro_md text,
    cover_image_path text,
    youtube_url text,
    preshow_at timestamp with time zone,
    published_at timestamp with time zone,
    announced_at timestamp with time zone,
    results_announced_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT omnium_editions_number_check CHECK ((number > 0)),
    CONSTRAINT omnium_editions_status_check CHECK ((status = ANY (ARRAY['concept'::text, 'published'::text, 'live'::text, 'results_final'::text])))
);


--
-- Name: omnium_entrants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.omnium_entrants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edition_event_id uuid NOT NULL,
    rider_id uuid NOT NULL,
    league text,
    subgroup_label text,
    source text NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT omnium_entrants_source_check CHECK ((source = ANY (ARRAY['zwift_entrants'::text, 'manual'::text, 'result'::text])))
);


--
-- Name: omnium_kit_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.omnium_kit_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid NOT NULL,
    code text NOT NULL,
    award_id uuid,
    issued_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: omnium_prize_awards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.omnium_prize_awards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prize_id uuid NOT NULL,
    edition_id uuid,
    league text,
    rider_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    note text,
    awarded_at timestamp with time zone DEFAULT now() NOT NULL,
    awarded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT omnium_prize_awards_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'claimed'::text])))
);


--
-- Name: omnium_prizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.omnium_prizes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid NOT NULL,
    scope text NOT NULL,
    league text,
    title text NOT NULL,
    description text,
    kind text DEFAULT 'zwift_kit'::text NOT NULL,
    sort_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT omnium_prizes_kind_check CHECK ((kind = ANY (ARRAY['zwift_kit'::text, 'other'::text]))),
    CONSTRAINT omnium_prizes_scope_check CHECK ((scope = ANY (ARRAY['edition'::text, 'season'::text])))
);


--
-- Name: omnium_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.omnium_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edition_id uuid NOT NULL,
    edition_event_id uuid NOT NULL,
    rider_id uuid NOT NULL,
    league text NOT NULL,
    status text DEFAULT 'finished'::text NOT NULL,
    "position" integer,
    overall_position integer,
    time_text text,
    time_seconds numeric(9,3),
    segment_seconds numeric(9,3),
    finish_points numeric(7,2) DEFAULT 0 NOT NULL,
    sprint_points numeric(7,2) DEFAULT 0 NOT NULL,
    points numeric(7,2) DEFAULT 0 NOT NULL,
    points_raw numeric(7,2) DEFAULT 0 NOT NULL,
    voided_reason text,
    breakdown jsonb DEFAULT '{}'::jsonb NOT NULL,
    matched_via text DEFAULT 'manual'::text NOT NULL,
    source text DEFAULT 'paste'::text NOT NULL,
    entered_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT omnium_results_matched_via_check CHECK ((matched_via = ANY (ARRAY['zwift_id'::text, 'profile'::text, 'name'::text, 'manual'::text, 'unmatched'::text]))),
    CONSTRAINT omnium_results_overall_position_check CHECK (((overall_position IS NULL) OR (overall_position > 0))),
    CONSTRAINT omnium_results_position_check CHECK ((("position" IS NULL) OR ("position" > 0))),
    CONSTRAINT omnium_results_source_check CHECK ((source = ANY (ARRAY['paste'::text, 'zwift'::text, 'import'::text]))),
    CONSTRAINT omnium_results_status_check CHECK ((status = ANY (ARRAY['finished'::text, 'dnf'::text, 'dns'::text, 'dsq'::text])))
);


--
-- Name: omnium_rider_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.omnium_rider_links (
    rider_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    matched_via text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT omnium_rider_links_matched_via_check CHECK ((matched_via = ANY (ARRAY['zwift_id'::text, 'manual'::text])))
);


--
-- Name: omnium_riders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.omnium_riders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zwift_id text,
    name_key text NOT NULL,
    display_name text NOT NULL,
    team_name text,
    country text,
    last_league text,
    public_profile_id uuid,
    merged_into_id uuid,
    anonymised_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: omnium_season_standings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.omnium_season_standings (
    season_id uuid NOT NULL,
    rider_id uuid NOT NULL,
    league text NOT NULL,
    points_by_edition jsonb DEFAULT '{}'::jsonb NOT NULL,
    prologue_points numeric(8,2) DEFAULT 0 NOT NULL,
    scratch_points numeric(8,2) DEFAULT 0 NOT NULL,
    sprint_points numeric(8,2) DEFAULT 0 NOT NULL,
    crit_points numeric(8,2) DEFAULT 0 NOT NULL,
    total_points numeric(9,2) DEFAULT 0 NOT NULL,
    editions_raced integer DEFAULT 0 NOT NULL,
    rank integer NOT NULL,
    rank_shared boolean DEFAULT false NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: omnium_seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.omnium_seasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    starts_on date,
    ends_on date,
    is_current boolean DEFAULT false NOT NULL,
    scoring jsonb DEFAULT '{}'::jsonb NOT NULL,
    rules_md text,
    zwift_tag text DEFAULT 'zwbomnium'::text,
    discord_guild_id text,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outdoor_route_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outdoor_route_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workout_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    start_point_id uuid,
    variant text NOT NULL,
    heading_deg integer NOT NULL,
    distance_km numeric(6,1) NOT NULL,
    elevation_m integer NOT NULL,
    estimated_minutes integer NOT NULL,
    score_pct integer NOT NULL,
    summary text,
    wind_note text,
    geometry jsonb NOT NULL,
    chosen_at timestamp with time zone,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT outdoor_route_suggestions_heading_deg_check CHECK (((heading_deg >= 0) AND (heading_deg <= 359))),
    CONSTRAINT outdoor_route_suggestions_score_pct_check CHECK (((score_pct >= 0) AND (score_pct <= 100)))
);


--
-- Name: poll_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.poll_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    poll_id uuid NOT NULL,
    label text NOT NULL,
    display_order integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: poll_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.poll_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    poll_id uuid NOT NULL,
    option_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: polls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.polls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text DEFAULT 'free'::text NOT NULL,
    scope_id uuid,
    question text NOT NULL,
    description_md text,
    multi_select boolean DEFAULT false NOT NULL,
    closes_at timestamp with time zone,
    active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT polls_scope_check CHECK ((scope = ANY (ARRAY['free'::text, 'event'::text, 'team'::text])))
);


--
-- Name: post_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    author_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: post_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_likes (
    post_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    category text NOT NULL,
    body_md text NOT NULL,
    excerpt text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    author_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text DEFAULT 'aanbod'::text NOT NULL,
    price text,
    status text DEFAULT 'open'::text NOT NULL,
    CONSTRAINT posts_category_check CHECK ((category = ANY (ARRAY['fiets'::text, 'frame'::text, 'wielen'::text, 'componenten'::text, 'kleding'::text, 'schoenen'::text, 'helm'::text, 'accessoires'::text, 'training-gear'::text, 'tools'::text, 'voeding'::text, 'overig'::text, 'materiaal'::text, 'training'::text, 'race-craft'::text, 'regelgeving'::text, 'routes'::text, 'algemeen'::text]))),
    CONSTRAINT posts_kind_check CHECK ((kind = ANY (ARRAY['aanbod'::text, 'gezocht'::text, 'vraag'::text, 'tip'::text]))),
    CONSTRAINT posts_status_check CHECK ((status = ANY (ARRAY['open'::text, 'gereserveerd'::text, 'afgerond'::text])))
);


--
-- Name: profile_climbed_cols; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_climbed_cols (
    profile_id uuid NOT NULL,
    col_slug text NOT NULL,
    first_activity_id bigint,
    first_climbed_at timestamp with time zone NOT NULL,
    times_climbed integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_activity_id bigint,
    last_climbed_at timestamp with time zone,
    best_time_seconds integer,
    best_time_activity_id bigint,
    best_time_at timestamp with time zone,
    best_time_source text,
    CONSTRAINT profile_climbed_cols_best_time_source_check CHECK ((best_time_source = 'gps'::text))
);


--
-- Name: profile_completed_segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_completed_segments (
    profile_id uuid NOT NULL,
    segment_slug text NOT NULL,
    first_activity_id bigint,
    first_completed_at timestamp with time zone NOT NULL,
    last_activity_id bigint,
    last_completed_at timestamp with time zone,
    times_completed integer DEFAULT 1 NOT NULL,
    best_time_seconds integer,
    best_time_activity_id bigint,
    best_time_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    best_time_source text,
    CONSTRAINT profile_completed_segments_best_time_source_check CHECK ((best_time_source = 'gps'::text))
);


--
-- Name: profile_ftp_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_ftp_history (
    profile_id uuid NOT NULL,
    effective_from date NOT NULL,
    ftp_watts integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profile_ftp_history_ftp_watts_check CHECK (((ftp_watts > 0) AND (ftp_watts < 1200)))
);


--
-- Name: profile_sport_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_sport_settings (
    profile_id uuid NOT NULL,
    ftp_watts numeric,
    cp_watts numeric,
    w_prime_joules numeric,
    lthr integer,
    max_hr integer,
    power_zones jsonb,
    hr_zones jsonb,
    power_zone_names jsonb,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profile_start_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_start_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    label text NOT NULL,
    lat numeric(8,3) NOT NULL,
    lon numeric(8,3) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profile_start_points_label_check CHECK (((length(btrim(label)) >= 1) AND (length(btrim(label)) <= 60))),
    CONSTRAINT profile_start_points_lat_check CHECK (((lat >= ('-90'::integer)::numeric) AND (lat <= (90)::numeric))),
    CONSTRAINT profile_start_points_lon_check CHECK (((lon >= ('-180'::integer)::numeric) AND (lon <= (180)::numeric)))
);


--
-- Name: profile_stats_tiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_stats_tiles (
    profile_id uuid NOT NULL,
    tiles jsonb DEFAULT '[]'::jsonb NOT NULL,
    club_tiles jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    dashboard_hidden jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT profile_stats_tiles_club_tiles_check CHECK ((jsonb_typeof(club_tiles) = 'array'::text)),
    CONSTRAINT profile_stats_tiles_dashboard_hidden_array CHECK ((jsonb_typeof(dashboard_hidden) = 'array'::text)),
    CONSTRAINT profile_stats_tiles_tiles_check CHECK ((jsonb_typeof(tiles) = 'array'::text))
);


--
-- Name: profile_wellness; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_wellness (
    profile_id uuid NOT NULL,
    date date NOT NULL,
    resting_hr integer,
    hrv numeric(6,2),
    sleep_secs integer,
    sleep_score numeric(5,2),
    readiness numeric(5,2),
    fatigue numeric(5,2),
    stress numeric(5,2),
    soreness numeric(5,2),
    mood numeric(5,2),
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    display_name text NOT NULL,
    avatar_url text,
    region text,
    zwift_id text,
    strava_id text,
    zrl_category text,
    ftp_watts integer,
    weight_kg numeric(4,1),
    bio text,
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_approved boolean DEFAULT false NOT NULL,
    approved_at timestamp with time zone,
    approved_by uuid,
    community_roles text[] DEFAULT ARRAY['community_member'::text] NOT NULL,
    public_profile_enabled boolean DEFAULT false NOT NULL,
    profile_visibility jsonb DEFAULT '{"bio": true, "roles": true, "avatar": true, "badges": true, "region": true, "zwift_id": true, "ftp_watts": true, "strava_id": true, "weight_kg": true, "intervals_id": true, "zrl_category": true}'::jsonb NOT NULL,
    privacy_accepted_at timestamp with time zone,
    zrl_division text DEFAULT 'open'::text NOT NULL,
    birth_date date,
    share_birthday boolean DEFAULT false NOT NULL,
    mywhoosh_id text,
    wellness_device text,
    auto_sync_physique boolean DEFAULT false NOT NULL,
    intervals_id text,
    zwift_opt_out boolean DEFAULT false NOT NULL,
    sex text,
    symptom_tracking_enabled boolean DEFAULT false NOT NULL,
    privacy_accepted_version text,
    event_type_interests text[] DEFAULT ARRAY[]::text[] NOT NULL,
    fit_max_distance_km integer,
    fit_max_elevation_m integer,
    live_heart_rate_consent_at timestamp with time zone,
    CONSTRAINT profiles_birth_date_reasonable CHECK (((birth_date IS NULL) OR (birth_date >= '1900-01-01'::date))),
    CONSTRAINT profiles_community_roles_allowed CHECK (((cardinality(community_roles) > 0) AND (community_roles <@ ARRAY['board'::text, 'team_captain'::text, 'event_organizer'::text, 'community_manager'::text, 'trainer'::text, 'paying_member'::text, 'community_member'::text]))),
    CONSTRAINT profiles_fit_max_distance_km_check CHECK (((fit_max_distance_km IS NULL) OR ((fit_max_distance_km > 0) AND (fit_max_distance_km <= 1000)))),
    CONSTRAINT profiles_fit_max_elevation_m_check CHECK (((fit_max_elevation_m IS NULL) OR ((fit_max_elevation_m >= 0) AND (fit_max_elevation_m <= 20000)))),
    CONSTRAINT profiles_ftp_watts_check CHECK (((ftp_watts > 0) AND (ftp_watts < 800))),
    CONSTRAINT profiles_sex_check CHECK (((sex IS NULL) OR (sex = ANY (ARRAY['man'::text, 'vrouw'::text, 'zeg_ik_liever_niet'::text])))),
    CONSTRAINT profiles_weight_kg_check CHECK (((weight_kg > (0)::numeric) AND (weight_kg < (300)::numeric))),
    CONSTRAINT profiles_zrl_category_check CHECK ((zrl_category = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'E'::text]))),
    CONSTRAINT profiles_zrl_division_check CHECK ((zrl_division = ANY (ARRAY['open'::text, 'women'::text])))
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: race_briefings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.race_briefings (
    event_id uuid NOT NULL,
    plan text,
    roles jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sheet jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT race_briefings_plan_check CHECK (((plan IS NULL) OR (length(plan) <= 4000))),
    CONSTRAINT race_briefings_sheet_check CHECK ((pg_column_size(sheet) <= 32768))
);


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limits (
    bucket text NOT NULL,
    key text NOT NULL,
    window_start timestamp with time zone NOT NULL,
    count integer DEFAULT 0 NOT NULL
);


--
-- Name: rider_power_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rider_power_profiles (
    profile_id uuid NOT NULL,
    athlete_id text,
    period text DEFAULT '90d'::text NOT NULL,
    source text DEFAULT 'intervals'::text NOT NULL,
    ftp_watts integer,
    weight_kg numeric(5,2),
    watts_15s integer,
    watts_30s integer,
    watts_1m integer,
    watts_2m integer,
    watts_5m integer,
    watts_10m integer,
    watts_20m integer,
    wkg_15s numeric(6,2),
    wkg_30s numeric(6,2),
    wkg_1m numeric(6,2),
    wkg_2m numeric(6,2),
    wkg_5m numeric(6,2),
    wkg_10m numeric(6,2),
    wkg_20m numeric(6,2),
    ftp_wkg numeric(6,2),
    rider_type text DEFAULT 'unknown'::text NOT NULL,
    sync_status text DEFAULT 'pending'::text NOT NULL,
    sync_error text,
    synced_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    curve_points jsonb DEFAULT '[]'::jsonb NOT NULL,
    curve_points_fatigue jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT rider_power_profiles_curve_points_array CHECK ((jsonb_typeof(curve_points) = 'array'::text)),
    CONSTRAINT rider_power_profiles_curve_points_fatigue_array CHECK ((jsonb_typeof(curve_points_fatigue) = 'array'::text)),
    CONSTRAINT rider_power_profiles_ftp_watts_check CHECK (((ftp_watts IS NULL) OR ((ftp_watts > 0) AND (ftp_watts < 1200)))),
    CONSTRAINT rider_power_profiles_rider_type_check CHECK ((rider_type = ANY (ARRAY['sprinter'::text, 'puncher'::text, 'tter'::text, 'climber'::text, 'allrounder'::text, 'unknown'::text]))),
    CONSTRAINT rider_power_profiles_sync_status_check CHECK ((sync_status = ANY (ARRAY['pending'::text, 'ok'::text, 'partial'::text, 'error'::text]))),
    CONSTRAINT rider_power_profiles_weight_kg_check CHECK (((weight_kg IS NULL) OR ((weight_kg > (0)::numeric) AND (weight_kg < (300)::numeric))))
);


--
-- Name: COLUMN rider_power_profiles.curve_points; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rider_power_profiles.curve_points IS 'Compacte powercurve: [{seconds, watts, wattsPerKg}], zonder activiteitsdetails.';


--
-- Name: COLUMN rider_power_profiles.curve_points_fatigue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rider_power_profiles.curve_points_fatigue IS 'Vermoeide curves: [{afterKj, points: [{seconds, watts, wattsPerKg}]}].';


--
-- Name: roster_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roster_entries (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    zwift_id text,
    pace_category text,
    team_name text,
    claimed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    team_id uuid,
    team_assignment_source text DEFAULT 'manual'::text NOT NULL,
    CONSTRAINT roster_entries_team_assignment_source_check CHECK ((team_assignment_source = ANY (ARRAY['manual'::text, 'manual_excluded'::text, 'roster_sync'::text, 'auto_zrl_category'::text, 'wtrl'::text])))
);


--
-- Name: sponsors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    website_url text,
    description_md text,
    tier public.sponsor_tier DEFAULT 'team'::public.sponsor_tier NOT NULL,
    display_order integer DEFAULT 100 NOT NULL,
    contact_email text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: src_month_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.src_month_entries (
    month date NOT NULL,
    profile_id uuid NOT NULL,
    team_id uuid NOT NULL,
    race text NOT NULL,
    category integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT src_month_entries_category_check CHECK (((category IS NULL) OR ((category >= 1) AND (category <= 6)))),
    CONSTRAINT src_month_entries_month_check CHECK ((EXTRACT(day FROM month) = (1)::numeric)),
    CONSTRAINT src_month_entries_race_check CHECK ((race = ANY (ARRAY['men'::text, 'women'::text])))
);


--
-- Name: src_races; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.src_races (
    event_id uuid NOT NULL,
    mywhoosh_event_id text NOT NULL,
    sunday date NOT NULL,
    gender text NOT NULL,
    round integer,
    is_final boolean DEFAULT false NOT NULL,
    category_starts jsonb DEFAULT '{}'::jsonb NOT NULL,
    registration_closes_at timestamp with time zone,
    pre_weight_categories integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
    pre_weight_opens_at timestamp with time zone,
    pre_weight_closes_at timestamp with time zone,
    course_url text,
    participants integer,
    result_event_id text,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    results_status text,
    results_synced_at timestamp with time zone,
    results_error text,
    CONSTRAINT src_races_gender_check CHECK ((gender = ANY (ARRAY['men'::text, 'women'::text]))),
    CONSTRAINT src_races_round_check CHECK (((round IS NULL) OR ((round >= 1) AND (round <= 5))))
);


--
-- Name: src_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.src_results (
    race_event_id uuid NOT NULL,
    mywhoosh_user_id text NOT NULL,
    name text NOT NULL,
    mywhoosh_team_id text,
    team_name text,
    category integer,
    category_rank integer,
    finished_ms bigint,
    gap_ms bigint,
    status text,
    profile_id uuid,
    suggested_profile_id uuid,
    CONSTRAINT src_results_category_check CHECK (((category IS NULL) OR ((category >= 1) AND (category <= 9))))
);


--
-- Name: src_sync_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.src_sync_state (
    id boolean DEFAULT true NOT NULL,
    created_by uuid,
    synced_at timestamp with time zone,
    sync_error text,
    races_in_feed integer,
    CONSTRAINT src_sync_state_id_check CHECK (id)
);


--
-- Name: src_team_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.src_team_results (
    race_event_id uuid NOT NULL,
    category integer NOT NULL,
    mywhoosh_team_id text NOT NULL,
    team_name text NOT NULL,
    time_ms bigint NOT NULL,
    rank integer NOT NULL,
    finishers integer NOT NULL
);


--
-- Name: strava_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strava_activities (
    id bigint NOT NULL,
    profile_id uuid NOT NULL,
    strava_athlete_id bigint NOT NULL,
    name text NOT NULL,
    sport_type text,
    start_date timestamp with time zone NOT NULL,
    achievement_week date NOT NULL,
    distance_m numeric(10,2) DEFAULT 0 NOT NULL,
    total_elevation_gain_m numeric(10,2) DEFAULT 0 NOT NULL,
    kudos_count integer DEFAULT 0 NOT NULL,
    moving_time_seconds integer DEFAULT 0 NOT NULL,
    elapsed_time_seconds integer DEFAULT 0 NOT NULL,
    trainer boolean DEFAULT false NOT NULL,
    commute boolean DEFAULT false NOT NULL,
    raw jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    efforts_fetched_at timestamp with time zone,
    blocks_processed_at timestamp with time zone,
    training_excluded_at timestamp with time zone,
    zwift_blocks_processed_at timestamp with time zone,
    zwift_world text,
    col_slugs text[],
    col_scan_key text,
    has_gps_times boolean,
    athlete_rpe smallint,
    part_of_activity_id bigint,
    CONSTRAINT strava_activities_athlete_rpe_check CHECK (((athlete_rpe IS NULL) OR ((athlete_rpe >= 1) AND (athlete_rpe <= 10)))),
    CONSTRAINT strava_activities_part_of_not_self CHECK (((part_of_activity_id IS NULL) OR (part_of_activity_id <> id)))
);


--
-- Name: strava_activity_dismissals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strava_activity_dismissals (
    profile_id uuid NOT NULL,
    activity_id bigint NOT NULL,
    dismissed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: strava_activity_summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strava_activity_summaries (
    activity_id bigint NOT NULL,
    profile_id uuid NOT NULL,
    workout_id uuid,
    intervals_id text,
    summary_text text,
    summary_hash text,
    written_at timestamp with time zone,
    attempts smallint DEFAULT 0 NOT NULL,
    last_error text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: strava_api_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strava_api_usage (
    id text NOT NULL,
    short_term_used integer,
    short_term_limit integer,
    daily_used integer,
    daily_limit integer,
    observed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: strava_bikes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strava_bikes (
    id text NOT NULL,
    profile_id uuid NOT NULL,
    name text,
    brand_model text,
    distance_m numeric(12,2) DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    retired boolean DEFAULT false NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text,
    show_on_profile boolean,
    source text DEFAULT 'strava'::text NOT NULL,
    discipline text DEFAULT 'race'::text NOT NULL,
    manual_distance_m numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT strava_bikes_discipline_check CHECK ((discipline = ANY (ARRAY['race'::text, 'gravel'::text, 'mtb'::text, 'indoor'::text, 'stad'::text, 'overig'::text]))),
    CONSTRAINT strava_bikes_source_check CHECK ((source = ANY (ARRAY['strava'::text, 'manual'::text])))
);


--
-- Name: strava_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strava_connections (
    profile_id uuid NOT NULL,
    strava_athlete_id bigint NOT NULL,
    athlete_username text,
    athlete_name text,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at integer NOT NULL,
    scope text,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_synced_at timestamp with time zone,
    last_event_at timestamp with time zone,
    consecutive_failures smallint DEFAULT 0 NOT NULL,
    last_error text,
    last_error_at timestamp with time zone,
    revoked_at timestamp with time zone,
    revoked_reason text,
    deauthorized_at timestamp with time zone,
    inactivity_warned_at timestamp with time zone,
    history_before timestamp with time zone,
    history_complete_at timestamp with time zone
);


--
-- Name: strava_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strava_webhook_events (
    id bigint NOT NULL,
    subscription_id bigint,
    object_type text NOT NULL,
    object_id bigint NOT NULL,
    aspect_type text NOT NULL,
    owner_id bigint NOT NULL,
    event_time timestamp with time zone NOT NULL,
    updates jsonb DEFAULT '{}'::jsonb NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    attempts smallint DEFAULT 0 NOT NULL,
    last_error text
);


--
-- Name: strava_webhook_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.strava_webhook_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: strava_webhook_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.strava_webhook_events_id_seq OWNED BY public.strava_webhook_events.id;


--
-- Name: strava_webhook_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strava_webhook_subscriptions (
    id bigint NOT NULL,
    callback_url text NOT NULL,
    verify_token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: symptom_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.symptom_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    log_date date NOT NULL,
    severity integer,
    symptoms text[] DEFAULT '{}'::text[] NOT NULL,
    cycle_start boolean DEFAULT false NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT symptom_logs_note_check CHECK (((note IS NULL) OR (length(note) <= 500))),
    CONSTRAINT symptom_logs_severity_check CHECK (((severity IS NULL) OR ((severity >= 1) AND (severity <= 5))))
);


--
-- Name: team_event_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_event_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    team_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    status text NOT NULL,
    note text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_event_availability_status_check CHECK ((status = ANY (ARRAY['available'::text, 'maybe'::text, 'unavailable'::text])))
);


--
-- Name: team_event_lineups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_event_lineups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    parent_team_id uuid NOT NULL,
    team_id uuid NOT NULL,
    profile_id uuid,
    slot integer,
    role text,
    note text,
    selected_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    roster_entry_id uuid,
    CONSTRAINT team_event_lineups_one_rider CHECK ((num_nonnulls(profile_id, roster_entry_id) = 1))
);


--
-- Name: team_member_seed_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_member_seed_overrides (
    team_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    excluded boolean DEFAULT true NOT NULL,
    reason text,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    team_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    assignment_source text DEFAULT 'manual'::text NOT NULL,
    CONSTRAINT team_members_assignment_source_check CHECK ((assignment_source = ANY (ARRAY['manual'::text, 'roster_claim'::text, 'event_availability'::text, 'wtrl'::text]))),
    CONSTRAINT team_members_role_check CHECK ((role = ANY (ARRAY['member'::text, 'captain'::text, 'co-captain'::text])))
);


--
-- Name: team_racepasses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_racepasses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    season text NOT NULL,
    round integer NOT NULL,
    valid_from date NOT NULL,
    valid_until date NOT NULL,
    url text NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_racepasses_check CHECK ((valid_until >= valid_from)),
    CONSTRAINT team_racepasses_round_check CHECK (((round >= 1) AND (round <= 4))),
    CONSTRAINT team_racepasses_url_check CHECK ((url ~ '^https://'::text))
);


--
-- Name: team_result_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_result_sources (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    team_id uuid NOT NULL,
    provider text NOT NULL,
    source_url text NOT NULL,
    match_name text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    last_synced_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_result_sources_provider_check CHECK ((provider = ANY (ARRAY['wtrl'::text, 'club_ladder'::text])))
);


--
-- Name: team_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_results (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    team_id uuid NOT NULL,
    competition text NOT NULL,
    round_label text,
    round_at timestamp with time zone,
    "position" integer,
    points numeric(7,2),
    total_teams integer,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    external_source text DEFAULT 'manual'::text NOT NULL,
    external_id text,
    source_url text,
    synced_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT team_results_external_source_check CHECK ((external_source = ANY (ARRAY['manual'::text, 'wtrl'::text, 'club_ladder'::text]))),
    CONSTRAINT team_results_position_check CHECK (("position" > 0)),
    CONSTRAINT team_results_total_teams_check CHECK ((total_teams > 0))
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    division text,
    captain_id uuid,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_graveyard boolean DEFAULT false NOT NULL,
    parent_team_id uuid,
    discord_url text,
    mywhoosh_team_name text,
    ladder_rank_min smallint,
    ladder_rank_max smallint,
    CONSTRAINT teams_discord_url_check CHECK (((discord_url IS NULL) OR (discord_url ~* '^https://(discord\.gg/[A-Za-z0-9-]+|(www\.)?(discord|discordapp)\.com/(invite/[A-Za-z0-9-]+|channels/[0-9]+/[0-9]+))/?$'::text))),
    CONSTRAINT teams_ladder_band_check CHECK ((((ladder_rank_min IS NULL) AND (ladder_rank_max IS NULL)) OR (((ladder_rank_min >= 1) AND (ladder_rank_min <= 10)) AND ((ladder_rank_max >= 1) AND (ladder_rank_max <= 10)) AND (ladder_rank_min <= ladder_rank_max)))),
    CONSTRAINT teams_type_check CHECK ((type = ANY (ARRAY['zrl'::text, 'ladder'::text, 'social'::text, 'outdoor'::text, 'src'::text])))
);


--
-- Name: telegram_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_links (
    profile_id uuid NOT NULL,
    chat_id bigint,
    link_token_hash text,
    link_token_expires_at timestamp with time zone,
    linked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: training_adaptation_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_adaptation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    trainer_id uuid,
    source_plan_id uuid,
    draft_plan_id uuid,
    status text DEFAULT 'completed'::text NOT NULL,
    input_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_json jsonb,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT training_adaptation_runs_status_check CHECK ((status = ANY (ARRAY['completed'::text, 'skipped'::text, 'failed'::text])))
);


--
-- Name: training_ai_generations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_ai_generations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    trainer_id uuid,
    goal_id uuid,
    model text NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    prompt_summary text NOT NULL,
    response_json jsonb,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    prompt_text text,
    openai_response_id text,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_plan_id uuid,
    adaptation_reason text,
    adaptation_kind text,
    adapt_from_date date,
    ftp_test_type text,
    ftp_test_date date,
    prompt_hash text,
    CONSTRAINT training_ai_generations_adaptation_kind_check CHECK (((adaptation_kind IS NULL) OR (adaptation_kind = ANY (ARRAY['day'::text, 'plan_update'::text, 'daily'::text])))),
    CONSTRAINT training_ai_generations_ftp_test_type_check CHECK (((ftp_test_type IS NULL) OR (ftp_test_type = ANY (ARRAY['ramp'::text, 'twenty_min'::text])))),
    CONSTRAINT training_ai_generations_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'in_progress'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: training_ai_prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_ai_prompts (
    hash text NOT NULL,
    prompt_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: training_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    week_start date,
    minutes_by_day jsonb DEFAULT '{}'::jsonb NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: training_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    author_id uuid,
    role text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    plan_id uuid,
    model text,
    response_id text,
    affects_plan boolean DEFAULT false NOT NULL,
    replan_result text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT training_chat_messages_role_check CHECK ((role = ANY (ARRAY['member'::text, 'trainer'::text, 'coach'::text]))),
    CONSTRAINT training_chat_messages_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'pending'::text, 'failed'::text])))
);


--
-- Name: training_coach_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_coach_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid NOT NULL,
    trainer_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    granted_by uuid,
    revoked_by uuid,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT training_coach_assignments_status_check CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text])))
);


--
-- Name: training_engine_comparisons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_engine_comparisons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    generation_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    trainer_id uuid NOT NULL,
    winner text NOT NULL,
    engine_side text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT training_engine_comparisons_engine_side_check CHECK ((engine_side = ANY (ARRAY['a'::text, 'b'::text]))),
    CONSTRAINT training_engine_comparisons_reason_check CHECK (((reason IS NULL) OR (char_length(reason) <= 280))),
    CONSTRAINT training_engine_comparisons_winner_check CHECK ((winner = ANY (ARRAY['ai'::text, 'engine'::text, 'gelijk'::text])))
);


--
-- Name: training_ftp_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_ftp_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    workout_id uuid,
    tested_on date NOT NULL,
    test_type text NOT NULL,
    result_watts numeric(6,1) NOT NULL,
    ftp_watts integer NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT training_ftp_tests_ftp_watts_check CHECK (((ftp_watts > 0) AND (ftp_watts < 800))),
    CONSTRAINT training_ftp_tests_result_watts_check CHECK (((result_watts > (0)::numeric) AND (result_watts < (1000)::numeric))),
    CONSTRAINT training_ftp_tests_test_type_check CHECK ((test_type = ANY (ARRAY['ramp'::text, 'twenty_min'::text])))
);


--
-- Name: training_goal_forecasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_goal_forecasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    target_seconds integer NOT NULL,
    predicted_seconds integer NOT NULL,
    verdict text NOT NULL,
    cp_watts integer NOT NULL,
    weight_kg numeric(5,1) NOT NULL,
    required_cp_watts integer,
    detail jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT training_goal_forecasts_verdict_check CHECK ((verdict = ANY (ARRAY['haalbaar'::text, 'met_groei'::text, 'ambitieus'::text, 'niet_realistisch'::text, 'groei_nodig'::text, 'buiten_bereik'::text])))
);


--
-- Name: training_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    title text NOT NULL,
    goal_type text NOT NULL,
    target_date date,
    target_event_id uuid,
    available_days text[] DEFAULT ARRAY[]::text[] NOT NULL,
    max_hours_per_week numeric(4,1),
    preferred_mode text DEFAULT 'mixed'::text NOT NULL,
    experience_level text DEFAULT 'intermediate'::text NOT NULL,
    desired_intensity text DEFAULT 'balanced'::text NOT NULL,
    risk_notes text,
    status text DEFAULT 'active'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    target_time_seconds integer,
    target_riding text,
    target_route jsonb,
    CONSTRAINT training_goals_desired_intensity_check CHECK ((desired_intensity = ANY (ARRAY['easy'::text, 'balanced'::text, 'hard'::text]))),
    CONSTRAINT training_goals_experience_level_check CHECK ((experience_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text]))),
    CONSTRAINT training_goals_goal_type_check CHECK ((goal_type = ANY (ARRAY['zrl'::text, 'ladder'::text, 'outdoor_event'::text, 'gran_fondo'::text, 'ftp'::text, 'base_fitness'::text, 'rebuild'::text]))),
    CONSTRAINT training_goals_preferred_mode_check CHECK ((preferred_mode = ANY (ARRAY['indoor'::text, 'outdoor'::text, 'mixed'::text]))),
    CONSTRAINT training_goals_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'archived'::text]))),
    CONSTRAINT training_goals_target_riding_check CHECK (((target_riding IS NULL) OR (target_riding = ANY (ARRAY['alone'::text, 'group'::text])))),
    CONSTRAINT training_goals_target_time_seconds_check CHECK (((target_time_seconds IS NULL) OR ((target_time_seconds >= 600) AND (target_time_seconds <= 86400))))
);


--
-- Name: training_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    trainer_id uuid,
    goal_id uuid,
    ai_generation_id uuid,
    title text NOT NULL,
    summary text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    published_by uuid,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_plan_id uuid,
    adaptation_reason text,
    ctl_projection_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    adapt_from_date date,
    root_plan_id uuid,
    adaptation_kind text,
    CONSTRAINT training_plans_adaptation_kind_check CHECK (((adaptation_kind IS NULL) OR (adaptation_kind = ANY (ARRAY['day'::text, 'plan_update'::text, 'daily'::text])))),
    CONSTRAINT training_plans_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'ai'::text]))),
    CONSTRAINT training_plans_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'review'::text, 'approved'::text, 'published'::text, 'archived'::text])))
);


--
-- Name: training_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    author_id uuid,
    author_role text NOT NULL,
    body text NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT training_preferences_author_role_check CHECK ((author_role = ANY (ARRAY['member'::text, 'trainer'::text]))),
    CONSTRAINT training_preferences_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 1000))),
    CONSTRAINT training_preferences_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'chat'::text])))
);


--
-- Name: training_replan_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_replan_requests (
    profile_id uuid NOT NULL,
    reason text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: training_season_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_season_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    title text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    kind text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    travel_days date[] DEFAULT '{}'::date[] NOT NULL,
    CONSTRAINT training_season_periods_kind_check CHECK ((kind = ANY (ARRAY['rust'::text, 'rustig'::text, 'kamp'::text]))),
    CONSTRAINT training_season_periods_range CHECK ((end_date >= start_date))
);


--
-- Name: training_season_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_season_targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    event_id uuid,
    goal_id uuid,
    title text NOT NULL,
    target_date date NOT NULL,
    priority text DEFAULT 'b'::text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT training_season_targets_priority_check CHECK ((priority = ANY (ARRAY['a'::text, 'b'::text, 'c'::text])))
);


--
-- Name: training_workout_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_workout_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workout_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    trainer_id uuid,
    athlete_rpe integer,
    athlete_feel text,
    athlete_report text,
    trainer_feedback text,
    paired_activity_id text,
    intervals_event_id text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metrics_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    athlete_confirmed_at timestamp with time zone,
    trainer_reviewed_at timestamp with time zone,
    trainer_status text,
    CONSTRAINT training_workout_reports_athlete_feel_check CHECK (((athlete_feel IS NULL) OR (athlete_feel = ANY (ARRAY['goed'::text, 'neutraal'::text, 'zwaar'::text, 'slecht'::text])))),
    CONSTRAINT training_workout_reports_athlete_rpe_check CHECK (((athlete_rpe IS NULL) OR ((athlete_rpe >= 1) AND (athlete_rpe <= 10)))),
    CONSTRAINT training_workout_reports_trainer_status_check CHECK (((trainer_status IS NULL) OR (trainer_status = ANY (ARRAY['approved'::text, 'adjusted'::text]))))
);


--
-- Name: training_workout_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_workout_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form text NOT NULL,
    title text NOT NULL,
    description text,
    duration_minutes integer NOT NULL,
    intensity text NOT NULL,
    target_type text DEFAULT 'power'::text NOT NULL,
    structure_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_standard boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    test_type text,
    method_label text,
    CONSTRAINT training_workout_templates_duration_minutes_check CHECK (((duration_minutes > 0) AND (duration_minutes <= 480))),
    CONSTRAINT training_workout_templates_form_check CHECK ((form = ANY (ARRAY['herstel'::text, 'duur'::text, 'tempo'::text, 'sweetspot'::text, 'drempel'::text, 'vo2max'::text, 'anaeroob'::text, 'sprint'::text, 'test'::text, 'warmup'::text]))),
    CONSTRAINT training_workout_templates_intensity_check CHECK ((intensity = ANY (ARRAY['recovery'::text, 'endurance'::text, 'tempo'::text, 'threshold'::text, 'vo2max'::text, 'anaerobic'::text, 'race'::text, 'rest'::text]))),
    CONSTRAINT training_workout_templates_method_label_check CHECK ((method_label = ANY (ARRAY['veelbelovend'::text, 'experimenteel'::text]))),
    CONSTRAINT training_workout_templates_target_type_check CHECK ((target_type = ANY (ARRAY['power'::text, 'heart_rate'::text, 'rpe'::text, 'free'::text]))),
    CONSTRAINT training_workout_templates_test_type_check CHECK (((test_type IS NULL) OR (test_type = ANY (ARRAY['ramp'::text, 'twenty_min'::text]))))
);


--
-- Name: training_workouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_workouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    trainer_id uuid,
    scheduled_at timestamp with time zone NOT NULL,
    title text NOT NULL,
    description text,
    duration_minutes integer DEFAULT 60 NOT NULL,
    intensity text DEFAULT 'endurance'::text NOT NULL,
    target_type text DEFAULT 'power'::text NOT NULL,
    structure_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    intervals_event_id text,
    publish_status text DEFAULT 'pending'::text NOT NULL,
    publish_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    intervals_external_id text,
    superseded_at timestamp with time zone,
    superseded_by_plan_id uuid,
    origin text DEFAULT 'ai'::text NOT NULL,
    event_id uuid,
    test_type text,
    zwift_event_id bigint,
    zwift_suggestions_dismissed_at timestamp with time zone,
    method_label text,
    member_duration_minutes integer,
    CONSTRAINT training_workouts_duration_minutes_check CHECK (((duration_minutes > 0) AND (duration_minutes <= 720))),
    CONSTRAINT training_workouts_intensity_check CHECK ((intensity = ANY (ARRAY['recovery'::text, 'endurance'::text, 'tempo'::text, 'threshold'::text, 'vo2max'::text, 'anaerobic'::text, 'race'::text, 'rest'::text]))),
    CONSTRAINT training_workouts_member_duration_minutes_check CHECK (((member_duration_minutes >= 15) AND (member_duration_minutes <= 480))),
    CONSTRAINT training_workouts_method_label_check CHECK ((method_label = ANY (ARRAY['veelbelovend'::text, 'experimenteel'::text]))),
    CONSTRAINT training_workouts_origin_check CHECK ((origin = ANY (ARRAY['ai'::text, 'member'::text, 'trainer'::text, 'event'::text]))),
    CONSTRAINT training_workouts_publish_status_check CHECK ((publish_status = ANY (ARRAY['pending'::text, 'published'::text, 'failed'::text]))),
    CONSTRAINT training_workouts_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'completed'::text, 'skipped'::text]))),
    CONSTRAINT training_workouts_target_type_check CHECK ((target_type = ANY (ARRAY['power'::text, 'heart_rate'::text, 'rpe'::text, 'free'::text]))),
    CONSTRAINT training_workouts_test_type_check CHECK (((test_type IS NULL) OR (test_type = ANY (ARRAY['ramp'::text, 'twenty_min'::text]))))
);


--
-- Name: ttt_plan_riders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ttt_plan_riders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    profile_id uuid,
    is_manual boolean DEFAULT false NOT NULL,
    zwift_id text,
    name text NOT NULL,
    ftp_watts integer,
    weight_kg numeric(5,2),
    height_cm integer,
    power_300_watts integer,
    pull_watts integer,
    pull_duration_seconds integer,
    display_order integer DEFAULT 0 NOT NULL,
    role text,
    notes text,
    result jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ttt_plan_riders_ftp_watts_check CHECK (((ftp_watts IS NULL) OR ((ftp_watts > 0) AND (ftp_watts < 1200)))),
    CONSTRAINT ttt_plan_riders_height_cm_check CHECK (((height_cm IS NULL) OR ((height_cm >= 100) AND (height_cm <= 230)))),
    CONSTRAINT ttt_plan_riders_power_300_watts_check CHECK (((power_300_watts IS NULL) OR ((power_300_watts > 0) AND (power_300_watts < 2000)))),
    CONSTRAINT ttt_plan_riders_pull_duration_seconds_check CHECK (((pull_duration_seconds IS NULL) OR ((pull_duration_seconds >= 0) AND (pull_duration_seconds <= 1200)))),
    CONSTRAINT ttt_plan_riders_pull_watts_check CHECK (((pull_watts IS NULL) OR ((pull_watts > 0) AND (pull_watts < 2000)))),
    CONSTRAINT ttt_plan_riders_weight_kg_check CHECK (((weight_kg IS NULL) OR ((weight_kg > (0)::numeric) AND (weight_kg < (300)::numeric))))
);


--
-- Name: ttt_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ttt_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    parent_team_id uuid NOT NULL,
    team_id uuid,
    name text NOT NULL,
    route text DEFAULT 'next_zrl'::text NOT NULL,
    target_speed numeric(5,2),
    intensity integer DEFAULT 0 NOT NULL,
    efficiency integer DEFAULT 0 NOT NULL,
    allow_zero_pulls boolean DEFAULT false NOT NULL,
    min_pull_duration integer DEFAULT 30 NOT NULL,
    max_pull_duration integer DEFAULT 180 NOT NULL,
    duration_interval integer DEFAULT 15 NOT NULL,
    optimization_strategy text DEFAULT 'variable'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    api_response jsonb,
    export_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_error text,
    created_by uuid,
    updated_by uuid,
    optimized_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    share_token text,
    CONSTRAINT ttt_plans_duration_interval_check CHECK ((duration_interval = ANY (ARRAY[10, 15]))),
    CONSTRAINT ttt_plans_efficiency_check CHECK (((efficiency >= '-2'::integer) AND (efficiency <= 2))),
    CONSTRAINT ttt_plans_intensity_check CHECK (((intensity >= '-3'::integer) AND (intensity <= 3))),
    CONSTRAINT ttt_plans_max_pull_duration_check CHECK (((max_pull_duration >= 30) AND (max_pull_duration <= 600))),
    CONSTRAINT ttt_plans_min_pull_duration_check CHECK (((min_pull_duration >= 10) AND (min_pull_duration <= 120))),
    CONSTRAINT ttt_plans_optimization_strategy_check CHECK ((optimization_strategy = ANY (ARRAY['variable'::text, 'fixed'::text]))),
    CONSTRAINT ttt_plans_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'optimized'::text, 'error'::text])))
);


--
-- Name: weekly_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_reviews (
    profile_id uuid NOT NULL,
    week_start date NOT NULL,
    summary jsonb NOT NULL,
    coach_text text,
    coach_status text DEFAULT 'rules'::text NOT NULL,
    coach_response_id text,
    coach_model text,
    coach_started_at timestamp with time zone,
    seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT weekly_reviews_coach_status_check CHECK ((coach_status = ANY (ARRAY['rules'::text, 'pending'::text, 'done'::text, 'failed'::text]))),
    CONSTRAINT weekly_reviews_summary_check CHECK ((jsonb_typeof(summary) = 'object'::text)),
    CONSTRAINT weekly_reviews_week_start_check CHECK ((EXTRACT(isodow FROM week_start) = (1)::numeric))
);


--
-- Name: whatsapp_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_groups (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    invite_url text NOT NULL,
    contact_profile_id uuid,
    member_count_estimate integer,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    team_id uuid,
    event_id uuid,
    kind text DEFAULT 'group'::text NOT NULL,
    CONSTRAINT whatsapp_groups_category_check CHECK (((category IS NULL) OR (category = ANY (ARRAY['algemeen'::text, 'bestuur'::text, 'zrl'::text, 'ladder'::text, 'outdoor'::text, 'klassiekers'::text, 'social'::text, 'training'::text, 'overig'::text])))),
    CONSTRAINT whatsapp_groups_invite_url_check CHECK ((invite_url ~* '^https://(chat\.whatsapp\.com/|(www\.)?whatsapp\.com/channel/)'::text)),
    CONSTRAINT whatsapp_groups_kind_check CHECK ((kind = ANY (ARRAY['group'::text, 'channel'::text]))),
    CONSTRAINT whatsapp_groups_member_count_estimate_check CHECK ((member_count_estimate >= 0)),
    CONSTRAINT whatsapp_groups_scope_xor CHECK (((team_id IS NULL) OR (event_id IS NULL)))
);


--
-- Name: wtrl_team_riders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wtrl_team_riders (
    trc_ref text NOT NULL,
    zwift_id text NOT NULL,
    name text NOT NULL,
    category text,
    status text NOT NULL,
    zftp_w integer,
    zftp_wkg numeric(4,2),
    zmap_wkg numeric(4,2),
    CONSTRAINT wtrl_team_riders_category_check CHECK ((category = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'E'::text]))),
    CONSTRAINT wtrl_team_riders_status_check CHECK ((status = ANY (ARRAY['member'::text, 'invited'::text])))
);


--
-- Name: wtrl_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wtrl_teams (
    trc_ref text NOT NULL,
    name text NOT NULL,
    season text,
    division text,
    captain text,
    team_id uuid,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    imported_by uuid
);


--
-- Name: zrl_race_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zrl_race_snapshots (
    zwift_event_id text NOT NULL,
    data jsonb NOT NULL,
    frozen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: zrl_rider_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zrl_rider_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_result_id uuid,
    event_id uuid,
    team_id uuid,
    profile_id uuid,
    roster_entry_id uuid,
    external_source text DEFAULT 'wtrl'::text NOT NULL,
    external_id text NOT NULL,
    rider_name text NOT NULL,
    zwift_id text,
    category text,
    "position" integer,
    points numeric(7,2),
    time_text text,
    time_seconds integer,
    matched_via text DEFAULT 'unmatched'::text NOT NULL,
    round_label text,
    round_at timestamp with time zone,
    source_url text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zrl_rider_results_matched_via_check CHECK ((matched_via = ANY (ARRAY['zwift_id'::text, 'roster'::text, 'profile_name'::text, 'unmatched'::text])))
);


--
-- Name: zrl_team_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zrl_team_assignments (
    league_key text NOT NULL,
    zwift_id bigint NOT NULL,
    team_label text NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zrl_team_assignments_team_label_check CHECK (((length(TRIM(BOTH FROM team_label)) >= 1) AND (length(TRIM(BOTH FROM team_label)) <= 60)))
);


--
-- Name: zrl_team_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zrl_team_results (
    event_id uuid NOT NULL,
    team_id uuid,
    rank integer NOT NULL,
    teams integer NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    riders integer DEFAULT 0 NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zrl_team_results_rank_check CHECK ((rank > 0)),
    CONSTRAINT zrl_team_results_teams_check CHECK ((teams > 0))
);


--
-- Name: zwb_ds_budget; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwb_ds_budget (
    id smallint DEFAULT 1 NOT NULL,
    tokens real NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zwb_ds_budget_id_check CHECK ((id = 1))
);


--
-- Name: zwb_ds_rider_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwb_ds_rider_states (
    zwift_id bigint NOT NULL,
    checked_at timestamp with time zone NOT NULL,
    state_at timestamp with time zone,
    event_subgroup_id bigint,
    event_distance_m real,
    speed_kmh real,
    power integer,
    cadence_rpm smallint,
    draft integer,
    elapsed_s integer,
    kj real,
    climbing_m integer
);


--
-- Name: zwb_segment_maps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwb_segment_maps (
    id bigint NOT NULL,
    name text NOT NULL,
    distance_m double precision,
    average_grade double precision,
    start_lat double precision,
    start_lon double precision,
    south double precision,
    west double precision,
    north double precision,
    east double precision,
    polyline text,
    track jsonb DEFAULT '[]'::jsonb NOT NULL,
    private boolean DEFAULT false NOT NULL,
    hazardous boolean DEFAULT false NOT NULL,
    geometry_status text DEFAULT 'pending'::text NOT NULL,
    geometry_checked_at timestamp with time zone,
    geometry_error text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zwb_segment_maps_geometry_status_check CHECK ((geometry_status = ANY (ARRAY['pending'::text, 'ready'::text, 'error'::text, 'unavailable'::text])))
);


--
-- Name: zwb_segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwb_segments (
    slug text NOT NULL,
    name text NOT NULL,
    collection text NOT NULL,
    country text,
    region text,
    virtual boolean DEFAULT false NOT NULL,
    distance_m numeric,
    elevation_gain_m numeric,
    category text,
    strava_segment_id bigint,
    legacy_col_slug text,
    active boolean DEFAULT true NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zwb_segments_collection_check CHECK ((collection = ANY (ARRAY['cols'::text, 'zwift_flat'::text, 'benelux_popular'::text, 'europe_flat'::text])))
);


--
-- Name: zwbeker_congrats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwbeker_congrats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    beker_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zwbeker_congrats_body_check CHECK (((length(btrim(body)) >= 1) AND (length(btrim(body)) <= 500)))
);


--
-- Name: zwbeker_winners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwbeker_winners (
    beker_id uuid NOT NULL,
    profile_id uuid NOT NULL
);


--
-- Name: zwbekers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwbekers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid,
    kind text NOT NULL,
    title text NOT NULL,
    story text NOT NULL,
    achieved_on date NOT NULL,
    team_id uuid,
    team_name text,
    event_id uuid,
    result_url text,
    design jsonb NOT NULL,
    photo_path text,
    status text DEFAULT 'voorgedragen'::text NOT NULL,
    review_note text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    zrl_round text,
    CONSTRAINT zwbekers_check CHECK (((kind = 'team'::text) OR ((team_id IS NULL) AND (team_name IS NULL)))),
    CONSTRAINT zwbekers_check1 CHECK (((status = 'voorgedragen'::text) = (reviewed_at IS NULL))),
    CONSTRAINT zwbekers_design_check CHECK ((jsonb_typeof(design) = 'object'::text)),
    CONSTRAINT zwbekers_event_or_round CHECK (((event_id IS NULL) OR (zrl_round IS NULL))),
    CONSTRAINT zwbekers_kind_check CHECK ((kind = ANY (ARRAY['individueel'::text, 'team'::text]))),
    CONSTRAINT zwbekers_photo_path_check CHECK (((photo_path IS NULL) OR (length(photo_path) <= 300))),
    CONSTRAINT zwbekers_result_url_check CHECK (((result_url IS NULL) OR ((result_url ~ '^https://'::text) AND (length(result_url) <= 500)))),
    CONSTRAINT zwbekers_review_note_check CHECK (((review_note IS NULL) OR ((length(btrim(review_note)) >= 1) AND (length(btrim(review_note)) <= 500)))),
    CONSTRAINT zwbekers_status_check CHECK ((status = ANY (ARRAY['voorgedragen'::text, 'toegekend'::text, 'afgewezen'::text]))),
    CONSTRAINT zwbekers_story_check CHECK (((length(btrim(story)) >= 10) AND (length(btrim(story)) <= 1000))),
    CONSTRAINT zwbekers_team_name_check CHECK (((team_name IS NULL) OR ((length(btrim(team_name)) >= 1) AND (length(btrim(team_name)) <= 80)))),
    CONSTRAINT zwbekers_title_check CHECK (((length(btrim(title)) >= 3) AND (length(btrim(title)) <= 60))),
    CONSTRAINT zwbekers_zrl_round_format CHECK (((zrl_round IS NULL) OR (zrl_round ~ '^[0-9]{4}/[0-9]{2} R[1-4]$'::text)))
);


--
-- Name: zwbgame_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwbgame_preferences (
    profile_id uuid NOT NULL,
    visible boolean DEFAULT true NOT NULL,
    data_consent_version text,
    revision uuid DEFAULT gen_random_uuid() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zwbgame_preferences_data_consent_version_check CHECK (((data_consent_version IS NULL) OR (data_consent_version = '2026-09-17'::text)))
);


--
-- Name: zwbgame_riders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwbgame_riders (
    profile_id uuid NOT NULL,
    consent_revision uuid NOT NULL,
    attributes jsonb NOT NULL,
    provenance jsonb NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    CONSTRAINT zwbgame_riders_attributes_check CHECK ((jsonb_typeof(attributes) = 'object'::text)),
    CONSTRAINT zwbgame_riders_provenance_check CHECK ((jsonb_typeof(provenance) = 'object'::text))
);


--
-- Name: zwbgame_roster_exclusions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwbgame_roster_exclusions (
    roster_id uuid NOT NULL,
    excluded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: zwbriljant_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwbriljant_preferences (
    profile_id uuid NOT NULL,
    consent_version text,
    visible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zwbriljant_preferences_consent_version_check CHECK (((consent_version IS NULL) OR (consent_version = '2026-10-21'::text)))
);


--
-- Name: zwbriljant_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwbriljant_snapshots (
    profile_id uuid NOT NULL,
    week date NOT NULL,
    score numeric(5,2),
    facets jsonb NOT NULL,
    consistency numeric,
    source text NOT NULL,
    provenance jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zwbriljant_snapshots_consistency_check CHECK (((consistency IS NULL) OR ((consistency >= (0)::numeric) AND (consistency <= (1)::numeric)))),
    CONSTRAINT zwbriljant_snapshots_facets_check CHECK (((jsonb_typeof(facets) = 'object'::text) AND ((facets - ARRAY['sprint'::text, 'anaeroob'::text, 'vo2max'::text, 'drempel'::text, 'durability'::text, 'fitheid'::text, 'racen'::text]) = '{}'::jsonb))),
    CONSTRAINT zwbriljant_snapshots_provenance_check CHECK ((jsonb_typeof(provenance) = 'object'::text)),
    CONSTRAINT zwbriljant_snapshots_score_check CHECK (((score IS NULL) OR ((score >= (0)::numeric) AND (score <= (100)::numeric)))),
    CONSTRAINT zwbriljant_snapshots_source_check CHECK ((source = ANY (ARRAY['week'::text, 'terugblik'::text]))),
    CONSTRAINT zwbriljant_snapshots_week_check CHECK ((EXTRACT(isodow FROM week) = (1)::numeric))
);


--
-- Name: zwift_bike_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwift_bike_parts (
    id bigint NOT NULL,
    part text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    test_frame text DEFAULT ''::text NOT NULL,
    stage smallint DEFAULT 0 NOT NULL,
    cda_delta numeric(6,4) NOT NULL,
    kg_delta numeric(5,2) NOT NULL,
    source text NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    fixed_wheels boolean DEFAULT false NOT NULL,
    CONSTRAINT zwift_bike_parts_kind_check CHECK ((kind = ANY (ARRAY['road'::text, 'tt'::text, 'gravel'::text, 'mtb'::text]))),
    CONSTRAINT zwift_bike_parts_part_check CHECK ((part = ANY (ARRAY['frame'::text, 'wheel'::text]))),
    CONSTRAINT zwift_bike_parts_stage_check CHECK (((stage >= 0) AND (stage <= 5)))
);


--
-- Name: zwift_bike_parts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.zwift_bike_parts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.zwift_bike_parts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: zwift_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwift_events (
    event_id bigint NOT NULL,
    name text NOT NULL,
    event_start timestamp with time zone NOT NULL,
    event_type text,
    sport text,
    route_id bigint,
    duration_seconds integer,
    distance_m numeric(10,1),
    laps integer,
    subgroups jsonb DEFAULT '[]'::jsonb NOT NULL,
    series_name text,
    description text,
    total_signups integer,
    zwb_signups integer,
    external_url text NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: zwift_legacy_velo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwift_legacy_velo (
    zwift_id bigint NOT NULL,
    velo_live numeric(6,1),
    velo_max30 numeric(6,1),
    velo_max90 numeric(6,1),
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zwift_legacy_velo_zwift_id_check CHECK ((zwift_id > 0))
);


--
-- Name: zwift_race_score_sync; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwift_race_score_sync (
    zwift_id bigint NOT NULL,
    next_start integer DEFAULT 0 NOT NULL,
    list_complete boolean DEFAULT false NOT NULL,
    refused boolean DEFAULT false NOT NULL,
    newest_at timestamp with time zone,
    settled_at timestamp with time zone,
    attempted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    listed_until timestamp with time zone,
    races_checked_at timestamp with time zone,
    CONSTRAINT zwift_race_score_sync_next_start_check CHECK ((next_start >= 0))
);


--
-- Name: zwift_race_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwift_race_scores (
    zwift_id bigint NOT NULL,
    activity_id text NOT NULL,
    raced_at timestamp with time zone NOT NULL,
    raced_on date NOT NULL,
    score_before integer,
    score_after integer,
    looked_up_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    zwift_event_id bigint,
    event_name text,
    event_looked_up_at timestamp with time zone,
    CONSTRAINT zwift_race_scores_activity_id_check CHECK ((activity_id ~ '^[0-9]+$'::text)),
    CONSTRAINT zwift_race_scores_score_after_check CHECK (((score_after IS NULL) OR (score_after >= 0))),
    CONSTRAINT zwift_race_scores_score_before_check CHECK (((score_before IS NULL) OR (score_before >= 0))),
    CONSTRAINT zwift_race_scores_zwift_event_id_check CHECK (((zwift_event_id IS NULL) OR (zwift_event_id > 0)))
);


--
-- Name: zwift_rider_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwift_rider_metrics (
    zwift_id bigint NOT NULL,
    racing_score integer,
    zwift_category text,
    zrs_fetched_at timestamp with time zone,
    velo numeric(6,1),
    velo_category text,
    phenotype text,
    power_wkg jsonb,
    velo_fetched_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: zwift_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwift_routes (
    route_id bigint NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    world text,
    strava_segment_id bigint,
    profile jsonb,
    shape jsonb,
    profile_source text,
    profile_distance_m numeric(9,1),
    profile_elevation_m numeric(7,1),
    synced_at timestamp with time zone,
    sync_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    profile_raw_elevation_m numeric(7,1),
    CONSTRAINT zwift_routes_profile_source_check CHECK ((profile_source = 'strava_segment'::text))
);


--
-- Name: zwift_segment_bests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zwift_segment_bests (
    zwift_id bigint NOT NULL,
    segment_id text NOT NULL,
    best_seconds numeric(8,3),
    best_watts integer,
    best_weight_kg numeric(5,1),
    best_at timestamp with time zone,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zwift_segment_bests_best_seconds_check CHECK (((best_seconds IS NULL) OR (best_seconds > (0)::numeric))),
    CONSTRAINT zwift_segment_bests_best_watts_check CHECK (((best_watts IS NULL) OR (best_watts > 0))),
    CONSTRAINT zwift_segment_bests_best_weight_kg_check CHECK (((best_weight_kg IS NULL) OR (best_weight_kg > (0)::numeric))),
    CONSTRAINT zwift_segment_bests_segment_id_check CHECK ((segment_id ~ '^-?[0-9]+$'::text))
);


--
-- Name: zwift_world_distances; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.zwift_world_distances WITH (security_invoker='on') AS
 SELECT profile_id,
    zwift_world AS world,
    (sum(distance_m))::bigint AS distance_m
   FROM public.strava_activities
  WHERE (zwift_world IS NOT NULL)
  GROUP BY profile_id, zwift_world;


--
-- Name: live_positions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_positions ALTER COLUMN id SET DEFAULT nextval('public.live_positions_id_seq'::regclass);


--
-- Name: strava_webhook_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_webhook_events ALTER COLUMN id SET DEFAULT nextval('public.strava_webhook_events_id_seq'::regclass);


--
-- Name: achievement_awards achievement_awards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_awards
    ADD CONSTRAINT achievement_awards_pkey PRIMARY KEY (id);


--
-- Name: achievement_badges achievement_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_badges
    ADD CONSTRAINT achievement_badges_pkey PRIMARY KEY (id);


--
-- Name: ai_jobs ai_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_jobs
    ADD CONSTRAINT ai_jobs_pkey PRIMARY KEY (id);


--
-- Name: ai_usage ai_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage
    ADD CONSTRAINT ai_usage_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: app_updates app_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_updates
    ADD CONSTRAINT app_updates_pkey PRIMARY KEY (id);


--
-- Name: app_updates app_updates_week_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_updates
    ADD CONSTRAINT app_updates_week_start_key UNIQUE (week_start);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: bike_components bike_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bike_components
    ADD CONSTRAINT bike_components_pkey PRIMARY KEY (id);


--
-- Name: bike_components bike_components_threshold_value_positive; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.bike_components
    ADD CONSTRAINT bike_components_threshold_value_positive CHECK ((threshold_value > 0)) NOT VALID;


--
-- Name: birthday_messages birthday_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.birthday_messages
    ADD CONSTRAINT birthday_messages_pkey PRIMARY KEY (id);


--
-- Name: birthday_photos birthday_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.birthday_photos
    ADD CONSTRAINT birthday_photos_pkey PRIMARY KEY (id);


--
-- Name: birthday_photos birthday_photos_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.birthday_photos
    ADD CONSTRAINT birthday_photos_storage_path_key UNIQUE (storage_path);


--
-- Name: birthday_ride_rsvps birthday_ride_rsvps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.birthday_ride_rsvps
    ADD CONSTRAINT birthday_ride_rsvps_pkey PRIMARY KEY (birthday_profile_id, celebration_year, profile_id);


--
-- Name: birthday_rides birthday_rides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.birthday_rides
    ADD CONSTRAINT birthday_rides_pkey PRIMARY KEY (birthday_profile_id, celebration_year);


--
-- Name: bokaal_bets bokaal_bets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bokaal_bets
    ADD CONSTRAINT bokaal_bets_pkey PRIMARY KEY (id);


--
-- Name: bokaal_bonus_answers bokaal_bonus_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bokaal_bonus_answers
    ADD CONSTRAINT bokaal_bonus_answers_pkey PRIMARY KEY (race_id, profile_id);


--
-- Name: bokaal_players bokaal_players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bokaal_players
    ADD CONSTRAINT bokaal_players_pkey PRIMARY KEY (profile_id, season);


--
-- Name: bokaal_races bokaal_races_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bokaal_races
    ADD CONSTRAINT bokaal_races_pkey PRIMARY KEY (id);


--
-- Name: bokaal_races bokaal_races_race_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bokaal_races
    ADD CONSTRAINT bokaal_races_race_slug_key UNIQUE (race_slug);


--
-- Name: bokaal_ratings bokaal_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bokaal_ratings
    ADD CONSTRAINT bokaal_ratings_pkey PRIMARY KEY (category, rider_slug);


--
-- Name: calendar_feed_tokens calendar_feed_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_feed_tokens
    ADD CONSTRAINT calendar_feed_tokens_pkey PRIMARY KEY (profile_id);


--
-- Name: calendar_feed_tokens calendar_feed_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_feed_tokens
    ADD CONSTRAINT calendar_feed_tokens_token_key UNIQUE (token);


--
-- Name: club_ladder_event_expectations club_ladder_event_expectations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_ladder_event_expectations
    ADD CONSTRAINT club_ladder_event_expectations_pkey PRIMARY KEY (event_id);


--
-- Name: club_ladder_favorite_routes club_ladder_favorite_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_ladder_favorite_routes
    ADD CONSTRAINT club_ladder_favorite_routes_pkey PRIMARY KEY (team_id, route_slug);


--
-- Name: club_ladder_fixture_signups club_ladder_fixture_signups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_ladder_fixture_signups
    ADD CONSTRAINT club_ladder_fixture_signups_pkey PRIMARY KEY (fixture_id, zwift_id);


--
-- Name: club_ladder_match_riders club_ladder_match_riders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_ladder_match_riders
    ADD CONSTRAINT club_ladder_match_riders_pkey PRIMARY KEY (result_id, "position");


--
-- Name: club_ladder_matches club_ladder_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_ladder_matches
    ADD CONSTRAINT club_ladder_matches_pkey PRIMARY KEY (result_id);


--
-- Name: club_modules club_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_modules
    ADD CONSTRAINT club_modules_pkey PRIMARY KEY (module_key);


--
-- Name: club_settings club_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_settings
    ADD CONSTRAINT club_settings_pkey PRIMARY KEY (id);


--
-- Name: club_stories club_stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_stories
    ADD CONSTRAINT club_stories_pkey PRIMARY KEY (id);


--
-- Name: club_story_photos club_story_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_story_photos
    ADD CONSTRAINT club_story_photos_pkey PRIMARY KEY (id);


--
-- Name: cols cols_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cols
    ADD CONSTRAINT cols_pkey PRIMARY KEY (slug);


--
-- Name: community_role_permissions community_role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_role_permissions
    ADD CONSTRAINT community_role_permissions_pkey PRIMARY KEY (role);


--
-- Name: event_chat_messages event_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_chat_messages
    ADD CONSTRAINT event_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: event_climbs event_climbs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_climbs
    ADD CONSTRAINT event_climbs_pkey PRIMARY KEY (id);


--
-- Name: event_links event_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_links
    ADD CONSTRAINT event_links_pkey PRIMARY KEY (id);


--
-- Name: event_pacing_generations event_pacing_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_pacing_generations
    ADD CONSTRAINT event_pacing_generations_pkey PRIMARY KEY (id);


--
-- Name: event_pacing_plans event_pacing_plans_event_id_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_pacing_plans
    ADD CONSTRAINT event_pacing_plans_event_id_profile_id_key UNIQUE (event_id, profile_id);


--
-- Name: event_pacing_plans event_pacing_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_pacing_plans
    ADD CONSTRAINT event_pacing_plans_pkey PRIMARY KEY (id);


--
-- Name: event_photos event_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_photos
    ADD CONSTRAINT event_photos_pkey PRIMARY KEY (id);


--
-- Name: event_pois event_pois_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_pois
    ADD CONSTRAINT event_pois_pkey PRIMARY KEY (id);


--
-- Name: event_program_links event_program_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_program_links
    ADD CONSTRAINT event_program_links_pkey PRIMARY KEY (program_id, event_id);


--
-- Name: event_programs event_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_programs
    ADD CONSTRAINT event_programs_pkey PRIMARY KEY (id);


--
-- Name: event_programs event_programs_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_programs
    ADD CONSTRAINT event_programs_slug_key UNIQUE (slug);


--
-- Name: event_reminder_sends event_reminder_sends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_reminder_sends
    ADD CONSTRAINT event_reminder_sends_pkey PRIMARY KEY (event_id, profile_id, reminder_kind);


--
-- Name: event_report_comments event_report_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_report_comments
    ADD CONSTRAINT event_report_comments_pkey PRIMARY KEY (id);


--
-- Name: event_reports event_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_reports
    ADD CONSTRAINT event_reports_pkey PRIMARY KEY (id);


--
-- Name: event_results event_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_results
    ADD CONSTRAINT event_results_pkey PRIMARY KEY (id);


--
-- Name: event_rsvps event_rsvps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_rsvps
    ADD CONSTRAINT event_rsvps_pkey PRIMARY KEY (event_id, profile_id);


--
-- Name: event_zones event_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_zones
    ADD CONSTRAINT event_zones_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: external_event_candidates external_event_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_event_candidates
    ADD CONSTRAINT external_event_candidates_pkey PRIMARY KEY (id);


--
-- Name: external_event_candidates external_event_candidates_source_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_event_candidates
    ADD CONSTRAINT external_event_candidates_source_external_id_key UNIQUE (source, external_id);


--
-- Name: external_event_participants external_event_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_event_participants
    ADD CONSTRAINT external_event_participants_pkey PRIMARY KEY (id);


--
-- Name: frr_gc_exclusions frr_gc_exclusions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_gc_exclusions
    ADD CONSTRAINT frr_gc_exclusions_pkey PRIMARY KEY (profile_id, tour_id, zwift_id);


--
-- Name: frr_gc_history frr_gc_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_gc_history
    ADD CONSTRAINT frr_gc_history_pkey PRIMARY KEY (tour_id, after_stage, gender_class, zwift_id);


--
-- Name: frr_gc_standings frr_gc_standings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_gc_standings
    ADD CONSTRAINT frr_gc_standings_pkey PRIMARY KEY (tour_id, gender_class, zwift_id);


--
-- Name: frr_slot_entrants frr_slot_entrants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_slot_entrants
    ADD CONSTRAINT frr_slot_entrants_pkey PRIMARY KEY (event_id, zwift_id);


--
-- Name: frr_stage_results frr_stage_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_stage_results
    ADD CONSTRAINT frr_stage_results_pkey PRIMARY KEY (slot_event_id, zwift_id);


--
-- Name: frr_tours frr_tours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_tours
    ADD CONSTRAINT frr_tours_pkey PRIMARY KEY (id);


--
-- Name: frr_tours frr_tours_zwift_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_tours
    ADD CONSTRAINT frr_tours_zwift_tag_key UNIQUE (zwift_tag);


--
-- Name: frr_watch_riders frr_watch_riders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_watch_riders
    ADD CONSTRAINT frr_watch_riders_pkey PRIMARY KEY (profile_id, zwift_id);


--
-- Name: integration_health integration_health_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_health
    ADD CONSTRAINT integration_health_pkey PRIMARY KEY (id);


--
-- Name: integration_notices integration_notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_notices
    ADD CONSTRAINT integration_notices_pkey PRIMARY KEY (id);


--
-- Name: intervals_activities intervals_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervals_activities
    ADD CONSTRAINT intervals_activities_pkey PRIMARY KEY (profile_id, intervals_id);


--
-- Name: intervals_connections intervals_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervals_connections
    ADD CONSTRAINT intervals_connections_pkey PRIMARY KEY (profile_id);


--
-- Name: intervals_strength_muscles intervals_strength_muscles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervals_strength_muscles
    ADD CONSTRAINT intervals_strength_muscles_pkey PRIMARY KEY (profile_id, intervals_id);


--
-- Name: knowledge_messages knowledge_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_messages
    ADD CONSTRAINT knowledge_messages_pkey PRIMARY KEY (id);


--
-- Name: knowledge_threads knowledge_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_threads
    ADD CONSTRAINT knowledge_threads_pkey PRIMARY KEY (id);


--
-- Name: knowledge_topics knowledge_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_topics
    ADD CONSTRAINT knowledge_topics_pkey PRIMARY KEY (slug);


--
-- Name: ladder_pool ladder_pool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ladder_pool
    ADD CONSTRAINT ladder_pool_pkey PRIMARY KEY (profile_id);


--
-- Name: ladder_ranks ladder_ranks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ladder_ranks
    ADD CONSTRAINT ladder_ranks_pkey PRIMARY KEY (zwift_id);


--
-- Name: ladder_roster_riders ladder_roster_riders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ladder_roster_riders
    ADD CONSTRAINT ladder_roster_riders_pkey PRIMARY KEY (roster_entry_id);


--
-- Name: ladder_withdrawn ladder_withdrawn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ladder_withdrawn
    ADD CONSTRAINT ladder_withdrawn_pkey PRIMARY KEY (profile_id);


--
-- Name: live_positions live_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_positions
    ADD CONSTRAINT live_positions_pkey PRIMARY KEY (id);


--
-- Name: live_sessions live_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT live_sessions_pkey PRIMARY KEY (id);


--
-- Name: live_tracker_tokens live_tracker_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_tracker_tokens
    ADD CONSTRAINT live_tracker_tokens_pkey PRIMARY KEY (id);


--
-- Name: live_tracker_tokens live_tracker_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_tracker_tokens
    ADD CONSTRAINT live_tracker_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: maintenance_tips maintenance_tips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_tips
    ADD CONSTRAINT maintenance_tips_pkey PRIMARY KEY (id);


--
-- Name: media_items media_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_items
    ADD CONSTRAINT media_items_pkey PRIMARY KEY (id);


--
-- Name: member_benefits member_benefits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_benefits
    ADD CONSTRAINT member_benefits_pkey PRIMARY KEY (id);


--
-- Name: member_knowledge member_knowledge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_knowledge
    ADD CONSTRAINT member_knowledge_pkey PRIMARY KEY (profile_id);


--
-- Name: member_knowledge_topics member_knowledge_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_knowledge_topics
    ADD CONSTRAINT member_knowledge_topics_pkey PRIMARY KEY (profile_id, topic_slug);


--
-- Name: member_protocol_checks member_protocol_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_protocol_checks
    ADD CONSTRAINT member_protocol_checks_pkey PRIMARY KEY (protocol_id, day, task_key);


--
-- Name: member_protocol_core_sessions member_protocol_core_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_protocol_core_sessions
    ADD CONSTRAINT member_protocol_core_sessions_pkey PRIMARY KEY (protocol_id, intervals_id);


--
-- Name: member_protocols member_protocols_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_protocols
    ADD CONSTRAINT member_protocols_pkey PRIMARY KEY (id);


--
-- Name: member_question_askers member_question_askers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_question_askers
    ADD CONSTRAINT member_question_askers_pkey PRIMARY KEY (question_id, profile_id);


--
-- Name: member_questions member_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_questions
    ADD CONSTRAINT member_questions_pkey PRIMARY KEY (id);


--
-- Name: member_tips member_tips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_tips
    ADD CONSTRAINT member_tips_pkey PRIMARY KEY (id);


--
-- Name: member_zwift_bikes member_zwift_bikes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_zwift_bikes
    ADD CONSTRAINT member_zwift_bikes_pkey PRIMARY KEY (profile_id, part, name);


--
-- Name: mobility_exercises mobility_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_exercises
    ADD CONSTRAINT mobility_exercises_pkey PRIMARY KEY (id);


--
-- Name: mobility_exercises mobility_exercises_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_exercises
    ADD CONSTRAINT mobility_exercises_slug_key UNIQUE (slug);


--
-- Name: mobility_series_items mobility_series_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_series_items
    ADD CONSTRAINT mobility_series_items_pkey PRIMARY KEY (id);


--
-- Name: mobility_series_items mobility_series_items_series_id_sort_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_series_items
    ADD CONSTRAINT mobility_series_items_series_id_sort_order_key UNIQUE (series_id, sort_order);


--
-- Name: mobility_series mobility_series_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_series
    ADD CONSTRAINT mobility_series_pkey PRIMARY KEY (id);


--
-- Name: mobility_series mobility_series_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_series
    ADD CONSTRAINT mobility_series_slug_key UNIQUE (slug);


--
-- Name: mobility_sessions mobility_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_sessions
    ADD CONSTRAINT mobility_sessions_pkey PRIMARY KEY (id);


--
-- Name: mobility_sessions mobility_sessions_profile_id_series_id_completed_on_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_sessions
    ADD CONSTRAINT mobility_sessions_profile_id_series_id_completed_on_key UNIQUE (profile_id, series_id, completed_on);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (profile_id);


--
-- Name: nutrition_foods nutrition_foods_nevo_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_foods
    ADD CONSTRAINT nutrition_foods_nevo_code_key UNIQUE (nevo_code);


--
-- Name: nutrition_foods nutrition_foods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_foods
    ADD CONSTRAINT nutrition_foods_pkey PRIMARY KEY (id);


--
-- Name: nutrition_log_ai_usage nutrition_log_ai_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_log_ai_usage
    ADD CONSTRAINT nutrition_log_ai_usage_pkey PRIMARY KEY (id);


--
-- Name: nutrition_log_ai_usage nutrition_log_ai_usage_response_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_log_ai_usage
    ADD CONSTRAINT nutrition_log_ai_usage_response_id_key UNIQUE (response_id);


--
-- Name: nutrition_log_items nutrition_log_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_log_items
    ADD CONSTRAINT nutrition_log_items_pkey PRIMARY KEY (id);


--
-- Name: nutrition_log_meals nutrition_log_meals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_log_meals
    ADD CONSTRAINT nutrition_log_meals_pkey PRIMARY KEY (id);


--
-- Name: nutrition_log_settings nutrition_log_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_log_settings
    ADD CONSTRAINT nutrition_log_settings_pkey PRIMARY KEY (profile_id);


--
-- Name: nutrition_menu_choices nutrition_menu_choices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_menu_choices
    ADD CONSTRAINT nutrition_menu_choices_pkey PRIMARY KEY (profile_id, day, meal_moment);


--
-- Name: nutrition_products nutrition_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_products
    ADD CONSTRAINT nutrition_products_pkey PRIMARY KEY (barcode);


--
-- Name: nutrition_profiles nutrition_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_profiles
    ADD CONSTRAINT nutrition_profiles_pkey PRIMARY KEY (profile_id);


--
-- Name: nutrition_recipe_ingredients nutrition_recipe_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_recipe_ingredients
    ADD CONSTRAINT nutrition_recipe_ingredients_pkey PRIMARY KEY (id);


--
-- Name: nutrition_recipe_ingredients nutrition_recipe_ingredients_recipe_id_sort_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_recipe_ingredients
    ADD CONSTRAINT nutrition_recipe_ingredients_recipe_id_sort_order_key UNIQUE (recipe_id, sort_order);


--
-- Name: nutrition_recipe_prefs nutrition_recipe_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_recipe_prefs
    ADD CONSTRAINT nutrition_recipe_prefs_pkey PRIMARY KEY (profile_id, recipe_id);


--
-- Name: nutrition_recipes nutrition_recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_recipes
    ADD CONSTRAINT nutrition_recipes_pkey PRIMARY KEY (id);


--
-- Name: nutrition_recipes nutrition_recipes_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_recipes
    ADD CONSTRAINT nutrition_recipes_slug_key UNIQUE (slug);


--
-- Name: nutrition_reminder_sends nutrition_reminder_sends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_reminder_sends
    ADD CONSTRAINT nutrition_reminder_sends_pkey PRIMARY KEY (profile_id, sent_on, kind);


--
-- Name: nutrition_sweat_tests nutrition_sweat_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_sweat_tests
    ADD CONSTRAINT nutrition_sweat_tests_pkey PRIMARY KEY (id);


--
-- Name: omnium_edition_events omnium_edition_events_edition_id_discipline_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_edition_events
    ADD CONSTRAINT omnium_edition_events_edition_id_discipline_key UNIQUE (edition_id, discipline);


--
-- Name: omnium_edition_events omnium_edition_events_edition_id_order_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_edition_events
    ADD CONSTRAINT omnium_edition_events_edition_id_order_index_key UNIQUE (edition_id, order_index);


--
-- Name: omnium_edition_events omnium_edition_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_edition_events
    ADD CONSTRAINT omnium_edition_events_pkey PRIMARY KEY (id);


--
-- Name: omnium_edition_standings omnium_edition_standings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_edition_standings
    ADD CONSTRAINT omnium_edition_standings_pkey PRIMARY KEY (edition_id, rider_id);


--
-- Name: omnium_editions omnium_editions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_editions
    ADD CONSTRAINT omnium_editions_pkey PRIMARY KEY (id);


--
-- Name: omnium_editions omnium_editions_season_id_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_editions
    ADD CONSTRAINT omnium_editions_season_id_number_key UNIQUE (season_id, number);


--
-- Name: omnium_editions omnium_editions_season_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_editions
    ADD CONSTRAINT omnium_editions_season_id_slug_key UNIQUE (season_id, slug);


--
-- Name: omnium_entrants omnium_entrants_edition_event_id_rider_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_entrants
    ADD CONSTRAINT omnium_entrants_edition_event_id_rider_id_key UNIQUE (edition_event_id, rider_id);


--
-- Name: omnium_entrants omnium_entrants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_entrants
    ADD CONSTRAINT omnium_entrants_pkey PRIMARY KEY (id);


--
-- Name: omnium_kit_codes omnium_kit_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_kit_codes
    ADD CONSTRAINT omnium_kit_codes_code_key UNIQUE (code);


--
-- Name: omnium_kit_codes omnium_kit_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_kit_codes
    ADD CONSTRAINT omnium_kit_codes_pkey PRIMARY KEY (id);


--
-- Name: omnium_prize_awards omnium_prize_awards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_prize_awards
    ADD CONSTRAINT omnium_prize_awards_pkey PRIMARY KEY (id);


--
-- Name: omnium_prize_awards omnium_prize_awards_prize_id_edition_id_league_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_prize_awards
    ADD CONSTRAINT omnium_prize_awards_prize_id_edition_id_league_key UNIQUE (prize_id, edition_id, league);


--
-- Name: omnium_prizes omnium_prizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_prizes
    ADD CONSTRAINT omnium_prizes_pkey PRIMARY KEY (id);


--
-- Name: omnium_results omnium_results_edition_event_id_rider_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_results
    ADD CONSTRAINT omnium_results_edition_event_id_rider_id_key UNIQUE (edition_event_id, rider_id);


--
-- Name: omnium_results omnium_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_results
    ADD CONSTRAINT omnium_results_pkey PRIMARY KEY (id);


--
-- Name: omnium_rider_links omnium_rider_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_rider_links
    ADD CONSTRAINT omnium_rider_links_pkey PRIMARY KEY (rider_id);


--
-- Name: omnium_riders omnium_riders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_riders
    ADD CONSTRAINT omnium_riders_pkey PRIMARY KEY (id);


--
-- Name: omnium_season_standings omnium_season_standings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_season_standings
    ADD CONSTRAINT omnium_season_standings_pkey PRIMARY KEY (season_id, rider_id);


--
-- Name: omnium_seasons omnium_seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_seasons
    ADD CONSTRAINT omnium_seasons_pkey PRIMARY KEY (id);


--
-- Name: omnium_seasons omnium_seasons_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_seasons
    ADD CONSTRAINT omnium_seasons_slug_key UNIQUE (slug);


--
-- Name: outdoor_route_suggestions outdoor_route_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outdoor_route_suggestions
    ADD CONSTRAINT outdoor_route_suggestions_pkey PRIMARY KEY (id);


--
-- Name: poll_options poll_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_options
    ADD CONSTRAINT poll_options_pkey PRIMARY KEY (id);


--
-- Name: poll_votes poll_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_pkey PRIMARY KEY (id);


--
-- Name: polls polls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_pkey PRIMARY KEY (id);


--
-- Name: post_comments post_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_pkey PRIMARY KEY (post_id, profile_id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: posts posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_slug_key UNIQUE (slug);


--
-- Name: profile_blocks profile_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_blocks
    ADD CONSTRAINT profile_blocks_pkey PRIMARY KEY (profile_id, z, x, y);


--
-- Name: profile_climbed_cols profile_climbed_cols_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_climbed_cols
    ADD CONSTRAINT profile_climbed_cols_pkey PRIMARY KEY (profile_id, col_slug);


--
-- Name: profile_completed_segments profile_completed_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_completed_segments
    ADD CONSTRAINT profile_completed_segments_pkey PRIMARY KEY (profile_id, segment_slug);


--
-- Name: profile_ftp_history profile_ftp_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_ftp_history
    ADD CONSTRAINT profile_ftp_history_pkey PRIMARY KEY (profile_id, effective_from);


--
-- Name: profile_sport_settings profile_sport_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_sport_settings
    ADD CONSTRAINT profile_sport_settings_pkey PRIMARY KEY (profile_id);


--
-- Name: profile_start_points profile_start_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_start_points
    ADD CONSTRAINT profile_start_points_pkey PRIMARY KEY (id);


--
-- Name: profile_stats_tiles profile_stats_tiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_stats_tiles
    ADD CONSTRAINT profile_stats_tiles_pkey PRIMARY KEY (profile_id);


--
-- Name: profile_wellness profile_wellness_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_wellness
    ADD CONSTRAINT profile_wellness_pkey PRIMARY KEY (profile_id, date);


--
-- Name: profile_zwift_blocks profile_zwift_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_zwift_blocks
    ADD CONSTRAINT profile_zwift_blocks_pkey PRIMARY KEY (profile_id, z, x, y);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: race_briefings race_briefings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_briefings
    ADD CONSTRAINT race_briefings_pkey PRIMARY KEY (event_id);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (bucket, key, window_start);


--
-- Name: rider_power_profiles rider_power_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rider_power_profiles
    ADD CONSTRAINT rider_power_profiles_pkey PRIMARY KEY (profile_id);


--
-- Name: roster_entries roster_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roster_entries
    ADD CONSTRAINT roster_entries_pkey PRIMARY KEY (id);


--
-- Name: sponsors sponsors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_pkey PRIMARY KEY (id);


--
-- Name: sponsors sponsors_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_slug_key UNIQUE (slug);


--
-- Name: src_month_entries src_month_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_month_entries
    ADD CONSTRAINT src_month_entries_pkey PRIMARY KEY (month, profile_id);


--
-- Name: src_races src_races_mywhoosh_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_races
    ADD CONSTRAINT src_races_mywhoosh_event_id_key UNIQUE (mywhoosh_event_id);


--
-- Name: src_races src_races_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_races
    ADD CONSTRAINT src_races_pkey PRIMARY KEY (event_id);


--
-- Name: src_races src_races_sunday_gender_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_races
    ADD CONSTRAINT src_races_sunday_gender_key UNIQUE (sunday, gender);


--
-- Name: src_results src_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_results
    ADD CONSTRAINT src_results_pkey PRIMARY KEY (race_event_id, mywhoosh_user_id);


--
-- Name: src_sync_state src_sync_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_sync_state
    ADD CONSTRAINT src_sync_state_pkey PRIMARY KEY (id);


--
-- Name: src_team_results src_team_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_team_results
    ADD CONSTRAINT src_team_results_pkey PRIMARY KEY (race_event_id, category, mywhoosh_team_id);


--
-- Name: strava_activities strava_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_activities
    ADD CONSTRAINT strava_activities_pkey PRIMARY KEY (id);


--
-- Name: strava_activity_dismissals strava_activity_dismissals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_activity_dismissals
    ADD CONSTRAINT strava_activity_dismissals_pkey PRIMARY KEY (profile_id, activity_id);


--
-- Name: strava_activity_summaries strava_activity_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_activity_summaries
    ADD CONSTRAINT strava_activity_summaries_pkey PRIMARY KEY (activity_id);


--
-- Name: strava_api_usage strava_api_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_api_usage
    ADD CONSTRAINT strava_api_usage_pkey PRIMARY KEY (id);


--
-- Name: strava_bikes strava_bikes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_bikes
    ADD CONSTRAINT strava_bikes_pkey PRIMARY KEY (id);


--
-- Name: strava_connections strava_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_connections
    ADD CONSTRAINT strava_connections_pkey PRIMARY KEY (profile_id);


--
-- Name: strava_connections strava_connections_strava_athlete_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_connections
    ADD CONSTRAINT strava_connections_strava_athlete_id_key UNIQUE (strava_athlete_id);


--
-- Name: strava_webhook_events strava_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_webhook_events
    ADD CONSTRAINT strava_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: strava_webhook_subscriptions strava_webhook_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_webhook_subscriptions
    ADD CONSTRAINT strava_webhook_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: symptom_logs symptom_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.symptom_logs
    ADD CONSTRAINT symptom_logs_pkey PRIMARY KEY (id);


--
-- Name: team_event_availability team_event_availability_event_id_team_id_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_event_availability
    ADD CONSTRAINT team_event_availability_event_id_team_id_profile_id_key UNIQUE (event_id, team_id, profile_id);


--
-- Name: team_event_availability team_event_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_event_availability
    ADD CONSTRAINT team_event_availability_pkey PRIMARY KEY (id);


--
-- Name: team_event_lineups team_event_lineups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_event_lineups
    ADD CONSTRAINT team_event_lineups_pkey PRIMARY KEY (id);


--
-- Name: team_event_lineups team_event_lineups_rider_per_team; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_event_lineups
    ADD CONSTRAINT team_event_lineups_rider_per_team UNIQUE (event_id, parent_team_id, team_id, profile_id);


--
-- Name: team_member_seed_overrides team_member_seed_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_member_seed_overrides
    ADD CONSTRAINT team_member_seed_overrides_pkey PRIMARY KEY (team_id, profile_id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (team_id, profile_id);


--
-- Name: team_racepasses team_racepasses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_racepasses
    ADD CONSTRAINT team_racepasses_pkey PRIMARY KEY (id);


--
-- Name: team_racepasses team_racepasses_team_id_season_round_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_racepasses
    ADD CONSTRAINT team_racepasses_team_id_season_round_key UNIQUE (team_id, season, round);


--
-- Name: team_result_sources team_result_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_result_sources
    ADD CONSTRAINT team_result_sources_pkey PRIMARY KEY (id);


--
-- Name: team_results team_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_results
    ADD CONSTRAINT team_results_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: telegram_links telegram_links_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_links
    ADD CONSTRAINT telegram_links_chat_id_key UNIQUE (chat_id);


--
-- Name: telegram_links telegram_links_link_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_links
    ADD CONSTRAINT telegram_links_link_token_hash_key UNIQUE (link_token_hash);


--
-- Name: telegram_links telegram_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_links
    ADD CONSTRAINT telegram_links_pkey PRIMARY KEY (profile_id);


--
-- Name: training_adaptation_runs training_adaptation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_adaptation_runs
    ADD CONSTRAINT training_adaptation_runs_pkey PRIMARY KEY (id);


--
-- Name: training_ai_generations training_ai_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_ai_generations
    ADD CONSTRAINT training_ai_generations_pkey PRIMARY KEY (id);


--
-- Name: training_ai_prompts training_ai_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_ai_prompts
    ADD CONSTRAINT training_ai_prompts_pkey PRIMARY KEY (hash);


--
-- Name: training_availability training_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_availability
    ADD CONSTRAINT training_availability_pkey PRIMARY KEY (id);


--
-- Name: training_chat_messages training_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_chat_messages
    ADD CONSTRAINT training_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: training_coach_assignments training_coach_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_coach_assignments
    ADD CONSTRAINT training_coach_assignments_pkey PRIMARY KEY (id);


--
-- Name: training_engine_comparisons training_engine_comparisons_generation_id_trainer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_engine_comparisons
    ADD CONSTRAINT training_engine_comparisons_generation_id_trainer_id_key UNIQUE (generation_id, trainer_id);


--
-- Name: training_engine_comparisons training_engine_comparisons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_engine_comparisons
    ADD CONSTRAINT training_engine_comparisons_pkey PRIMARY KEY (id);


--
-- Name: training_ftp_tests training_ftp_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_ftp_tests
    ADD CONSTRAINT training_ftp_tests_pkey PRIMARY KEY (id);


--
-- Name: training_goal_forecasts training_goal_forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_goal_forecasts
    ADD CONSTRAINT training_goal_forecasts_pkey PRIMARY KEY (id);


--
-- Name: training_goals training_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_goals
    ADD CONSTRAINT training_goals_pkey PRIMARY KEY (id);


--
-- Name: training_plans training_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_plans
    ADD CONSTRAINT training_plans_pkey PRIMARY KEY (id);


--
-- Name: training_preferences training_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_preferences
    ADD CONSTRAINT training_preferences_pkey PRIMARY KEY (id);


--
-- Name: training_replan_requests training_replan_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_replan_requests
    ADD CONSTRAINT training_replan_requests_pkey PRIMARY KEY (profile_id);


--
-- Name: training_season_periods training_season_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_season_periods
    ADD CONSTRAINT training_season_periods_pkey PRIMARY KEY (id);


--
-- Name: training_season_targets training_season_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_season_targets
    ADD CONSTRAINT training_season_targets_pkey PRIMARY KEY (id);


--
-- Name: training_workout_reports training_workout_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workout_reports
    ADD CONSTRAINT training_workout_reports_pkey PRIMARY KEY (id);


--
-- Name: training_workout_templates training_workout_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workout_templates
    ADD CONSTRAINT training_workout_templates_pkey PRIMARY KEY (id);


--
-- Name: training_workouts training_workouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workouts
    ADD CONSTRAINT training_workouts_pkey PRIMARY KEY (id);


--
-- Name: ttt_plan_riders ttt_plan_riders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ttt_plan_riders
    ADD CONSTRAINT ttt_plan_riders_pkey PRIMARY KEY (id);


--
-- Name: ttt_plans ttt_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ttt_plans
    ADD CONSTRAINT ttt_plans_pkey PRIMARY KEY (id);


--
-- Name: weekly_reviews weekly_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_reviews
    ADD CONSTRAINT weekly_reviews_pkey PRIMARY KEY (profile_id, week_start);


--
-- Name: whatsapp_groups whatsapp_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_groups
    ADD CONSTRAINT whatsapp_groups_pkey PRIMARY KEY (id);


--
-- Name: wtrl_team_riders wtrl_team_riders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wtrl_team_riders
    ADD CONSTRAINT wtrl_team_riders_pkey PRIMARY KEY (trc_ref, zwift_id);


--
-- Name: wtrl_teams wtrl_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wtrl_teams
    ADD CONSTRAINT wtrl_teams_pkey PRIMARY KEY (trc_ref);


--
-- Name: zrl_race_snapshots zrl_race_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zrl_race_snapshots
    ADD CONSTRAINT zrl_race_snapshots_pkey PRIMARY KEY (zwift_event_id);


--
-- Name: zrl_rider_results zrl_rider_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zrl_rider_results
    ADD CONSTRAINT zrl_rider_results_pkey PRIMARY KEY (id);


--
-- Name: zrl_team_assignments zrl_team_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zrl_team_assignments
    ADD CONSTRAINT zrl_team_assignments_pkey PRIMARY KEY (league_key, zwift_id);


--
-- Name: zrl_team_results zrl_team_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zrl_team_results
    ADD CONSTRAINT zrl_team_results_pkey PRIMARY KEY (event_id);


--
-- Name: zwb_ds_budget zwb_ds_budget_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwb_ds_budget
    ADD CONSTRAINT zwb_ds_budget_pkey PRIMARY KEY (id);


--
-- Name: zwb_ds_rider_states zwb_ds_rider_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwb_ds_rider_states
    ADD CONSTRAINT zwb_ds_rider_states_pkey PRIMARY KEY (zwift_id);


--
-- Name: zwb_segment_maps zwb_segment_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwb_segment_maps
    ADD CONSTRAINT zwb_segment_maps_pkey PRIMARY KEY (id);


--
-- Name: zwb_segments zwb_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwb_segments
    ADD CONSTRAINT zwb_segments_pkey PRIMARY KEY (slug);


--
-- Name: zwb_segments zwb_segments_strava_segment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwb_segments
    ADD CONSTRAINT zwb_segments_strava_segment_id_key UNIQUE (strava_segment_id);


--
-- Name: zwbeker_congrats zwbeker_congrats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbeker_congrats
    ADD CONSTRAINT zwbeker_congrats_pkey PRIMARY KEY (id);


--
-- Name: zwbeker_winners zwbeker_winners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbeker_winners
    ADD CONSTRAINT zwbeker_winners_pkey PRIMARY KEY (beker_id, profile_id);


--
-- Name: zwbekers zwbekers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbekers
    ADD CONSTRAINT zwbekers_pkey PRIMARY KEY (id);


--
-- Name: zwbgame_preferences zwbgame_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbgame_preferences
    ADD CONSTRAINT zwbgame_preferences_pkey PRIMARY KEY (profile_id);


--
-- Name: zwbgame_riders zwbgame_riders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbgame_riders
    ADD CONSTRAINT zwbgame_riders_pkey PRIMARY KEY (profile_id);


--
-- Name: zwbgame_roster_exclusions zwbgame_roster_exclusions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbgame_roster_exclusions
    ADD CONSTRAINT zwbgame_roster_exclusions_pkey PRIMARY KEY (roster_id);


--
-- Name: zwbriljant_preferences zwbriljant_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbriljant_preferences
    ADD CONSTRAINT zwbriljant_preferences_pkey PRIMARY KEY (profile_id);


--
-- Name: zwbriljant_snapshots zwbriljant_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbriljant_snapshots
    ADD CONSTRAINT zwbriljant_snapshots_pkey PRIMARY KEY (profile_id, week);


--
-- Name: zwift_bike_parts zwift_bike_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwift_bike_parts
    ADD CONSTRAINT zwift_bike_parts_pkey PRIMARY KEY (id);


--
-- Name: zwift_bike_parts zwift_bike_parts_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwift_bike_parts
    ADD CONSTRAINT zwift_bike_parts_unique UNIQUE (part, name, test_frame, stage);


--
-- Name: zwift_events zwift_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwift_events
    ADD CONSTRAINT zwift_events_pkey PRIMARY KEY (event_id);


--
-- Name: zwift_legacy_velo zwift_legacy_velo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwift_legacy_velo
    ADD CONSTRAINT zwift_legacy_velo_pkey PRIMARY KEY (zwift_id);


--
-- Name: zwift_race_score_sync zwift_race_score_sync_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwift_race_score_sync
    ADD CONSTRAINT zwift_race_score_sync_pkey PRIMARY KEY (zwift_id);


--
-- Name: zwift_race_scores zwift_race_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwift_race_scores
    ADD CONSTRAINT zwift_race_scores_pkey PRIMARY KEY (zwift_id, activity_id);


--
-- Name: zwift_rider_metrics zwift_rider_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwift_rider_metrics
    ADD CONSTRAINT zwift_rider_metrics_pkey PRIMARY KEY (zwift_id);


--
-- Name: zwift_routes zwift_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwift_routes
    ADD CONSTRAINT zwift_routes_pkey PRIMARY KEY (route_id);


--
-- Name: zwift_segment_bests zwift_segment_bests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwift_segment_bests
    ADD CONSTRAINT zwift_segment_bests_pkey PRIMARY KEY (zwift_id, segment_id);


--
-- Name: achievement_awards_milestone_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX achievement_awards_milestone_unique_idx ON public.achievement_awards USING btree (badge_id, profile_id) WHERE (award_scope = 'milestone'::text);


--
-- Name: achievement_awards_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX achievement_awards_period_idx ON public.achievement_awards USING btree (period_start DESC, badge_id);


--
-- Name: achievement_awards_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX achievement_awards_profile_idx ON public.achievement_awards USING btree (profile_id, awarded_at DESC);


--
-- Name: achievement_awards_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX achievement_awards_unique_idx ON public.achievement_awards USING btree (badge_id, profile_id, period_start);


--
-- Name: achievement_badges_code_tier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX achievement_badges_code_tier_idx ON public.achievement_badges USING btree (achievement_code, tier);


--
-- Name: achievement_badges_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX achievement_badges_sort_idx ON public.achievement_badges USING btree (sort_order);


--
-- Name: ai_jobs_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_jobs_created_idx ON public.ai_jobs USING btree (created_at);


--
-- Name: ai_usage_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_usage_created_idx ON public.ai_usage USING btree (created_at);


--
-- Name: ai_usage_profile_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_usage_profile_created_idx ON public.ai_usage USING btree (profile_id, created_at);


--
-- Name: announcements_pinned_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX announcements_pinned_created_at_idx ON public.announcements USING btree (pinned DESC, created_at DESC);


--
-- Name: app_updates_publish_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_updates_publish_idx ON public.app_updates USING btree (publish_at DESC);


--
-- Name: audit_log_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_created_idx ON public.audit_log USING btree (created_at DESC);


--
-- Name: audit_log_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_entity_idx ON public.audit_log USING btree (entity, entity_id);


--
-- Name: bike_components_bike_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bike_components_bike_idx ON public.bike_components USING btree (bike_id);


--
-- Name: bike_components_profile_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bike_components_profile_status_idx ON public.bike_components USING btree (profile_id, status);


--
-- Name: birthday_messages_target_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX birthday_messages_target_year_idx ON public.birthday_messages USING btree (birthday_profile_id, celebration_year, created_at);


--
-- Name: birthday_photos_target_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX birthday_photos_target_year_idx ON public.birthday_photos USING btree (birthday_profile_id, celebration_year, created_at DESC);


--
-- Name: birthday_ride_rsvps_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX birthday_ride_rsvps_target_idx ON public.birthday_ride_rsvps USING btree (birthday_profile_id, celebration_year);


--
-- Name: bokaal_bets_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bokaal_bets_player ON public.bokaal_bets USING btree (profile_id, season);


--
-- Name: bokaal_bets_race; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bokaal_bets_race ON public.bokaal_bets USING btree (race_id);


--
-- Name: bokaal_bonus_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bokaal_bonus_player ON public.bokaal_bonus_answers USING btree (profile_id, season);


--
-- Name: bokaal_races_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bokaal_races_board ON public.bokaal_races USING btree (status, starts_at);


--
-- Name: club_ladder_matches_raced_on_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX club_ladder_matches_raced_on_idx ON public.club_ladder_matches USING btree (raced_on DESC);


--
-- Name: club_stories_beker_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX club_stories_beker_idx ON public.club_stories USING btree (beker_id) WHERE (beker_id IS NOT NULL);


--
-- Name: club_stories_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX club_stories_open_idx ON public.club_stories USING btree (created_at) WHERE (status = 'ingestuurd'::text);


--
-- Name: club_stories_placed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX club_stories_placed_idx ON public.club_stories USING btree (chapter, happened_year, created_at) WHERE (status = 'geplaatst'::text);


--
-- Name: club_stories_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX club_stories_profile_idx ON public.club_stories USING btree (profile_id, created_at DESC);


--
-- Name: club_story_photos_story_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX club_story_photos_story_idx ON public.club_story_photos USING btree (story_id, "position");


--
-- Name: cols_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cols_country_idx ON public.cols USING btree (country);


--
-- Name: cols_region_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cols_region_idx ON public.cols USING btree (region);


--
-- Name: community_role_permissions_permissions_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX community_role_permissions_permissions_idx ON public.community_role_permissions USING gin (permissions);


--
-- Name: event_chat_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_chat_event_idx ON public.event_chat_messages USING btree (event_id, created_at);


--
-- Name: event_climbs_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_climbs_event_idx ON public.event_climbs USING btree (event_id, "position");


--
-- Name: event_links_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_links_event_idx ON public.event_links USING btree (event_id, "position");


--
-- Name: event_pacing_generations_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_pacing_generations_lookup_idx ON public.event_pacing_generations USING btree (profile_id, event_id, created_at DESC);


--
-- Name: event_pacing_plans_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_pacing_plans_event_idx ON public.event_pacing_plans USING btree (event_id);


--
-- Name: event_pacing_plans_shared_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_pacing_plans_shared_idx ON public.event_pacing_plans USING btree (event_id) WHERE shared;


--
-- Name: event_photos_event_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_photos_event_created_idx ON public.event_photos USING btree (event_id, created_at DESC);


--
-- Name: event_photos_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_photos_profile_idx ON public.event_photos USING btree (profile_id, created_at DESC);


--
-- Name: event_pois_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_pois_event_idx ON public.event_pois USING btree (event_id);


--
-- Name: event_program_links_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_program_links_event_idx ON public.event_program_links USING btree (event_id);


--
-- Name: event_report_comments_report_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_report_comments_report_idx ON public.event_report_comments USING btree (report_id, created_at);


--
-- Name: event_reports_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_reports_event_idx ON public.event_reports USING btree (event_id, created_at DESC);


--
-- Name: event_reports_event_profile_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX event_reports_event_profile_key ON public.event_reports USING btree (event_id, profile_id);


--
-- Name: event_reports_recent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_reports_recent_idx ON public.event_reports USING btree (created_at DESC);


--
-- Name: event_results_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_results_event_idx ON public.event_results USING btree (event_id, "position");


--
-- Name: event_zones_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_zones_event_idx ON public.event_zones USING btree (event_id, "position");


--
-- Name: events_club_ladder_fixture_team; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX events_club_ladder_fixture_team ON public.events USING btree (club_ladder_fixture_id, team_id) WHERE (club_ladder_fixture_id IS NOT NULL);


--
-- Name: events_frr_stage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX events_frr_stage_idx ON public.events USING btree (frr_tour_id, frr_stage) WHERE ((frr_tour_id IS NOT NULL) AND (frr_stage IS NOT NULL) AND (zwift_event_id IS NULL));


--
-- Name: events_frr_tour_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX events_frr_tour_event_idx ON public.events USING btree (frr_tour_id) WHERE ((frr_tour_id IS NOT NULL) AND (frr_stage IS NULL) AND (zwift_event_id IS NULL));


--
-- Name: events_frr_tour_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_frr_tour_idx ON public.events USING btree (frr_tour_id) WHERE (frr_tour_id IS NOT NULL);


--
-- Name: events_parent_event_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_parent_event_id_idx ON public.events USING btree (parent_event_id) WHERE (parent_event_id IS NOT NULL);


--
-- Name: events_src_sunday_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX events_src_sunday_idx ON public.events USING btree (src_sunday) WHERE ((src_sunday IS NOT NULL) AND (parent_event_id IS NULL));


--
-- Name: events_start_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_start_at_idx ON public.events USING btree (start_at);


--
-- Name: events_team_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_team_id_idx ON public.events USING btree (team_id);


--
-- Name: events_team_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_team_start_idx ON public.events USING btree (team_id, start_at);


--
-- Name: events_zwift_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_zwift_event_idx ON public.events USING btree (zwift_event_id) WHERE (zwift_event_id IS NOT NULL);


--
-- Name: external_event_candidates_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX external_event_candidates_start_idx ON public.external_event_candidates USING btree (start_at);


--
-- Name: external_event_candidates_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX external_event_candidates_status_idx ON public.external_event_candidates USING btree (ignored_at, published_at, start_at);


--
-- Name: external_event_participants_candidate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX external_event_participants_candidate_idx ON public.external_event_participants USING btree (candidate_id);


--
-- Name: external_event_participants_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX external_event_participants_profile_idx ON public.external_event_participants USING btree (profile_id);


--
-- Name: external_event_participants_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX external_event_participants_unique_idx ON public.external_event_participants USING btree (candidate_id, lower(external_name), COALESCE(category, ''::text));


--
-- Name: frr_gc_history_zwift_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX frr_gc_history_zwift_idx ON public.frr_gc_history USING btree (tour_id, zwift_id);


--
-- Name: frr_gc_standings_zwift_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX frr_gc_standings_zwift_idx ON public.frr_gc_standings USING btree (tour_id, zwift_id);


--
-- Name: frr_slot_entrants_zwift_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX frr_slot_entrants_zwift_idx ON public.frr_slot_entrants USING btree (zwift_id);


--
-- Name: frr_stage_results_tour_zwift_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX frr_stage_results_tour_zwift_idx ON public.frr_stage_results USING btree (tour_id, zwift_id);


--
-- Name: integration_health_source_checked_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integration_health_source_checked_idx ON public.integration_health USING btree (source, checked_at DESC);


--
-- Name: integration_notices_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integration_notices_open_idx ON public.integration_notices USING btree (profile_id) WHERE ((seen_at IS NULL) AND (resolved_at IS NULL));


--
-- Name: integration_notices_profile_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integration_notices_profile_created_idx ON public.integration_notices USING btree (profile_id, integration, created_at DESC);


--
-- Name: intervals_activities_profile_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX intervals_activities_profile_date_idx ON public.intervals_activities USING btree (profile_id, start_date_local DESC);


--
-- Name: intervals_connections_last_synced_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX intervals_connections_last_synced_idx ON public.intervals_connections USING btree (last_synced_at NULLS FIRST);


--
-- Name: knowledge_messages_thread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX knowledge_messages_thread_idx ON public.knowledge_messages USING btree (thread_id, created_at);


--
-- Name: knowledge_threads_asker_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX knowledge_threads_asker_idx ON public.knowledge_threads USING btree (asker_id, last_message_at DESC);


--
-- Name: knowledge_threads_expert_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX knowledge_threads_expert_idx ON public.knowledge_threads USING btree (expert_id, last_message_at DESC);


--
-- Name: knowledge_topics_label_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX knowledge_topics_label_idx ON public.knowledge_topics USING btree (lower(btrim(label)));


--
-- Name: ladder_roster_riders_team_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ladder_roster_riders_team_idx ON public.ladder_roster_riders USING btree (team_id);


--
-- Name: live_positions_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_positions_recorded_at ON public.live_positions USING btree (recorded_at);


--
-- Name: live_positions_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_positions_session_idx ON public.live_positions USING btree (session_id, recorded_at);


--
-- Name: live_sessions_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_sessions_active_idx ON public.live_sessions USING btree (last_seen_at) WHERE (ended_at IS NULL);


--
-- Name: live_sessions_external_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_sessions_external_open_idx ON public.live_sessions USING btree (source, started_at) WHERE ((ended_at IS NULL) AND (source = ANY (ARRAY['garmin'::text, 'wahoo'::text])));


--
-- Name: live_sessions_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_sessions_profile_idx ON public.live_sessions USING btree (profile_id, started_at DESC);


--
-- Name: live_sessions_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_sessions_source_idx ON public.live_sessions USING btree (source, profile_id, started_at DESC);


--
-- Name: live_tracker_tokens_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_tracker_tokens_profile_idx ON public.live_tracker_tokens USING btree (profile_id, created_at DESC);


--
-- Name: live_tracker_tokens_wahoo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_tracker_tokens_wahoo_idx ON public.live_tracker_tokens USING btree (profile_id) WHERE ((provider = 'wahoo_link'::text) AND enabled AND (revoked_at IS NULL));


--
-- Name: maintenance_tips_component_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX maintenance_tips_component_idx ON public.maintenance_tips USING btree (component_type, status);


--
-- Name: maintenance_tips_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX maintenance_tips_profile_idx ON public.maintenance_tips USING btree (profile_id);


--
-- Name: media_items_external_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX media_items_external_unique_idx ON public.media_items USING btree (source, external_id) WHERE (external_id IS NOT NULL);


--
-- Name: media_items_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_items_kind_idx ON public.media_items USING btree (kind, published_at DESC);


--
-- Name: media_items_pinned_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_items_pinned_idx ON public.media_items USING btree (pinned DESC, published_at DESC);


--
-- Name: media_items_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_items_published_idx ON public.media_items USING btree (published_at DESC);


--
-- Name: member_benefits_active_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_benefits_active_order_idx ON public.member_benefits USING btree (active, display_order);


--
-- Name: member_knowledge_topics_topic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_knowledge_topics_topic_idx ON public.member_knowledge_topics USING btree (topic_slug);


--
-- Name: member_protocols_one_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX member_protocols_one_active_idx ON public.member_protocols USING btree (profile_id, protocol_slug) WHERE (status = 'actief'::text);


--
-- Name: member_protocols_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_protocols_profile_idx ON public.member_protocols USING btree (profile_id, start_date);


--
-- Name: member_question_askers_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_question_askers_profile_idx ON public.member_question_askers USING btree (profile_id);


--
-- Name: member_questions_activity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_questions_activity_idx ON public.member_questions USING btree (activity_at DESC);


--
-- Name: member_questions_faq_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_questions_faq_idx ON public.member_questions USING btree (asked_count DESC, faq_at) WHERE (faq_at IS NOT NULL);


--
-- Name: member_questions_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_questions_open_idx ON public.member_questions USING btree (created_at) WHERE (answered_at IS NULL);


--
-- Name: member_questions_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_questions_profile_idx ON public.member_questions USING btree (profile_id, created_at DESC);


--
-- Name: member_tips_col_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_tips_col_idx ON public.member_tips USING btree (col_slug) WHERE (col_slug IS NOT NULL);


--
-- Name: member_tips_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_tips_event_idx ON public.member_tips USING btree (event_id) WHERE (event_id IS NOT NULL);


--
-- Name: member_tips_message_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX member_tips_message_idx ON public.member_tips USING btree (message_id) WHERE (message_id IS NOT NULL);


--
-- Name: member_tips_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_tips_profile_idx ON public.member_tips USING btree (profile_id, created_at DESC);


--
-- Name: member_tips_topic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_tips_topic_idx ON public.member_tips USING btree (topic_slug, status, created_at DESC);


--
-- Name: mobility_exercises_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_exercises_category_idx ON public.mobility_exercises USING btree (category, region);


--
-- Name: mobility_series_items_series_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_series_items_series_idx ON public.mobility_series_items USING btree (series_id, sort_order);


--
-- Name: mobility_series_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_series_owner_idx ON public.mobility_series USING btree (owner_id, created_at DESC);


--
-- Name: mobility_sessions_profile_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_sessions_profile_date_idx ON public.mobility_sessions USING btree (profile_id, completed_on DESC);


--
-- Name: nutrition_foods_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_foods_name_idx ON public.nutrition_foods USING btree (lower(name_nl));


--
-- Name: nutrition_log_ai_usage_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_log_ai_usage_profile_idx ON public.nutrition_log_ai_usage USING btree (profile_id, used_at DESC);


--
-- Name: nutrition_log_items_meal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_log_items_meal_idx ON public.nutrition_log_items USING btree (meal_id, sort_order);


--
-- Name: nutrition_log_meals_day_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_log_meals_day_idx ON public.nutrition_log_meals USING btree (profile_id, eaten_on);


--
-- Name: nutrition_menu_choices_recipe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_menu_choices_recipe_idx ON public.nutrition_menu_choices USING btree (recipe_id);


--
-- Name: nutrition_recipe_ingredients_recipe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_recipe_ingredients_recipe_idx ON public.nutrition_recipe_ingredients USING btree (recipe_id, sort_order);


--
-- Name: nutrition_recipes_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_recipes_owner_idx ON public.nutrition_recipes USING btree (owner_id, created_at DESC);


--
-- Name: nutrition_recipes_share_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_recipes_share_idx ON public.nutrition_recipes USING btree (share_status) WHERE (share_status IS NOT NULL);


--
-- Name: nutrition_recipes_visibility_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_recipes_visibility_idx ON public.nutrition_recipes USING btree (visibility) WHERE (visibility = 'leden'::text);


--
-- Name: nutrition_sweat_tests_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nutrition_sweat_tests_profile_idx ON public.nutrition_sweat_tests USING btree (profile_id, tested_on DESC);


--
-- Name: omnium_awards_scope_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX omnium_awards_scope_unique ON public.omnium_prize_awards USING btree (prize_id, edition_id, league) NULLS NOT DISTINCT;


--
-- Name: omnium_edition_events_zwift_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX omnium_edition_events_zwift_idx ON public.omnium_edition_events USING btree (zwift_event_id) WHERE (zwift_event_id IS NOT NULL);


--
-- Name: omnium_edition_standings_rank_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX omnium_edition_standings_rank_idx ON public.omnium_edition_standings USING btree (edition_id, league, rank);


--
-- Name: omnium_editions_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX omnium_editions_start_idx ON public.omnium_editions USING btree (starts_at DESC);


--
-- Name: omnium_entrants_league_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX omnium_entrants_league_idx ON public.omnium_entrants USING btree (edition_event_id, league);


--
-- Name: omnium_kit_award_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX omnium_kit_award_unique ON public.omnium_kit_codes USING btree (award_id) WHERE (award_id IS NOT NULL);


--
-- Name: omnium_kit_codes_free_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX omnium_kit_codes_free_idx ON public.omnium_kit_codes USING btree (season_id) WHERE (issued_at IS NULL);


--
-- Name: omnium_prize_awards_rider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX omnium_prize_awards_rider_idx ON public.omnium_prize_awards USING btree (rider_id);


--
-- Name: omnium_prizes_season_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX omnium_prizes_season_idx ON public.omnium_prizes USING btree (season_id, scope, sort_index);


--
-- Name: omnium_results_edition_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX omnium_results_edition_idx ON public.omnium_results USING btree (edition_id, league, points DESC);


--
-- Name: omnium_results_rider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX omnium_results_rider_idx ON public.omnium_results USING btree (rider_id);


--
-- Name: omnium_rider_links_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX omnium_rider_links_profile_idx ON public.omnium_rider_links USING btree (profile_id);


--
-- Name: omnium_riders_merged_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX omnium_riders_merged_idx ON public.omnium_riders USING btree (merged_into_id) WHERE (merged_into_id IS NOT NULL);


--
-- Name: omnium_riders_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX omnium_riders_name_idx ON public.omnium_riders USING btree (name_key);


--
-- Name: omnium_riders_zwift_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX omnium_riders_zwift_idx ON public.omnium_riders USING btree (zwift_id) WHERE (zwift_id IS NOT NULL);


--
-- Name: omnium_season_standings_rank_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX omnium_season_standings_rank_idx ON public.omnium_season_standings USING btree (season_id, league, rank);


--
-- Name: omnium_seasons_current_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX omnium_seasons_current_idx ON public.omnium_seasons USING btree (is_current) WHERE is_current;


--
-- Name: outdoor_route_suggestions_workout_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX outdoor_route_suggestions_workout_idx ON public.outdoor_route_suggestions USING btree (workout_id, score_pct DESC);


--
-- Name: poll_options_poll_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX poll_options_poll_order_idx ON public.poll_options USING btree (poll_id, display_order);


--
-- Name: poll_votes_multi_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX poll_votes_multi_unique ON public.poll_votes USING btree (poll_id, option_id, profile_id);


--
-- Name: poll_votes_poll_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX poll_votes_poll_profile_idx ON public.poll_votes USING btree (poll_id, profile_id);


--
-- Name: polls_active_recent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX polls_active_recent_idx ON public.polls USING btree (active, created_at DESC);


--
-- Name: polls_scope_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX polls_scope_idx ON public.polls USING btree (scope, scope_id, created_at DESC);


--
-- Name: post_comments_post_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_comments_post_id_created_at_idx ON public.post_comments USING btree (post_id, created_at);


--
-- Name: posts_category_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_category_created_at_idx ON public.posts USING btree (category, created_at DESC);


--
-- Name: posts_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_kind_idx ON public.posts USING btree (kind, created_at DESC);


--
-- Name: posts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_status_idx ON public.posts USING btree (status, created_at DESC);


--
-- Name: posts_tags_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_tags_idx ON public.posts USING gin (tags);


--
-- Name: profile_blocks_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_blocks_country_idx ON public.profile_blocks USING btree (profile_id, country);


--
-- Name: profile_blocks_province_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_blocks_province_idx ON public.profile_blocks USING btree (profile_id, province);


--
-- Name: profile_blocks_seen_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_blocks_seen_idx ON public.profile_blocks USING btree (profile_id, first_seen_at);


--
-- Name: profile_blocks_xy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_blocks_xy_idx ON public.profile_blocks USING btree (z, x, y);


--
-- Name: profile_climbed_cols_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_climbed_cols_profile_idx ON public.profile_climbed_cols USING btree (profile_id);


--
-- Name: profile_completed_segments_best_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_completed_segments_best_time_idx ON public.profile_completed_segments USING btree (segment_slug, best_time_seconds);


--
-- Name: profile_completed_segments_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_completed_segments_profile_idx ON public.profile_completed_segments USING btree (profile_id);


--
-- Name: profile_completed_segments_segment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_completed_segments_segment_idx ON public.profile_completed_segments USING btree (segment_slug);


--
-- Name: profile_start_points_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_start_points_profile_idx ON public.profile_start_points USING btree (profile_id, created_at);


--
-- Name: profile_wellness_profile_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_wellness_profile_date_idx ON public.profile_wellness USING btree (profile_id, date DESC);


--
-- Name: profile_zwift_blocks_world_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_zwift_blocks_world_idx ON public.profile_zwift_blocks USING btree (world, profile_id);


--
-- Name: profile_zwift_blocks_xy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_zwift_blocks_xy_idx ON public.profile_zwift_blocks USING btree (z, x, y);


--
-- Name: profiles_community_roles_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_community_roles_idx ON public.profiles USING gin (community_roles);


--
-- Name: profiles_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_pending_idx ON public.profiles USING btree (created_at) WHERE (is_approved = false);


--
-- Name: profiles_region_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_region_idx ON public.profiles USING btree (region);


--
-- Name: push_subscriptions_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX push_subscriptions_profile_idx ON public.push_subscriptions USING btree (profile_id);


--
-- Name: rate_limits_window_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rate_limits_window_idx ON public.rate_limits USING btree (window_start);


--
-- Name: roster_entries_claimed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX roster_entries_claimed_idx ON public.roster_entries USING btree (claimed_by);


--
-- Name: roster_entries_name_lower_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roster_entries_name_lower_idx ON public.roster_entries USING btree (lower(name));


--
-- Name: roster_entries_team_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX roster_entries_team_idx ON public.roster_entries USING btree (team_id);


--
-- Name: sponsors_tier_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sponsors_tier_order_idx ON public.sponsors USING btree (tier, display_order);


--
-- Name: src_month_entries_team_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX src_month_entries_team_idx ON public.src_month_entries USING btree (team_id, month);


--
-- Name: src_results_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX src_results_profile_idx ON public.src_results USING btree (profile_id);


--
-- Name: src_results_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX src_results_user_idx ON public.src_results USING btree (mywhoosh_user_id);


--
-- Name: strava_activities_blocks_todo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_activities_blocks_todo_idx ON public.strava_activities USING btree (profile_id) WHERE (blocks_processed_at IS NULL);


--
-- Name: strava_activities_gps_times_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_activities_gps_times_idx ON public.strava_activities USING btree (profile_id) WHERE (has_gps_times IS TRUE);


--
-- Name: strava_activities_outdoor_ride; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_activities_outdoor_ride ON public.strava_activities USING btree (id) WHERE ((sport_type = 'Ride'::text) AND (NOT trainer));


--
-- Name: strava_activities_part_of_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_activities_part_of_idx ON public.strava_activities USING btree (part_of_activity_id) WHERE (part_of_activity_id IS NOT NULL);


--
-- Name: strava_activities_profile_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_activities_profile_start_idx ON public.strava_activities USING btree (profile_id, start_date);


--
-- Name: strava_activities_profile_week_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_activities_profile_week_idx ON public.strava_activities USING btree (profile_id, achievement_week);


--
-- Name: strava_activities_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_activities_start_date ON public.strava_activities USING btree (start_date DESC);


--
-- Name: strava_activities_week_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_activities_week_idx ON public.strava_activities USING btree (achievement_week);


--
-- Name: strava_activities_zwift_blocks_todo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_activities_zwift_blocks_todo_idx ON public.strava_activities USING btree (profile_id) WHERE ((zwift_blocks_processed_at IS NULL) AND (sport_type = 'VirtualRide'::text));


--
-- Name: strava_activities_zwift_world_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_activities_zwift_world_idx ON public.strava_activities USING btree (zwift_world, profile_id) WHERE (zwift_world IS NOT NULL);


--
-- Name: strava_activity_summaries_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_activity_summaries_profile_idx ON public.strava_activity_summaries USING btree (profile_id, written_at);


--
-- Name: strava_bikes_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_bikes_profile_idx ON public.strava_bikes USING btree (profile_id);


--
-- Name: strava_connections_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_connections_active_idx ON public.strava_connections USING btree (last_synced_at NULLS FIRST) WHERE (revoked_at IS NULL);


--
-- Name: strava_connections_pending_deauth_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_connections_pending_deauth_idx ON public.strava_connections USING btree (revoked_at) WHERE ((revoked_at IS NOT NULL) AND (deauthorized_at IS NULL));


--
-- Name: strava_webhook_events_dedupe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX strava_webhook_events_dedupe_idx ON public.strava_webhook_events USING btree (object_type, object_id, aspect_type, event_time);


--
-- Name: strava_webhook_events_todo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strava_webhook_events_todo_idx ON public.strava_webhook_events USING btree (received_at) WHERE (processed_at IS NULL);


--
-- Name: symptom_logs_profile_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX symptom_logs_profile_date_idx ON public.symptom_logs USING btree (profile_id, log_date);


--
-- Name: team_event_availability_team_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_event_availability_team_event_idx ON public.team_event_availability USING btree (team_id, event_id, status);


--
-- Name: team_event_lineups_event_team_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_event_lineups_event_team_idx ON public.team_event_lineups USING btree (event_id, team_id, slot);


--
-- Name: team_event_lineups_roster_per_team; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX team_event_lineups_roster_per_team ON public.team_event_lineups USING btree (event_id, parent_team_id, team_id, roster_entry_id) WHERE (roster_entry_id IS NOT NULL);


--
-- Name: team_members_profile_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_members_profile_id_idx ON public.team_members USING btree (profile_id);


--
-- Name: team_racepasses_team_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_racepasses_team_idx ON public.team_racepasses USING btree (team_id, valid_from);


--
-- Name: team_result_sources_team_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_result_sources_team_idx ON public.team_result_sources USING btree (team_id);


--
-- Name: team_result_sources_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX team_result_sources_unique_idx ON public.team_result_sources USING btree (team_id, provider, lower(match_name));


--
-- Name: team_results_competition_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_results_competition_idx ON public.team_results USING btree (competition);


--
-- Name: team_results_external_source_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX team_results_external_source_id_idx ON public.team_results USING btree (external_source, external_id) WHERE (external_id IS NOT NULL);


--
-- Name: team_results_team_id_round_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_results_team_id_round_at_idx ON public.team_results USING btree (team_id, round_at DESC);


--
-- Name: teams_graveyard_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teams_graveyard_idx ON public.teams USING btree (is_graveyard);


--
-- Name: teams_mywhoosh_team_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX teams_mywhoosh_team_name_idx ON public.teams USING btree (lower(mywhoosh_team_name)) WHERE (mywhoosh_team_name IS NOT NULL);


--
-- Name: teams_parent_team_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teams_parent_team_idx ON public.teams USING btree (parent_team_id);


--
-- Name: training_adaptation_runs_draft_plan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_adaptation_runs_draft_plan_idx ON public.training_adaptation_runs USING btree (draft_plan_id);


--
-- Name: training_adaptation_runs_profile_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_adaptation_runs_profile_created_idx ON public.training_adaptation_runs USING btree (profile_id, created_at DESC);


--
-- Name: training_adaptation_runs_source_plan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_adaptation_runs_source_plan_idx ON public.training_adaptation_runs USING btree (source_plan_id);


--
-- Name: training_ai_generations_one_daily_per_plan_day; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_ai_generations_one_daily_per_plan_day ON public.training_ai_generations USING btree (parent_plan_id, adapt_from_date) WHERE ((adaptation_kind = 'daily'::text) AND (adapt_from_date >= '2026-09-14'::date));


--
-- Name: training_ai_generations_openai_response_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_ai_generations_openai_response_id_unique ON public.training_ai_generations USING btree (openai_response_id) WHERE (openai_response_id IS NOT NULL);


--
-- Name: training_ai_generations_profile_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_ai_generations_profile_status_idx ON public.training_ai_generations USING btree (profile_id, status, created_at DESC);


--
-- Name: training_availability_default_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_availability_default_unique ON public.training_availability USING btree (profile_id) WHERE (week_start IS NULL);


--
-- Name: training_availability_week_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_availability_week_unique ON public.training_availability USING btree (profile_id, week_start) WHERE (week_start IS NOT NULL);


--
-- Name: training_chat_messages_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_chat_messages_pending_idx ON public.training_chat_messages USING btree (created_at) WHERE (status = 'pending'::text);


--
-- Name: training_chat_messages_plan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_chat_messages_plan_idx ON public.training_chat_messages USING btree (plan_id);


--
-- Name: training_chat_messages_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_chat_messages_profile_idx ON public.training_chat_messages USING btree (profile_id, created_at);


--
-- Name: training_coach_assignments_active_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_coach_assignments_active_unique ON public.training_coach_assignments USING btree (athlete_id, trainer_id) WHERE (status = 'active'::text);


--
-- Name: training_coach_assignments_trainer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_coach_assignments_trainer_idx ON public.training_coach_assignments USING btree (trainer_id, status);


--
-- Name: training_engine_comparisons_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_engine_comparisons_profile_idx ON public.training_engine_comparisons USING btree (profile_id);


--
-- Name: training_engine_comparisons_trainer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_engine_comparisons_trainer_idx ON public.training_engine_comparisons USING btree (trainer_id, created_at DESC);


--
-- Name: training_ftp_tests_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_ftp_tests_profile_idx ON public.training_ftp_tests USING btree (profile_id, tested_on DESC);


--
-- Name: training_ftp_tests_workout_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_ftp_tests_workout_unique ON public.training_ftp_tests USING btree (workout_id) WHERE (workout_id IS NOT NULL);


--
-- Name: training_goal_forecasts_goal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_goal_forecasts_goal_idx ON public.training_goal_forecasts USING btree (goal_id, computed_at DESC);


--
-- Name: training_goals_profile_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_goals_profile_status_idx ON public.training_goals USING btree (profile_id, status, target_date);


--
-- Name: training_plans_ai_generation_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_plans_ai_generation_id_unique ON public.training_plans USING btree (ai_generation_id) WHERE (ai_generation_id IS NOT NULL);


--
-- Name: training_plans_parent_plan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_plans_parent_plan_idx ON public.training_plans USING btree (parent_plan_id);


--
-- Name: training_plans_profile_root_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_plans_profile_root_idx ON public.training_plans USING btree (profile_id, root_plan_id);


--
-- Name: training_plans_profile_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_plans_profile_status_idx ON public.training_plans USING btree (profile_id, status, start_date DESC);


--
-- Name: training_plans_root_plan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_plans_root_plan_idx ON public.training_plans USING btree (root_plan_id);


--
-- Name: training_preferences_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_preferences_profile_idx ON public.training_preferences USING btree (profile_id, created_at);


--
-- Name: training_replan_requests_requested_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_replan_requests_requested_idx ON public.training_replan_requests USING btree (requested_at);


--
-- Name: training_season_periods_range_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_season_periods_range_idx ON public.training_season_periods USING btree (profile_id, start_date, end_date);


--
-- Name: training_season_targets_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_season_targets_date_idx ON public.training_season_targets USING btree (profile_id, target_date);


--
-- Name: training_season_targets_event_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_season_targets_event_unique ON public.training_season_targets USING btree (profile_id, event_id) WHERE (event_id IS NOT NULL);


--
-- Name: training_workout_reports_pending_review_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_workout_reports_pending_review_idx ON public.training_workout_reports USING btree (trainer_id, athlete_confirmed_at) WHERE ((athlete_confirmed_at IS NOT NULL) AND (trainer_reviewed_at IS NULL));


--
-- Name: training_workout_reports_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_workout_reports_profile_idx ON public.training_workout_reports USING btree (profile_id, updated_at DESC);


--
-- Name: training_workout_reports_workout_profile_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_workout_reports_workout_profile_unique ON public.training_workout_reports USING btree (workout_id, profile_id);


--
-- Name: training_workout_templates_form_duration_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_workout_templates_form_duration_idx ON public.training_workout_templates USING btree (form, duration_minutes);


--
-- Name: training_workout_templates_standard_title_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_workout_templates_standard_title_unique ON public.training_workout_templates USING btree (form, title) WHERE is_standard;


--
-- Name: training_workouts_event_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_workouts_event_unique ON public.training_workouts USING btree (profile_id, event_id) WHERE ((event_id IS NOT NULL) AND (superseded_at IS NULL));


--
-- Name: training_workouts_fixed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_workouts_fixed_idx ON public.training_workouts USING btree (profile_id, scheduled_at) WHERE ((origin = ANY (ARRAY['member'::text, 'event'::text])) AND (superseded_at IS NULL));


--
-- Name: training_workouts_intervals_external_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX training_workouts_intervals_external_id_unique ON public.training_workouts USING btree (intervals_external_id) WHERE (intervals_external_id IS NOT NULL);


--
-- Name: training_workouts_plan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_workouts_plan_idx ON public.training_workouts USING btree (plan_id, scheduled_at);


--
-- Name: training_workouts_profile_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_workouts_profile_active_idx ON public.training_workouts USING btree (profile_id, scheduled_at) WHERE (superseded_at IS NULL);


--
-- Name: training_workouts_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_workouts_profile_idx ON public.training_workouts USING btree (profile_id, scheduled_at);


--
-- Name: training_workouts_superseded_by_plan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_workouts_superseded_by_plan_idx ON public.training_workouts USING btree (superseded_by_plan_id);


--
-- Name: training_workouts_test_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX training_workouts_test_idx ON public.training_workouts USING btree (profile_id, scheduled_at) WHERE ((test_type IS NOT NULL) AND (superseded_at IS NULL));


--
-- Name: ttt_plan_riders_plan_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ttt_plan_riders_plan_order_idx ON public.ttt_plan_riders USING btree (plan_id, display_order);


--
-- Name: ttt_plans_share_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ttt_plans_share_token_key ON public.ttt_plans USING btree (share_token) WHERE (share_token IS NOT NULL);


--
-- Name: ttt_plans_team_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ttt_plans_team_event_idx ON public.ttt_plans USING btree (parent_team_id, event_id, updated_at DESC);


--
-- Name: whatsapp_groups_display_order_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX whatsapp_groups_display_order_name_idx ON public.whatsapp_groups USING btree (display_order, name);


--
-- Name: whatsapp_groups_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX whatsapp_groups_event_idx ON public.whatsapp_groups USING btree (event_id);


--
-- Name: whatsapp_groups_team_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX whatsapp_groups_team_idx ON public.whatsapp_groups USING btree (team_id);


--
-- Name: wtrl_team_riders_zwift_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wtrl_team_riders_zwift_id_idx ON public.wtrl_team_riders USING btree (zwift_id);


--
-- Name: wtrl_teams_team_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wtrl_teams_team_id_idx ON public.wtrl_teams USING btree (team_id);


--
-- Name: zrl_rider_results_external_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX zrl_rider_results_external_idx ON public.zrl_rider_results USING btree (external_source, external_id);


--
-- Name: zrl_rider_results_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zrl_rider_results_profile_idx ON public.zrl_rider_results USING btree (profile_id, round_at DESC);


--
-- Name: zrl_rider_results_team_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zrl_rider_results_team_idx ON public.zrl_rider_results USING btree (team_id, round_at DESC);


--
-- Name: zrl_team_results_team_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zrl_team_results_team_id_idx ON public.zrl_team_results USING btree (team_id);


--
-- Name: zwb_ds_rider_states_checked_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwb_ds_rider_states_checked_idx ON public.zwb_ds_rider_states USING btree (checked_at);


--
-- Name: zwb_segment_maps_bounds; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwb_segment_maps_bounds ON public.zwb_segment_maps USING btree (south, north, west, east);


--
-- Name: zwb_segment_maps_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwb_segment_maps_pending ON public.zwb_segment_maps USING btree (geometry_status, geometry_checked_at);


--
-- Name: zwb_segments_collection_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwb_segments_collection_idx ON public.zwb_segments USING btree (collection, active);


--
-- Name: zwb_segments_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwb_segments_country_idx ON public.zwb_segments USING btree (country);


--
-- Name: zwbeker_congrats_beker_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwbeker_congrats_beker_idx ON public.zwbeker_congrats USING btree (beker_id, created_at);


--
-- Name: zwbeker_congrats_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwbeker_congrats_profile_idx ON public.zwbeker_congrats USING btree (profile_id);


--
-- Name: zwbeker_winners_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwbeker_winners_profile_idx ON public.zwbeker_winners USING btree (profile_id);


--
-- Name: zwbekers_kast_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwbekers_kast_idx ON public.zwbekers USING btree (achieved_on DESC) WHERE (status = 'toegekend'::text);


--
-- Name: zwbekers_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwbekers_open_idx ON public.zwbekers USING btree (created_at) WHERE (status = 'voorgedragen'::text);


--
-- Name: zwbekers_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwbekers_profile_idx ON public.zwbekers USING btree (profile_id, created_at DESC);


--
-- Name: zwbriljant_snapshots_week_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwbriljant_snapshots_week_idx ON public.zwbriljant_snapshots USING btree (week DESC);


--
-- Name: zwift_events_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwift_events_start_idx ON public.zwift_events USING btree (event_start);


--
-- Name: zwift_race_scores_rider_day_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwift_race_scores_rider_day_idx ON public.zwift_race_scores USING btree (zwift_id, raced_on DESC);


--
-- Name: zwift_race_scores_rider_raced_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwift_race_scores_rider_raced_idx ON public.zwift_race_scores USING btree (zwift_id, raced_at DESC);


--
-- Name: zwift_rider_metrics_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwift_rider_metrics_updated_idx ON public.zwift_rider_metrics USING btree (updated_at);


--
-- Name: zwift_routes_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwift_routes_slug_idx ON public.zwift_routes USING btree (slug);


--
-- Name: zwift_routes_synced_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwift_routes_synced_idx ON public.zwift_routes USING btree (synced_at NULLS FIRST);


--
-- Name: zwift_segment_bests_fetched_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zwift_segment_bests_fetched_idx ON public.zwift_segment_bests USING btree (fetched_at);


--
-- Name: birthday_rides birthday_rides_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER birthday_rides_set_updated_at BEFORE UPDATE ON public.birthday_rides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_birthday_rides();


--
-- Name: community_role_permissions community_role_permissions_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER community_role_permissions_touch BEFORE INSERT OR UPDATE ON public.community_role_permissions FOR EACH ROW EXECUTE FUNCTION public.touch_community_role_permissions();


--
-- Name: event_reports event_reports_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_reports_touch_updated_at BEFORE UPDATE ON public.event_reports FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: event_rsvps event_rsvps_team_join; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_rsvps_team_join AFTER INSERT OR UPDATE OF status ON public.event_rsvps FOR EACH ROW EXECUTE FUNCTION public.handle_event_rsvp_team_join();


--
-- Name: knowledge_messages knowledge_messages_after_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER knowledge_messages_after_insert AFTER INSERT ON public.knowledge_messages FOR EACH ROW EXECUTE FUNCTION public.knowledge_messages_after_insert();


--
-- Name: knowledge_threads knowledge_threads_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER knowledge_threads_before_insert BEFORE INSERT ON public.knowledge_threads FOR EACH ROW EXECUTE FUNCTION public.knowledge_threads_before_insert();


--
-- Name: knowledge_topics knowledge_topics_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER knowledge_topics_before_insert BEFORE INSERT ON public.knowledge_topics FOR EACH ROW EXECUTE FUNCTION public.knowledge_topics_before_insert();


--
-- Name: member_benefits member_benefits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER member_benefits_updated_at BEFORE UPDATE ON public.member_benefits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_sponsors();


--
-- Name: member_question_askers member_question_askers_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER member_question_askers_before_insert BEFORE INSERT ON public.member_question_askers FOR EACH ROW EXECUTE FUNCTION public.member_question_askers_before_insert();


--
-- Name: member_question_askers member_question_askers_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER member_question_askers_count AFTER INSERT OR DELETE ON public.member_question_askers FOR EACH ROW EXECUTE FUNCTION public.member_question_askers_count();


--
-- Name: member_questions member_questions_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER member_questions_before_insert BEFORE INSERT ON public.member_questions FOR EACH ROW EXECUTE FUNCTION public.member_questions_before_insert();


--
-- Name: member_questions member_questions_before_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER member_questions_before_update BEFORE UPDATE ON public.member_questions FOR EACH ROW EXECUTE FUNCTION public.member_questions_before_update();


--
-- Name: member_tips member_tips_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER member_tips_guard BEFORE UPDATE ON public.member_tips FOR EACH ROW EXECUTE FUNCTION public.member_tips_guard();


--
-- Name: mobility_exercises mobility_exercises_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER mobility_exercises_touch BEFORE UPDATE ON public.mobility_exercises FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: mobility_series_items mobility_series_items_pre_ride_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER mobility_series_items_pre_ride_limit BEFORE INSERT OR UPDATE ON public.mobility_series_items FOR EACH ROW EXECUTE FUNCTION public.mobility_pre_ride_hold_limit();


--
-- Name: mobility_series mobility_series_timing_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER mobility_series_timing_guard BEFORE UPDATE OF timing ON public.mobility_series FOR EACH ROW EXECUTE FUNCTION public.mobility_series_timing_guard();


--
-- Name: mobility_series mobility_series_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER mobility_series_touch BEFORE UPDATE ON public.mobility_series FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: nutrition_log_settings nutrition_log_settings_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER nutrition_log_settings_touch BEFORE UPDATE ON public.nutrition_log_settings FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: nutrition_profiles nutrition_profiles_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER nutrition_profiles_touch BEFORE UPDATE ON public.nutrition_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: nutrition_recipes nutrition_recipes_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER nutrition_recipes_touch BEFORE UPDATE ON public.nutrition_recipes FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: omnium_edition_events omnium_edition_events_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER omnium_edition_events_touch BEFORE UPDATE ON public.omnium_edition_events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: omnium_editions omnium_editions_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER omnium_editions_touch BEFORE UPDATE ON public.omnium_editions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: omnium_edition_events omnium_invalidate_entrants; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER omnium_invalidate_entrants BEFORE UPDATE ON public.omnium_edition_events FOR EACH ROW EXECUTE FUNCTION public.omnium_invalidate_entrants();


--
-- Name: omnium_prize_awards omnium_prize_awards_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER omnium_prize_awards_touch BEFORE UPDATE ON public.omnium_prize_awards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: omnium_prizes omnium_prizes_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER omnium_prizes_touch BEFORE UPDATE ON public.omnium_prizes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: omnium_results omnium_results_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER omnium_results_touch BEFORE UPDATE ON public.omnium_results FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: omnium_riders omnium_riders_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER omnium_riders_touch BEFORE UPDATE ON public.omnium_riders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: omnium_seasons omnium_seasons_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER omnium_seasons_touch BEFORE UPDATE ON public.omnium_seasons FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: polls polls_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER polls_updated_at BEFORE UPDATE ON public.polls FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_polls();


--
-- Name: posts posts_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER posts_touch_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: profile_start_points profile_start_points_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profile_start_points_limit BEFORE INSERT ON public.profile_start_points FOR EACH ROW EXECUTE FUNCTION public.limit_start_points();


--
-- Name: profile_start_points profile_start_points_round; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profile_start_points_round BEFORE INSERT OR UPDATE ON public.profile_start_points FOR EACH ROW EXECUTE FUNCTION public.round_start_point();


--
-- Name: profiles profiles_ftp_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_ftp_history AFTER INSERT OR UPDATE OF ftp_watts ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.record_profile_ftp_history();


--
-- Name: profiles profiles_link_roster_by_zwift_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_link_roster_by_zwift_id AFTER INSERT OR UPDATE OF zwift_id ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_profile_zwift_id_link();


--
-- Name: profiles profiles_protect_admin_fields; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_protect_admin_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_fields();


--
-- Name: rider_power_profiles rider_power_profiles_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER rider_power_profiles_touch BEFORE UPDATE ON public.rider_power_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_team_roster_updated_at();


--
-- Name: roster_entries roster_entries_claim_ladder; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER roster_entries_claim_ladder AFTER UPDATE OF claimed_by ON public.roster_entries FOR EACH ROW EXECUTE FUNCTION public.handle_roster_claim_ladder();


--
-- Name: sponsors sponsors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sponsors_updated_at BEFORE UPDATE ON public.sponsors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_sponsors();


--
-- Name: strava_activities strava_activities_has_gps_times; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER strava_activities_has_gps_times BEFORE INSERT OR UPDATE OF raw ON public.strava_activities FOR EACH ROW EXECUTE FUNCTION public.strava_activities_set_has_gps_times();


--
-- Name: team_event_availability team_event_availability_team_join; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER team_event_availability_team_join AFTER INSERT OR UPDATE OF status ON public.team_event_availability FOR EACH ROW EXECUTE FUNCTION public.handle_team_availability_team_join();


--
-- Name: team_event_availability team_event_availability_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER team_event_availability_touch BEFORE UPDATE ON public.team_event_availability FOR EACH ROW EXECUTE FUNCTION public.touch_team_roster_updated_at();


--
-- Name: team_event_lineups team_event_lineups_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER team_event_lineups_touch BEFORE UPDATE ON public.team_event_lineups FOR EACH ROW EXECUTE FUNCTION public.touch_team_roster_updated_at();


--
-- Name: teams teams_become_umbrella; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER teams_become_umbrella AFTER INSERT OR UPDATE OF parent_team_id ON public.teams FOR EACH ROW EXECUTE FUNCTION public.handle_team_becomes_umbrella();


--
-- Name: intervals_connections touch_intervals_connections; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_intervals_connections BEFORE UPDATE ON public.intervals_connections FOR EACH ROW EXECUTE FUNCTION public.touch_intervals_connections_updated_at();


--
-- Name: training_ai_generations training_ai_generations_store_prompt; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER training_ai_generations_store_prompt BEFORE INSERT OR UPDATE OF prompt_text ON public.training_ai_generations FOR EACH ROW EXECUTE FUNCTION public.training_ai_generations_store_prompt();


--
-- Name: training_ai_generations training_ai_generations_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER training_ai_generations_touch BEFORE UPDATE ON public.training_ai_generations FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: training_coach_assignments training_assignments_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER training_assignments_touch BEFORE UPDATE ON public.training_coach_assignments FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: training_availability training_availability_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER training_availability_touch BEFORE UPDATE ON public.training_availability FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: training_goals training_goals_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER training_goals_touch BEFORE UPDATE ON public.training_goals FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: training_plans training_plans_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER training_plans_touch BEFORE UPDATE ON public.training_plans FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: training_season_periods training_season_periods_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER training_season_periods_touch BEFORE UPDATE ON public.training_season_periods FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: training_season_targets training_season_targets_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER training_season_targets_touch BEFORE UPDATE ON public.training_season_targets FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: training_workout_reports training_workout_reports_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER training_workout_reports_touch BEFORE UPDATE ON public.training_workout_reports FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: training_workout_templates training_workout_templates_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER training_workout_templates_touch BEFORE UPDATE ON public.training_workout_templates FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: training_workouts training_workouts_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER training_workouts_touch BEFORE UPDATE ON public.training_workouts FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: profiles trg_audit_profile_privileges; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_profile_privileges AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_profile_privilege_change();


--
-- Name: community_role_permissions trg_audit_role_permissions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_role_permissions AFTER INSERT OR DELETE OR UPDATE ON public.community_role_permissions FOR EACH ROW EXECUTE FUNCTION public.log_role_permission_change();


--
-- Name: ttt_plan_riders ttt_plan_riders_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ttt_plan_riders_touch BEFORE UPDATE ON public.ttt_plan_riders FOR EACH ROW EXECUTE FUNCTION public.touch_team_roster_updated_at();


--
-- Name: ttt_plans ttt_plans_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ttt_plans_touch BEFORE UPDATE ON public.ttt_plans FOR EACH ROW EXECUTE FUNCTION public.touch_team_roster_updated_at();


--
-- Name: intervals_connections zwbgame_intervals_disconnected; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zwbgame_intervals_disconnected AFTER DELETE OR UPDATE OF athlete_id, api_key ON public.intervals_connections FOR EACH ROW EXECUTE FUNCTION public.zwbgame_disconnect_intervals();


--
-- Name: zwbgame_preferences zwbgame_preferences_changed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zwbgame_preferences_changed BEFORE INSERT OR UPDATE ON public.zwbgame_preferences FOR EACH ROW EXECUTE FUNCTION public.zwbgame_invalidate_rider();


--
-- Name: zwbgame_riders zwbgame_rider_consent; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zwbgame_rider_consent BEFORE INSERT OR UPDATE ON public.zwbgame_riders FOR EACH ROW EXECUTE FUNCTION public.zwbgame_check_rider_consent();


--
-- Name: zwbriljant_preferences zwbriljant_preferences_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zwbriljant_preferences_touch BEFORE UPDATE ON public.zwbriljant_preferences FOR EACH ROW EXECUTE FUNCTION public.touch_training_updated_at();


--
-- Name: achievement_awards achievement_awards_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_awards
    ADD CONSTRAINT achievement_awards_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.achievement_badges(id) ON DELETE CASCADE;


--
-- Name: achievement_awards achievement_awards_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_awards
    ADD CONSTRAINT achievement_awards_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: ai_usage ai_usage_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage
    ADD CONSTRAINT ai_usage_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: announcements announcements_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: app_updates app_updates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_updates
    ADD CONSTRAINT app_updates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: audit_log audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bike_components bike_components_bike_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bike_components
    ADD CONSTRAINT bike_components_bike_id_fkey FOREIGN KEY (bike_id) REFERENCES public.strava_bikes(id) ON DELETE CASCADE;


--
-- Name: bike_components bike_components_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bike_components
    ADD CONSTRAINT bike_components_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: birthday_messages birthday_messages_author_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.birthday_messages
    ADD CONSTRAINT birthday_messages_author_profile_id_fkey FOREIGN KEY (author_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: birthday_messages birthday_messages_birthday_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.birthday_messages
    ADD CONSTRAINT birthday_messages_birthday_profile_id_fkey FOREIGN KEY (birthday_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: birthday_photos birthday_photos_birthday_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.birthday_photos
    ADD CONSTRAINT birthday_photos_birthday_profile_id_fkey FOREIGN KEY (birthday_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: birthday_photos birthday_photos_uploader_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.birthday_photos
    ADD CONSTRAINT birthday_photos_uploader_profile_id_fkey FOREIGN KEY (uploader_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: birthday_ride_rsvps birthday_ride_rsvps_birthday_profile_id_celebration_year_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.birthday_ride_rsvps
    ADD CONSTRAINT birthday_ride_rsvps_birthday_profile_id_celebration_year_fkey FOREIGN KEY (birthday_profile_id, celebration_year) REFERENCES public.birthday_rides(birthday_profile_id, celebration_year) ON DELETE CASCADE;


--
-- Name: birthday_ride_rsvps birthday_ride_rsvps_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.birthday_ride_rsvps
    ADD CONSTRAINT birthday_ride_rsvps_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: birthday_rides birthday_rides_birthday_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.birthday_rides
    ADD CONSTRAINT birthday_rides_birthday_profile_id_fkey FOREIGN KEY (birthday_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: bokaal_bets bokaal_bets_profile_id_season_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bokaal_bets
    ADD CONSTRAINT bokaal_bets_profile_id_season_fkey FOREIGN KEY (profile_id, season) REFERENCES public.bokaal_players(profile_id, season) ON DELETE CASCADE;


--
-- Name: bokaal_bets bokaal_bets_race_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bokaal_bets
    ADD CONSTRAINT bokaal_bets_race_id_fkey FOREIGN KEY (race_id) REFERENCES public.bokaal_races(id) ON DELETE CASCADE;


--
-- Name: bokaal_bonus_answers bokaal_bonus_answers_profile_id_season_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bokaal_bonus_answers
    ADD CONSTRAINT bokaal_bonus_answers_profile_id_season_fkey FOREIGN KEY (profile_id, season) REFERENCES public.bokaal_players(profile_id, season) ON DELETE CASCADE;


--
-- Name: bokaal_bonus_answers bokaal_bonus_answers_race_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bokaal_bonus_answers
    ADD CONSTRAINT bokaal_bonus_answers_race_id_fkey FOREIGN KEY (race_id) REFERENCES public.bokaal_races(id) ON DELETE CASCADE;


--
-- Name: bokaal_players bokaal_players_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bokaal_players
    ADD CONSTRAINT bokaal_players_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: calendar_feed_tokens calendar_feed_tokens_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_feed_tokens
    ADD CONSTRAINT calendar_feed_tokens_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: club_ladder_event_expectations club_ladder_event_expectations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_ladder_event_expectations
    ADD CONSTRAINT club_ladder_event_expectations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: club_ladder_favorite_routes club_ladder_favorite_routes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_ladder_favorite_routes
    ADD CONSTRAINT club_ladder_favorite_routes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: club_ladder_favorite_routes club_ladder_favorite_routes_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_ladder_favorite_routes
    ADD CONSTRAINT club_ladder_favorite_routes_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: club_ladder_match_riders club_ladder_match_riders_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_ladder_match_riders
    ADD CONSTRAINT club_ladder_match_riders_result_id_fkey FOREIGN KEY (result_id) REFERENCES public.club_ladder_matches(result_id) ON DELETE CASCADE;


--
-- Name: club_modules club_modules_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_modules
    ADD CONSTRAINT club_modules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: club_settings club_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_settings
    ADD CONSTRAINT club_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: club_stories club_stories_beker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_stories
    ADD CONSTRAINT club_stories_beker_id_fkey FOREIGN KEY (beker_id) REFERENCES public.zwbekers(id) ON DELETE SET NULL;


--
-- Name: club_stories club_stories_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_stories
    ADD CONSTRAINT club_stories_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: club_stories club_stories_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_stories
    ADD CONSTRAINT club_stories_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: club_story_photos club_story_photos_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_story_photos
    ADD CONSTRAINT club_story_photos_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.club_stories(id) ON DELETE CASCADE;


--
-- Name: community_role_permissions community_role_permissions_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_role_permissions
    ADD CONSTRAINT community_role_permissions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: event_chat_messages event_chat_messages_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_chat_messages
    ADD CONSTRAINT event_chat_messages_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_chat_messages event_chat_messages_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_chat_messages
    ADD CONSTRAINT event_chat_messages_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: event_climbs event_climbs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_climbs
    ADD CONSTRAINT event_climbs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: event_climbs event_climbs_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_climbs
    ADD CONSTRAINT event_climbs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_links event_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_links
    ADD CONSTRAINT event_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: event_links event_links_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_links
    ADD CONSTRAINT event_links_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_pacing_generations event_pacing_generations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_pacing_generations
    ADD CONSTRAINT event_pacing_generations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_pacing_generations event_pacing_generations_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_pacing_generations
    ADD CONSTRAINT event_pacing_generations_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: event_pacing_plans event_pacing_plans_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_pacing_plans
    ADD CONSTRAINT event_pacing_plans_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_pacing_plans event_pacing_plans_generation_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_pacing_plans
    ADD CONSTRAINT event_pacing_plans_generation_fk FOREIGN KEY (ai_generation_id) REFERENCES public.event_pacing_generations(id) ON DELETE SET NULL;


--
-- Name: event_pacing_plans event_pacing_plans_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_pacing_plans
    ADD CONSTRAINT event_pacing_plans_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: event_photos event_photos_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_photos
    ADD CONSTRAINT event_photos_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_photos event_photos_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_photos
    ADD CONSTRAINT event_photos_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: event_pois event_pois_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_pois
    ADD CONSTRAINT event_pois_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: event_pois event_pois_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_pois
    ADD CONSTRAINT event_pois_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_program_links event_program_links_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_program_links
    ADD CONSTRAINT event_program_links_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_program_links event_program_links_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_program_links
    ADD CONSTRAINT event_program_links_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.event_programs(id) ON DELETE CASCADE;


--
-- Name: event_programs event_programs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_programs
    ADD CONSTRAINT event_programs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: event_reminder_sends event_reminder_sends_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_reminder_sends
    ADD CONSTRAINT event_reminder_sends_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_reminder_sends event_reminder_sends_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_reminder_sends
    ADD CONSTRAINT event_reminder_sends_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: event_report_comments event_report_comments_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_report_comments
    ADD CONSTRAINT event_report_comments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: event_report_comments event_report_comments_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_report_comments
    ADD CONSTRAINT event_report_comments_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.event_reports(id) ON DELETE CASCADE;


--
-- Name: event_reports event_reports_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_reports
    ADD CONSTRAINT event_reports_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_reports event_reports_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_reports
    ADD CONSTRAINT event_reports_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: event_results event_results_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_results
    ADD CONSTRAINT event_results_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_results event_results_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_results
    ADD CONSTRAINT event_results_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: event_rsvps event_rsvps_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_rsvps
    ADD CONSTRAINT event_rsvps_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_rsvps event_rsvps_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_rsvps
    ADD CONSTRAINT event_rsvps_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: event_zones event_zones_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_zones
    ADD CONSTRAINT event_zones_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: event_zones event_zones_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_zones
    ADD CONSTRAINT event_zones_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: events events_frr_tour_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_frr_tour_id_fkey FOREIGN KEY (frr_tour_id) REFERENCES public.frr_tours(id) ON DELETE SET NULL;


--
-- Name: events events_parent_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_parent_event_id_fkey FOREIGN KEY (parent_event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: events events_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: events events_zwift_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_zwift_route_id_fkey FOREIGN KEY (zwift_route_id) REFERENCES public.zwift_routes(route_id) ON DELETE SET NULL;


--
-- Name: external_event_candidates external_event_candidates_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_event_candidates
    ADD CONSTRAINT external_event_candidates_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: external_event_candidates external_event_candidates_published_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_event_candidates
    ADD CONSTRAINT external_event_candidates_published_event_id_fkey FOREIGN KEY (published_event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: external_event_participants external_event_participants_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_event_participants
    ADD CONSTRAINT external_event_participants_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.external_event_candidates(id) ON DELETE CASCADE;


--
-- Name: external_event_participants external_event_participants_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_event_participants
    ADD CONSTRAINT external_event_participants_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: frr_gc_exclusions frr_gc_exclusions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_gc_exclusions
    ADD CONSTRAINT frr_gc_exclusions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: frr_gc_exclusions frr_gc_exclusions_tour_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_gc_exclusions
    ADD CONSTRAINT frr_gc_exclusions_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.frr_tours(id) ON DELETE CASCADE;


--
-- Name: frr_gc_history frr_gc_history_tour_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_gc_history
    ADD CONSTRAINT frr_gc_history_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.frr_tours(id) ON DELETE CASCADE;


--
-- Name: frr_gc_standings frr_gc_standings_tour_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_gc_standings
    ADD CONSTRAINT frr_gc_standings_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.frr_tours(id) ON DELETE CASCADE;


--
-- Name: frr_slot_entrants frr_slot_entrants_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_slot_entrants
    ADD CONSTRAINT frr_slot_entrants_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: frr_slot_entrants frr_slot_entrants_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_slot_entrants
    ADD CONSTRAINT frr_slot_entrants_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: frr_stage_results frr_stage_results_slot_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_stage_results
    ADD CONSTRAINT frr_stage_results_slot_event_id_fkey FOREIGN KEY (slot_event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: frr_stage_results frr_stage_results_tour_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_stage_results
    ADD CONSTRAINT frr_stage_results_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.frr_tours(id) ON DELETE CASCADE;


--
-- Name: frr_tours frr_tours_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_tours
    ADD CONSTRAINT frr_tours_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: frr_watch_riders frr_watch_riders_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frr_watch_riders
    ADD CONSTRAINT frr_watch_riders_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: integration_notices integration_notices_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_notices
    ADD CONSTRAINT integration_notices_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: integration_notices integration_notices_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_notices
    ADD CONSTRAINT integration_notices_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: intervals_activities intervals_activities_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervals_activities
    ADD CONSTRAINT intervals_activities_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: intervals_connections intervals_connections_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervals_connections
    ADD CONSTRAINT intervals_connections_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: intervals_strength_muscles intervals_strength_muscles_profile_id_intervals_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervals_strength_muscles
    ADD CONSTRAINT intervals_strength_muscles_profile_id_intervals_id_fkey FOREIGN KEY (profile_id, intervals_id) REFERENCES public.intervals_activities(profile_id, intervals_id) ON DELETE CASCADE;


--
-- Name: knowledge_messages knowledge_messages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_messages
    ADD CONSTRAINT knowledge_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: knowledge_messages knowledge_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_messages
    ADD CONSTRAINT knowledge_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.knowledge_threads(id) ON DELETE CASCADE;


--
-- Name: knowledge_threads knowledge_threads_asker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_threads
    ADD CONSTRAINT knowledge_threads_asker_id_fkey FOREIGN KEY (asker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: knowledge_threads knowledge_threads_expert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_threads
    ADD CONSTRAINT knowledge_threads_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: knowledge_threads knowledge_threads_last_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_threads
    ADD CONSTRAINT knowledge_threads_last_author_id_fkey FOREIGN KEY (last_author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: knowledge_threads knowledge_threads_tip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_threads
    ADD CONSTRAINT knowledge_threads_tip_id_fkey FOREIGN KEY (tip_id) REFERENCES public.member_tips(id) ON DELETE SET NULL;


--
-- Name: knowledge_threads knowledge_threads_topic_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_threads
    ADD CONSTRAINT knowledge_threads_topic_fk FOREIGN KEY (topic_slug) REFERENCES public.knowledge_topics(slug);


--
-- Name: knowledge_topics knowledge_topics_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_topics
    ADD CONSTRAINT knowledge_topics_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ladder_pool ladder_pool_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ladder_pool
    ADD CONSTRAINT ladder_pool_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ladder_pool ladder_pool_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ladder_pool
    ADD CONSTRAINT ladder_pool_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: ladder_ranks ladder_ranks_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ladder_ranks
    ADD CONSTRAINT ladder_ranks_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ladder_roster_riders ladder_roster_riders_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ladder_roster_riders
    ADD CONSTRAINT ladder_roster_riders_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ladder_roster_riders ladder_roster_riders_roster_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ladder_roster_riders
    ADD CONSTRAINT ladder_roster_riders_roster_entry_id_fkey FOREIGN KEY (roster_entry_id) REFERENCES public.roster_entries(id) ON DELETE CASCADE;


--
-- Name: ladder_roster_riders ladder_roster_riders_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ladder_roster_riders
    ADD CONSTRAINT ladder_roster_riders_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: ladder_withdrawn ladder_withdrawn_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ladder_withdrawn
    ADD CONSTRAINT ladder_withdrawn_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: ladder_withdrawn ladder_withdrawn_withdrawn_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ladder_withdrawn
    ADD CONSTRAINT ladder_withdrawn_withdrawn_by_fkey FOREIGN KEY (withdrawn_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: live_positions live_positions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_positions
    ADD CONSTRAINT live_positions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: live_positions live_positions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_positions
    ADD CONSTRAINT live_positions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.live_sessions(id) ON DELETE CASCADE;


--
-- Name: live_sessions live_sessions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT live_sessions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: live_sessions live_sessions_tracker_token_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT live_sessions_tracker_token_id_fkey FOREIGN KEY (tracker_token_id) REFERENCES public.live_tracker_tokens(id) ON DELETE SET NULL;


--
-- Name: live_tracker_tokens live_tracker_tokens_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_tracker_tokens
    ADD CONSTRAINT live_tracker_tokens_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: maintenance_tips maintenance_tips_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_tips
    ADD CONSTRAINT maintenance_tips_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: maintenance_tips maintenance_tips_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_tips
    ADD CONSTRAINT maintenance_tips_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: media_items media_items_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_items
    ADD CONSTRAINT media_items_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: member_benefits member_benefits_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_benefits
    ADD CONSTRAINT member_benefits_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: member_benefits member_benefits_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_benefits
    ADD CONSTRAINT member_benefits_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE SET NULL;


--
-- Name: member_knowledge member_knowledge_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_knowledge
    ADD CONSTRAINT member_knowledge_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: member_knowledge_topics member_knowledge_topics_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_knowledge_topics
    ADD CONSTRAINT member_knowledge_topics_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.member_knowledge(profile_id) ON DELETE CASCADE;


--
-- Name: member_knowledge_topics member_knowledge_topics_topic_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_knowledge_topics
    ADD CONSTRAINT member_knowledge_topics_topic_fk FOREIGN KEY (topic_slug) REFERENCES public.knowledge_topics(slug);


--
-- Name: member_protocol_checks member_protocol_checks_protocol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_protocol_checks
    ADD CONSTRAINT member_protocol_checks_protocol_id_fkey FOREIGN KEY (protocol_id) REFERENCES public.member_protocols(id) ON DELETE CASCADE;


--
-- Name: member_protocol_core_sessions member_protocol_core_sessions_protocol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_protocol_core_sessions
    ADD CONSTRAINT member_protocol_core_sessions_protocol_id_fkey FOREIGN KEY (protocol_id) REFERENCES public.member_protocols(id) ON DELETE CASCADE;


--
-- Name: member_protocols member_protocols_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_protocols
    ADD CONSTRAINT member_protocols_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: member_question_askers member_question_askers_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_question_askers
    ADD CONSTRAINT member_question_askers_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: member_question_askers member_question_askers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_question_askers
    ADD CONSTRAINT member_question_askers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.member_questions(id) ON DELETE CASCADE;


--
-- Name: member_questions member_questions_answered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_questions
    ADD CONSTRAINT member_questions_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: member_questions member_questions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_questions
    ADD CONSTRAINT member_questions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: member_tips member_tips_col_slug_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_tips
    ADD CONSTRAINT member_tips_col_slug_fkey FOREIGN KEY (col_slug) REFERENCES public.cols(slug) ON DELETE SET NULL;


--
-- Name: member_tips member_tips_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_tips
    ADD CONSTRAINT member_tips_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: member_tips member_tips_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_tips
    ADD CONSTRAINT member_tips_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: member_tips member_tips_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_tips
    ADD CONSTRAINT member_tips_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.knowledge_messages(id) ON DELETE SET NULL;


--
-- Name: member_tips member_tips_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_tips
    ADD CONSTRAINT member_tips_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: member_tips member_tips_topic_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_tips
    ADD CONSTRAINT member_tips_topic_fk FOREIGN KEY (topic_slug) REFERENCES public.knowledge_topics(slug);


--
-- Name: member_zwift_bikes member_zwift_bikes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_zwift_bikes
    ADD CONSTRAINT member_zwift_bikes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: mobility_exercises mobility_exercises_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_exercises
    ADD CONSTRAINT mobility_exercises_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: mobility_series_items mobility_series_items_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_series_items
    ADD CONSTRAINT mobility_series_items_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.mobility_exercises(id) ON DELETE RESTRICT;


--
-- Name: mobility_series_items mobility_series_items_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_series_items
    ADD CONSTRAINT mobility_series_items_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.mobility_series(id) ON DELETE CASCADE;


--
-- Name: mobility_series mobility_series_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_series
    ADD CONSTRAINT mobility_series_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: mobility_sessions mobility_sessions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_sessions
    ADD CONSTRAINT mobility_sessions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: mobility_sessions mobility_sessions_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_sessions
    ADD CONSTRAINT mobility_sessions_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.mobility_series(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: nutrition_log_ai_usage nutrition_log_ai_usage_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_log_ai_usage
    ADD CONSTRAINT nutrition_log_ai_usage_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: nutrition_log_items nutrition_log_items_food_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_log_items
    ADD CONSTRAINT nutrition_log_items_food_id_fkey FOREIGN KEY (food_id) REFERENCES public.nutrition_foods(id) ON DELETE RESTRICT;


--
-- Name: nutrition_log_items nutrition_log_items_meal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_log_items
    ADD CONSTRAINT nutrition_log_items_meal_id_fkey FOREIGN KEY (meal_id) REFERENCES public.nutrition_log_meals(id) ON DELETE CASCADE;


--
-- Name: nutrition_log_items nutrition_log_items_product_barcode_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_log_items
    ADD CONSTRAINT nutrition_log_items_product_barcode_fkey FOREIGN KEY (product_barcode) REFERENCES public.nutrition_products(barcode) ON DELETE RESTRICT;


--
-- Name: nutrition_log_meals nutrition_log_meals_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_log_meals
    ADD CONSTRAINT nutrition_log_meals_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.nutrition_log_settings(profile_id) ON DELETE CASCADE;


--
-- Name: nutrition_log_meals nutrition_log_meals_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_log_meals
    ADD CONSTRAINT nutrition_log_meals_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.nutrition_recipes(id) ON DELETE SET NULL;


--
-- Name: nutrition_log_settings nutrition_log_settings_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_log_settings
    ADD CONSTRAINT nutrition_log_settings_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: nutrition_menu_choices nutrition_menu_choices_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_menu_choices
    ADD CONSTRAINT nutrition_menu_choices_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: nutrition_menu_choices nutrition_menu_choices_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_menu_choices
    ADD CONSTRAINT nutrition_menu_choices_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.nutrition_recipes(id) ON DELETE CASCADE;


--
-- Name: nutrition_profiles nutrition_profiles_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_profiles
    ADD CONSTRAINT nutrition_profiles_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: nutrition_recipe_ingredients nutrition_recipe_ingredients_food_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_recipe_ingredients
    ADD CONSTRAINT nutrition_recipe_ingredients_food_id_fkey FOREIGN KEY (food_id) REFERENCES public.nutrition_foods(id) ON DELETE RESTRICT;


--
-- Name: nutrition_recipe_ingredients nutrition_recipe_ingredients_product_barcode_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_recipe_ingredients
    ADD CONSTRAINT nutrition_recipe_ingredients_product_barcode_fkey FOREIGN KEY (product_barcode) REFERENCES public.nutrition_products(barcode) ON DELETE RESTRICT;


--
-- Name: nutrition_recipe_ingredients nutrition_recipe_ingredients_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_recipe_ingredients
    ADD CONSTRAINT nutrition_recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.nutrition_recipes(id) ON DELETE CASCADE;


--
-- Name: nutrition_recipe_prefs nutrition_recipe_prefs_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_recipe_prefs
    ADD CONSTRAINT nutrition_recipe_prefs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: nutrition_recipe_prefs nutrition_recipe_prefs_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_recipe_prefs
    ADD CONSTRAINT nutrition_recipe_prefs_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.nutrition_recipes(id) ON DELETE CASCADE;


--
-- Name: nutrition_recipes nutrition_recipes_contributed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_recipes
    ADD CONSTRAINT nutrition_recipes_contributed_by_fkey FOREIGN KEY (contributed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: nutrition_recipes nutrition_recipes_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_recipes
    ADD CONSTRAINT nutrition_recipes_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: nutrition_reminder_sends nutrition_reminder_sends_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_reminder_sends
    ADD CONSTRAINT nutrition_reminder_sends_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: nutrition_sweat_tests nutrition_sweat_tests_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_sweat_tests
    ADD CONSTRAINT nutrition_sweat_tests_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: omnium_edition_events omnium_edition_events_edition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_edition_events
    ADD CONSTRAINT omnium_edition_events_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.omnium_editions(id) ON DELETE CASCADE;


--
-- Name: omnium_edition_standings omnium_edition_standings_edition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_edition_standings
    ADD CONSTRAINT omnium_edition_standings_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.omnium_editions(id) ON DELETE CASCADE;


--
-- Name: omnium_edition_standings omnium_edition_standings_rider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_edition_standings
    ADD CONSTRAINT omnium_edition_standings_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.omnium_riders(id) ON DELETE CASCADE;


--
-- Name: omnium_editions omnium_editions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_editions
    ADD CONSTRAINT omnium_editions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: omnium_editions omnium_editions_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_editions
    ADD CONSTRAINT omnium_editions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: omnium_editions omnium_editions_recon_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_editions
    ADD CONSTRAINT omnium_editions_recon_event_id_fkey FOREIGN KEY (recon_event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: omnium_editions omnium_editions_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_editions
    ADD CONSTRAINT omnium_editions_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.omnium_seasons(id) ON DELETE CASCADE;


--
-- Name: omnium_entrants omnium_entrants_edition_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_entrants
    ADD CONSTRAINT omnium_entrants_edition_event_id_fkey FOREIGN KEY (edition_event_id) REFERENCES public.omnium_edition_events(id) ON DELETE CASCADE;


--
-- Name: omnium_entrants omnium_entrants_rider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_entrants
    ADD CONSTRAINT omnium_entrants_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.omnium_riders(id) ON DELETE CASCADE;


--
-- Name: omnium_kit_codes omnium_kit_codes_award_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_kit_codes
    ADD CONSTRAINT omnium_kit_codes_award_id_fkey FOREIGN KEY (award_id) REFERENCES public.omnium_prize_awards(id) ON DELETE SET NULL;


--
-- Name: omnium_kit_codes omnium_kit_codes_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_kit_codes
    ADD CONSTRAINT omnium_kit_codes_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.omnium_seasons(id) ON DELETE CASCADE;


--
-- Name: omnium_prize_awards omnium_prize_awards_awarded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_prize_awards
    ADD CONSTRAINT omnium_prize_awards_awarded_by_fkey FOREIGN KEY (awarded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: omnium_prize_awards omnium_prize_awards_edition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_prize_awards
    ADD CONSTRAINT omnium_prize_awards_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.omnium_editions(id) ON DELETE CASCADE;


--
-- Name: omnium_prize_awards omnium_prize_awards_prize_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_prize_awards
    ADD CONSTRAINT omnium_prize_awards_prize_id_fkey FOREIGN KEY (prize_id) REFERENCES public.omnium_prizes(id) ON DELETE CASCADE;


--
-- Name: omnium_prize_awards omnium_prize_awards_rider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_prize_awards
    ADD CONSTRAINT omnium_prize_awards_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.omnium_riders(id) ON DELETE CASCADE;


--
-- Name: omnium_prizes omnium_prizes_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_prizes
    ADD CONSTRAINT omnium_prizes_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.omnium_seasons(id) ON DELETE CASCADE;


--
-- Name: omnium_results omnium_results_edition_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_results
    ADD CONSTRAINT omnium_results_edition_event_id_fkey FOREIGN KEY (edition_event_id) REFERENCES public.omnium_edition_events(id) ON DELETE CASCADE;


--
-- Name: omnium_results omnium_results_edition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_results
    ADD CONSTRAINT omnium_results_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.omnium_editions(id) ON DELETE CASCADE;


--
-- Name: omnium_results omnium_results_entered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_results
    ADD CONSTRAINT omnium_results_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: omnium_results omnium_results_rider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_results
    ADD CONSTRAINT omnium_results_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.omnium_riders(id) ON DELETE CASCADE;


--
-- Name: omnium_rider_links omnium_rider_links_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_rider_links
    ADD CONSTRAINT omnium_rider_links_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: omnium_rider_links omnium_rider_links_rider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_rider_links
    ADD CONSTRAINT omnium_rider_links_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.omnium_riders(id) ON DELETE CASCADE;


--
-- Name: omnium_riders omnium_riders_merged_into_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_riders
    ADD CONSTRAINT omnium_riders_merged_into_id_fkey FOREIGN KEY (merged_into_id) REFERENCES public.omnium_riders(id) ON DELETE SET NULL;


--
-- Name: omnium_riders omnium_riders_public_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_riders
    ADD CONSTRAINT omnium_riders_public_profile_id_fkey FOREIGN KEY (public_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: omnium_season_standings omnium_season_standings_rider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_season_standings
    ADD CONSTRAINT omnium_season_standings_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.omnium_riders(id) ON DELETE CASCADE;


--
-- Name: omnium_season_standings omnium_season_standings_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omnium_season_standings
    ADD CONSTRAINT omnium_season_standings_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.omnium_seasons(id) ON DELETE CASCADE;


--
-- Name: outdoor_route_suggestions outdoor_route_suggestions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outdoor_route_suggestions
    ADD CONSTRAINT outdoor_route_suggestions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: outdoor_route_suggestions outdoor_route_suggestions_start_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outdoor_route_suggestions
    ADD CONSTRAINT outdoor_route_suggestions_start_point_id_fkey FOREIGN KEY (start_point_id) REFERENCES public.profile_start_points(id) ON DELETE SET NULL;


--
-- Name: outdoor_route_suggestions outdoor_route_suggestions_workout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outdoor_route_suggestions
    ADD CONSTRAINT outdoor_route_suggestions_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.training_workouts(id) ON DELETE CASCADE;


--
-- Name: poll_options poll_options_poll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_options
    ADD CONSTRAINT poll_options_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE;


--
-- Name: poll_votes poll_votes_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.poll_options(id) ON DELETE CASCADE;


--
-- Name: poll_votes poll_votes_poll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE;


--
-- Name: poll_votes poll_votes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: polls polls_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: post_comments post_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: post_comments post_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: profile_blocks profile_blocks_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_blocks
    ADD CONSTRAINT profile_blocks_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profile_climbed_cols profile_climbed_cols_best_time_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_climbed_cols
    ADD CONSTRAINT profile_climbed_cols_best_time_activity_id_fkey FOREIGN KEY (best_time_activity_id) REFERENCES public.strava_activities(id) ON DELETE SET NULL;


--
-- Name: profile_climbed_cols profile_climbed_cols_col_slug_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_climbed_cols
    ADD CONSTRAINT profile_climbed_cols_col_slug_fkey FOREIGN KEY (col_slug) REFERENCES public.cols(slug) ON DELETE CASCADE;


--
-- Name: profile_climbed_cols profile_climbed_cols_first_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_climbed_cols
    ADD CONSTRAINT profile_climbed_cols_first_activity_id_fkey FOREIGN KEY (first_activity_id) REFERENCES public.strava_activities(id) ON DELETE SET NULL;


--
-- Name: profile_climbed_cols profile_climbed_cols_last_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_climbed_cols
    ADD CONSTRAINT profile_climbed_cols_last_activity_id_fkey FOREIGN KEY (last_activity_id) REFERENCES public.strava_activities(id) ON DELETE SET NULL;


--
-- Name: profile_climbed_cols profile_climbed_cols_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_climbed_cols
    ADD CONSTRAINT profile_climbed_cols_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profile_completed_segments profile_completed_segments_best_time_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_completed_segments
    ADD CONSTRAINT profile_completed_segments_best_time_activity_id_fkey FOREIGN KEY (best_time_activity_id) REFERENCES public.strava_activities(id) ON DELETE SET NULL;


--
-- Name: profile_completed_segments profile_completed_segments_first_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_completed_segments
    ADD CONSTRAINT profile_completed_segments_first_activity_id_fkey FOREIGN KEY (first_activity_id) REFERENCES public.strava_activities(id) ON DELETE SET NULL;


--
-- Name: profile_completed_segments profile_completed_segments_last_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_completed_segments
    ADD CONSTRAINT profile_completed_segments_last_activity_id_fkey FOREIGN KEY (last_activity_id) REFERENCES public.strava_activities(id) ON DELETE SET NULL;


--
-- Name: profile_completed_segments profile_completed_segments_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_completed_segments
    ADD CONSTRAINT profile_completed_segments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profile_completed_segments profile_completed_segments_segment_slug_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_completed_segments
    ADD CONSTRAINT profile_completed_segments_segment_slug_fkey FOREIGN KEY (segment_slug) REFERENCES public.zwb_segments(slug) ON DELETE CASCADE;


--
-- Name: profile_ftp_history profile_ftp_history_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_ftp_history
    ADD CONSTRAINT profile_ftp_history_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profile_sport_settings profile_sport_settings_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_sport_settings
    ADD CONSTRAINT profile_sport_settings_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profile_start_points profile_start_points_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_start_points
    ADD CONSTRAINT profile_start_points_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profile_stats_tiles profile_stats_tiles_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_stats_tiles
    ADD CONSTRAINT profile_stats_tiles_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profile_wellness profile_wellness_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_wellness
    ADD CONSTRAINT profile_wellness_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profile_zwift_blocks profile_zwift_blocks_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_zwift_blocks
    ADD CONSTRAINT profile_zwift_blocks_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: race_briefings race_briefings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_briefings
    ADD CONSTRAINT race_briefings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: race_briefings race_briefings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.race_briefings
    ADD CONSTRAINT race_briefings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: rider_power_profiles rider_power_profiles_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rider_power_profiles
    ADD CONSTRAINT rider_power_profiles_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: roster_entries roster_entries_claimed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roster_entries
    ADD CONSTRAINT roster_entries_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: roster_entries roster_entries_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roster_entries
    ADD CONSTRAINT roster_entries_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: sponsors sponsors_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: src_month_entries src_month_entries_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_month_entries
    ADD CONSTRAINT src_month_entries_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: src_month_entries src_month_entries_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_month_entries
    ADD CONSTRAINT src_month_entries_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: src_races src_races_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_races
    ADD CONSTRAINT src_races_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: src_results src_results_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_results
    ADD CONSTRAINT src_results_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: src_results src_results_race_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_results
    ADD CONSTRAINT src_results_race_event_id_fkey FOREIGN KEY (race_event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: src_results src_results_suggested_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_results
    ADD CONSTRAINT src_results_suggested_profile_id_fkey FOREIGN KEY (suggested_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: src_sync_state src_sync_state_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_sync_state
    ADD CONSTRAINT src_sync_state_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: src_team_results src_team_results_race_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.src_team_results
    ADD CONSTRAINT src_team_results_race_event_id_fkey FOREIGN KEY (race_event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: strava_activities strava_activities_part_of_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_activities
    ADD CONSTRAINT strava_activities_part_of_activity_id_fkey FOREIGN KEY (part_of_activity_id) REFERENCES public.strava_activities(id) ON DELETE SET NULL;


--
-- Name: strava_activities strava_activities_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_activities
    ADD CONSTRAINT strava_activities_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: strava_activity_dismissals strava_activity_dismissals_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_activity_dismissals
    ADD CONSTRAINT strava_activity_dismissals_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: strava_activity_summaries strava_activity_summaries_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_activity_summaries
    ADD CONSTRAINT strava_activity_summaries_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.strava_activities(id) ON DELETE CASCADE;


--
-- Name: strava_activity_summaries strava_activity_summaries_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_activity_summaries
    ADD CONSTRAINT strava_activity_summaries_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: strava_activity_summaries strava_activity_summaries_workout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_activity_summaries
    ADD CONSTRAINT strava_activity_summaries_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.training_workouts(id) ON DELETE SET NULL;


--
-- Name: strava_bikes strava_bikes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_bikes
    ADD CONSTRAINT strava_bikes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: strava_connections strava_connections_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strava_connections
    ADD CONSTRAINT strava_connections_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: symptom_logs symptom_logs_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.symptom_logs
    ADD CONSTRAINT symptom_logs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: team_event_availability team_event_availability_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_event_availability
    ADD CONSTRAINT team_event_availability_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: team_event_availability team_event_availability_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_event_availability
    ADD CONSTRAINT team_event_availability_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: team_event_availability team_event_availability_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_event_availability
    ADD CONSTRAINT team_event_availability_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_event_lineups team_event_lineups_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_event_lineups
    ADD CONSTRAINT team_event_lineups_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: team_event_lineups team_event_lineups_parent_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_event_lineups
    ADD CONSTRAINT team_event_lineups_parent_team_id_fkey FOREIGN KEY (parent_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_event_lineups team_event_lineups_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_event_lineups
    ADD CONSTRAINT team_event_lineups_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: team_event_lineups team_event_lineups_roster_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_event_lineups
    ADD CONSTRAINT team_event_lineups_roster_entry_id_fkey FOREIGN KEY (roster_entry_id) REFERENCES public.roster_entries(id) ON DELETE CASCADE;


--
-- Name: team_event_lineups team_event_lineups_selected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_event_lineups
    ADD CONSTRAINT team_event_lineups_selected_by_fkey FOREIGN KEY (selected_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: team_event_lineups team_event_lineups_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_event_lineups
    ADD CONSTRAINT team_event_lineups_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_member_seed_overrides team_member_seed_overrides_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_member_seed_overrides
    ADD CONSTRAINT team_member_seed_overrides_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: team_member_seed_overrides team_member_seed_overrides_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_member_seed_overrides
    ADD CONSTRAINT team_member_seed_overrides_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: team_member_seed_overrides team_member_seed_overrides_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_member_seed_overrides
    ADD CONSTRAINT team_member_seed_overrides_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_racepasses team_racepasses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_racepasses
    ADD CONSTRAINT team_racepasses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: team_racepasses team_racepasses_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_racepasses
    ADD CONSTRAINT team_racepasses_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_result_sources team_result_sources_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_result_sources
    ADD CONSTRAINT team_result_sources_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_results team_results_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_results
    ADD CONSTRAINT team_results_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: team_results team_results_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_results
    ADD CONSTRAINT team_results_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: teams teams_captain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_captain_id_fkey FOREIGN KEY (captain_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: teams teams_parent_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_parent_team_id_fkey FOREIGN KEY (parent_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: telegram_links telegram_links_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_links
    ADD CONSTRAINT telegram_links_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_adaptation_runs training_adaptation_runs_draft_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_adaptation_runs
    ADD CONSTRAINT training_adaptation_runs_draft_plan_id_fkey FOREIGN KEY (draft_plan_id) REFERENCES public.training_plans(id) ON DELETE SET NULL;


--
-- Name: training_adaptation_runs training_adaptation_runs_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_adaptation_runs
    ADD CONSTRAINT training_adaptation_runs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_adaptation_runs training_adaptation_runs_source_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_adaptation_runs
    ADD CONSTRAINT training_adaptation_runs_source_plan_id_fkey FOREIGN KEY (source_plan_id) REFERENCES public.training_plans(id) ON DELETE SET NULL;


--
-- Name: training_adaptation_runs training_adaptation_runs_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_adaptation_runs
    ADD CONSTRAINT training_adaptation_runs_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_ai_generations training_ai_generations_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_ai_generations
    ADD CONSTRAINT training_ai_generations_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.training_goals(id) ON DELETE SET NULL;


--
-- Name: training_ai_generations training_ai_generations_parent_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_ai_generations
    ADD CONSTRAINT training_ai_generations_parent_plan_id_fkey FOREIGN KEY (parent_plan_id) REFERENCES public.training_plans(id) ON DELETE SET NULL;


--
-- Name: training_ai_generations training_ai_generations_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_ai_generations
    ADD CONSTRAINT training_ai_generations_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_ai_generations training_ai_generations_prompt_hash_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_ai_generations
    ADD CONSTRAINT training_ai_generations_prompt_hash_fkey FOREIGN KEY (prompt_hash) REFERENCES public.training_ai_prompts(hash);


--
-- Name: training_ai_generations training_ai_generations_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_ai_generations
    ADD CONSTRAINT training_ai_generations_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_availability training_availability_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_availability
    ADD CONSTRAINT training_availability_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_availability training_availability_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_availability
    ADD CONSTRAINT training_availability_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_availability training_availability_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_availability
    ADD CONSTRAINT training_availability_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_chat_messages training_chat_messages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_chat_messages
    ADD CONSTRAINT training_chat_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_chat_messages training_chat_messages_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_chat_messages
    ADD CONSTRAINT training_chat_messages_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.training_plans(id) ON DELETE SET NULL;


--
-- Name: training_chat_messages training_chat_messages_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_chat_messages
    ADD CONSTRAINT training_chat_messages_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_coach_assignments training_coach_assignments_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_coach_assignments
    ADD CONSTRAINT training_coach_assignments_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_coach_assignments training_coach_assignments_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_coach_assignments
    ADD CONSTRAINT training_coach_assignments_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_coach_assignments training_coach_assignments_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_coach_assignments
    ADD CONSTRAINT training_coach_assignments_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_coach_assignments training_coach_assignments_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_coach_assignments
    ADD CONSTRAINT training_coach_assignments_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_engine_comparisons training_engine_comparisons_generation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_engine_comparisons
    ADD CONSTRAINT training_engine_comparisons_generation_id_fkey FOREIGN KEY (generation_id) REFERENCES public.training_ai_generations(id) ON DELETE CASCADE;


--
-- Name: training_engine_comparisons training_engine_comparisons_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_engine_comparisons
    ADD CONSTRAINT training_engine_comparisons_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_engine_comparisons training_engine_comparisons_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_engine_comparisons
    ADD CONSTRAINT training_engine_comparisons_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_ftp_tests training_ftp_tests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_ftp_tests
    ADD CONSTRAINT training_ftp_tests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_ftp_tests training_ftp_tests_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_ftp_tests
    ADD CONSTRAINT training_ftp_tests_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_ftp_tests training_ftp_tests_workout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_ftp_tests
    ADD CONSTRAINT training_ftp_tests_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.training_workouts(id) ON DELETE SET NULL;


--
-- Name: training_goal_forecasts training_goal_forecasts_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_goal_forecasts
    ADD CONSTRAINT training_goal_forecasts_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.training_goals(id) ON DELETE CASCADE;


--
-- Name: training_goal_forecasts training_goal_forecasts_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_goal_forecasts
    ADD CONSTRAINT training_goal_forecasts_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_goals training_goals_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_goals
    ADD CONSTRAINT training_goals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_goals training_goals_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_goals
    ADD CONSTRAINT training_goals_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_goals training_goals_target_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_goals
    ADD CONSTRAINT training_goals_target_event_id_fkey FOREIGN KEY (target_event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: training_plans training_plans_ai_generation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_plans
    ADD CONSTRAINT training_plans_ai_generation_id_fkey FOREIGN KEY (ai_generation_id) REFERENCES public.training_ai_generations(id) ON DELETE SET NULL;


--
-- Name: training_plans training_plans_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_plans
    ADD CONSTRAINT training_plans_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_plans training_plans_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_plans
    ADD CONSTRAINT training_plans_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.training_goals(id) ON DELETE SET NULL;


--
-- Name: training_plans training_plans_parent_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_plans
    ADD CONSTRAINT training_plans_parent_plan_id_fkey FOREIGN KEY (parent_plan_id) REFERENCES public.training_plans(id) ON DELETE SET NULL;


--
-- Name: training_plans training_plans_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_plans
    ADD CONSTRAINT training_plans_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_plans training_plans_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_plans
    ADD CONSTRAINT training_plans_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_plans training_plans_root_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_plans
    ADD CONSTRAINT training_plans_root_plan_id_fkey FOREIGN KEY (root_plan_id) REFERENCES public.training_plans(id) ON DELETE SET NULL;


--
-- Name: training_plans training_plans_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_plans
    ADD CONSTRAINT training_plans_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_preferences training_preferences_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_preferences
    ADD CONSTRAINT training_preferences_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_preferences training_preferences_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_preferences
    ADD CONSTRAINT training_preferences_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_replan_requests training_replan_requests_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_replan_requests
    ADD CONSTRAINT training_replan_requests_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_season_periods training_season_periods_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_season_periods
    ADD CONSTRAINT training_season_periods_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_season_periods training_season_periods_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_season_periods
    ADD CONSTRAINT training_season_periods_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_season_periods training_season_periods_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_season_periods
    ADD CONSTRAINT training_season_periods_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_season_targets training_season_targets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_season_targets
    ADD CONSTRAINT training_season_targets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_season_targets training_season_targets_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_season_targets
    ADD CONSTRAINT training_season_targets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: training_season_targets training_season_targets_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_season_targets
    ADD CONSTRAINT training_season_targets_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.training_goals(id) ON DELETE SET NULL;


--
-- Name: training_season_targets training_season_targets_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_season_targets
    ADD CONSTRAINT training_season_targets_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_season_targets training_season_targets_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_season_targets
    ADD CONSTRAINT training_season_targets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_workout_reports training_workout_reports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workout_reports
    ADD CONSTRAINT training_workout_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_workout_reports training_workout_reports_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workout_reports
    ADD CONSTRAINT training_workout_reports_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_workout_reports training_workout_reports_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workout_reports
    ADD CONSTRAINT training_workout_reports_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_workout_reports training_workout_reports_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workout_reports
    ADD CONSTRAINT training_workout_reports_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_workout_reports training_workout_reports_workout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workout_reports
    ADD CONSTRAINT training_workout_reports_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.training_workouts(id) ON DELETE CASCADE;


--
-- Name: training_workout_templates training_workout_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workout_templates
    ADD CONSTRAINT training_workout_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: training_workouts training_workouts_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workouts
    ADD CONSTRAINT training_workouts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: training_workouts training_workouts_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workouts
    ADD CONSTRAINT training_workouts_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.training_plans(id) ON DELETE CASCADE;


--
-- Name: training_workouts training_workouts_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workouts
    ADD CONSTRAINT training_workouts_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_workouts training_workouts_superseded_by_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workouts
    ADD CONSTRAINT training_workouts_superseded_by_plan_id_fkey FOREIGN KEY (superseded_by_plan_id) REFERENCES public.training_plans(id) ON DELETE SET NULL;


--
-- Name: training_workouts training_workouts_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_workouts
    ADD CONSTRAINT training_workouts_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ttt_plan_riders ttt_plan_riders_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ttt_plan_riders
    ADD CONSTRAINT ttt_plan_riders_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.ttt_plans(id) ON DELETE CASCADE;


--
-- Name: ttt_plan_riders ttt_plan_riders_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ttt_plan_riders
    ADD CONSTRAINT ttt_plan_riders_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ttt_plans ttt_plans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ttt_plans
    ADD CONSTRAINT ttt_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ttt_plans ttt_plans_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ttt_plans
    ADD CONSTRAINT ttt_plans_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: ttt_plans ttt_plans_parent_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ttt_plans
    ADD CONSTRAINT ttt_plans_parent_team_id_fkey FOREIGN KEY (parent_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: ttt_plans ttt_plans_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ttt_plans
    ADD CONSTRAINT ttt_plans_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: ttt_plans ttt_plans_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ttt_plans
    ADD CONSTRAINT ttt_plans_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: weekly_reviews weekly_reviews_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_reviews
    ADD CONSTRAINT weekly_reviews_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: whatsapp_groups whatsapp_groups_contact_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_groups
    ADD CONSTRAINT whatsapp_groups_contact_profile_id_fkey FOREIGN KEY (contact_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: whatsapp_groups whatsapp_groups_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_groups
    ADD CONSTRAINT whatsapp_groups_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: whatsapp_groups whatsapp_groups_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_groups
    ADD CONSTRAINT whatsapp_groups_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: wtrl_team_riders wtrl_team_riders_trc_ref_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wtrl_team_riders
    ADD CONSTRAINT wtrl_team_riders_trc_ref_fkey FOREIGN KEY (trc_ref) REFERENCES public.wtrl_teams(trc_ref) ON DELETE CASCADE;


--
-- Name: wtrl_teams wtrl_teams_imported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wtrl_teams
    ADD CONSTRAINT wtrl_teams_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: wtrl_teams wtrl_teams_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wtrl_teams
    ADD CONSTRAINT wtrl_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: zrl_rider_results zrl_rider_results_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zrl_rider_results
    ADD CONSTRAINT zrl_rider_results_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: zrl_rider_results zrl_rider_results_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zrl_rider_results
    ADD CONSTRAINT zrl_rider_results_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: zrl_rider_results zrl_rider_results_roster_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zrl_rider_results
    ADD CONSTRAINT zrl_rider_results_roster_entry_id_fkey FOREIGN KEY (roster_entry_id) REFERENCES public.roster_entries(id) ON DELETE SET NULL;


--
-- Name: zrl_rider_results zrl_rider_results_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zrl_rider_results
    ADD CONSTRAINT zrl_rider_results_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: zrl_rider_results zrl_rider_results_team_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zrl_rider_results
    ADD CONSTRAINT zrl_rider_results_team_result_id_fkey FOREIGN KEY (team_result_id) REFERENCES public.team_results(id) ON DELETE CASCADE;


--
-- Name: zrl_team_assignments zrl_team_assignments_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zrl_team_assignments
    ADD CONSTRAINT zrl_team_assignments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: zrl_team_results zrl_team_results_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zrl_team_results
    ADD CONSTRAINT zrl_team_results_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: zrl_team_results zrl_team_results_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zrl_team_results
    ADD CONSTRAINT zrl_team_results_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: zwb_segments zwb_segments_legacy_col_slug_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwb_segments
    ADD CONSTRAINT zwb_segments_legacy_col_slug_fkey FOREIGN KEY (legacy_col_slug) REFERENCES public.cols(slug) ON DELETE SET NULL;


--
-- Name: zwbeker_congrats zwbeker_congrats_beker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbeker_congrats
    ADD CONSTRAINT zwbeker_congrats_beker_id_fkey FOREIGN KEY (beker_id) REFERENCES public.zwbekers(id) ON DELETE CASCADE;


--
-- Name: zwbeker_congrats zwbeker_congrats_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbeker_congrats
    ADD CONSTRAINT zwbeker_congrats_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: zwbeker_winners zwbeker_winners_beker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbeker_winners
    ADD CONSTRAINT zwbeker_winners_beker_id_fkey FOREIGN KEY (beker_id) REFERENCES public.zwbekers(id) ON DELETE CASCADE;


--
-- Name: zwbeker_winners zwbeker_winners_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbeker_winners
    ADD CONSTRAINT zwbeker_winners_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: zwbekers zwbekers_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbekers
    ADD CONSTRAINT zwbekers_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: zwbekers zwbekers_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbekers
    ADD CONSTRAINT zwbekers_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: zwbekers zwbekers_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbekers
    ADD CONSTRAINT zwbekers_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: zwbekers zwbekers_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbekers
    ADD CONSTRAINT zwbekers_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: zwbgame_preferences zwbgame_preferences_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbgame_preferences
    ADD CONSTRAINT zwbgame_preferences_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: zwbgame_riders zwbgame_riders_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbgame_riders
    ADD CONSTRAINT zwbgame_riders_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: zwbgame_roster_exclusions zwbgame_roster_exclusions_excluded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbgame_roster_exclusions
    ADD CONSTRAINT zwbgame_roster_exclusions_excluded_by_fkey FOREIGN KEY (excluded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: zwbgame_roster_exclusions zwbgame_roster_exclusions_roster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbgame_roster_exclusions
    ADD CONSTRAINT zwbgame_roster_exclusions_roster_id_fkey FOREIGN KEY (roster_id) REFERENCES public.roster_entries(id) ON DELETE CASCADE;


--
-- Name: zwbriljant_preferences zwbriljant_preferences_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbriljant_preferences
    ADD CONSTRAINT zwbriljant_preferences_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: zwbriljant_snapshots zwbriljant_snapshots_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zwbriljant_snapshots
    ADD CONSTRAINT zwbriljant_snapshots_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: achievement_awards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.achievement_awards ENABLE ROW LEVEL SECURITY;

--
-- Name: achievement_awards achievement_awards_permission_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY achievement_awards_permission_write ON public.achievement_awards TO authenticated USING (( SELECT public.current_user_has_permission('achievements.finalize'::text) AS current_user_has_permission)) WITH CHECK (( SELECT public.current_user_has_permission('achievements.finalize'::text) AS current_user_has_permission));


--
-- Name: achievement_awards achievement_awards_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY achievement_awards_select_authenticated ON public.achievement_awards FOR SELECT TO authenticated USING (true);


--
-- Name: achievement_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.achievement_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: achievement_badges achievement_badges_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY achievement_badges_select_authenticated ON public.achievement_badges FOR SELECT TO authenticated USING (true);


--
-- Name: ai_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements announcements_permission_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY announcements_permission_write ON public.announcements TO authenticated USING (( SELECT public.current_user_has_permission('community.manage'::text) AS current_user_has_permission)) WITH CHECK (( SELECT public.current_user_has_permission('community.manage'::text) AS current_user_has_permission));


--
-- Name: announcements announcements_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY announcements_select_authenticated ON public.announcements FOR SELECT TO authenticated USING (true);


--
-- Name: app_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: app_updates app_updates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_updates_select ON public.app_updates FOR SELECT TO authenticated USING (((publish_at <= now()) OR ( SELECT public.current_user_has_permission('notifications.broadcast'::text) AS current_user_has_permission)));


--
-- Name: app_updates app_updates_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_updates_write ON public.app_updates TO authenticated USING (( SELECT public.current_user_has_permission('notifications.broadcast'::text) AS current_user_has_permission)) WITH CHECK (( SELECT public.current_user_has_permission('notifications.broadcast'::text) AS current_user_has_permission));


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_log_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_log_select ON public.audit_log FOR SELECT TO authenticated USING (( SELECT public.current_user_has_permission('roles.manage_permissions'::text) AS current_user_has_permission));


--
-- Name: bike_components; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bike_components ENABLE ROW LEVEL SECURITY;

--
-- Name: bike_components bike_components_own_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bike_components_own_all ON public.bike_components TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: birthday_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.birthday_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: birthday_messages birthday_messages_author_or_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_messages_author_or_admin_delete ON public.birthday_messages FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = author_profile_id) OR (( SELECT auth.uid() AS uid) = birthday_profile_id) OR ( SELECT public.current_user_has_permission('content.moderate_posts'::text) AS current_user_has_permission)));


--
-- Name: birthday_messages birthday_messages_members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_messages_members_insert ON public.birthday_messages FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = author_profile_id) AND (EXISTS ( SELECT 1
   FROM (public.profiles viewer
     JOIN public.profiles birthday_member ON ((birthday_member.id = birthday_messages.birthday_profile_id)))
  WHERE ((viewer.id = ( SELECT auth.uid() AS uid)) AND viewer.is_approved AND birthday_member.is_approved AND birthday_member.share_birthday)))));


--
-- Name: birthday_messages birthday_messages_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_messages_members_read ON public.birthday_messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.profiles viewer
     JOIN public.profiles birthday_member ON ((birthday_member.id = birthday_messages.birthday_profile_id)))
  WHERE ((viewer.id = ( SELECT auth.uid() AS uid)) AND viewer.is_approved AND (birthday_member.share_birthday OR (birthday_member.id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: birthday_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.birthday_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: birthday_photos birthday_photos_members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_photos_members_insert ON public.birthday_photos FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = uploader_profile_id) AND (EXISTS ( SELECT 1
   FROM (public.profiles viewer
     JOIN public.profiles birthday_member ON ((birthday_member.id = birthday_photos.birthday_profile_id)))
  WHERE ((viewer.id = ( SELECT auth.uid() AS uid)) AND viewer.is_approved AND birthday_member.is_approved AND birthday_member.share_birthday)))));


--
-- Name: birthday_photos birthday_photos_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_photos_members_read ON public.birthday_photos FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.profiles viewer
     JOIN public.profiles birthday_member ON ((birthday_member.id = birthday_photos.birthday_profile_id)))
  WHERE ((viewer.id = ( SELECT auth.uid() AS uid)) AND viewer.is_approved AND (birthday_member.share_birthday OR (birthday_member.id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: birthday_photos birthday_photos_uploader_or_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_photos_uploader_or_admin_delete ON public.birthday_photos FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = uploader_profile_id) OR (( SELECT auth.uid() AS uid) = birthday_profile_id) OR ( SELECT public.current_user_has_permission('content.moderate_posts'::text) AS current_user_has_permission)));


--
-- Name: birthday_ride_rsvps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.birthday_ride_rsvps ENABLE ROW LEVEL SECURITY;

--
-- Name: birthday_ride_rsvps birthday_ride_rsvps_members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_ride_rsvps_members_insert ON public.birthday_ride_rsvps FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = profile_id) AND (EXISTS ( SELECT 1
   FROM (public.profiles viewer
     JOIN public.profiles birthday_member ON ((birthday_member.id = birthday_ride_rsvps.birthday_profile_id)))
  WHERE ((viewer.id = ( SELECT auth.uid() AS uid)) AND viewer.is_approved AND birthday_member.is_approved AND birthday_member.share_birthday)))));


--
-- Name: birthday_ride_rsvps birthday_ride_rsvps_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_ride_rsvps_members_read ON public.birthday_ride_rsvps FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.profiles viewer
     JOIN public.profiles birthday_member ON ((birthday_member.id = birthday_ride_rsvps.birthday_profile_id)))
  WHERE ((viewer.id = ( SELECT auth.uid() AS uid)) AND viewer.is_approved AND (birthday_member.share_birthday OR (birthday_member.id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: birthday_ride_rsvps birthday_ride_rsvps_members_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_ride_rsvps_members_update ON public.birthday_ride_rsvps FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: birthday_ride_rsvps birthday_ride_rsvps_owner_or_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_ride_rsvps_owner_or_admin_delete ON public.birthday_ride_rsvps FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = profile_id) OR (( SELECT auth.uid() AS uid) = birthday_profile_id) OR ( SELECT public.current_user_has_permission('content.moderate_posts'::text) AS current_user_has_permission)));


--
-- Name: birthday_rides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.birthday_rides ENABLE ROW LEVEL SECURITY;

--
-- Name: birthday_rides birthday_rides_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_rides_members_read ON public.birthday_rides FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.profiles viewer
     JOIN public.profiles birthday_member ON ((birthday_member.id = birthday_rides.birthday_profile_id)))
  WHERE ((viewer.id = ( SELECT auth.uid() AS uid)) AND viewer.is_approved AND (birthday_member.share_birthday OR (birthday_member.id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: birthday_rides birthday_rides_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_rides_owner_delete ON public.birthday_rides FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = birthday_profile_id));


--
-- Name: birthday_rides birthday_rides_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_rides_owner_insert ON public.birthday_rides FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = birthday_profile_id) AND (EXISTS ( SELECT 1
   FROM public.profiles profile
  WHERE ((profile.id = ( SELECT auth.uid() AS uid)) AND profile.is_approved)))));


--
-- Name: birthday_rides birthday_rides_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY birthday_rides_owner_update ON public.birthday_rides FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = birthday_profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = birthday_profile_id));


--
-- Name: bokaal_bets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bokaal_bets ENABLE ROW LEVEL SECURITY;

--
-- Name: bokaal_bets bokaal_bets_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bokaal_bets_read ON public.bokaal_bets FOR SELECT TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR (( SELECT public.bokaal_member() AS bokaal_member) AND (EXISTS ( SELECT 1
   FROM public.bokaal_races r
  WHERE ((r.id = bokaal_bets.race_id) AND (r.starts_at <= now())))))));


--
-- Name: bokaal_bonus_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bokaal_bonus_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: bokaal_bonus_answers bokaal_bonus_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bokaal_bonus_read ON public.bokaal_bonus_answers FOR SELECT TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR (( SELECT public.bokaal_member() AS bokaal_member) AND (EXISTS ( SELECT 1
   FROM public.bokaal_races r
  WHERE ((r.id = bokaal_bonus_answers.race_id) AND (r.starts_at <= now())))))));


--
-- Name: bokaal_players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bokaal_players ENABLE ROW LEVEL SECURITY;

--
-- Name: bokaal_players bokaal_players_join; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bokaal_players_join ON public.bokaal_players FOR INSERT TO authenticated WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) AND ( SELECT public.bokaal_member() AS bokaal_member)));


--
-- Name: bokaal_players bokaal_players_leave; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bokaal_players_leave ON public.bokaal_players FOR DELETE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: bokaal_players bokaal_players_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bokaal_players_read ON public.bokaal_players FOR SELECT TO authenticated USING (( SELECT public.bokaal_member() AS bokaal_member));


--
-- Name: bokaal_races; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bokaal_races ENABLE ROW LEVEL SECURITY;

--
-- Name: bokaal_races bokaal_races_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bokaal_races_read ON public.bokaal_races FOR SELECT TO authenticated USING (((status <> 'concept'::text) AND ( SELECT public.bokaal_member() AS bokaal_member)));


--
-- Name: bokaal_ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bokaal_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_feed_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_feed_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_feed_tokens calendar_feed_tokens_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_feed_tokens_delete_own ON public.calendar_feed_tokens FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: calendar_feed_tokens calendar_feed_tokens_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_feed_tokens_insert_own ON public.calendar_feed_tokens FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: calendar_feed_tokens calendar_feed_tokens_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_feed_tokens_select_own ON public.calendar_feed_tokens FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: calendar_feed_tokens calendar_feed_tokens_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_feed_tokens_update_own ON public.calendar_feed_tokens FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: club_ladder_event_expectations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_ladder_event_expectations ENABLE ROW LEVEL SECURITY;

--
-- Name: club_ladder_favorite_routes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_ladder_favorite_routes ENABLE ROW LEVEL SECURITY;

--
-- Name: club_ladder_fixture_signups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_ladder_fixture_signups ENABLE ROW LEVEL SECURITY;

--
-- Name: club_ladder_match_riders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_ladder_match_riders ENABLE ROW LEVEL SECURITY;

--
-- Name: club_ladder_matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_ladder_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: club_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: club_modules club_modules_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY club_modules_select ON public.club_modules FOR SELECT TO anon, authenticated USING (true);


--
-- Name: club_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: club_settings club_settings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY club_settings_select ON public.club_settings FOR SELECT TO anon, authenticated USING (true);


--
-- Name: club_stories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_stories ENABLE ROW LEVEL SECURITY;

--
-- Name: club_stories club_stories_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY club_stories_select ON public.club_stories FOR SELECT TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('community.manage'::text) AS current_user_has_permission)));


--
-- Name: club_story_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.club_story_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: club_story_photos club_story_photos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY club_story_photos_select ON public.club_story_photos FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.club_stories s
  WHERE (s.id = club_story_photos.story_id))));


--
-- Name: cols; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cols ENABLE ROW LEVEL SECURITY;

--
-- Name: cols cols_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cols_members_read ON public.cols FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: post_comments comments_delete_own_or_moderator; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comments_delete_own_or_moderator ON public.post_comments FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = author_id) OR ( SELECT public.current_user_has_permission('content.moderate_posts'::text) AS current_user_has_permission)));


--
-- Name: post_comments comments_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comments_insert_own ON public.post_comments FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = author_id));


--
-- Name: post_comments comments_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comments_select_authenticated ON public.post_comments FOR SELECT TO authenticated USING (true);


--
-- Name: community_role_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.community_role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: community_role_permissions community_role_permissions_permission_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY community_role_permissions_permission_insert ON public.community_role_permissions FOR INSERT TO authenticated WITH CHECK (( SELECT public.current_user_has_permission('roles.manage_permissions'::text) AS current_user_has_permission));


--
-- Name: community_role_permissions community_role_permissions_permission_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY community_role_permissions_permission_update ON public.community_role_permissions FOR UPDATE TO authenticated USING (( SELECT public.current_user_has_permission('roles.manage_permissions'::text) AS current_user_has_permission)) WITH CHECK (( SELECT public.current_user_has_permission('roles.manage_permissions'::text) AS current_user_has_permission));


--
-- Name: community_role_permissions community_role_permissions_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY community_role_permissions_select_authenticated ON public.community_role_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: event_chat_messages event_chat_delete_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_chat_delete_own_or_admin ON public.event_chat_messages FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = profile_id) OR ( SELECT public.current_user_has_permission('content.moderate_posts'::text) AS current_user_has_permission)));


--
-- Name: event_chat_messages event_chat_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_chat_insert_own ON public.event_chat_messages FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = profile_id) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved)))));


--
-- Name: event_chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: event_chat_messages event_chat_select_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_chat_select_approved ON public.event_chat_messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: event_climbs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_climbs ENABLE ROW LEVEL SECURITY;

--
-- Name: event_climbs event_climbs_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_climbs_read ON public.event_climbs FOR SELECT TO authenticated USING (true);


--
-- Name: event_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_links ENABLE ROW LEVEL SECURITY;

--
-- Name: event_links event_links_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_links_read ON public.event_links FOR SELECT TO authenticated USING (true);


--
-- Name: event_pacing_generations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_pacing_generations ENABLE ROW LEVEL SECURITY;

--
-- Name: event_pacing_generations event_pacing_generations_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_pacing_generations_own ON public.event_pacing_generations FOR SELECT TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: event_pacing_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_pacing_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: event_pacing_plans event_pacing_plans_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_pacing_plans_delete ON public.event_pacing_plans FOR DELETE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: event_pacing_plans event_pacing_plans_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_pacing_plans_insert ON public.event_pacing_plans FOR INSERT TO authenticated WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: event_pacing_plans event_pacing_plans_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_pacing_plans_read ON public.event_pacing_plans FOR SELECT TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR shared));


--
-- Name: event_pacing_plans event_pacing_plans_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_pacing_plans_update ON public.event_pacing_plans FOR UPDATE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: event_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: event_photos event_photos_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_photos_members_read ON public.event_photos FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: event_photos event_photos_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_photos_own_insert ON public.event_photos FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = profile_id) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved)))));


--
-- Name: event_photos event_photos_own_or_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_photos_own_or_admin_delete ON public.event_photos FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = profile_id) OR ( SELECT public.current_user_has_permission('content.moderate_posts'::text) AS current_user_has_permission)));


--
-- Name: event_photos event_photos_own_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_photos_own_update ON public.event_photos FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: event_pois; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_pois ENABLE ROW LEVEL SECURITY;

--
-- Name: event_pois event_pois_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_pois_delete_own ON public.event_pois FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = created_by));


--
-- Name: event_pois event_pois_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_pois_insert_own ON public.event_pois FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = created_by));


--
-- Name: event_pois event_pois_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_pois_read ON public.event_pois FOR SELECT TO authenticated USING (true);


--
-- Name: event_program_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_program_links ENABLE ROW LEVEL SECURITY;

--
-- Name: event_program_links event_program_links_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_program_links_delete ON public.event_program_links FOR DELETE TO authenticated USING ((( SELECT public.current_user_has_permission('events.manage_all'::text) AS current_user_has_permission) OR (EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_program_links.event_id) AND (e.created_by = ( SELECT auth.uid() AS uid)))))));


--
-- Name: event_program_links event_program_links_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_program_links_insert ON public.event_program_links FOR INSERT TO authenticated WITH CHECK ((( SELECT public.current_user_has_permission('events.manage_all'::text) AS current_user_has_permission) OR (EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_program_links.event_id) AND (e.created_by = ( SELECT auth.uid() AS uid)))))));


--
-- Name: event_program_links event_program_links_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_program_links_read ON public.event_program_links FOR SELECT TO authenticated USING (true);


--
-- Name: event_programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_programs ENABLE ROW LEVEL SECURITY;

--
-- Name: event_programs event_programs_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_programs_delete ON public.event_programs FOR DELETE TO authenticated USING (( SELECT public.current_user_has_permission('events.manage_all'::text) AS current_user_has_permission));


--
-- Name: event_programs event_programs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_programs_insert ON public.event_programs FOR INSERT TO authenticated WITH CHECK (( SELECT public.current_user_has_permission('events.manage_all'::text) AS current_user_has_permission));


--
-- Name: event_programs event_programs_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_programs_read ON public.event_programs FOR SELECT TO authenticated USING (true);


--
-- Name: event_programs event_programs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_programs_update ON public.event_programs FOR UPDATE TO authenticated USING (( SELECT public.current_user_has_permission('events.manage_all'::text) AS current_user_has_permission));


--
-- Name: event_reminder_sends; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_reminder_sends ENABLE ROW LEVEL SECURITY;

--
-- Name: event_report_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_report_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: event_report_comments event_report_comments_delete_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_report_comments_delete_own_or_admin ON public.event_report_comments FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = profile_id) OR ( SELECT public.current_user_has_permission('content.moderate_posts'::text) AS current_user_has_permission)));


--
-- Name: event_report_comments event_report_comments_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_report_comments_insert_own ON public.event_report_comments FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = profile_id) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved)))));


--
-- Name: event_report_comments event_report_comments_select_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_report_comments_select_approved ON public.event_report_comments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: event_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: event_reports event_reports_delete_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_reports_delete_own_or_admin ON public.event_reports FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = profile_id) OR ( SELECT public.current_user_has_permission('content.moderate_posts'::text) AS current_user_has_permission)));


--
-- Name: event_reports event_reports_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_reports_insert_own ON public.event_reports FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = profile_id) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved)))));


--
-- Name: event_reports event_reports_select_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_reports_select_approved ON public.event_reports FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: event_reports event_reports_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_reports_update_own ON public.event_reports FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: event_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_results ENABLE ROW LEVEL SECURITY;

--
-- Name: event_results event_results_select_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_results_select_approved ON public.event_results FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: event_rsvps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

--
-- Name: event_zones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_zones ENABLE ROW LEVEL SECURITY;

--
-- Name: event_zones event_zones_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_zones_read ON public.event_zones FOR SELECT TO authenticated USING (true);


--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: events events_delete_own_or_permission; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_delete_own_or_permission ON public.events FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = created_by) OR ( SELECT public.current_user_has_permission('events.manage_all'::text) AS current_user_has_permission)));


--
-- Name: events events_insert_with_permission; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_insert_with_permission ON public.events FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = created_by) AND ( SELECT public.current_user_has_permission('events.create'::text) AS current_user_has_permission)));


--
-- Name: events events_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_select_authenticated ON public.events FOR SELECT TO authenticated USING (true);


--
-- Name: events events_update_own_or_permission; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_update_own_or_permission ON public.events FOR UPDATE TO authenticated USING (((( SELECT auth.uid() AS uid) = created_by) OR ( SELECT public.current_user_has_permission('events.manage_all'::text) AS current_user_has_permission)));


--
-- Name: external_event_candidates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_event_candidates ENABLE ROW LEVEL SECURITY;

--
-- Name: external_event_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_event_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: frr_gc_exclusions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.frr_gc_exclusions ENABLE ROW LEVEL SECURITY;

--
-- Name: frr_gc_exclusions frr_gc_exclusions_own_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY frr_gc_exclusions_own_delete ON public.frr_gc_exclusions FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: frr_gc_exclusions frr_gc_exclusions_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY frr_gc_exclusions_own_insert ON public.frr_gc_exclusions FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: frr_gc_exclusions frr_gc_exclusions_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY frr_gc_exclusions_own_read ON public.frr_gc_exclusions FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: frr_gc_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.frr_gc_history ENABLE ROW LEVEL SECURITY;

--
-- Name: frr_gc_history frr_gc_history_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY frr_gc_history_read ON public.frr_gc_history FOR SELECT TO authenticated USING (true);


--
-- Name: frr_gc_standings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.frr_gc_standings ENABLE ROW LEVEL SECURITY;

--
-- Name: frr_gc_standings frr_gc_standings_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY frr_gc_standings_read ON public.frr_gc_standings FOR SELECT TO authenticated USING (true);


--
-- Name: frr_slot_entrants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.frr_slot_entrants ENABLE ROW LEVEL SECURITY;

--
-- Name: frr_slot_entrants frr_slot_entrants_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY frr_slot_entrants_read ON public.frr_slot_entrants FOR SELECT TO authenticated USING (true);


--
-- Name: frr_stage_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.frr_stage_results ENABLE ROW LEVEL SECURITY;

--
-- Name: frr_stage_results frr_stage_results_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY frr_stage_results_read ON public.frr_stage_results FOR SELECT TO authenticated USING (true);


--
-- Name: frr_tours; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.frr_tours ENABLE ROW LEVEL SECURITY;

--
-- Name: frr_tours frr_tours_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY frr_tours_read ON public.frr_tours FOR SELECT TO authenticated USING (true);


--
-- Name: frr_watch_riders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.frr_watch_riders ENABLE ROW LEVEL SECURITY;

--
-- Name: frr_watch_riders frr_watch_riders_own_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY frr_watch_riders_own_delete ON public.frr_watch_riders FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: frr_watch_riders frr_watch_riders_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY frr_watch_riders_own_insert ON public.frr_watch_riders FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: frr_watch_riders frr_watch_riders_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY frr_watch_riders_own_read ON public.frr_watch_riders FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: integration_health; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_health ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_notices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_notices ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_notices integration_notices_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY integration_notices_select_own ON public.integration_notices FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: intervals_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intervals_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: intervals_activities intervals_activities_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY intervals_activities_select ON public.intervals_activities FOR SELECT TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.training_coach_assignments a
  WHERE ((a.athlete_id = intervals_activities.profile_id) AND (a.trainer_id = ( SELECT auth.uid() AS uid)) AND (a.status = 'active'::text))))));


--
-- Name: intervals_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intervals_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: intervals_connections intervals_connections_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY intervals_connections_self_read ON public.intervals_connections FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: intervals_connections intervals_connections_self_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY intervals_connections_self_write ON public.intervals_connections TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: intervals_strength_muscles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intervals_strength_muscles ENABLE ROW LEVEL SECURITY;

--
-- Name: intervals_strength_muscles intervals_strength_muscles_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY intervals_strength_muscles_own ON public.intervals_strength_muscles TO authenticated USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));


--
-- Name: knowledge_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_messages knowledge_messages_own_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_messages_own_delete ON public.knowledge_messages FOR DELETE TO authenticated USING ((author_id = ( SELECT auth.uid() AS uid)));


--
-- Name: knowledge_messages knowledge_messages_participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_messages_participants ON public.knowledge_messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.knowledge_threads t
  WHERE ((t.id = knowledge_messages.thread_id) AND ((( SELECT auth.uid() AS uid) = t.asker_id) OR (( SELECT auth.uid() AS uid) = t.expert_id))))));


--
-- Name: knowledge_messages knowledge_messages_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_messages_write ON public.knowledge_messages FOR INSERT TO authenticated WITH CHECK (((author_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.knowledge_threads t
  WHERE ((t.id = knowledge_messages.thread_id) AND (t.status = 'open'::text) AND ((( SELECT auth.uid() AS uid) = t.asker_id) OR (( SELECT auth.uid() AS uid) = t.expert_id)))))));


--
-- Name: knowledge_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_threads ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_threads knowledge_threads_ask; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_threads_ask ON public.knowledge_threads FOR INSERT TO authenticated WITH CHECK (((asker_id = ( SELECT auth.uid() AS uid)) AND (status = 'open'::text) AND (EXISTS ( SELECT 1
   FROM public.member_knowledge mk
  WHERE (mk.profile_id = ( SELECT auth.uid() AS uid)))) AND (EXISTS ( SELECT 1
   FROM (public.member_knowledge_topics t
     JOIN public.profiles p ON (((p.id = t.profile_id) AND p.is_approved)))
  WHERE ((t.profile_id = knowledge_threads.expert_id) AND (t.topic_slug = knowledge_threads.topic_slug))))));


--
-- Name: knowledge_threads knowledge_threads_participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_threads_participants ON public.knowledge_threads FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = asker_id) OR (( SELECT auth.uid() AS uid) = expert_id)));


--
-- Name: knowledge_topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_topics ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_topics knowledge_topics_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_topics_delete ON public.knowledge_topics FOR DELETE TO authenticated USING (( SELECT public.current_user_moderates_member_tips() AS current_user_moderates_member_tips));


--
-- Name: knowledge_topics knowledge_topics_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_topics_insert ON public.knowledge_topics FOR INSERT TO authenticated WITH CHECK ((((created_by = ( SELECT auth.uid() AS uid)) AND (status = 'active'::text) AND (sort_order = 1000) AND ( SELECT public.current_user_has_permission('content.create_posts'::text) AS current_user_has_permission)) OR ( SELECT public.current_user_moderates_member_tips() AS current_user_moderates_member_tips)));


--
-- Name: knowledge_topics knowledge_topics_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_topics_select ON public.knowledge_topics FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: knowledge_topics knowledge_topics_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_topics_update ON public.knowledge_topics FOR UPDATE TO authenticated USING (( SELECT public.current_user_moderates_member_tips() AS current_user_moderates_member_tips)) WITH CHECK (( SELECT public.current_user_moderates_member_tips() AS current_user_moderates_member_tips));


--
-- Name: ladder_pool; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ladder_pool ENABLE ROW LEVEL SECURITY;

--
-- Name: ladder_ranks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ladder_ranks ENABLE ROW LEVEL SECURITY;

--
-- Name: ladder_roster_riders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ladder_roster_riders ENABLE ROW LEVEL SECURITY;

--
-- Name: ladder_withdrawn; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ladder_withdrawn ENABLE ROW LEVEL SECURITY;

--
-- Name: post_likes likes_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY likes_select_authenticated ON public.post_likes FOR SELECT TO authenticated USING (true);


--
-- Name: post_likes likes_self_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY likes_self_write ON public.post_likes TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: live_positions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.live_positions ENABLE ROW LEVEL SECURITY;

--
-- Name: live_positions live_positions_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY live_positions_insert_own ON public.live_positions FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = profile_id) AND (EXISTS ( SELECT 1
   FROM public.live_sessions s
  WHERE ((s.id = live_positions.session_id) AND (s.profile_id = ( SELECT auth.uid() AS uid)) AND (s.ended_at IS NULL))))));


--
-- Name: live_positions live_positions_select_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY live_positions_select_members ON public.live_positions FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.live_sessions s
  WHERE ((s.id = live_positions.session_id) AND (s.visibility = 'members'::text)))) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND profiles.is_approved)))));


--
-- Name: live_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: live_sessions live_sessions_insert_with_permission; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY live_sessions_insert_with_permission ON public.live_sessions FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = profile_id) AND (visibility = 'members'::text) AND ( SELECT public.current_user_has_permission('live.start'::text) AS current_user_has_permission)));


--
-- Name: live_sessions live_sessions_select_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY live_sessions_select_members ON public.live_sessions FOR SELECT TO authenticated USING (((visibility = 'members'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND profiles.is_approved)))));


--
-- Name: live_sessions live_sessions_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY live_sessions_update_own ON public.live_sessions FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: live_tracker_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.live_tracker_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: live_tracker_tokens live_tracker_tokens_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY live_tracker_tokens_insert_own ON public.live_tracker_tokens FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: live_tracker_tokens live_tracker_tokens_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY live_tracker_tokens_select_own ON public.live_tracker_tokens FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: live_tracker_tokens live_tracker_tokens_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY live_tracker_tokens_update_own ON public.live_tracker_tokens FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: maintenance_tips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.maintenance_tips ENABLE ROW LEVEL SECURITY;

--
-- Name: maintenance_tips maintenance_tips_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY maintenance_tips_delete ON public.maintenance_tips FOR DELETE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('community.manage'::text) AS current_user_has_permission)));


--
-- Name: maintenance_tips maintenance_tips_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY maintenance_tips_insert ON public.maintenance_tips FOR INSERT TO authenticated WITH CHECK (( SELECT public.current_user_has_permission('community.manage'::text) AS current_user_has_permission));


--
-- Name: maintenance_tips maintenance_tips_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY maintenance_tips_read ON public.maintenance_tips FOR SELECT TO authenticated USING (((status = 'published'::text) OR (profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('community.manage'::text) AS current_user_has_permission)));


--
-- Name: maintenance_tips maintenance_tips_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY maintenance_tips_update ON public.maintenance_tips FOR UPDATE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('community.manage'::text) AS current_user_has_permission))) WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('community.manage'::text) AS current_user_has_permission)));


--
-- Name: media_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

--
-- Name: media_items media_permission_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_permission_write ON public.media_items TO authenticated USING (( SELECT public.current_user_has_permission('media.manage'::text) AS current_user_has_permission)) WITH CHECK (( SELECT public.current_user_has_permission('media.manage'::text) AS current_user_has_permission));


--
-- Name: media_items media_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_select_authenticated ON public.media_items FOR SELECT TO authenticated USING (true);


--
-- Name: member_benefits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_benefits ENABLE ROW LEVEL SECURITY;

--
-- Name: member_benefits member_benefits_admin_read_inactive; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_benefits_admin_read_inactive ON public.member_benefits FOR SELECT TO authenticated USING (( SELECT public.current_user_has_permission('sponsors.manage'::text) AS current_user_has_permission));


--
-- Name: member_benefits member_benefits_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_benefits_members_read ON public.member_benefits FOR SELECT TO authenticated USING (active);


--
-- Name: member_knowledge; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_knowledge ENABLE ROW LEVEL SECURITY;

--
-- Name: member_knowledge member_knowledge_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_knowledge_own ON public.member_knowledge TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: member_knowledge_topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_knowledge_topics ENABLE ROW LEVEL SECURITY;

--
-- Name: member_knowledge_topics member_knowledge_topics_own_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_knowledge_topics_own_delete ON public.member_knowledge_topics FOR DELETE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: member_knowledge_topics member_knowledge_topics_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_knowledge_topics_own_insert ON public.member_knowledge_topics FOR INSERT TO authenticated WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: member_knowledge_topics member_knowledge_topics_own_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_knowledge_topics_own_update ON public.member_knowledge_topics FOR UPDATE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: member_knowledge_topics member_knowledge_topics_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_knowledge_topics_select ON public.member_knowledge_topics FOR SELECT TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = member_knowledge_topics.profile_id) AND p.is_approved))))));


--
-- Name: member_protocol_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_protocol_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: member_protocol_checks member_protocol_checks_own_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_protocol_checks_own_delete ON public.member_protocol_checks FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.member_protocols p
  WHERE ((p.id = member_protocol_checks.protocol_id) AND (p.profile_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: member_protocol_checks member_protocol_checks_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_protocol_checks_own_insert ON public.member_protocol_checks FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.member_protocols p
  WHERE ((p.id = member_protocol_checks.protocol_id) AND (p.profile_id = ( SELECT auth.uid() AS uid)) AND (p.status = 'actief'::text)))));


--
-- Name: member_protocol_checks member_protocol_checks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_protocol_checks_select ON public.member_protocol_checks FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.member_protocols p
  WHERE ((p.id = member_protocol_checks.protocol_id) AND public.current_user_in_training_chat(p.profile_id)))));


--
-- Name: member_protocol_core_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_protocol_core_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: member_protocol_core_sessions member_protocol_core_sessions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_protocol_core_sessions_select ON public.member_protocol_core_sessions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.member_protocols p
  WHERE ((p.id = member_protocol_core_sessions.protocol_id) AND public.current_user_in_training_chat(p.profile_id)))));


--
-- Name: member_protocols; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_protocols ENABLE ROW LEVEL SECURITY;

--
-- Name: member_protocols member_protocols_own_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_protocols_own_delete ON public.member_protocols FOR DELETE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: member_protocols member_protocols_own_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_protocols_own_update ON public.member_protocols FOR UPDATE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: member_protocols member_protocols_own_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_protocols_own_write ON public.member_protocols FOR INSERT TO authenticated WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: member_protocols member_protocols_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_protocols_select ON public.member_protocols FOR SELECT TO authenticated USING (public.current_user_in_training_chat(profile_id));


--
-- Name: member_question_askers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_question_askers ENABLE ROW LEVEL SECURITY;

--
-- Name: member_question_askers member_question_askers_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_question_askers_delete ON public.member_question_askers FOR DELETE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_answers_questions() AS current_user_answers_questions)));


--
-- Name: member_question_askers member_question_askers_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_question_askers_insert ON public.member_question_askers FOR INSERT TO authenticated WITH CHECK ((( SELECT public.current_user_answers_questions() AS current_user_answers_questions) OR ((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))) AND (EXISTS ( SELECT 1
   FROM public.member_questions q
  WHERE ((q.id = member_question_askers.question_id) AND (q.visibility = 'club'::text)))))));


--
-- Name: member_question_askers member_question_askers_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_question_askers_select ON public.member_question_askers FOR SELECT TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_answers_questions() AS current_user_answers_questions)));


--
-- Name: member_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: member_questions member_questions_answer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_questions_answer ON public.member_questions FOR UPDATE TO authenticated USING (( SELECT public.current_user_answers_questions() AS current_user_answers_questions)) WITH CHECK (( SELECT public.current_user_answers_questions() AS current_user_answers_questions));


--
-- Name: member_questions member_questions_ask; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_questions_ask ON public.member_questions FOR INSERT TO authenticated WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved)))));


--
-- Name: member_questions member_questions_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_questions_delete ON public.member_questions FOR DELETE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_answers_questions() AS current_user_answers_questions)));


--
-- Name: member_questions member_questions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_questions_select ON public.member_questions FOR SELECT TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_answers_questions() AS current_user_answers_questions) OR ((visibility = 'club'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))))));


--
-- Name: member_tips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_tips ENABLE ROW LEVEL SECURITY;

--
-- Name: member_tips member_tips_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_tips_delete ON public.member_tips FOR DELETE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_moderates_member_tips() AS current_user_moderates_member_tips)));


--
-- Name: member_tips member_tips_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_tips_insert ON public.member_tips FOR INSERT TO authenticated WITH CHECK ((((profile_id = ( SELECT auth.uid() AS uid)) AND (source = 'lid'::text) AND (status = 'published'::text) AND (message_id IS NULL) AND ( SELECT public.current_user_has_permission('content.create_posts'::text) AS current_user_has_permission)) OR ((source = 'gesprek'::text) AND (status = 'published'::text) AND (created_by = ( SELECT auth.uid() AS uid)) AND (profile_id <> ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.knowledge_messages m
     JOIN public.knowledge_threads t ON ((t.id = m.thread_id)))
  WHERE ((m.id = member_tips.message_id) AND (m.author_id = member_tips.profile_id) AND ((( SELECT auth.uid() AS uid) = t.asker_id) OR (( SELECT auth.uid() AS uid) = t.expert_id)))))) OR ( SELECT public.current_user_has_permission('community.manage'::text) AS current_user_has_permission)));


--
-- Name: member_tips member_tips_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_tips_select ON public.member_tips FOR SELECT TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_moderates_member_tips() AS current_user_moderates_member_tips) OR ((status = 'published'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))))));


--
-- Name: member_tips member_tips_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_tips_update ON public.member_tips FOR UPDATE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_moderates_member_tips() AS current_user_moderates_member_tips))) WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_moderates_member_tips() AS current_user_moderates_member_tips)));


--
-- Name: member_zwift_bikes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_zwift_bikes ENABLE ROW LEVEL SECURITY;

--
-- Name: member_zwift_bikes member_zwift_bikes_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_zwift_bikes_own ON public.member_zwift_bikes TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: mobility_exercises; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mobility_exercises ENABLE ROW LEVEL SECURITY;

--
-- Name: mobility_exercises mobility_exercises_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobility_exercises_delete ON public.mobility_exercises FOR DELETE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) AND (is_standard = false)));


--
-- Name: mobility_exercises mobility_exercises_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobility_exercises_insert ON public.mobility_exercises FOR INSERT TO authenticated WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) AND (is_standard = false) AND ( SELECT public.current_user_has_permission('training.create_plans'::text) AS current_user_has_permission)));


--
-- Name: mobility_exercises mobility_exercises_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobility_exercises_read ON public.mobility_exercises FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: mobility_exercises mobility_exercises_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobility_exercises_update ON public.mobility_exercises FOR UPDATE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) AND (is_standard = false))) WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) AND (is_standard = false)));


--
-- Name: mobility_series; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mobility_series ENABLE ROW LEVEL SECURITY;

--
-- Name: mobility_series mobility_series_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobility_series_delete ON public.mobility_series FOR DELETE TO authenticated USING (((owner_id = ( SELECT auth.uid() AS uid)) AND (is_standard = false)));


--
-- Name: mobility_series mobility_series_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobility_series_insert ON public.mobility_series FOR INSERT TO authenticated WITH CHECK (((owner_id = ( SELECT auth.uid() AS uid)) AND (is_standard = false)));


--
-- Name: mobility_series_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mobility_series_items ENABLE ROW LEVEL SECURITY;

--
-- Name: mobility_series_items mobility_series_items_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobility_series_items_read ON public.mobility_series_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.mobility_series s
  WHERE ((s.id = mobility_series_items.series_id) AND ((s.is_standard AND (EXISTS ( SELECT 1
           FROM public.profiles p
          WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved)))) OR (s.owner_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: mobility_series_items mobility_series_items_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobility_series_items_write ON public.mobility_series_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.mobility_series s
  WHERE ((s.id = mobility_series_items.series_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)) AND (s.is_standard = false))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.mobility_series s
  WHERE ((s.id = mobility_series_items.series_id) AND (s.owner_id = ( SELECT auth.uid() AS uid)) AND (s.is_standard = false)))));


--
-- Name: mobility_series mobility_series_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobility_series_read ON public.mobility_series FOR SELECT TO authenticated USING (((is_standard AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved)))) OR (owner_id = ( SELECT auth.uid() AS uid))));


--
-- Name: mobility_series mobility_series_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobility_series_update ON public.mobility_series FOR UPDATE TO authenticated USING (((owner_id = ( SELECT auth.uid() AS uid)) AND (is_standard = false))) WITH CHECK (((owner_id = ( SELECT auth.uid() AS uid)) AND (is_standard = false)));


--
-- Name: mobility_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mobility_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: mobility_sessions mobility_sessions_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobility_sessions_own ON public.mobility_sessions TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences notification_preferences_own_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_preferences_own_all ON public.notification_preferences TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: nutrition_foods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_foods ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_foods nutrition_foods_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_foods_read ON public.nutrition_foods FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: nutrition_log_ai_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_log_ai_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_log_ai_usage nutrition_log_ai_usage_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_log_ai_usage_read ON public.nutrition_log_ai_usage FOR SELECT TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: nutrition_log_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_log_items ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_log_items nutrition_log_items_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_log_items_own ON public.nutrition_log_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.nutrition_log_meals m
  WHERE ((m.id = nutrition_log_items.meal_id) AND (m.profile_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.nutrition_log_meals m
  WHERE ((m.id = nutrition_log_items.meal_id) AND (m.profile_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: nutrition_log_items nutrition_log_items_trainer_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_log_items_trainer_read ON public.nutrition_log_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.nutrition_log_meals m
  WHERE ((m.id = nutrition_log_items.meal_id) AND public.nutrition_log_trainer_can_read(m.profile_id)))));


--
-- Name: nutrition_log_meals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_log_meals ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_log_meals nutrition_log_meals_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_log_meals_delete ON public.nutrition_log_meals FOR DELETE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: nutrition_log_meals nutrition_log_meals_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_log_meals_insert ON public.nutrition_log_meals FOR INSERT TO authenticated WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.nutrition_log_settings s
  WHERE ((s.profile_id = ( SELECT auth.uid() AS uid)) AND (NOT s.paused))))));


--
-- Name: nutrition_log_meals nutrition_log_meals_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_log_meals_read ON public.nutrition_log_meals FOR SELECT TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: nutrition_log_meals nutrition_log_meals_trainer_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_log_meals_trainer_read ON public.nutrition_log_meals FOR SELECT TO authenticated USING (public.nutrition_log_trainer_can_read(profile_id));


--
-- Name: nutrition_log_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_log_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_log_settings nutrition_log_settings_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_log_settings_own ON public.nutrition_log_settings TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: nutrition_log_settings nutrition_log_settings_trainer_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_log_settings_trainer_read ON public.nutrition_log_settings FOR SELECT TO authenticated USING (public.nutrition_log_trainer_can_read(profile_id));


--
-- Name: nutrition_menu_choices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_menu_choices ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_menu_choices nutrition_menu_choices_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_menu_choices_own ON public.nutrition_menu_choices TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.nutrition_recipes r
  WHERE (r.id = nutrition_menu_choices.recipe_id)))));


--
-- Name: nutrition_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_products ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_products nutrition_products_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_products_read ON public.nutrition_products FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: nutrition_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_profiles nutrition_profiles_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_profiles_own ON public.nutrition_profiles TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: nutrition_recipe_ingredients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_recipe_ingredients ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_recipe_ingredients nutrition_recipe_ingredients_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_recipe_ingredients_read ON public.nutrition_recipe_ingredients FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.nutrition_recipes r
  WHERE ((r.id = nutrition_recipe_ingredients.recipe_id) AND (((r.is_standard OR (r.visibility = 'leden'::text)) AND (EXISTS ( SELECT 1
           FROM public.profiles p
          WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved)))) OR (r.owner_id = ( SELECT auth.uid() AS uid)) OR ((r.share_status = 'voorgesteld'::text) AND ( SELECT public.current_user_has_permission('training.create_plans'::text) AS current_user_has_permission)))))));


--
-- Name: nutrition_recipe_ingredients nutrition_recipe_ingredients_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_recipe_ingredients_write ON public.nutrition_recipe_ingredients TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.nutrition_recipes r
  WHERE ((r.id = nutrition_recipe_ingredients.recipe_id) AND (((r.owner_id = ( SELECT auth.uid() AS uid)) AND (r.is_standard = false)) OR (r.is_standard AND ( SELECT public.current_user_has_permission('training.create_plans'::text) AS current_user_has_permission))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.nutrition_recipes r
  WHERE ((r.id = nutrition_recipe_ingredients.recipe_id) AND (((r.owner_id = ( SELECT auth.uid() AS uid)) AND (r.is_standard = false)) OR (r.is_standard AND ( SELECT public.current_user_has_permission('training.create_plans'::text) AS current_user_has_permission)))))));


--
-- Name: nutrition_recipe_prefs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_recipe_prefs ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_recipe_prefs nutrition_recipe_prefs_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_recipe_prefs_own ON public.nutrition_recipe_prefs TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: nutrition_recipes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_recipes ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_recipes nutrition_recipes_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_recipes_delete ON public.nutrition_recipes FOR DELETE TO authenticated USING ((((owner_id = ( SELECT auth.uid() AS uid)) AND (is_standard = false)) OR (is_standard AND ( SELECT public.current_user_has_permission('training.create_plans'::text) AS current_user_has_permission))));


--
-- Name: nutrition_recipes nutrition_recipes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_recipes_insert ON public.nutrition_recipes FOR INSERT TO authenticated WITH CHECK ((((owner_id = ( SELECT auth.uid() AS uid)) AND (is_standard = false)) OR (is_standard AND ( SELECT public.current_user_has_permission('training.create_plans'::text) AS current_user_has_permission))));


--
-- Name: nutrition_recipes nutrition_recipes_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_recipes_read ON public.nutrition_recipes FOR SELECT TO authenticated USING ((((is_standard OR (visibility = 'leden'::text)) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved)))) OR (owner_id = ( SELECT auth.uid() AS uid)) OR ((share_status = 'voorgesteld'::text) AND ( SELECT public.current_user_has_permission('training.create_plans'::text) AS current_user_has_permission))));


--
-- Name: nutrition_recipes nutrition_recipes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_recipes_update ON public.nutrition_recipes FOR UPDATE TO authenticated USING ((((owner_id = ( SELECT auth.uid() AS uid)) AND (is_standard = false)) OR (is_standard AND ( SELECT public.current_user_has_permission('training.create_plans'::text) AS current_user_has_permission)))) WITH CHECK ((((owner_id = ( SELECT auth.uid() AS uid)) AND (is_standard = false)) OR (is_standard AND ( SELECT public.current_user_has_permission('training.create_plans'::text) AS current_user_has_permission))));


--
-- Name: nutrition_reminder_sends; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_reminder_sends ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_sweat_tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_sweat_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_sweat_tests nutrition_sweat_tests_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nutrition_sweat_tests_own ON public.nutrition_sweat_tests TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: omnium_edition_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.omnium_edition_events ENABLE ROW LEVEL SECURITY;

--
-- Name: omnium_edition_events omnium_edition_events_manage_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_edition_events_manage_read ON public.omnium_edition_events FOR SELECT TO authenticated USING (( SELECT public.current_user_has_permission('omnium.manage'::text) AS current_user_has_permission));


--
-- Name: omnium_edition_events omnium_edition_events_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_edition_events_public_read ON public.omnium_edition_events FOR SELECT TO anon, authenticated USING ((EXISTS ( SELECT 1
   FROM public.omnium_editions e
  WHERE ((e.id = omnium_edition_events.edition_id) AND (e.published_at IS NOT NULL)))));


--
-- Name: omnium_edition_standings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.omnium_edition_standings ENABLE ROW LEVEL SECURITY;

--
-- Name: omnium_edition_standings omnium_edition_standings_manage_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_edition_standings_manage_read ON public.omnium_edition_standings FOR SELECT TO authenticated USING (( SELECT public.current_user_has_permission('omnium.manage'::text) AS current_user_has_permission));


--
-- Name: omnium_edition_standings omnium_edition_standings_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_edition_standings_public_read ON public.omnium_edition_standings FOR SELECT TO anon, authenticated USING ((EXISTS ( SELECT 1
   FROM public.omnium_editions e
  WHERE ((e.id = omnium_edition_standings.edition_id) AND (e.published_at IS NOT NULL)))));


--
-- Name: omnium_editions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.omnium_editions ENABLE ROW LEVEL SECURITY;

--
-- Name: omnium_editions omnium_editions_manage_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_editions_manage_read ON public.omnium_editions FOR SELECT TO authenticated USING (( SELECT public.current_user_has_permission('omnium.manage'::text) AS current_user_has_permission));


--
-- Name: omnium_editions omnium_editions_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_editions_public_read ON public.omnium_editions FOR SELECT TO anon, authenticated USING ((published_at IS NOT NULL));


--
-- Name: omnium_entrants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.omnium_entrants ENABLE ROW LEVEL SECURITY;

--
-- Name: omnium_entrants omnium_entrants_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_entrants_public_read ON public.omnium_entrants FOR SELECT TO anon, authenticated USING ((EXISTS ( SELECT 1
   FROM (public.omnium_edition_events ee
     JOIN public.omnium_editions e ON ((e.id = ee.edition_id)))
  WHERE ((ee.id = omnium_entrants.edition_event_id) AND (e.published_at IS NOT NULL)))));


--
-- Name: omnium_kit_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.omnium_kit_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: omnium_prize_awards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.omnium_prize_awards ENABLE ROW LEVEL SECURITY;

--
-- Name: omnium_prize_awards omnium_prize_awards_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_prize_awards_public_read ON public.omnium_prize_awards FOR SELECT TO anon, authenticated USING (((EXISTS ( SELECT 1
   FROM (public.omnium_prizes p
     JOIN public.omnium_seasons s ON ((s.id = p.season_id)))
  WHERE ((p.id = omnium_prize_awards.prize_id) AND (s.published_at IS NOT NULL)))) AND ((edition_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.omnium_editions e
  WHERE ((e.id = omnium_prize_awards.edition_id) AND (e.published_at IS NOT NULL)))))));


--
-- Name: omnium_prizes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.omnium_prizes ENABLE ROW LEVEL SECURITY;

--
-- Name: omnium_prizes omnium_prizes_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_prizes_public_read ON public.omnium_prizes FOR SELECT TO anon, authenticated USING ((EXISTS ( SELECT 1
   FROM public.omnium_seasons s
  WHERE ((s.id = omnium_prizes.season_id) AND (s.published_at IS NOT NULL)))));


--
-- Name: omnium_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.omnium_results ENABLE ROW LEVEL SECURITY;

--
-- Name: omnium_results omnium_results_manage_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_results_manage_read ON public.omnium_results FOR SELECT TO authenticated USING (( SELECT public.current_user_has_permission('omnium.manage'::text) AS current_user_has_permission));


--
-- Name: omnium_results omnium_results_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_results_public_read ON public.omnium_results FOR SELECT TO anon, authenticated USING ((EXISTS ( SELECT 1
   FROM public.omnium_editions e
  WHERE ((e.id = omnium_results.edition_id) AND (e.published_at IS NOT NULL)))));


--
-- Name: omnium_rider_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.omnium_rider_links ENABLE ROW LEVEL SECURITY;

--
-- Name: omnium_rider_links omnium_rider_links_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_rider_links_members_read ON public.omnium_rider_links FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: omnium_riders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.omnium_riders ENABLE ROW LEVEL SECURITY;

--
-- Name: omnium_riders omnium_riders_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_riders_public_read ON public.omnium_riders FOR SELECT TO anon, authenticated USING (true);


--
-- Name: omnium_season_standings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.omnium_season_standings ENABLE ROW LEVEL SECURITY;

--
-- Name: omnium_season_standings omnium_season_standings_manage_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_season_standings_manage_read ON public.omnium_season_standings FOR SELECT TO authenticated USING (( SELECT public.current_user_has_permission('omnium.manage'::text) AS current_user_has_permission));


--
-- Name: omnium_season_standings omnium_season_standings_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_season_standings_public_read ON public.omnium_season_standings FOR SELECT TO anon, authenticated USING ((EXISTS ( SELECT 1
   FROM public.omnium_seasons s
  WHERE ((s.id = omnium_season_standings.season_id) AND (s.published_at IS NOT NULL)))));


--
-- Name: omnium_seasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.omnium_seasons ENABLE ROW LEVEL SECURITY;

--
-- Name: omnium_seasons omnium_seasons_manage_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_seasons_manage_read ON public.omnium_seasons FOR SELECT TO authenticated USING (( SELECT public.current_user_has_permission('omnium.manage'::text) AS current_user_has_permission));


--
-- Name: omnium_seasons omnium_seasons_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY omnium_seasons_public_read ON public.omnium_seasons FOR SELECT TO anon, authenticated USING ((published_at IS NOT NULL));


--
-- Name: outdoor_route_suggestions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.outdoor_route_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: outdoor_route_suggestions outdoor_routes_own_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY outdoor_routes_own_select ON public.outdoor_route_suggestions FOR SELECT TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: poll_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

--
-- Name: poll_options poll_options_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY poll_options_members_read ON public.poll_options FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: poll_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: poll_votes poll_votes_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY poll_votes_members_read ON public.poll_votes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: poll_votes poll_votes_own_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY poll_votes_own_delete ON public.poll_votes FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = profile_id) AND (EXISTS ( SELECT 1
   FROM public.polls p
  WHERE ((p.id = poll_votes.poll_id) AND p.active AND ((p.closes_at IS NULL) OR (p.closes_at > now())))))));


--
-- Name: poll_votes poll_votes_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY poll_votes_own_insert ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = profile_id) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))) AND (EXISTS ( SELECT 1
   FROM public.polls p
  WHERE ((p.id = poll_votes.poll_id) AND p.active AND ((p.closes_at IS NULL) OR (p.closes_at > now())))))));


--
-- Name: polls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

--
-- Name: polls polls_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY polls_members_read ON public.polls FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: post_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: post_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: posts posts_delete_own_or_moderator; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_delete_own_or_moderator ON public.posts FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = author_id) OR ( SELECT public.current_user_has_permission('content.moderate_posts'::text) AS current_user_has_permission)));


--
-- Name: posts posts_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_insert_own ON public.posts FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = author_id));


--
-- Name: posts posts_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_select_authenticated ON public.posts FOR SELECT TO authenticated USING (true);


--
-- Name: posts posts_update_own_or_moderator; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_update_own_or_moderator ON public.posts FOR UPDATE TO authenticated USING (((( SELECT auth.uid() AS uid) = author_id) OR ( SELECT public.current_user_has_permission('content.moderate_posts'::text) AS current_user_has_permission)));


--
-- Name: profile_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_blocks profile_blocks_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profile_blocks_members_read ON public.profile_blocks FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: profile_climbed_cols; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_climbed_cols ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_climbed_cols profile_climbed_cols_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profile_climbed_cols_members_read ON public.profile_climbed_cols FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: profile_completed_segments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_completed_segments ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_completed_segments profile_completed_segments_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profile_completed_segments_members_read ON public.profile_completed_segments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: profile_ftp_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_ftp_history ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_ftp_history profile_ftp_history_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profile_ftp_history_select ON public.profile_ftp_history FOR SELECT TO authenticated USING (public.current_user_can_train_profile(profile_id));


--
-- Name: profile_sport_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_sport_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_sport_settings profile_sport_settings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profile_sport_settings_select ON public.profile_sport_settings FOR SELECT TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.training_coach_assignments a
  WHERE ((a.athlete_id = profile_sport_settings.profile_id) AND (a.trainer_id = ( SELECT auth.uid() AS uid)) AND (a.status = 'active'::text))))));


--
-- Name: profile_start_points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_start_points ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_stats_tiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_stats_tiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_stats_tiles profile_stats_tiles_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profile_stats_tiles_self ON public.profile_stats_tiles TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: profile_wellness; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_wellness ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_wellness profile_wellness_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profile_wellness_self_read ON public.profile_wellness FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: profile_zwift_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_zwift_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_zwift_blocks profile_zwift_blocks_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profile_zwift_blocks_members_read ON public.profile_zwift_blocks FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_admin_update ON public.profiles FOR UPDATE TO authenticated USING ((( SELECT public.current_user_has_permission('members.approve'::text) AS current_user_has_permission) OR ( SELECT public.current_user_has_permission('members.manage_roles'::text) AS current_user_has_permission))) WITH CHECK ((( SELECT public.current_user_has_permission('members.approve'::text) AS current_user_has_permission) OR ( SELECT public.current_user_has_permission('members.manage_roles'::text) AS current_user_has_permission)));


--
-- Name: profiles profiles_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_authenticated ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = id)) WITH CHECK ((( SELECT auth.uid() AS uid) = id));


--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions push_subscriptions_own_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY push_subscriptions_own_all ON public.push_subscriptions TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: race_briefings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.race_briefings ENABLE ROW LEVEL SECURITY;

--
-- Name: race_briefings race_briefings_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY race_briefings_read ON public.race_briefings FOR SELECT TO authenticated USING (true);


--
-- Name: rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: rider_power_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rider_power_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: rider_power_profiles rider_power_profiles_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rider_power_profiles_select_authenticated ON public.rider_power_profiles FOR SELECT TO authenticated USING (true);


--
-- Name: rider_power_profiles rider_power_profiles_self_or_team_sync_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rider_power_profiles_self_or_team_sync_write ON public.rider_power_profiles TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('teams.sync_sources'::text) AS current_user_has_permission))) WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('teams.sync_sources'::text) AS current_user_has_permission)));


--
-- Name: roster_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roster_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: roster_entries roster_members_permission_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roster_members_permission_delete ON public.roster_entries FOR DELETE TO authenticated USING (( SELECT public.current_user_has_permission('members.manage_roles'::text) AS current_user_has_permission));


--
-- Name: roster_entries roster_members_permission_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roster_members_permission_insert ON public.roster_entries FOR INSERT TO authenticated WITH CHECK (( SELECT public.current_user_has_permission('members.manage_roles'::text) AS current_user_has_permission));


--
-- Name: roster_entries roster_members_permission_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roster_members_permission_update ON public.roster_entries FOR UPDATE TO authenticated USING (( SELECT public.current_user_has_permission('members.manage_roles'::text) AS current_user_has_permission)) WITH CHECK (( SELECT public.current_user_has_permission('members.manage_roles'::text) AS current_user_has_permission));


--
-- Name: roster_entries roster_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roster_select_authenticated ON public.roster_entries FOR SELECT TO authenticated USING (true);


--
-- Name: event_rsvps rsvps_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rsvps_select_authenticated ON public.event_rsvps FOR SELECT TO authenticated USING (true);


--
-- Name: event_rsvps rsvps_upsert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rsvps_upsert_own ON public.event_rsvps TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: sponsors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

--
-- Name: sponsors sponsors_admin_read_inactive; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sponsors_admin_read_inactive ON public.sponsors FOR SELECT TO authenticated USING (( SELECT public.current_user_has_permission('sponsors.manage'::text) AS current_user_has_permission));


--
-- Name: sponsors sponsors_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sponsors_public_read ON public.sponsors FOR SELECT USING (active);


--
-- Name: src_month_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.src_month_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: src_month_entries src_month_entries_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY src_month_entries_read ON public.src_month_entries FOR SELECT TO authenticated USING (true);


--
-- Name: src_races; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.src_races ENABLE ROW LEVEL SECURITY;

--
-- Name: src_races src_races_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY src_races_read ON public.src_races FOR SELECT TO authenticated USING (true);


--
-- Name: src_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.src_results ENABLE ROW LEVEL SECURITY;

--
-- Name: src_results src_results_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY src_results_read ON public.src_results FOR SELECT TO authenticated USING (true);


--
-- Name: src_sync_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.src_sync_state ENABLE ROW LEVEL SECURITY;

--
-- Name: src_sync_state src_sync_state_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY src_sync_state_read ON public.src_sync_state FOR SELECT TO authenticated USING (true);


--
-- Name: src_team_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.src_team_results ENABLE ROW LEVEL SECURITY;

--
-- Name: src_team_results src_team_results_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY src_team_results_read ON public.src_team_results FOR SELECT TO authenticated USING (true);


--
-- Name: profile_start_points start_points_own_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY start_points_own_delete ON public.profile_start_points FOR DELETE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: profile_start_points start_points_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY start_points_own_insert ON public.profile_start_points FOR INSERT TO authenticated WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: profile_start_points start_points_own_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY start_points_own_select ON public.profile_start_points FOR SELECT TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: profile_start_points start_points_own_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY start_points_own_update ON public.profile_start_points FOR UPDATE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: strava_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strava_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: strava_activities strava_activities_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY strava_activities_select_authenticated ON public.strava_activities FOR SELECT TO authenticated USING (true);


--
-- Name: strava_activities strava_activities_write_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY strava_activities_write_own ON public.strava_activities TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: strava_activity_dismissals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strava_activity_dismissals ENABLE ROW LEVEL SECURITY;

--
-- Name: strava_activity_dismissals strava_activity_dismissals_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY strava_activity_dismissals_select_own ON public.strava_activity_dismissals FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: strava_activity_summaries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strava_activity_summaries ENABLE ROW LEVEL SECURITY;

--
-- Name: strava_activity_summaries strava_activity_summaries_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY strava_activity_summaries_select ON public.strava_activity_summaries FOR SELECT TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.training_coach_assignments a
  WHERE ((a.athlete_id = strava_activity_summaries.profile_id) AND (a.trainer_id = ( SELECT auth.uid() AS uid)) AND (a.status = 'active'::text))))));


--
-- Name: strava_api_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strava_api_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: strava_bikes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strava_bikes ENABLE ROW LEVEL SECURITY;

--
-- Name: strava_bikes strava_bikes_own_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY strava_bikes_own_all ON public.strava_bikes TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: strava_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: strava_connections strava_connections_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY strava_connections_select_own ON public.strava_connections FOR SELECT TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: strava_connections strava_connections_write_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY strava_connections_write_own ON public.strava_connections TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: strava_webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strava_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: strava_webhook_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strava_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: symptom_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: symptom_logs symptom_logs_own_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY symptom_logs_own_all ON public.symptom_logs TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: team_event_availability; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_event_availability ENABLE ROW LEVEL SECURITY;

--
-- Name: team_event_availability team_event_availability_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_event_availability_select_authenticated ON public.team_event_availability FOR SELECT TO authenticated USING (true);


--
-- Name: team_event_availability team_event_availability_self_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_event_availability_self_write ON public.team_event_availability TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: team_event_lineups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_event_lineups ENABLE ROW LEVEL SECURITY;

--
-- Name: team_event_lineups team_event_lineups_captain_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_event_lineups_captain_write ON public.team_event_lineups TO authenticated USING ((( SELECT public.current_user_has_permission('teams.manage_roster'::text) AS current_user_has_permission) OR (EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = ANY (ARRAY[team_event_lineups.parent_team_id, team_event_lineups.team_id])) AND (tm.profile_id = ( SELECT auth.uid() AS uid)) AND (tm.role = ANY (ARRAY['captain'::text, 'co-captain'::text]))))))) WITH CHECK ((( SELECT public.current_user_has_permission('teams.manage_roster'::text) AS current_user_has_permission) OR (EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = ANY (ARRAY[team_event_lineups.parent_team_id, team_event_lineups.team_id])) AND (tm.profile_id = ( SELECT auth.uid() AS uid)) AND (tm.role = ANY (ARRAY['captain'::text, 'co-captain'::text])))))));


--
-- Name: team_event_lineups team_event_lineups_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_event_lineups_select_authenticated ON public.team_event_lineups FOR SELECT TO authenticated USING (true);


--
-- Name: team_member_seed_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_member_seed_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members team_members_permission_or_captain_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_members_permission_or_captain_write ON public.team_members TO authenticated USING ((( SELECT public.current_user_has_permission('teams.manage_roster'::text) AS current_user_has_permission) OR public.current_user_is_team_captain(team_id))) WITH CHECK ((( SELECT public.current_user_has_permission('teams.manage_roster'::text) AS current_user_has_permission) OR public.current_user_is_team_captain(team_id)));


--
-- Name: team_members team_members_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_members_select_authenticated ON public.team_members FOR SELECT TO authenticated USING (true);


--
-- Name: team_racepasses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_racepasses ENABLE ROW LEVEL SECURITY;

--
-- Name: team_racepasses team_racepasses_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_racepasses_read ON public.team_racepasses FOR SELECT TO authenticated USING (true);


--
-- Name: team_result_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_result_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: team_result_sources team_result_sources_permission_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_result_sources_permission_write ON public.team_result_sources TO authenticated USING (( SELECT public.current_user_has_permission('teams.sync_sources'::text) AS current_user_has_permission)) WITH CHECK (( SELECT public.current_user_has_permission('teams.sync_sources'::text) AS current_user_has_permission));


--
-- Name: team_result_sources team_result_sources_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_result_sources_select_authenticated ON public.team_result_sources FOR SELECT TO authenticated USING (true);


--
-- Name: team_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_results ENABLE ROW LEVEL SECURITY;

--
-- Name: team_results team_results_permission_or_captain_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_results_permission_or_captain_write ON public.team_results TO authenticated USING ((( SELECT public.current_user_has_permission('teams.manage_results'::text) AS current_user_has_permission) OR (EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = team_results.team_id) AND (tm.profile_id = ( SELECT auth.uid() AS uid)) AND (tm.role = ANY (ARRAY['captain'::text, 'co-captain'::text]))))))) WITH CHECK ((( SELECT public.current_user_has_permission('teams.manage_results'::text) AS current_user_has_permission) OR (EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = team_results.team_id) AND (tm.profile_id = ( SELECT auth.uid() AS uid)) AND (tm.role = ANY (ARRAY['captain'::text, 'co-captain'::text])))))));


--
-- Name: team_results team_results_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_results_select_authenticated ON public.team_results FOR SELECT TO authenticated USING (true);


--
-- Name: team_member_seed_overrides team_seed_overrides_manage_roster; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_seed_overrides_manage_roster ON public.team_member_seed_overrides TO authenticated USING (( SELECT public.current_user_has_permission('teams.manage_roster'::text) AS current_user_has_permission)) WITH CHECK (( SELECT public.current_user_has_permission('teams.manage_roster'::text) AS current_user_has_permission));


--
-- Name: team_member_seed_overrides team_seed_overrides_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_seed_overrides_select_authenticated ON public.team_member_seed_overrides FOR SELECT TO authenticated USING (true);


--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: teams teams_permission_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_permission_write ON public.teams TO authenticated USING ((( SELECT public.current_user_has_permission('teams.create'::text) AS current_user_has_permission) OR ( SELECT public.current_user_has_permission('teams.manage_roster'::text) AS current_user_has_permission))) WITH CHECK ((( SELECT public.current_user_has_permission('teams.create'::text) AS current_user_has_permission) OR ( SELECT public.current_user_has_permission('teams.manage_roster'::text) AS current_user_has_permission)));


--
-- Name: teams teams_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_select_authenticated ON public.teams FOR SELECT TO authenticated USING (true);


--
-- Name: telegram_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_links telegram_links_own_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY telegram_links_own_delete ON public.telegram_links FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: telegram_links telegram_links_own_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY telegram_links_own_select ON public.telegram_links FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = profile_id));


--
-- Name: training_adaptation_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_adaptation_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: training_adaptation_runs training_adaptation_runs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_adaptation_runs_select ON public.training_adaptation_runs FOR SELECT TO authenticated USING (public.current_user_can_train_profile(profile_id));


--
-- Name: training_adaptation_runs training_adaptation_runs_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_adaptation_runs_write ON public.training_adaptation_runs TO authenticated USING ((((trainer_id = ( SELECT auth.uid() AS uid)) AND public.current_user_can_train_profile(profile_id)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission))) WITH CHECK ((((trainer_id = ( SELECT auth.uid() AS uid)) AND public.current_user_can_train_profile(profile_id)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_ai_generations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_ai_generations ENABLE ROW LEVEL SECURITY;

--
-- Name: training_ai_prompts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_ai_prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: training_ai_generations training_ai_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_ai_select ON public.training_ai_generations FOR SELECT TO authenticated USING (public.current_user_can_train_profile(profile_id));


--
-- Name: training_ai_generations training_ai_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_ai_write ON public.training_ai_generations TO authenticated USING ((((trainer_id = ( SELECT auth.uid() AS uid)) AND public.current_user_can_train_profile(profile_id)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission))) WITH CHECK ((((trainer_id = ( SELECT auth.uid() AS uid)) AND public.current_user_can_train_profile(profile_id)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_coach_assignments training_assignments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_assignments_delete ON public.training_coach_assignments FOR DELETE TO authenticated USING (((athlete_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_coach_assignments training_assignments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_assignments_insert ON public.training_coach_assignments FOR INSERT TO authenticated WITH CHECK ((((athlete_id = ( SELECT auth.uid() AS uid)) AND public.profile_has_community_role(trainer_id, 'trainer'::text)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_coach_assignments training_assignments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_assignments_select ON public.training_coach_assignments FOR SELECT TO authenticated USING (((athlete_id = ( SELECT auth.uid() AS uid)) OR (trainer_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_coach_assignments training_assignments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_assignments_update ON public.training_coach_assignments FOR UPDATE TO authenticated USING (((athlete_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission))) WITH CHECK ((((athlete_id = ( SELECT auth.uid() AS uid)) AND ((status <> 'active'::text) OR public.profile_has_community_role(trainer_id, 'trainer'::text))) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_availability; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_availability ENABLE ROW LEVEL SECURITY;

--
-- Name: training_availability training_availability_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_availability_delete ON public.training_availability FOR DELETE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_availability training_availability_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_availability_insert ON public.training_availability FOR INSERT TO authenticated WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_availability training_availability_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_availability_select ON public.training_availability FOR SELECT TO authenticated USING (public.current_user_can_train_profile(profile_id));


--
-- Name: training_availability training_availability_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_availability_update ON public.training_availability FOR UPDATE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission))) WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_chat_messages training_chat_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_chat_delete_own ON public.training_chat_messages FOR DELETE TO authenticated USING (((author_id IS NOT NULL) AND (author_id = ( SELECT auth.uid() AS uid))));


--
-- Name: training_chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: training_chat_messages training_chat_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_chat_select ON public.training_chat_messages FOR SELECT TO authenticated USING (public.current_user_in_training_chat(profile_id));


--
-- Name: training_coach_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_coach_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: training_engine_comparisons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_engine_comparisons ENABLE ROW LEVEL SECURITY;

--
-- Name: training_engine_comparisons training_engine_comparisons_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_engine_comparisons_insert ON public.training_engine_comparisons FOR INSERT TO authenticated WITH CHECK (((trainer_id = ( SELECT auth.uid() AS uid)) AND public.current_user_can_train_profile(profile_id)));


--
-- Name: training_engine_comparisons training_engine_comparisons_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_engine_comparisons_select ON public.training_engine_comparisons FOR SELECT TO authenticated USING (((trainer_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_ftp_tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_ftp_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: training_ftp_tests training_ftp_tests_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_ftp_tests_delete ON public.training_ftp_tests FOR DELETE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_ftp_tests training_ftp_tests_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_ftp_tests_insert ON public.training_ftp_tests FOR INSERT TO authenticated WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_ftp_tests training_ftp_tests_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_ftp_tests_select ON public.training_ftp_tests FOR SELECT TO authenticated USING (public.current_user_can_train_profile(profile_id));


--
-- Name: training_ftp_tests training_ftp_tests_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_ftp_tests_update ON public.training_ftp_tests FOR UPDATE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission))) WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_goal_forecasts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_goal_forecasts ENABLE ROW LEVEL SECURITY;

--
-- Name: training_goal_forecasts training_goal_forecasts_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_goal_forecasts_select ON public.training_goal_forecasts FOR SELECT TO authenticated USING (public.current_user_can_train_profile(profile_id));


--
-- Name: training_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: training_goals training_goals_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_goals_select ON public.training_goals FOR SELECT TO authenticated USING (public.current_user_can_train_profile(profile_id));


--
-- Name: training_goals training_goals_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_goals_write ON public.training_goals TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission))) WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: training_plans training_plans_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_plans_select ON public.training_plans FOR SELECT TO authenticated USING (public.current_user_can_train_profile(profile_id));


--
-- Name: training_plans training_plans_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_plans_write ON public.training_plans TO authenticated USING ((((trainer_id = ( SELECT auth.uid() AS uid)) AND public.current_user_can_train_profile(profile_id)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission))) WITH CHECK ((((trainer_id = ( SELECT auth.uid() AS uid)) AND public.current_user_can_train_profile(profile_id)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: training_preferences training_preferences_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_preferences_select ON public.training_preferences FOR SELECT TO authenticated USING (public.current_user_in_training_chat(profile_id));


--
-- Name: training_replan_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_replan_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: training_replan_requests training_replan_requests_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_replan_requests_select ON public.training_replan_requests FOR SELECT TO authenticated USING (public.current_user_can_train_profile(profile_id));


--
-- Name: training_season_periods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_season_periods ENABLE ROW LEVEL SECURITY;

--
-- Name: training_season_periods training_season_periods_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_season_periods_delete ON public.training_season_periods FOR DELETE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_season_periods training_season_periods_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_season_periods_insert ON public.training_season_periods FOR INSERT TO authenticated WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_season_periods training_season_periods_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_season_periods_select ON public.training_season_periods FOR SELECT TO authenticated USING (public.current_user_can_train_profile(profile_id));


--
-- Name: training_season_periods training_season_periods_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_season_periods_update ON public.training_season_periods FOR UPDATE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission))) WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_season_targets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_season_targets ENABLE ROW LEVEL SECURITY;

--
-- Name: training_season_targets training_season_targets_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_season_targets_delete ON public.training_season_targets FOR DELETE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_season_targets training_season_targets_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_season_targets_insert ON public.training_season_targets FOR INSERT TO authenticated WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_season_targets training_season_targets_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_season_targets_select ON public.training_season_targets FOR SELECT TO authenticated USING (public.current_user_can_train_profile(profile_id));


--
-- Name: training_season_targets training_season_targets_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_season_targets_update ON public.training_season_targets FOR UPDATE TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission))) WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_workout_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_workout_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: training_workout_reports training_workout_reports_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_workout_reports_select ON public.training_workout_reports FOR SELECT TO authenticated USING (public.current_user_can_train_profile(profile_id));


--
-- Name: training_workout_reports training_workout_reports_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_workout_reports_write ON public.training_workout_reports TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR ((trainer_id = ( SELECT auth.uid() AS uid)) AND public.current_user_can_train_profile(profile_id)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission))) WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) OR ((trainer_id = ( SELECT auth.uid() AS uid)) AND public.current_user_can_train_profile(profile_id)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: training_workout_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_workout_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: training_workout_templates training_workout_templates_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_workout_templates_delete ON public.training_workout_templates FOR DELETE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) AND (is_standard = false)));


--
-- Name: training_workout_templates training_workout_templates_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_workout_templates_insert ON public.training_workout_templates FOR INSERT TO authenticated WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) AND (is_standard = false) AND ( SELECT public.current_user_has_permission('training.create_plans'::text) AS current_user_has_permission)));


--
-- Name: training_workout_templates training_workout_templates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_workout_templates_select ON public.training_workout_templates FOR SELECT TO authenticated USING (( SELECT public.current_user_has_permission('training.create_plans'::text) AS current_user_has_permission));


--
-- Name: training_workout_templates training_workout_templates_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_workout_templates_update ON public.training_workout_templates FOR UPDATE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) AND (is_standard = false))) WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) AND (is_standard = false)));


--
-- Name: training_workouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_workouts ENABLE ROW LEVEL SECURITY;

--
-- Name: training_workouts training_workouts_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_workouts_select ON public.training_workouts FOR SELECT TO authenticated USING (public.current_user_can_train_profile(profile_id));


--
-- Name: training_workouts training_workouts_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_workouts_write ON public.training_workouts TO authenticated USING ((((trainer_id = ( SELECT auth.uid() AS uid)) AND public.current_user_can_train_profile(profile_id)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission))) WITH CHECK ((((trainer_id = ( SELECT auth.uid() AS uid)) AND public.current_user_can_train_profile(profile_id)) OR ( SELECT public.current_user_has_permission('training.manage_assignments'::text) AS current_user_has_permission)));


--
-- Name: ttt_plan_riders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ttt_plan_riders ENABLE ROW LEVEL SECURITY;

--
-- Name: ttt_plan_riders ttt_plan_riders_delete_captain; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ttt_plan_riders_delete_captain ON public.ttt_plan_riders FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.ttt_plans p
  WHERE ((p.id = ttt_plan_riders.plan_id) AND public.can_manage_ttt_plan(p.parent_team_id, p.team_id)))));


--
-- Name: ttt_plan_riders ttt_plan_riders_insert_captain; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ttt_plan_riders_insert_captain ON public.ttt_plan_riders FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.ttt_plans p
  WHERE ((p.id = ttt_plan_riders.plan_id) AND public.can_manage_ttt_plan(p.parent_team_id, p.team_id)))));


--
-- Name: ttt_plan_riders ttt_plan_riders_select_team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ttt_plan_riders_select_team ON public.ttt_plan_riders FOR SELECT TO authenticated USING (public.can_read_ttt_plan(plan_id));


--
-- Name: ttt_plan_riders ttt_plan_riders_update_captain; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ttt_plan_riders_update_captain ON public.ttt_plan_riders FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.ttt_plans p
  WHERE ((p.id = ttt_plan_riders.plan_id) AND public.can_manage_ttt_plan(p.parent_team_id, p.team_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.ttt_plans p
  WHERE ((p.id = ttt_plan_riders.plan_id) AND public.can_manage_ttt_plan(p.parent_team_id, p.team_id)))));


--
-- Name: ttt_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ttt_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: ttt_plans ttt_plans_delete_captain; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ttt_plans_delete_captain ON public.ttt_plans FOR DELETE TO authenticated USING (public.can_manage_ttt_plan(parent_team_id, team_id));


--
-- Name: ttt_plans ttt_plans_insert_captain; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ttt_plans_insert_captain ON public.ttt_plans FOR INSERT TO authenticated WITH CHECK (public.can_manage_ttt_plan(parent_team_id, team_id));


--
-- Name: ttt_plans ttt_plans_select_team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ttt_plans_select_team ON public.ttt_plans FOR SELECT TO authenticated USING (public.can_read_ttt_plan(id));


--
-- Name: ttt_plans ttt_plans_update_captain; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ttt_plans_update_captain ON public.ttt_plans FOR UPDATE TO authenticated USING (public.can_manage_ttt_plan(parent_team_id, team_id)) WITH CHECK (public.can_manage_ttt_plan(parent_team_id, team_id));


--
-- Name: whatsapp_groups wa_groups_permission_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wa_groups_permission_write ON public.whatsapp_groups TO authenticated USING (( SELECT public.current_user_has_permission('community.manage'::text) AS current_user_has_permission)) WITH CHECK (( SELECT public.current_user_has_permission('community.manage'::text) AS current_user_has_permission));


--
-- Name: whatsapp_groups wa_groups_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wa_groups_select_authenticated ON public.whatsapp_groups FOR SELECT TO authenticated USING (true);


--
-- Name: weekly_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: weekly_reviews weekly_reviews_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY weekly_reviews_self_read ON public.weekly_reviews FOR SELECT TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: whatsapp_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: wtrl_team_riders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wtrl_team_riders ENABLE ROW LEVEL SECURITY;

--
-- Name: wtrl_team_riders wtrl_team_riders_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wtrl_team_riders_select_authenticated ON public.wtrl_team_riders FOR SELECT TO authenticated USING (true);


--
-- Name: wtrl_teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wtrl_teams ENABLE ROW LEVEL SECURITY;

--
-- Name: wtrl_teams wtrl_teams_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wtrl_teams_select_authenticated ON public.wtrl_teams FOR SELECT TO authenticated USING (true);


--
-- Name: zrl_race_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zrl_race_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: zrl_rider_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zrl_rider_results ENABLE ROW LEVEL SECURITY;

--
-- Name: zrl_rider_results zrl_rider_results_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zrl_rider_results_select_authenticated ON public.zrl_rider_results FOR SELECT TO authenticated USING (true);


--
-- Name: zrl_rider_results zrl_rider_results_team_sync_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zrl_rider_results_team_sync_write ON public.zrl_rider_results TO authenticated USING (( SELECT public.current_user_has_permission('teams.sync_sources'::text) AS current_user_has_permission)) WITH CHECK (( SELECT public.current_user_has_permission('teams.sync_sources'::text) AS current_user_has_permission));


--
-- Name: zrl_team_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zrl_team_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: zrl_team_assignments zrl_team_assignments_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zrl_team_assignments_read ON public.zrl_team_assignments FOR SELECT TO authenticated USING (true);


--
-- Name: zrl_team_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zrl_team_results ENABLE ROW LEVEL SECURITY;

--
-- Name: zrl_team_results zrl_team_results_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zrl_team_results_read ON public.zrl_team_results FOR SELECT TO authenticated USING (true);


--
-- Name: zwb_ds_budget; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwb_ds_budget ENABLE ROW LEVEL SECURITY;

--
-- Name: zwb_ds_rider_states; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwb_ds_rider_states ENABLE ROW LEVEL SECURITY;

--
-- Name: zwb_segment_maps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwb_segment_maps ENABLE ROW LEVEL SECURITY;

--
-- Name: zwb_segments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwb_segments ENABLE ROW LEVEL SECURITY;

--
-- Name: zwb_segments zwb_segments_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zwb_segments_members_read ON public.zwb_segments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))));


--
-- Name: zwbeker_congrats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwbeker_congrats ENABLE ROW LEVEL SECURITY;

--
-- Name: zwbeker_congrats zwbeker_congrats_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zwbeker_congrats_select ON public.zwbeker_congrats FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.zwbekers b
  WHERE ((b.id = zwbeker_congrats.beker_id) AND (b.status = 'toegekend'::text)))));


--
-- Name: zwbeker_winners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwbeker_winners ENABLE ROW LEVEL SECURITY;

--
-- Name: zwbeker_winners zwbeker_winners_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zwbeker_winners_select ON public.zwbeker_winners FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.zwbekers b
  WHERE (b.id = zwbeker_winners.beker_id))));


--
-- Name: zwbekers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwbekers ENABLE ROW LEVEL SECURITY;

--
-- Name: zwbekers zwbekers_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zwbekers_select ON public.zwbekers FOR SELECT TO authenticated USING ((((status = 'toegekend'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved)))) OR (profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.current_user_has_permission('achievements.finalize'::text) AS current_user_has_permission)));


--
-- Name: zwbgame_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwbgame_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: zwbgame_preferences zwbgame_preferences_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zwbgame_preferences_self ON public.zwbgame_preferences TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved)))));


--
-- Name: zwbgame_riders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwbgame_riders ENABLE ROW LEVEL SECURITY;

--
-- Name: zwbgame_riders zwbgame_riders_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zwbgame_riders_self ON public.zwbgame_riders FOR SELECT TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: zwbgame_roster_exclusions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwbgame_roster_exclusions ENABLE ROW LEVEL SECURITY;

--
-- Name: zwbriljant_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwbriljant_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: zwbriljant_preferences zwbriljant_preferences_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zwbriljant_preferences_own ON public.zwbriljant_preferences TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid))) WITH CHECK (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved)))));


--
-- Name: zwbriljant_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwbriljant_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: zwbriljant_snapshots zwbriljant_snapshots_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zwbriljant_snapshots_delete ON public.zwbriljant_snapshots FOR DELETE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));


--
-- Name: zwbriljant_snapshots zwbriljant_snapshots_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zwbriljant_snapshots_read ON public.zwbriljant_snapshots FOR SELECT TO authenticated USING (((profile_id = ( SELECT auth.uid() AS uid)) OR (public.zwbriljant_shares(profile_id) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND p.is_approved))) AND (NOT (EXISTS ( SELECT 1
   FROM public.zwbriljant_preferences pref
  WHERE ((pref.profile_id = ( SELECT auth.uid() AS uid)) AND (NOT pref.visible))))))));


--
-- Name: zwift_bike_parts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwift_bike_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: zwift_bike_parts zwift_bike_parts_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zwift_bike_parts_read ON public.zwift_bike_parts FOR SELECT TO authenticated USING (true);


--
-- Name: zwift_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwift_events ENABLE ROW LEVEL SECURITY;

--
-- Name: zwift_events zwift_events_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zwift_events_read ON public.zwift_events FOR SELECT TO authenticated USING (true);


--
-- Name: zwift_legacy_velo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwift_legacy_velo ENABLE ROW LEVEL SECURITY;

--
-- Name: zwift_race_score_sync; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwift_race_score_sync ENABLE ROW LEVEL SECURITY;

--
-- Name: zwift_race_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwift_race_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: zwift_rider_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwift_rider_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: zwift_routes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwift_routes ENABLE ROW LEVEL SECURITY;

--
-- Name: zwift_routes zwift_routes_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zwift_routes_read ON public.zwift_routes FOR SELECT TO authenticated USING (true);


--
-- Name: zwift_segment_bests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zwift_segment_bests ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

-- pg_dump zette het zoekpad leeg; wat hieronder komt, noemt functies zonder schema.
select pg_catalog.set_config('search_path', 'public, extensions', false);

-- Rechten -------------------------------------------------------------------

revoke all on table public."achievement_awards" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."achievement_awards" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."achievement_awards" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."achievement_awards" to service_role;
revoke all on table public."achievement_badges" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."achievement_badges" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."achievement_badges" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."achievement_badges" to service_role;
revoke all on table public."ai_jobs" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ai_jobs" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ai_jobs" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ai_jobs" to service_role;
revoke all on table public."ai_usage" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ai_usage" to service_role;
revoke all on sequence public."ai_usage_id_seq" from public, anon, authenticated, service_role;
grant select, update, usage on sequence public."ai_usage_id_seq" to anon;
grant select, update, usage on sequence public."ai_usage_id_seq" to authenticated;
grant select, update, usage on sequence public."ai_usage_id_seq" to service_role;
revoke all on table public."announcements" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."announcements" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."announcements" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."announcements" to service_role;
revoke all on table public."app_updates" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."app_updates" to service_role;
grant insert, select, update, delete on table public."app_updates" to authenticated;
revoke all on table public."audit_log" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."audit_log" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."audit_log" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."audit_log" to service_role;
revoke all on table public."bike_components" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."bike_components" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."bike_components" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."bike_components" to service_role;
revoke all on table public."birthday_messages" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."birthday_messages" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."birthday_messages" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."birthday_messages" to service_role;
revoke all on table public."birthday_photos" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."birthday_photos" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."birthday_photos" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."birthday_photos" to service_role;
revoke all on table public."birthday_ride_rsvps" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."birthday_ride_rsvps" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."birthday_ride_rsvps" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."birthday_ride_rsvps" to service_role;
revoke all on table public."birthday_rides" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."birthday_rides" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."birthday_rides" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."birthday_rides" to service_role;
revoke all on table public."bokaal_bets" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."bokaal_bets" to service_role;
grant select on table public."bokaal_bets" to authenticated;
revoke all on table public."bokaal_bonus_answers" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."bokaal_bonus_answers" to service_role;
grant select on table public."bokaal_bonus_answers" to authenticated;
revoke all on table public."bokaal_players" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."bokaal_players" to service_role;
grant insert, select, delete on table public."bokaal_players" to authenticated;
revoke all on table public."bokaal_races" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."bokaal_races" to service_role;
grant select on table public."bokaal_races" to authenticated;
revoke all on table public."bokaal_ratings" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."bokaal_ratings" to service_role;
revoke all on table public."calendar_feed_tokens" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."calendar_feed_tokens" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."calendar_feed_tokens" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."calendar_feed_tokens" to service_role;
revoke all on table public."club_blocks" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_blocks" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_blocks" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_blocks" to service_role;
revoke all on table public."club_ladder_event_expectations" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_event_expectations" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_event_expectations" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_event_expectations" to service_role;
revoke all on table public."club_ladder_favorite_routes" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_favorite_routes" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_favorite_routes" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_favorite_routes" to service_role;
revoke all on table public."club_ladder_fixture_signups" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_fixture_signups" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_fixture_signups" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_fixture_signups" to service_role;
revoke all on table public."club_ladder_match_riders" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_match_riders" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_match_riders" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_match_riders" to service_role;
revoke all on table public."club_ladder_matches" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_matches" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_matches" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_ladder_matches" to service_role;
revoke all on table public."club_modules" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_modules" to service_role;
grant select on table public."club_modules" to anon;
grant select on table public."club_modules" to authenticated;
revoke all on table public."club_settings" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_settings" to service_role;
grant select on table public."club_settings" to anon;
grant select on table public."club_settings" to authenticated;
revoke all on table public."club_stories" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_stories" to service_role;
grant select on table public."club_stories" to authenticated;
revoke all on table public."club_story_photos" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_story_photos" to service_role;
grant select on table public."club_story_photos" to authenticated;
revoke all on table public."club_zwift_blocks" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_zwift_blocks" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_zwift_blocks" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."club_zwift_blocks" to service_role;
revoke all on table public."cols" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."cols" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."cols" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."cols" to service_role;
revoke all on table public."community_role_permissions" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."community_role_permissions" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."community_role_permissions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."community_role_permissions" to service_role;
revoke all on table public."event_chat_messages" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_chat_messages" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_chat_messages" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_chat_messages" to service_role;
revoke all on table public."event_climbs" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_climbs" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_climbs" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_climbs" to service_role;
revoke all on table public."event_links" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_links" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_links" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_links" to service_role;
revoke all on table public."event_pacing_generations" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_pacing_generations" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_pacing_generations" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_pacing_generations" to service_role;
revoke all on table public."event_pacing_plans" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_pacing_plans" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_pacing_plans" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_pacing_plans" to service_role;
revoke all on table public."event_photos" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_photos" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_photos" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_photos" to service_role;
revoke all on table public."event_pois" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_pois" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_pois" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_pois" to service_role;
revoke all on table public."event_program_links" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_program_links" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_program_links" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_program_links" to service_role;
revoke all on table public."event_programs" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_programs" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_programs" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_programs" to service_role;
revoke all on table public."event_reminder_sends" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_reminder_sends" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_reminder_sends" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_reminder_sends" to service_role;
revoke all on table public."event_report_comments" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_report_comments" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_report_comments" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_report_comments" to service_role;
revoke all on table public."event_reports" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_reports" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_reports" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_reports" to service_role;
revoke all on table public."event_results" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_results" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_results" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_results" to service_role;
revoke all on table public."event_rsvps" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_rsvps" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_rsvps" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_rsvps" to service_role;
revoke all on table public."event_zones" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_zones" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_zones" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."event_zones" to service_role;
revoke all on table public."events" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."events" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."events" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."events" to service_role;
revoke all on table public."external_event_candidates" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."external_event_candidates" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."external_event_candidates" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."external_event_candidates" to service_role;
revoke all on table public."external_event_participants" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."external_event_participants" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."external_event_participants" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."external_event_participants" to service_role;
revoke all on table public."frr_gc_exclusions" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_gc_exclusions" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_gc_exclusions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_gc_exclusions" to service_role;
revoke all on table public."frr_gc_history" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_gc_history" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_gc_history" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_gc_history" to service_role;
revoke all on table public."frr_gc_standings" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_gc_standings" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_gc_standings" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_gc_standings" to service_role;
revoke all on table public."frr_slot_entrants" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_slot_entrants" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_slot_entrants" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_slot_entrants" to service_role;
revoke all on table public."frr_stage_results" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_stage_results" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_stage_results" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_stage_results" to service_role;
revoke all on table public."frr_tours" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_tours" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_tours" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_tours" to service_role;
revoke all on table public."frr_watch_riders" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_watch_riders" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_watch_riders" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."frr_watch_riders" to service_role;
revoke all on table public."integration_health" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."integration_health" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."integration_health" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."integration_health" to service_role;
revoke all on table public."integration_notices" from public, anon, authenticated, service_role;
grant select, truncate, references, trigger, maintain on table public."integration_notices" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."integration_notices" to service_role;
revoke all on table public."intervals_activities" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."intervals_activities" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."intervals_activities" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."intervals_activities" to service_role;
revoke all on table public."intervals_connections" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."intervals_connections" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."intervals_connections" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."intervals_connections" to service_role;
revoke all on table public."intervals_strength_muscles" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."intervals_strength_muscles" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."intervals_strength_muscles" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."intervals_strength_muscles" to service_role;
revoke all on table public."knowledge_messages" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."knowledge_messages" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."knowledge_messages" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."knowledge_messages" to service_role;
revoke all on table public."knowledge_threads" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."knowledge_threads" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."knowledge_threads" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."knowledge_threads" to service_role;
revoke all on table public."knowledge_topics" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."knowledge_topics" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."knowledge_topics" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."knowledge_topics" to service_role;
revoke all on table public."ladder_pool" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ladder_pool" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ladder_pool" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ladder_pool" to service_role;
revoke all on table public."ladder_ranks" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ladder_ranks" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ladder_ranks" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ladder_ranks" to service_role;
revoke all on table public."ladder_roster_riders" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ladder_roster_riders" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ladder_roster_riders" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ladder_roster_riders" to service_role;
revoke all on table public."ladder_withdrawn" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ladder_withdrawn" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ladder_withdrawn" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ladder_withdrawn" to service_role;
revoke all on table public."live_positions" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."live_positions" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."live_positions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."live_positions" to service_role;
revoke all on sequence public."live_positions_id_seq" from public, anon, authenticated, service_role;
grant select, update, usage on sequence public."live_positions_id_seq" to anon;
grant select, update, usage on sequence public."live_positions_id_seq" to authenticated;
grant select, update, usage on sequence public."live_positions_id_seq" to service_role;
revoke all on table public."live_sessions" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."live_sessions" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."live_sessions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."live_sessions" to service_role;
revoke all on table public."live_tracker_tokens" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."live_tracker_tokens" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."live_tracker_tokens" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."live_tracker_tokens" to service_role;
revoke all on table public."maintenance_tips" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."maintenance_tips" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."maintenance_tips" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."maintenance_tips" to service_role;
revoke all on table public."media_items" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."media_items" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."media_items" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."media_items" to service_role;
revoke all on table public."member_benefits" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_benefits" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_benefits" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_benefits" to service_role;
revoke all on table public."member_knowledge" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_knowledge" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_knowledge" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_knowledge" to service_role;
revoke all on table public."member_knowledge_topics" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_knowledge_topics" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_knowledge_topics" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_knowledge_topics" to service_role;
revoke all on table public."member_protocol_checks" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_protocol_checks" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_protocol_checks" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_protocol_checks" to service_role;
revoke all on table public."member_protocol_core_sessions" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_protocol_core_sessions" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_protocol_core_sessions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_protocol_core_sessions" to service_role;
revoke all on table public."member_protocols" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_protocols" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_protocols" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_protocols" to service_role;
revoke all on table public."member_question_askers" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_question_askers" to service_role;
grant insert, select, delete on table public."member_question_askers" to authenticated;
revoke all on table public."member_questions" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_questions" to service_role;
grant insert, select, update, delete on table public."member_questions" to authenticated;
revoke all on table public."member_tips" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_tips" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_tips" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_tips" to service_role;
revoke all on table public."member_zwift_bikes" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_zwift_bikes" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_zwift_bikes" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."member_zwift_bikes" to service_role;
revoke all on table public."mobility_exercises" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."mobility_exercises" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."mobility_exercises" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."mobility_exercises" to service_role;
revoke all on table public."mobility_series" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."mobility_series" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."mobility_series" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."mobility_series" to service_role;
revoke all on table public."mobility_series_items" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."mobility_series_items" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."mobility_series_items" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."mobility_series_items" to service_role;
revoke all on table public."mobility_sessions" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."mobility_sessions" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."mobility_sessions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."mobility_sessions" to service_role;
revoke all on table public."notification_preferences" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."notification_preferences" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."notification_preferences" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."notification_preferences" to service_role;
revoke all on table public."nutrition_foods" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_foods" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_foods" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_foods" to service_role;
revoke all on table public."nutrition_log_ai_usage" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_log_ai_usage" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_log_ai_usage" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_log_ai_usage" to service_role;
revoke all on table public."nutrition_log_items" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_log_items" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_log_items" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_log_items" to service_role;
revoke all on table public."nutrition_log_meals" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_log_meals" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_log_meals" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_log_meals" to service_role;
revoke all on table public."nutrition_log_settings" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_log_settings" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_log_settings" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_log_settings" to service_role;
revoke all on table public."nutrition_menu_choices" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_menu_choices" to service_role;
grant insert, select, update, delete on table public."nutrition_menu_choices" to authenticated;
revoke all on table public."nutrition_products" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_products" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_products" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_products" to service_role;
revoke all on table public."nutrition_profiles" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_profiles" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_profiles" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_profiles" to service_role;
revoke all on table public."nutrition_recipe_ingredients" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_recipe_ingredients" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_recipe_ingredients" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_recipe_ingredients" to service_role;
revoke all on table public."nutrition_recipe_prefs" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_recipe_prefs" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_recipe_prefs" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_recipe_prefs" to service_role;
revoke all on table public."nutrition_recipes" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_recipes" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_recipes" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_recipes" to service_role;
revoke all on table public."nutrition_reminder_sends" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_reminder_sends" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_reminder_sends" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_reminder_sends" to service_role;
revoke all on table public."nutrition_sweat_tests" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_sweat_tests" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_sweat_tests" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."nutrition_sweat_tests" to service_role;
revoke all on table public."omnium_edition_events" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_edition_events" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_edition_events" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_edition_events" to service_role;
revoke all on table public."omnium_edition_standings" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_edition_standings" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_edition_standings" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_edition_standings" to service_role;
revoke all on table public."omnium_editions" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_editions" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_editions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_editions" to service_role;
revoke all on table public."omnium_entrants" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_entrants" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_entrants" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_entrants" to service_role;
revoke all on table public."omnium_kit_codes" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_kit_codes" to service_role;
revoke all on table public."omnium_prize_awards" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_prize_awards" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_prize_awards" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_prize_awards" to service_role;
revoke all on table public."omnium_prizes" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_prizes" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_prizes" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_prizes" to service_role;
revoke all on table public."omnium_results" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_results" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_results" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_results" to service_role;
revoke all on table public."omnium_rider_links" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_rider_links" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_rider_links" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_rider_links" to service_role;
revoke all on table public."omnium_riders" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_riders" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_riders" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_riders" to service_role;
revoke all on table public."omnium_season_standings" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_season_standings" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_season_standings" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_season_standings" to service_role;
revoke all on table public."omnium_seasons" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_seasons" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_seasons" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."omnium_seasons" to service_role;
revoke all on table public."outdoor_route_suggestions" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."outdoor_route_suggestions" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."outdoor_route_suggestions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."outdoor_route_suggestions" to service_role;
revoke all on table public."poll_options" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."poll_options" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."poll_options" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."poll_options" to service_role;
revoke all on table public."poll_votes" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."poll_votes" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."poll_votes" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."poll_votes" to service_role;
revoke all on table public."polls" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."polls" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."polls" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."polls" to service_role;
revoke all on table public."post_comments" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."post_comments" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."post_comments" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."post_comments" to service_role;
revoke all on table public."post_likes" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."post_likes" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."post_likes" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."post_likes" to service_role;
revoke all on table public."posts" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."posts" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."posts" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."posts" to service_role;
revoke all on table public."profile_blocks" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_blocks" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_blocks" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_blocks" to service_role;
revoke all on table public."profile_climbed_cols" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_climbed_cols" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_climbed_cols" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_climbed_cols" to service_role;
revoke all on table public."profile_completed_segments" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_completed_segments" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_completed_segments" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_completed_segments" to service_role;
revoke all on table public."profile_ftp_history" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_ftp_history" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_ftp_history" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_ftp_history" to service_role;
revoke all on table public."profile_sport_settings" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_sport_settings" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_sport_settings" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_sport_settings" to service_role;
revoke all on table public."profile_start_points" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_start_points" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_start_points" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_start_points" to service_role;
revoke all on table public."profile_stats_tiles" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_stats_tiles" to service_role;
grant insert, select, update, delete on table public."profile_stats_tiles" to authenticated;
revoke all on table public."profile_wellness" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_wellness" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_wellness" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_wellness" to service_role;
revoke all on table public."profile_zwift_blocks" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_zwift_blocks" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_zwift_blocks" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profile_zwift_blocks" to service_role;
revoke all on table public."profiles" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profiles" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profiles" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."profiles" to service_role;
revoke all on table public."push_subscriptions" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."push_subscriptions" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."push_subscriptions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."push_subscriptions" to service_role;
revoke all on table public."race_briefings" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."race_briefings" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."race_briefings" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."race_briefings" to service_role;
revoke all on table public."rate_limits" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."rate_limits" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."rate_limits" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."rate_limits" to service_role;
revoke all on table public."rider_power_profiles" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."rider_power_profiles" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."rider_power_profiles" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."rider_power_profiles" to service_role;
revoke all on table public."roster_entries" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."roster_entries" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."roster_entries" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."roster_entries" to service_role;
revoke all on table public."sponsors" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."sponsors" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."sponsors" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."sponsors" to service_role;
revoke all on table public."src_month_entries" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_month_entries" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_month_entries" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_month_entries" to service_role;
revoke all on table public."src_races" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_races" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_races" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_races" to service_role;
revoke all on table public."src_results" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_results" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_results" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_results" to service_role;
revoke all on table public."src_sync_state" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_sync_state" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_sync_state" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_sync_state" to service_role;
revoke all on table public."src_team_results" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_team_results" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_team_results" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."src_team_results" to service_role;
revoke all on table public."strava_activities" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_activities" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_activities" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_activities" to service_role;
revoke all on table public."strava_activity_dismissals" from public, anon, authenticated, service_role;
grant select, truncate, references, trigger, maintain on table public."strava_activity_dismissals" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_activity_dismissals" to service_role;
revoke all on table public."strava_activity_summaries" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_activity_summaries" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_activity_summaries" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_activity_summaries" to service_role;
revoke all on table public."strava_api_usage" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_api_usage" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_api_usage" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_api_usage" to service_role;
revoke all on table public."strava_bikes" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_bikes" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_bikes" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_bikes" to service_role;
revoke all on table public."strava_connections" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_connections" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_connections" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_connections" to service_role;
revoke all on table public."strava_webhook_events" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_webhook_events" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_webhook_events" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_webhook_events" to service_role;
revoke all on sequence public."strava_webhook_events_id_seq" from public, anon, authenticated, service_role;
grant select, update, usage on sequence public."strava_webhook_events_id_seq" to anon;
grant select, update, usage on sequence public."strava_webhook_events_id_seq" to authenticated;
grant select, update, usage on sequence public."strava_webhook_events_id_seq" to service_role;
revoke all on table public."strava_webhook_subscriptions" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_webhook_subscriptions" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_webhook_subscriptions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."strava_webhook_subscriptions" to service_role;
revoke all on table public."symptom_logs" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."symptom_logs" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."symptom_logs" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."symptom_logs" to service_role;
revoke all on table public."team_event_availability" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_event_availability" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_event_availability" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_event_availability" to service_role;
revoke all on table public."team_event_lineups" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_event_lineups" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_event_lineups" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_event_lineups" to service_role;
revoke all on table public."team_member_seed_overrides" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_member_seed_overrides" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_member_seed_overrides" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_member_seed_overrides" to service_role;
revoke all on table public."team_members" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_members" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_members" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_members" to service_role;
revoke all on table public."team_racepasses" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_racepasses" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_racepasses" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_racepasses" to service_role;
revoke all on table public."team_result_sources" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_result_sources" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_result_sources" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_result_sources" to service_role;
revoke all on table public."team_results" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_results" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_results" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."team_results" to service_role;
revoke all on table public."teams" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."teams" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."teams" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."teams" to service_role;
revoke all on table public."telegram_links" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."telegram_links" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."telegram_links" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."telegram_links" to service_role;
revoke all on table public."training_adaptation_runs" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_adaptation_runs" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_adaptation_runs" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_adaptation_runs" to service_role;
revoke all on table public."training_ai_generations" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_ai_generations" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_ai_generations" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_ai_generations" to service_role;
revoke all on table public."training_ai_prompts" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_ai_prompts" to service_role;
revoke all on table public."training_availability" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_availability" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_availability" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_availability" to service_role;
revoke all on table public."training_chat_messages" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_chat_messages" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_chat_messages" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_chat_messages" to service_role;
revoke all on table public."training_coach_assignments" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_coach_assignments" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_coach_assignments" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_coach_assignments" to service_role;
revoke all on table public."training_engine_comparisons" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_engine_comparisons" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_engine_comparisons" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_engine_comparisons" to service_role;
revoke all on table public."training_ftp_tests" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_ftp_tests" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_ftp_tests" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_ftp_tests" to service_role;
revoke all on table public."training_goal_forecasts" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_goal_forecasts" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_goal_forecasts" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_goal_forecasts" to service_role;
revoke all on table public."training_goals" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_goals" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_goals" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_goals" to service_role;
revoke all on table public."training_plans" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_plans" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_plans" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_plans" to service_role;
revoke all on table public."training_preferences" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_preferences" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_preferences" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_preferences" to service_role;
revoke all on table public."training_replan_requests" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_replan_requests" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_replan_requests" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_replan_requests" to service_role;
revoke all on table public."training_season_periods" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_season_periods" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_season_periods" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_season_periods" to service_role;
revoke all on table public."training_season_targets" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_season_targets" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_season_targets" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_season_targets" to service_role;
revoke all on table public."training_workout_reports" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_workout_reports" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_workout_reports" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_workout_reports" to service_role;
revoke all on table public."training_workout_templates" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_workout_templates" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_workout_templates" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_workout_templates" to service_role;
revoke all on table public."training_workouts" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_workouts" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_workouts" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."training_workouts" to service_role;
revoke all on table public."ttt_plan_riders" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ttt_plan_riders" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ttt_plan_riders" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ttt_plan_riders" to service_role;
revoke all on table public."ttt_plans" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ttt_plans" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ttt_plans" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."ttt_plans" to service_role;
revoke all on table public."weekly_reviews" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."weekly_reviews" to service_role;
grant select on table public."weekly_reviews" to authenticated;
revoke all on table public."whatsapp_groups" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."whatsapp_groups" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."whatsapp_groups" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."whatsapp_groups" to service_role;
revoke all on table public."wtrl_team_riders" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."wtrl_team_riders" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."wtrl_team_riders" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."wtrl_team_riders" to service_role;
revoke all on table public."wtrl_teams" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."wtrl_teams" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."wtrl_teams" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."wtrl_teams" to service_role;
revoke all on table public."zrl_race_snapshots" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zrl_race_snapshots" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zrl_race_snapshots" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zrl_race_snapshots" to service_role;
revoke all on table public."zrl_rider_results" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zrl_rider_results" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zrl_rider_results" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zrl_rider_results" to service_role;
revoke all on table public."zrl_team_assignments" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zrl_team_assignments" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zrl_team_assignments" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zrl_team_assignments" to service_role;
revoke all on table public."zrl_team_results" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zrl_team_results" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zrl_team_results" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zrl_team_results" to service_role;
revoke all on table public."zwb_ds_budget" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwb_ds_budget" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwb_ds_budget" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwb_ds_budget" to service_role;
revoke all on table public."zwb_ds_rider_states" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwb_ds_rider_states" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwb_ds_rider_states" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwb_ds_rider_states" to service_role;
revoke all on table public."zwb_segment_maps" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwb_segment_maps" to service_role;
revoke all on table public."zwb_segments" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwb_segments" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwb_segments" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwb_segments" to service_role;
revoke all on table public."zwbeker_congrats" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwbeker_congrats" to service_role;
grant select on table public."zwbeker_congrats" to authenticated;
revoke all on table public."zwbeker_winners" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwbeker_winners" to service_role;
grant select on table public."zwbeker_winners" to authenticated;
revoke all on table public."zwbekers" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwbekers" to service_role;
grant select on table public."zwbekers" to authenticated;
revoke all on table public."zwbgame_preferences" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwbgame_preferences" to service_role;
grant insert, select, update on table public."zwbgame_preferences" to authenticated;
revoke all on table public."zwbgame_riders" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwbgame_riders" to service_role;
grant select on table public."zwbgame_riders" to authenticated;
revoke all on table public."zwbgame_roster_exclusions" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwbgame_roster_exclusions" to service_role;
revoke all on table public."zwbriljant_preferences" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwbriljant_preferences" to service_role;
grant insert, select, update, delete on table public."zwbriljant_preferences" to authenticated;
revoke all on table public."zwbriljant_snapshots" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwbriljant_snapshots" to service_role;
grant select, delete on table public."zwbriljant_snapshots" to authenticated;
revoke all on table public."zwift_bike_parts" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_bike_parts" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_bike_parts" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_bike_parts" to service_role;
revoke all on sequence public."zwift_bike_parts_id_seq" from public, anon, authenticated, service_role;
grant select, update, usage on sequence public."zwift_bike_parts_id_seq" to anon;
grant select, update, usage on sequence public."zwift_bike_parts_id_seq" to authenticated;
grant select, update, usage on sequence public."zwift_bike_parts_id_seq" to service_role;
revoke all on table public."zwift_events" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_events" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_events" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_events" to service_role;
revoke all on table public."zwift_legacy_velo" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_legacy_velo" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_legacy_velo" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_legacy_velo" to service_role;
revoke all on table public."zwift_race_score_sync" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_race_score_sync" to service_role;
revoke all on table public."zwift_race_scores" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_race_scores" to service_role;
revoke all on table public."zwift_rider_metrics" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_rider_metrics" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_rider_metrics" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_rider_metrics" to service_role;
revoke all on table public."zwift_routes" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_routes" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_routes" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_routes" to service_role;
revoke all on table public."zwift_segment_bests" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_segment_bests" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_segment_bests" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_segment_bests" to service_role;
revoke all on table public."zwift_world_distances" from public, anon, authenticated, service_role;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_world_distances" to anon;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_world_distances" to authenticated;
grant insert, select, update, delete, truncate, references, trigger, maintain on table public."zwift_world_distances" to service_role;
revoke all on function bokaal_answer_bonus(uuid,integer) from public, anon, authenticated, service_role;
grant execute on function bokaal_answer_bonus(uuid,integer) to authenticated, service_role;
revoke all on function bokaal_balance(uuid,text) from public, anon, authenticated, service_role;
grant execute on function bokaal_balance(uuid,text) to authenticated, service_role;
revoke all on function bokaal_cancel_bet(uuid) from public, anon, authenticated, service_role;
grant execute on function bokaal_cancel_bet(uuid) to authenticated, service_role;
revoke all on function bokaal_member() from public, anon, authenticated, service_role;
grant execute on function bokaal_member() to authenticated, service_role;
revoke all on function bokaal_place_bet(uuid,text,text,text,integer) from public, anon, authenticated, service_role;
grant execute on function bokaal_place_bet(uuid,text,text,text,integer) to authenticated, service_role;
revoke all on function bokaal_standings(text) from public, anon, authenticated, service_role;
grant execute on function bokaal_standings(text) to authenticated, service_role;
revoke all on function can_manage_ttt_plan(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function can_manage_ttt_plan(uuid,uuid) to public, anon, authenticated, service_role;
revoke all on function can_read_ttt_plan(uuid) from public, anon, authenticated, service_role;
grant execute on function can_read_ttt_plan(uuid) to public, anon, authenticated, service_role;
revoke all on function claim_roster_entry(uuid) from public, anon, authenticated, service_role;
grant execute on function claim_roster_entry(uuid) to public, anon, authenticated, service_role;
revoke all on function claim_zwb_ds_budget(integer) from public, anon, authenticated, service_role;
grant execute on function claim_zwb_ds_budget(integer) to service_role;
revoke all on function close_knowledge_thread(uuid) from public, anon, authenticated, service_role;
grant execute on function close_knowledge_thread(uuid) to authenticated, service_role;
revoke all on function convert_zrl_umbrella_races(uuid) from public, anon, authenticated, service_role;
grant execute on function convert_zrl_umbrella_races(uuid) to service_role;
revoke all on function current_user_answers_questions() from public, anon, authenticated, service_role;
grant execute on function current_user_answers_questions() to authenticated, service_role;
revoke all on function current_user_can_train_profile(uuid) from public, anon, authenticated, service_role;
grant execute on function current_user_can_train_profile(uuid) to public, anon, authenticated, service_role;
revoke all on function current_user_has_permission(text) from public, anon, authenticated, service_role;
grant execute on function current_user_has_permission(text) to public, anon, authenticated, service_role;
revoke all on function current_user_in_training_chat(uuid) from public, anon, authenticated, service_role;
grant execute on function current_user_in_training_chat(uuid) to public, anon, authenticated, service_role;
revoke all on function current_user_is_admin() from public, anon, authenticated, service_role;
grant execute on function current_user_is_admin() to public, anon, authenticated, service_role;
revoke all on function current_user_is_team_captain(uuid) from public, anon, authenticated, service_role;
grant execute on function current_user_is_team_captain(uuid) to public, anon, authenticated, service_role;
revoke all on function current_user_moderates_member_tips() from public, anon, authenticated, service_role;
grant execute on function current_user_moderates_member_tips() to public, anon, authenticated, service_role;
revoke all on function current_user_permissions() from public, anon, authenticated, service_role;
grant execute on function current_user_permissions() to public, anon, authenticated, service_role;
revoke all on function frr_class_riders(uuid,text[]) from public, anon, authenticated, service_role;
grant execute on function frr_class_riders(uuid,text[]) to authenticated, service_role;
revoke all on function frr_class_stage_results(uuid,text[]) from public, anon, authenticated, service_role;
grant execute on function frr_class_stage_results(uuid,text[]) to authenticated, service_role;
revoke all on function frr_replace_gc(uuid,integer,jsonb) from public, anon, authenticated, service_role;
grant execute on function frr_replace_gc(uuid,integer,jsonb) to service_role;
revoke all on function frr_replace_gc_history(uuid,jsonb) from public, anon, authenticated, service_role;
grant execute on function frr_replace_gc_history(uuid,jsonb) to service_role;
revoke all on function get_member_profile_bikes(uuid) from public, anon, authenticated, service_role;
grant execute on function get_member_profile_bikes(uuid) to authenticated, service_role;
revoke all on function get_public_profile(uuid) from public, anon, authenticated, service_role;
grant execute on function get_public_profile(uuid) to public, anon, authenticated, service_role;
revoke all on function get_public_profile_bikes(uuid) from public, anon, authenticated, service_role;
grant execute on function get_public_profile_bikes(uuid) to public, anon, authenticated, service_role;
revoke all on function get_public_profile_milestone_badges(uuid) from public, anon, authenticated, service_role;
grant execute on function get_public_profile_milestone_badges(uuid) to public, anon, authenticated, service_role;
revoke all on function get_public_profile_weekly_awards(uuid) from public, anon, authenticated, service_role;
grant execute on function get_public_profile_weekly_awards(uuid) to public, anon, authenticated, service_role;
revoke all on function handle_event_rsvp_team_join() from public, anon, authenticated, service_role;
grant execute on function handle_event_rsvp_team_join() to public, anon, authenticated, service_role;
revoke all on function handle_new_user() from public, anon, authenticated, service_role;
grant execute on function handle_new_user() to public, anon, authenticated, service_role;
revoke all on function handle_profile_zwift_id_link() from public, anon, authenticated, service_role;
grant execute on function handle_profile_zwift_id_link() to public, anon, authenticated, service_role;
revoke all on function handle_roster_claim_ladder() from public, anon, authenticated, service_role;
grant execute on function handle_roster_claim_ladder() to anon, authenticated, service_role;
revoke all on function handle_team_availability_team_join() from public, anon, authenticated, service_role;
grant execute on function handle_team_availability_team_join() to public, anon, authenticated, service_role;
revoke all on function handle_team_becomes_umbrella() from public, anon, authenticated, service_role;
grant execute on function handle_team_becomes_umbrella() to public, anon, authenticated, service_role;
revoke all on function join_event_team_for_member(uuid,uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function join_event_team_for_member(uuid,uuid,uuid) to service_role;
revoke all on function knowledge_messages_after_insert() from public, anon, authenticated, service_role;
grant execute on function knowledge_messages_after_insert() to public, anon, authenticated, service_role;
revoke all on function knowledge_threads_before_insert() from public, anon, authenticated, service_role;
grant execute on function knowledge_threads_before_insert() to public, anon, authenticated, service_role;
revoke all on function knowledge_topics_before_insert() from public, anon, authenticated, service_role;
grant execute on function knowledge_topics_before_insert() to public, anon, authenticated, service_role;
revoke all on function limit_start_points() from public, anon, authenticated, service_role;
grant execute on function limit_start_points() to public, anon, authenticated, service_role;
revoke all on function link_roster_by_zwift_id(uuid) from public, anon, authenticated, service_role;
grant execute on function link_roster_by_zwift_id(uuid) to service_role;
revoke all on function log_profile_privilege_change() from public, anon, authenticated, service_role;
grant execute on function log_profile_privilege_change() to public, anon, authenticated, service_role;
revoke all on function log_role_permission_change() from public, anon, authenticated, service_role;
grant execute on function log_role_permission_change() to public, anon, authenticated, service_role;
revoke all on function mark_knowledge_thread_read(uuid) from public, anon, authenticated, service_role;
grant execute on function mark_knowledge_thread_read(uuid) to authenticated, service_role;
revoke all on function member_last_seen() from public, anon, authenticated, service_role;
grant execute on function member_last_seen() to service_role;
revoke all on function member_question_askers_before_insert() from public, anon, authenticated, service_role;
grant execute on function member_question_askers_before_insert() to service_role;
revoke all on function member_question_askers_count() from public, anon, authenticated, service_role;
grant execute on function member_question_askers_count() to service_role;
revoke all on function member_questions_before_insert() from public, anon, authenticated, service_role;
grant execute on function member_questions_before_insert() to public, anon, authenticated, service_role;
revoke all on function member_questions_before_update() from public, anon, authenticated, service_role;
grant execute on function member_questions_before_update() to public, anon, authenticated, service_role;
revoke all on function member_tips_guard() from public, anon, authenticated, service_role;
grant execute on function member_tips_guard() to public, anon, authenticated, service_role;
revoke all on function mobility_pre_ride_hold_limit() from public, anon, authenticated, service_role;
grant execute on function mobility_pre_ride_hold_limit() to public, anon, authenticated, service_role;
revoke all on function mobility_series_timing_guard() from public, anon, authenticated, service_role;
grant execute on function mobility_series_timing_guard() to public, anon, authenticated, service_role;
revoke all on function nutrition_log_trainer_can_read(uuid) from public, anon, authenticated, service_role;
grant execute on function nutrition_log_trainer_can_read(uuid) to authenticated, service_role;
revoke all on function omnium_award_prize(uuid,uuid,uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function omnium_award_prize(uuid,uuid,uuid,uuid) to service_role;
revoke all on function omnium_invalidate_entrants() from public, anon, authenticated, service_role;
grant execute on function omnium_invalidate_entrants() to public, anon, authenticated, service_role;
revoke all on function omnium_merge_riders(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function omnium_merge_riders(uuid,uuid) to service_role;
revoke all on function omnium_replace_entrants(uuid,text,jsonb,jsonb) from public, anon, authenticated, service_role;
grant execute on function omnium_replace_entrants(uuid,text,jsonb,jsonb) to service_role;
revoke all on function omnium_replace_results(uuid,jsonb,text,timestamp with time zone) from public, anon, authenticated, service_role;
grant execute on function omnium_replace_results(uuid,jsonb,text,timestamp with time zone) to service_role;
revoke all on function profile_has_community_role(uuid,text) from public, anon, authenticated, service_role;
grant execute on function profile_has_community_role(uuid,text) to authenticated, service_role;
revoke all on function profile_visible(uuid,text) from public, anon, authenticated, service_role;
grant execute on function profile_visible(uuid,text) to public, anon, authenticated, service_role;
revoke all on function protect_profile_admin_fields() from public, anon, authenticated, service_role;
grant execute on function protect_profile_admin_fields() to public, anon, authenticated, service_role;
revoke all on function prune_superseded_training_workouts(integer) from public, anon, authenticated, service_role;
grant execute on function prune_superseded_training_workouts(integer) to service_role;
revoke all on function rate_limit_cleanup() from public, anon, authenticated, service_role;
grant execute on function rate_limit_cleanup() to service_role;
revoke all on function rate_limit_hit(text,text,integer,integer) from public, anon, authenticated, service_role;
grant execute on function rate_limit_hit(text,text,integer,integer) to service_role;
revoke all on function record_profile_ftp_history() from public, anon, authenticated, service_role;
grant execute on function record_profile_ftp_history() to public, anon, authenticated, service_role;
revoke all on function review_shared_nutrition_recipe(uuid,boolean,text) from public, anon, authenticated, service_role;
grant execute on function review_shared_nutrition_recipe(uuid,boolean,text) to authenticated, service_role;
revoke all on function roster_entry_team_source(uuid) from public, anon, authenticated, service_role;
grant execute on function roster_entry_team_source(uuid) to public, anon, authenticated, service_role;
revoke all on function round_start_point() from public, anon, authenticated, service_role;
grant execute on function round_start_point() to public, anon, authenticated, service_role;
revoke all on function set_activity_col_scans(jsonb) from public, anon, authenticated, service_role;
grant execute on function set_activity_col_scans(jsonb) to service_role;
revoke all on function set_updated_at_birthday_rides() from public, anon, authenticated, service_role;
grant execute on function set_updated_at_birthday_rides() to public, anon, authenticated, service_role;
revoke all on function set_updated_at_polls() from public, anon, authenticated, service_role;
grant execute on function set_updated_at_polls() to public, anon, authenticated, service_role;
revoke all on function set_updated_at_sponsors() from public, anon, authenticated, service_role;
grant execute on function set_updated_at_sponsors() to public, anon, authenticated, service_role;
revoke all on function src_replace_results(uuid,text,text,jsonb,jsonb) from public, anon, authenticated, service_role;
grant execute on function src_replace_results(uuid,text,text,jsonb,jsonb) to service_role;
revoke all on function strava_activities_set_has_gps_times() from public, anon, authenticated, service_role;
grant execute on function strava_activities_set_has_gps_times() to public, anon, authenticated, service_role;
revoke all on function touch_community_role_permissions() from public, anon, authenticated, service_role;
grant execute on function touch_community_role_permissions() to public, anon, authenticated, service_role;
revoke all on function touch_intervals_connections_updated_at() from public, anon, authenticated, service_role;
grant execute on function touch_intervals_connections_updated_at() to public, anon, authenticated, service_role;
revoke all on function touch_team_roster_updated_at() from public, anon, authenticated, service_role;
grant execute on function touch_team_roster_updated_at() to public, anon, authenticated, service_role;
revoke all on function touch_training_updated_at() from public, anon, authenticated, service_role;
grant execute on function touch_training_updated_at() to public, anon, authenticated, service_role;
revoke all on function touch_updated_at() from public, anon, authenticated, service_role;
grant execute on function touch_updated_at() to public, anon, authenticated, service_role;
revoke all on function training_ai_generations_store_prompt() from public, anon, authenticated, service_role;
grant execute on function training_ai_generations_store_prompt() to service_role;
revoke all on function unclaim_roster_entry(uuid) from public, anon, authenticated, service_role;
grant execute on function unclaim_roster_entry(uuid) to public, anon, authenticated, service_role;
revoke all on function zwbgame_check_rider_consent() from public, anon, authenticated, service_role;
grant execute on function zwbgame_check_rider_consent() to anon, authenticated, service_role;
revoke all on function zwbgame_disconnect_intervals() from public, anon, authenticated, service_role;
grant execute on function zwbgame_disconnect_intervals() to anon, authenticated, service_role;
revoke all on function zwbgame_invalidate_rider() from public, anon, authenticated, service_role;
grant execute on function zwbgame_invalidate_rider() to anon, authenticated, service_role;
revoke all on function zwbriljant_shares(uuid) from public, anon, authenticated, service_role;
grant execute on function zwbriljant_shares(uuid) to authenticated, service_role;

-- Storage -------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('avatars', 'avatars', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('bikes', 'bikes', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('birthday-gpx', 'birthday-gpx', false, 10485760, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('birthday-photos', 'birthday-photos', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('club-assets', 'club-assets', true, 2097152, array['image/png', 'image/jpeg']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('club-story-photos', 'club-story-photos', false, 10485760, array['image/jpeg']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('event-gpx', 'event-gpx', false, 10485760, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('event-photos', 'event-photos', true, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('sponsors', 'sponsors', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('zwbeker-photos', 'zwbeker-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do nothing;
drop policy if exists "avatars_own_delete" on storage."objects";
create policy "avatars_own_delete" on storage."objects"
  as permissive for delete to authenticated
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "avatars_own_insert" on storage."objects";
create policy "avatars_own_insert" on storage."objects"
  as permissive for insert to authenticated
  with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "avatars_own_update" on storage."objects";
create policy "avatars_own_update" on storage."objects"
  as permissive for update to authenticated
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "avatars_public_read" on storage."objects";
create policy "avatars_public_read" on storage."objects"
  as permissive for select to public
  using ((bucket_id = 'avatars'::text));
drop policy if exists "bikes_own_delete" on storage."objects";
create policy "bikes_own_delete" on storage."objects"
  as permissive for delete to authenticated
  using (((bucket_id = 'bikes'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "bikes_own_insert" on storage."objects";
create policy "bikes_own_insert" on storage."objects"
  as permissive for insert to authenticated
  with check (((bucket_id = 'bikes'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "bikes_own_update" on storage."objects";
create policy "bikes_own_update" on storage."objects"
  as permissive for update to authenticated
  using (((bucket_id = 'bikes'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  with check (((bucket_id = 'bikes'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "bikes_public_read" on storage."objects";
create policy "bikes_public_read" on storage."objects"
  as permissive for select to public
  using ((bucket_id = 'bikes'::text));
drop policy if exists "birthday_gpx_members_read" on storage."objects";
create policy "birthday_gpx_members_read" on storage."objects"
  as permissive for select to authenticated
  using (((bucket_id = 'birthday-gpx'::text) AND (EXISTS ( SELECT 1
   FROM (profiles viewer
     JOIN profiles birthday_member ON (((birthday_member.id)::text = (storage.foldername(objects.name))[1])))
  WHERE ((viewer.id = auth.uid()) AND viewer.is_approved AND (birthday_member.share_birthday OR (birthday_member.id = auth.uid())))))));
drop policy if exists "birthday_gpx_owner_insert" on storage."objects";
create policy "birthday_gpx_owner_insert" on storage."objects"
  as permissive for insert to authenticated
  with check (((bucket_id = 'birthday-gpx'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND (EXISTS ( SELECT 1
   FROM profiles profile
  WHERE ((profile.id = auth.uid()) AND profile.is_approved)))));
drop policy if exists "birthday_gpx_owner_or_admin_delete" on storage."objects";
create policy "birthday_gpx_owner_or_admin_delete" on storage."objects"
  as permissive for delete to authenticated
  using (((bucket_id = 'birthday-gpx'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR current_user_has_permission('content.moderate_posts'::text))));
drop policy if exists "birthday_photos_storage_members_insert" on storage."objects";
create policy "birthday_photos_storage_members_insert" on storage."objects"
  as permissive for insert to authenticated
  with check (((bucket_id = 'birthday-photos'::text) AND ((storage.foldername(name))[3] = (auth.uid())::text) AND (EXISTS ( SELECT 1
   FROM (profiles viewer
     JOIN profiles birthday_member ON (((birthday_member.id)::text = (storage.foldername(objects.name))[1])))
  WHERE ((viewer.id = auth.uid()) AND viewer.is_approved AND birthday_member.is_approved AND birthday_member.share_birthday)))));
drop policy if exists "birthday_photos_storage_members_read" on storage."objects";
create policy "birthday_photos_storage_members_read" on storage."objects"
  as permissive for select to authenticated
  using (((bucket_id = 'birthday-photos'::text) AND (EXISTS ( SELECT 1
   FROM (profiles viewer
     JOIN profiles birthday_member ON (((birthday_member.id)::text = (storage.foldername(objects.name))[1])))
  WHERE ((viewer.id = auth.uid()) AND viewer.is_approved AND (birthday_member.share_birthday OR (birthday_member.id = auth.uid())))))));
drop policy if exists "birthday_photos_storage_owner_or_admin_delete" on storage."objects";
create policy "birthday_photos_storage_owner_or_admin_delete" on storage."objects"
  as permissive for delete to authenticated
  using (((bucket_id = 'birthday-photos'::text) AND (((storage.foldername(name))[3] = (auth.uid())::text) OR ((storage.foldername(name))[1] = (auth.uid())::text) OR current_user_has_permission('content.moderate_posts'::text))));
drop policy if exists "club_assets_public_read" on storage."objects";
create policy "club_assets_public_read" on storage."objects"
  as permissive for select to public
  using ((bucket_id = 'club-assets'::text));
drop policy if exists "event-gpx delete own" on storage."objects";
create policy "event-gpx delete own" on storage."objects"
  as permissive for delete to authenticated
  using (((bucket_id = 'event-gpx'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
drop policy if exists "event-gpx read authenticated" on storage."objects";
create policy "event-gpx read authenticated" on storage."objects"
  as permissive for select to authenticated
  using ((bucket_id = 'event-gpx'::text));
drop policy if exists "event-gpx upload own" on storage."objects";
create policy "event-gpx upload own" on storage."objects"
  as permissive for insert to authenticated
  with check (((bucket_id = 'event-gpx'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
drop policy if exists "event_photos_storage_member_delete" on storage."objects";
create policy "event_photos_storage_member_delete" on storage."objects"
  as permissive for delete to authenticated
  using (((bucket_id = 'event-photos'::text) AND (((storage.foldername(name))[2] = (auth.uid())::text) OR current_user_has_permission('content.moderate_posts'::text))));
drop policy if exists "event_photos_storage_member_insert" on storage."objects";
create policy "event_photos_storage_member_insert" on storage."objects"
  as permissive for insert to authenticated
  with check (((bucket_id = 'event-photos'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));
drop policy if exists "event_photos_storage_public_read" on storage."objects";
create policy "event_photos_storage_public_read" on storage."objects"
  as permissive for select to public
  using ((bucket_id = 'event-photos'::text));
drop policy if exists "sponsors_logo_public_read" on storage."objects";
create policy "sponsors_logo_public_read" on storage."objects"
  as permissive for select to public
  using ((bucket_id = 'sponsors'::text));

-- Triggers buiten public ----------------------------------------------------

drop trigger if exists "on_auth_user_created" on auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Realtime ------------------------------------------------------------------

alter publication supabase_realtime add table public."event_chat_messages";
alter publication supabase_realtime add table public."live_positions";
alter publication supabase_realtime add table public."live_sessions";
alter publication supabase_realtime add table public."training_chat_messages";

notify pgrst, 'reload schema';
