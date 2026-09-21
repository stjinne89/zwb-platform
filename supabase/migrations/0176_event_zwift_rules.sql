-- De regels van een gekoppeld Zwift-event, voor het pacingplan.
--
-- Het pacingplan rekende tot 21 september 2026 elk Zwift-event als een
-- solo-inspanning. Of er gedraft mag worden, welke powerups er zijn, of een
-- tijdritfiets mag en of het event een fiets of wielen oplegt, staat in de
-- publieke Zwift-event-API (`eventType`, `rulesSet`, `tags`, `bikeHash`, zowel op
-- het event als per subgroep). Die worden hier bewaard op het moment dat de
-- beheerder de eventlink plakt of ververst, zodat de pacingpagina niet per lid
-- zwift.com hoeft te bevragen.
--
-- Gemeten op 200 echte events (21 september 2026): NO_DRAFTING, NO_POWERUPS,
-- NO_TT_BIKES in `rulesSet`; `powerup_percent="0,50,8,50"`, `doubledraft`,
-- `fwheel_override`, `disable_bike_upgrade_physics` in `tags`. Zie
-- docs/zwift-race-opzet-spike.md.
--
-- Leeg betekent: niet bekend (event nog niet opnieuw opgehaald). Het pacingplan
-- valt dan terug op een gewone wedstrijd met drafting en standaardpowerups; het
-- lid kan het format zelf kiezen.

alter table public.events
  add column if not exists zwift_event_type text;

alter table public.events
  add column if not exists zwift_rules text[];

alter table public.events
  add column if not exists zwift_tags text[];

-- `bikeHash` uit de API: het frame dat het event oplegt, als id uit zwift-data.
alter table public.events
  add column if not exists zwift_bike_hash bigint;
