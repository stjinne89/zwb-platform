-- ZWBlokken in de Zwift-werelden: blokken van sprongen binnen een wereld opruimen.
--
-- Zwift zet je tijdens een rit soms in één keer kilometers verder: naar een
-- startvak, een portal of het begin van een event. De sync knipte de routelijn
-- alleen bij stappen boven de 10 km en trok bij kortere sprongen een rechte lijn
-- over de kaart. Elk blok onder die lijn telde als gereden. Gemeten 2026-11-25:
-- in Watopia 33 van de 250 blokken van de koploper en 29 van de 226 van een
-- ander lid, in London 9 van 117.
--
-- De code knipt nu bij elke stap langer dan vier keer de gewone puntafstand van
-- die rit, met 1,5 km als ondergrens (jumpThresholdKm in
-- src/lib/zwblokken/zwift.ts). Welke blokken van een sprong komen, valt achteraf
-- niet uit de tabel af te lezen, dus alles opnieuw: de blokken weg en de cursor
-- terug, zodat de sync elke Zwift-rit opnieuw doorrekent. Hij loopt van oud naar
-- nieuw, dus first_seen_at en first_activity_id komen weer goed. zwift_world
-- schrijft hij opnieuw, met dezelfde uitkomst.
--
-- VOLGORDE: pas toe nadat de nieuwe code live staat, anders rekent de sync met de
-- oude regel. Daarna /api/zwblokken/backfill?zwift=1 herhalen tot `remaining`
-- false is. Tot dan zijn de Zwift-kaarten en -titels leeg of onvolledig.

delete from public.profile_zwift_blocks;

update public.strava_activities
  set zwift_blocks_processed_at = null
  where sport_type = 'VirtualRide';
