-- Rondes en duur bij een event met een GPX van één ronde.
--
-- Bij een rondekoers upload de beheerder de GPX van één ronde. Daarmee dacht de
-- app dat de Prins van de Peel (gravel, 150 minuten rondjes rijden) een rit van
-- 8 km was, en zette het trainingsschema er een kwartiertje voor in.
--
-- * `laps` bestaat al (0145) voor Zwift-events. Bij een GPX-event betekent het
--   nu hetzelfde: zoveel keer wordt de route gereden. `distance_km` en
--   `elevation_m` blijven de maten van de GPX zelf, dus van één ronde; het
--   totaal rekent de app uit (src/lib/events/route-size.ts). Geen enkel
--   GPX-event had op 2 november 2026 een `laps`, dus er is niets om te
--   herinterpreteren.
-- * `duration_minutes` is nieuw: de koersduur bij een format "rijden tot de tijd
--   op is". Die gaat in het trainingsschema voor de eindtijd en de afstand.

alter table public.events
  add column if not exists duration_minutes int
    check (duration_minutes is null or duration_minutes between 1 and 1440);

comment on column public.events.duration_minutes is
  'Koersduur in minuten (rijden tot de tijd op is); gaat in het schema voor eindtijd en afstand.';
