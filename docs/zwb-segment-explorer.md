# ZWB-segmentkaart — lokale oplevering 2026-09-13

De eigenaar heeft toestemming voor het gedeelde ZWB-klassement en de analyse bevestigd.
Deze implementatie gebruikt geen algemeen Strava-leaderboard en geen Segment Explore.
De bestaande atletenlimiet van de Strava-app staat los van die toestemming.

## Werking

- /profiel/segments: Leaflet-kaart met standaard OpenStreetMap-tegels (geen API-key),
  lijst, record/podium, filters, persoonlijk model en Strava-link. De basiskaart blijft
  licht in beide thema's; de kaartlijnen gebruiken daarop afgestemde contrastkleuren.
- /profiel/segments/collecties: eerdere collecties en Zwift; bestaande cols/badges zijn behouden.
- /beheer/segments: hervatbare batches van maximaal vijf ontbrekende ritdetails en drie geometrieën.
  Link beschikbaar via /beheer/strava. Alleen community.manage.
- /hulp/segments: aannames, kleuren, paginering en modelbeperkingen.
- GET /api/segments/explore: begrensde kaart/lijst; bounds=south,west,north,east, zoom,
  offset, q, own, min/max (meters), grade, status, target=record|podium, when (ISO).
- GET /api/segments/explore/[id]: details en klassement van hetzelfde segment.
  Beide endpoints controleren ingelogd/goedgekeurd lid en actuele privacyversie;
  antwoorden zijn private, no-store. Alleen het eigen profiel voedt het model.

De nieuwe registry zwb_segment_maps is onafhankelijk van de oude beperkte Benelux-selectie.
Een trigger registreert ieder ontvangen segment-ID. De beveiligde projectie
zwb_segment_club bepaalt tijden rechtstreeks uit pogingen en huidige activiteiten:
geen achterblijvende podiumtijd na verwijderen, wijzigen, privé maken of ontkoppelen.
Dubbele namen met verschillende ID's blijven apart. Alleen Ride, geen trainer/privé/
gemarkeerde/verborgen poging; andere disciplines hebben geen betrouwbare racefietsaanname.
Posities worden per snelste verstreken tijd per lid berekend. Gelijke tijden delen een rang.
Voor record/podium wordt de eigen tijd uit de tegenstanders verwijderd.

Pogingen vervangen gebeurt atomair via replace_activity_segment_efforts.
Een lege nieuwe response verwijdert eerdere pogingen. Een mislukte opslag laat het webhook-event
opnieuw proberen. Segmentdetails en streams worden beperkt opgehaald met rate-limitcontrole;
status/fout/tijdstip staan in de registry. Een recent gecontroleerd profiel wordt zeven dagen
niet opnieuw opgehaald; per nieuw webhook-nasyncrondje maximaal één segmentprofiel.

Het model gebruikt 90-daags vermogen (een gesynchroniseerde curve van maximaal 24 uur oud,
anders intervals.icu), eigen profielgewicht, 9 kg uitrusting en signed hellingen.
Wind is meteorologische FROM-richting en wordt als relatieve luchtstroom langs iedere
rijrichting verwerkt. De bestaande windstille ritberekening is niet gewijzigd.
Vier scenario's combineren ±20% CdA en ±20% windsnelheid. De band is geen
statistisch betrouwbaarheidsinterval. Geen extrapolatie buiten de curve of numerieke
snelheidsgrenzen, en geen voorspelling bij ontbrekende inputs of gevaarlijk segment.

## Lokaal testen en later activeren

1. Installeer dependencies met npm ci. Esbuild en PGlite zijn uitsluitend testdependencies.
2. Gerichte tests: npx vitest run tests/unit/segment-explorer.test.ts tests/unit/segment-storage.test.ts tests/unit/segment-database.test.ts tests/unit/strava-ingest.test.ts tests/unit/privacy-version.test.ts.
3. Browser: npm run test:e2e -- tests/e2e/segments.spec.ts.
   Deze test bundelt de echte component met gemockte API-antwoorden en zonder kaarttegelnetwerk.
   Er wordt geen testaccount of fixture-route in de productie-app aangebracht.
4. Build: npm run build.
5. Voor echte ingebruikname eerst migratie 0152_zwb_segment_explorer.sql toepassen.
   Zonder migratie blijft de kaart met een nette foutmelding leeg en zijn de nieuwe
   segmentopslagfuncties niet beschikbaar. Dit is een verplichte migratie vóór uitrol.
6. Privacyversie is bijgewerkt naar 2026-09-13. De bestaande privacydialoog vraagt leden
   opnieuw akkoord; alleen leden die deze versie of een latere versie accepteerden tellen mee.
7. Vul bestaande, nog niet ingelezen ritdetails aan via beheer. Reeds opgeslagen pogingen
   staan na migratie automatisch in de registry. Na updates/deletes ververst de kaart bij
   de volgende aanvraag; het is geen live tracker.

Er is niets gedeployd, gepusht of op de gedeelde Supabase-database uitgevoerd.
De SQL-migratie is wel tegen PGlite/PostgreSQL getest met een minimale bestaande schemafixture,
inclusief database-rollen, registratietrigger, privileges, aggregatie en delete/replace.
Dat vervangt geen verificatie tegen de volledige productie-Supabase-schema-/RLS-configuratie.
Geen echte Strava-/Intervals-/weerresponses gebruikt en geen veldvalidatie met ritpogingen
gedaan; de voorspelling is nog niet empirisch gekalibreerd.

Correctie 2026-09-13: de eerste versie gebruikte CARTO zonder sleutel. CARTO vereist
inmiddels een API-key en toonde daardoor een watermerk. Vervangen door het canonieke
OSM-tegeladres met zichtbare bronvermelding en normale browsercaching. De browserfixture
controleert nu ook expliciet het tegeladres. De fixture onderschept tegelverzoeken;
een geslaagde browsertest bewijst dus niet de beschikbaarheid van een externe provider.
Bij deze correctie is daarnaast één echte OSM-tegel opgehaald: HTTP 200, image/png,
visueel gecontroleerd zonder API-keywatermerk.

## Bewuste grenzen

- Geen algemene KOM/top 10, geen scraping en geen nieuwe handmatige doeltijden.
- Geen geometrie verzinnen tussen begin/einde: zonder lijn alleen een startmarker.
- Geen indoor-/e-bike-/MTB-voorspelling met het wegfietsmodel.
- Lijstpagina bevat maximaal 40 bronsegmenten; kansenfilter selecteert binnen die batch.
  Volgende blijft bruikbaar als een gefilterde batch leeg is. Clusters worden bij dit
  persoonlijke filter niet getoond om aantallen zonder overeenkomende beoordeling te vermijden.
- Maximaal 500 clusters per gebied. Zoom in voor verdere detaillering.
- Wind is per startgebied afgerond op 0,1 graad en gekozen uur. Geen voortschrijdend weer
  langs lange segmenten, beschuttingsmodel, bochtensnelheid, stayeren of verkeersmodel.
- De nieuwe kaart is alleen volledig voor werkelijk ingelezen pogingen. Oude
  authoritatieve PR's uit collecties zonder bijbehorende ingelezen poging worden niet
  als bewijs voor het nieuwe clubklassement gebruikt.
