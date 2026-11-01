-- Ladderteams: ZWBrains gaat op in ZWBandits, ZWB Zwiftladies heet ZWBeauties
-- (2026-11-01).
--
-- Vraag eigenaar: "Kun je de naam ZWBrains naar ZWBandits wijzigen? Of de leden
-- van de Brains verhuizen naar de ZWBandits en de Bandits in de puzzel zetten."
-- En daarna: "de Beauties zijn de nieuwe naam voor de Zwiftladies. Misschien
-- kun je die dan ook integreren."
--
-- 0290 maakte ZWBrains en ZWBeauties als nieuwe teams naast de bestaande
-- ZWBandits en ZWB Zwiftladies. Per paar blijft het oude team bestaan en neemt
-- het de inhoud van het nieuwe over:
--
--   nieuw team   ->  oud team          heet daarna   band
--   ZWBrains     ->  ZWBandits         ZWBandits     4-6 (Sapphire-Platinum)
--   ZWBeauties   ->  ZWB Zwiftladies   ZWBeauties    5-7 (Amethyst-Gold)
--
-- Waarom het oude team houden: het heeft de uitslagenbron op
-- ladder.cycleracing.club (team_result_sources, club_ladder), en ZWB
-- Zwiftladies ook een event (LIV Ladies Ride, 2026-08-08). De nieuwe teams
-- hadden alleen leden, rosternamen en uitsluitingen; geen uitslagen, events,
-- lineups of andere koppelingen (productie gelezen op 2026-11-01).
--
-- Per paar:
-- * Het oude team krijgt precies de leden van het nieuwe: wie er alleen in het
--   oude stond, gaat eruit met een uitsluiting (manual_remove), zoals bij
--   verplaatsen in de puzzel; wie in beide stond, houdt zijn rij.
-- * Uitsluitingen, rosternamen (ladder_roster_riders), band en naam gaan mee.
--   Division en omschrijving volgen de band, zoals bij ZWBeasts en ZWBullets.
-- * De club_ladder-bron krijgt de nieuwe naam als match.
-- * Het archief blijft zoals het was bij het oude team (beide in het archief,
--   net als ZWBeasts en ZWBullets). Een team buiten het archief met een bron
--   die niet in de ladderstand staat, maakt de sync rood.
-- * Het nieuwe team wordt verwijderd.
--
-- Op naam, zodat het opnieuw draaien niets doet: na afloop bestaat het oude
-- team niet meer onder zijn oude naam (ZWB Zwiftladies), of het nieuwe team
-- niet meer (ZWBrains).
--
-- Volgorde: lib/team-results/sync.ts maakt teams uit DEFAULT_TEAM_SEEDS aan als
-- ze op naam ontbreken. De code met "ZWBeauties" in plaats van "ZWB Zwiftladies"
-- moet live staan vóór deze migratie, anders maakt de sync een leeg team ZWB
-- Zwiftladies opnieuw aan.

do $$
declare
  pair record;
  v_new uuid;
  v_old uuid;
begin
  for pair in
    select * from (values
      ('ZWBrains', 'ZWBandits', 'ZWBandits', 'Sapphire-Platinum'),
      ('ZWBeauties', 'ZWB Zwiftladies', 'ZWBeauties', 'Amethyst-Gold')
    ) as p(new_name, old_name, final_name, division)
  loop
    select id into v_new from public.teams
    where type = 'ladder' and lower(name) = lower(pair.new_name);
    select id into v_old from public.teams
    where type = 'ladder' and lower(name) = lower(pair.old_name);

    if v_new is null or v_old is null or v_new = v_old then
      continue;
    end if;

    -- Alleen in het oude team: eruit, met een uitsluiting.
    insert into public.team_member_seed_overrides (team_id, profile_id, excluded, reason, updated_at)
    select v_old, m.profile_id, true, 'manual_remove', now()
    from public.team_members m
    where m.team_id = v_old
      and not exists (
        select 1 from public.team_members n
        where n.team_id = v_new and n.profile_id = m.profile_id
      )
    on conflict (team_id, profile_id) do update
      set excluded = true, reason = 'manual_remove', updated_at = now();

    delete from public.team_members m
    where m.team_id = v_old
      and not exists (
        select 1 from public.team_members n
        where n.team_id = v_new and n.profile_id = m.profile_id
      );

    -- Leden van het nieuwe team; wie al in het oude stond, houdt zijn rij.
    insert into public.team_members (team_id, profile_id, role, joined_at, assignment_source)
    select v_old, m.profile_id, m.role, m.joined_at, m.assignment_source
    from public.team_members m
    where m.team_id = v_new
    on conflict (team_id, profile_id) do nothing;

    -- Een lid is niet uitgesloten.
    delete from public.team_member_seed_overrides o
    using public.team_members m
    where o.team_id = v_old and m.team_id = v_old and m.profile_id = o.profile_id;

    insert into public.team_member_seed_overrides (team_id, profile_id, excluded, reason, created_by, updated_at)
    select v_old, o.profile_id, o.excluded, o.reason, o.created_by, o.updated_at
    from public.team_member_seed_overrides o
    where o.team_id = v_new
      and not exists (
        select 1 from public.team_members m
        where m.team_id = v_old and m.profile_id = o.profile_id
      )
    on conflict (team_id, profile_id) do nothing;

    update public.ladder_roster_riders
    set team_id = v_old
    where team_id = v_new;

    update public.teams o
    set ladder_rank_min = n.ladder_rank_min,
        ladder_rank_max = n.ladder_rank_max
    from public.teams n
    where o.id = v_old and n.id = v_new;

    delete from public.teams where id = v_new;

    update public.teams
    set name = pair.final_name,
        division = pair.division,
        description = 'ZWB Club Ladder team ' || pair.division
    where id = v_old;

    update public.team_result_sources
    set match_name = pair.final_name
    where team_id = v_old and provider = 'club_ladder';
  end loop;
end;
$$;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select name, is_graveyard, division, ladder_rank_min, ladder_rank_max,
--   (select count(*) from team_members m where m.team_id = t.id) leden,
--   (select count(*) from ladder_roster_riders r where r.team_id = t.id) rosternamen,
--   (select string_agg(match_name, ', ') from team_result_sources s
--     where s.team_id = t.id and s.provider = 'club_ladder') bron
--   from teams t where type = 'ladder' order by name;
--   -- ZWBandits 4-6, 8 leden, 1 rosternaam, bron ZWBandits;
--   -- ZWBeauties 5-7, 6 leden, 3 rosternamen, bron ZWBeauties;
--   -- geen ZWBrains en geen ZWB Zwiftladies meer.
