-- Reparatie: 0070 is hier niet volledig aangekomen.
--
-- Bij het toepassen van 0172 op de productiedatabase kwam:
--   ERROR: 42703: column r.team_assignment_source does not exist
-- Die kolom hoort uit 0070 te komen, samen met `team_members.assignment_source`
-- (die er wél is — de regel ervoor, het opruimen van lidmaatschappen op
-- categorie, liep gewoon). Eén kolom uit dezelfde migratie ontbreekt dus.
--
-- Dat is geen schoonheidsfoutje. De app schrijft die kolom: saveRosterEntries()
-- in `src/lib/team-results/sync.ts` zet `team_assignment_source` op
-- 'roster_sync' bij élke rosternaam die de WTRL-sync binnenhaalt, en gooit bij
-- een fout de hele sync om. Waar de kolom ontbreekt, is het bijwerken van
-- rosters dus nooit gelukt. Vandaar deze reparatie, los van 0172: die verandert
-- een regel, deze zet een kolom terug.
--
-- Waar de kolom al bestaat, doet dit niets aan de gegevens.

alter table public.roster_entries
  add column if not exists team_assignment_source text not null default 'manual'
    check (team_assignment_source in (
      'manual',
      'manual_excluded',
      'roster_sync',
      'auto_zrl_category'
    ));

-- 0070 gaf de kolom default 'auto_zrl_category', want toen deelde de categorie
-- rosternamen nog in. Dat doet sinds 0172 niets meer, dus een nieuwe rij zonder
-- opgave is gewoon handwerk. 'auto_zrl_category' blijft wel toegestaan: in een
-- database die 0070 wél helemaal kreeg, staan zulke rijen er nog, en
-- claim_roster_entry() leest ze — een naam die ooit op niveau bij een team werd
-- gezet, maakt je bij het claimen geen lid.
alter table public.roster_entries
  alter column team_assignment_source set default 'manual';
