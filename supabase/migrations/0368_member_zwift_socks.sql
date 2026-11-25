-- Zwift-garage: ook de Aero Lightning Socks. Wie ze heeft, rijdt in Zwift met
-- iets minder luchtweerstand (src/lib/pacing/zwift-setup.ts,
-- AERO_SOCKS_CDA_DELTA); het pacingplan rekent dat mee.
--
-- * Eén rij met part 'socks' en de naam van de sokken, stage 0, in dezelfde
--   tabel als frames en wielen. Geen eigen kolom of tabel: aan- en uitvinken
--   werkt zo precies als bij de wielen, en de gegevensexport neemt hem al mee.
-- * De gewone Lightning Socks geven geen voordeel en staan er niet in.

alter table public.member_zwift_bikes drop constraint if exists member_zwift_bikes_part_check;
alter table public.member_zwift_bikes
  add constraint member_zwift_bikes_part_check check (part in ('frame', 'wheel', 'socks'));
