-- Aanwezig melden voor een ZRL-race maakt je meteen lid van dat team.
--
-- Waarom. Een race in de kalender hoort bij één team (`events.team_id`, gevuld
-- door /beheer/zrl-kalender). Wie zich voor zo'n race beschikbaar meldde — op de
-- teampagina (`team_event_availability`) of met Ja op de eventpagina
-- (`event_rsvps`) — stond daarna nergens in dat team. De teampagina viste die
-- namen apart op zodat de captain ze tenminste zag, maar in het rooster, in de
-- opstelling-planner en in Voor mij op de kalender bestond het lid niet: dat
-- gaat allemaal over `team_members`. De captain moest iedereen met de hand
-- toevoegen. Dat hoort automatisch: wie zegt te rijden, rijdt voor dat team.
--
-- In de database en niet in de serveractie, om dezelfde reden als de
-- categorie-seeding in 0070: er zijn twee schrijfpaden naar dezelfde bedoeling
-- en `team_members` mag een lid niet zelf schrijven (RLS laat alleen beheer toe).
-- Een `security definer`-trigger doet het voor beide paden in dezelfde
-- transactie als de aanmelding zelf.

-- Herkomst van deze lidmaatschappen is niet 'manual' (niemand koos het met de
-- hand) en niet 'auto_zrl_category' (dan zou de categorie-sync uit 0070 ze bij
-- de eerstvolgende profielwijziging weer weggooien). Dus een eigen bron.

-- De oude check gaat er op zijn definitie uit en niet op zijn naam: een naamloos
-- afwijkende check zou in productie blijven staan en elke aanmelding er stil op
-- laten stuklopen.
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
    check (assignment_source in (
      'manual',
      'roster_claim',
      'auto_zrl_category',
      'event_availability'
    ));

/*
 * Voegt het lid toe aan het team van deze race. Geeft het team terug waar het
 * lid daarna in zit, of null als er niets te doen was.
 *
 * p_fallback_team_id vangt het geval dat de race zelf geen team heeft: de
 * aanmelding op de teampagina weet dan nog wel voor welk team het was.
 */
create or replace function public.join_event_team_for_member(
  p_profile_id uuid,
  p_event_id uuid,
  p_fallback_team_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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

-- Niet aanroepbaar van buiten: de functie schrijft een lidmaatschap voor een
-- willekeurig profiel en heeft alleen de twee triggers hieronder als beller.
-- (Postgres geeft nieuwe functies standaard execute aan PUBLIC.)
revoke all on function public.join_event_team_for_member(uuid, uuid, uuid) from public;

create or replace function public.handle_team_availability_team_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

drop trigger if exists team_event_availability_team_join on public.team_event_availability;
create trigger team_event_availability_team_join
  after insert or update of status on public.team_event_availability
  for each row execute function public.handle_team_availability_team_join();

create or replace function public.handle_event_rsvp_team_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'yes' then
    perform public.join_event_team_for_member(new.profile_id, new.event_id, null);
  end if;
  return new;
end;
$$;

drop trigger if exists event_rsvps_team_join on public.event_rsvps;
create trigger event_rsvps_team_join
  after insert or update of status on public.event_rsvps
  for each row execute function public.handle_event_rsvp_team_join();

-- Inhaalslag voor races die nog gereden moeten worden: wie daar al beschikbaar
-- of Ja staat, hoort nu in dat team. Bewust niet verder terug: oude seizoenen
-- alsnog in rosters omzetten zou teams van jaren terug opnieuw vullen, en die
-- opstellingen zijn al gemaakt.
select public.join_event_team_for_member(a.profile_id, a.event_id, a.team_id)
from public.team_event_availability a
join public.events e on e.id = a.event_id
where a.status = 'available'
  and e.type = 'zrl'
  and e.start_at >= now();

select public.join_event_team_for_member(r.profile_id, r.event_id, null)
from public.event_rsvps r
join public.events e on e.id = r.event_id
where r.status = 'yes'
  and e.type = 'zrl'
  and e.start_at >= now();
