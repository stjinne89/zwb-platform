-- Je ingeschaalde categorie maakt je geen teamlid meer.
--
-- Melding van de eigenaar: er stonden Zwiftladies in ZRL B. Oorzaak: de
-- automatische indeling uit 0070. Die zette elk goedgekeurd lid met categorie
-- A, B of C in 'ZRL <categorie>', behalve als `profiles.zrl_division` op
-- 'women' stond. Die divisie werd alleen gevuld als ergens de tekst
-- "zwiftladies" in een rosternaam of teamnaam voorkwam, dus bij elke vrouw waar
-- die tekst ontbrak won haar categorie en kwam ze in ZRL B terecht.
--
-- De regel is nu: lid van een ZRL-team word je doordat je je aanmeldt voor een
-- race van dat team (0171), doordat je je rosternaam claimt van een team dat
-- WTRL echt zo kent, of doordat een teambeheerder je toevoegt. Niveau is geen
-- lidmaatschap: een categorie zegt hoe hard je rijdt, niet voor wie.
--
-- Drie paden voegden op categorie toe; alle drie gaan eruit:
--   1. de trigger op profiles (bij elke wijziging van categorie/divisie/goedkeuring),
--   2. de knop Resultaten synchroniseren op /teams (RPC), en
--   3. het claimen van een rosternaam — dat riep dezelfde sync aan, én nam het
--      team van de rosternaam over, terwijl sync_zrl_parent_roster_entries()
--      dat team zelf ook al op pace_category kan hebben gezet.

drop trigger if exists profiles_zrl_parent_team_seed on public.profiles;
drop function if exists public.handle_zrl_parent_team_seed();
drop function if exists public.sync_all_zrl_parent_team_memberships();
drop function if exists public.sync_zrl_parent_team_membership(uuid);

-- Het claimen van een rosternaam blijft bestaan, zonder de categorie-sync. Het
-- team van de rosternaam telt alleen mee als het uit de WTRL-sync of een
-- handmatige keuze komt: 'auto_zrl_category' op een rosternaam is dezelfde gok
-- over niveau, alleen een stap eerder.
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
  returning name, zwift_id, pace_category, team_id, team_name, team_assignment_source
    into v_name, v_zwift, v_pace, v_team, v_team_name, v_team_source;

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

  if v_team is not null and coalesce(v_team_source, '') <> 'auto_zrl_category' then
    insert into public.team_members (team_id, profile_id, role, assignment_source)
    values (v_team, auth.uid(), 'member', 'roster_claim')
    on conflict (team_id, profile_id) do nothing;
  end if;

  return true;
end;
$$;

grant execute on function public.claim_roster_entry(uuid) to authenticated;

-- Nu de lidmaatschappen die er al staan. Alles wat op categorie is ontstaan
-- gaat eruit: rechtstreeks (1) en via een rosternaam die zelf op categorie bij
-- een team was gezet (2). Handmatige toevoegingen en aanmeldingen blijven.
delete from public.team_members
where assignment_source = 'auto_zrl_category';

delete from public.team_members tm
using public.roster_entries r
where tm.assignment_source = 'roster_claim'
  and r.claimed_by = tm.profile_id
  and r.team_id = tm.team_id
  and r.team_assignment_source = 'auto_zrl_category';

-- En daarna terugzetten wat wél verdiend is: wie zich heeft aangemeld voor een
-- race die nog gereden moet worden, hoort in dat team (0171). Zo kan de opruiming
-- hierboven niemand kwijtraken die zich gewoon had aangemeld.
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

-- De herkomst 'auto_zrl_category' bestaat niet meer. Uit de check halen zodat
-- geen enkel pad hem stilletjes terug kan zetten.
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
    check (assignment_source in ('manual', 'roster_claim', 'event_availability'));

-- sync_zrl_parent_roster_entries() blijft staan: die zet alleen nóg niet
-- geclaimde rosternamen onder een team, in de lijst "Nog niet geregistreerd".
-- Dat zijn geen leden, en sinds deze migratie wordt zo'n indeling ook geen
-- lidmaatschap meer bij het claimen.
