-- Welk Zwift-segment telt voor de Sprint Quali.
--
-- De Sprint Quali wordt nu opgehaald uit Zwifts segmentresultaten
-- (src/lib/omnium/segment-results.ts). Een route heeft vaak meerdere
-- sprintsegmenten, dus het bestuur kiest er één bij de Zwift-startlijst.
-- Tekst, geen getal: Zwifts segment-ID's zijn int64 en kunnen negatief zijn
-- (Tchou Tchou Sprint).
--
-- Geen invloed op de startlijst: de trigger omnium_invalidate_entrants (0157)
-- kijkt alleen naar zwift_event_id en subgroup_leagues. Past een gekozen
-- segment na een wijziging van het Zwift-event niet meer bij de route, dan
-- weigert het ophalen en moet er opnieuw gekozen worden.

alter table public.omnium_edition_events
  add column if not exists zwift_segment_id text
    check (zwift_segment_id is null or zwift_segment_id ~ '^-?[0-9]{1,20}$');

notify pgrst, 'reload schema';
