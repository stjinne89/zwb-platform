-- Analyse van een hittesessie met een CORE-sensor (aanvulling op 0238).
--
-- De app toetst een rit nu aan alle eisen van de hittesessie en legt uit waarom
-- hij niet voldoet (src/lib/protocols/core-temperature.ts, analyzeHeatSession).
-- Daarvoor bewaart hij per rit drie getallen extra. De uitleg zelf staat niet in
-- de database: die rekent de app bij het tonen uit, zodat een betere tekst via
-- een commit ook voor oude ritten geldt.
--
-- * ride_minutes: bewegingstijd van de rit in hele minuten.
-- * minutes_to_threshold: na hoeveel minuten de kerntemperatuur voor het eerst
--   op of boven 38,5 °C kwam; leeg als dat niet gebeurde.
-- * coverage_pct: hoeveel procent van de rit de sensor een bruikbare meting gaf.
--
-- Ritten van vóór deze migratie houden lege velden; de analyse slaat die eisen
-- dan over.

alter table public.member_protocol_core_sessions
  add column if not exists ride_minutes int check (ride_minutes is null or ride_minutes between 0 and 1440),
  add column if not exists minutes_to_threshold int
    check (minutes_to_threshold is null or minutes_to_threshold between 0 and 1440),
  add column if not exists coverage_pct int check (coverage_pct is null or coverage_pct between 0 and 100);

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select column_name from information_schema.columns
--   where table_name = 'member_protocol_core_sessions'
--     and column_name in ('ride_minutes', 'minutes_to_threshold', 'coverage_pct');  -- drie rijen
