-- Rosternaam en account met hetzelfde Zwift-ID zijn dezelfde renner.
--
-- Gemeten op productie (2026-09-22): 8 van de 27 accounts met een Zwift-ID hadden
-- hun rosternaam nooit geclaimd, en 8 ongeclaimde rosternamen droegen het Zwift-ID
-- van een bestaand account ("Pim de Meulemeester" naast account "Pim
-- Meulemeester"). Vier daarvan hingen aan een team en stonden daar dubbel: één keer
-- als lid, één keer als "niet geregistreerd". Claimen is een aparte stap die leden
-- overslaan.
--
-- Het Zwift-ID is uniek per renner, dus dit kan zonder te raden: een ongeclaimde
-- rosternaam met het Zwift-ID van precies één account wordt door dat account
-- geclaimd. Net als bij claim_roster_entry (0182): lid van het team van de naam
-- (herkomst 'wtrl' voor een WTRL-naam, anders 'roster_claim'), opstellingen gaan
-- mee. Anders dan daar: een captain die de renner uit dat team haalde wint, en het
-- profiel zelf wordt niet aangepast (categorie en divisie blijven zoals ze zijn).
--
-- Draait één keer voor alle accounts, en daarna bij elk profiel dat een Zwift-ID
-- krijgt of wijzigt.

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

create or replace function public.handle_profile_zwift_id_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(new.zwift_id), '') <> ''
    and (tg_op = 'INSERT' or new.zwift_id is distinct from old.zwift_id)
  then
    perform public.link_roster_by_zwift_id(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_link_roster_by_zwift_id on public.profiles;
create trigger profiles_link_roster_by_zwift_id
  after insert or update of zwift_id on public.profiles
  for each row execute function public.handle_profile_zwift_id_link();

select public.link_roster_by_zwift_id(null);
