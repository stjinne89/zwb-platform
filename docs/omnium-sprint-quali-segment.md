# Sprint Quali uit Zwifts segmentresultaten

2026-09-23. Vervolg op de [Zwift-API-spike](omnium-zwift-api-spike.md) en de
[live ZRL-stand](live-zrl-dashboard.md).

## Waarom nu wel

De spike (2026-08-20) vond geen bron voor de Sprint Quali: `race-results/entries`
kent geen segmenttijden en `segment-results` gaf 400/406. Op 2026-09-22 bleek
waarom: het endpoint wil protobuf, `world_id=1`, `segment_id` en een `from`
zonder milliseconden. Sindsdien leest de server het op productie voor de live
ZRL-stand. Het geeft alle passages van iedereen op één segment in een venster,
met de segmenttijd in milliseconden. De Sprint Quali rangschikt op precies die
tijd.

## Hoe het werkt

1. **Segment kiezen.** Op `/beheer/omnium/[editie]`, bij "leagues instellen" van
   de Sprint Quali, staat een keuzelijst "Sprintsegment": de segmenten van de
   route uit het Zwift-event (`eventSubgroups[].routeId` →
   `routeSegments`, uniek, in rijvolgorde). "Indeling bevestigen" bewaart de
   keuze in `omnium_edition_events.zwift_segment_id` (migratie `0190`). Staat de
   route niet in `src/lib/zwift/route-segments.json`, dan is er niets te kiezen.
2. **Ophalen.** "Ophalen uit Zwift" op de uitslagenpagina roept
   `fetchSegmentResults(segment, { from, to })` aan met het venster van het
   onderdeel: `starts_at` tot `starts_at + duration_minutes`, met aan beide
   kanten één minuut marge (`SEGMENT_WINDOW_MARGIN_MS`). Achteraf is die marge
   nodig omdat een passage op het einde van het segment wordt gestempeld.
3. **Snelste tijd per renner** (`bestSegmentTimes` in
   `src/lib/omnium/segment-results.ts`): alleen renners op de startlijst
   (`omnium_entrants`), per renner de snelste passage, ontdubbeld op passage-id.
   League en naam komen uit de startlijst. Zwift laat de subgroep in een
   segmentresultaat altijd leeg (0 van 213, gemeten 2026-09-22).
4. **Zelfde pijplijn als plakken.** De regels gaan als `parsedRows` door
   `previewOmniumResults`/`saveOmniumResults`, met mode `segment`
   (`zwiftModeFor`). Het voorbeeld toont nu ook de tijd per renner.

Waarschuwingen in het scherm: passages van renners buiten de startlijst
(geteld, niet getoond), ingeschreven renners zonder passage (met naam), renners
zonder league of Zwift-ID, en een Zwift-start die meer dan twee minuten van de
planning afwijkt. Het venster volgt de planning, niet Zwift.

Het ophalen weigert zonder gekozen segment, zonder duur, zonder opgehaalde
startlijst, vóór de start, en als het gekozen segment niet meer op de route van
het Zwift-event ligt (event-ID gewijzigd).

De plakroute blijft: "Plak-import gebruiken" zet het scherm terug.

## Niet bewezen

- **`to` op het segment-endpoint.** Sauce stuurt hem mee, maar op productie is
  alleen `from` gebruikt. Weigert Zwift de aanroep met `to`, dan volgt één
  poging zonder; het venster filteren we toch zelf.
- **Echte passages.** De tweede computer met Sauce was op 2026-09-23 niet
  bereikbaar (`192.168.0.134:1080` gaf geen verbinding). De fixture
  `tests/fixtures/zwift/segment-results-sprint.json` heeft de vorm van een
  gedecodeerd resultaat met waarden naar de meting van 2026-09-22, maar is
  verzonnen.
- **Tegen een echte editie.** Pas op 11 oktober 2026 te vergelijken met wat het
  bestuur anders zou plakken.
