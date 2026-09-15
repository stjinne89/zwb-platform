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
only_me/gemarkeerde rit en geen privésegment; andere disciplines hebben geen betrouwbare
racefietsaanname. Strava's `hidden` op een poging telt sinds 0154 wel mee: dat is een
weergavestandaard in de activiteit, geen privacykeuze van het lid (zie correctie hieronder).
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

Correctie 2026-09-13 (migratie 0154): na livegang verscheen alleen de eigenaar in de
klassementen. Leesanalyse op productie:

- Hoofdoorzaak is geen bug: alleen de eigenaar had privacyversie 2026-09-13 getekend
  (overige goedgekeurde leden: 15× 08-18, 1× 08-07, 14× 05-31, 4× nooit). Negen leden met
  samen ~58.000 opgeslagen pogingen tellen mee zodra ze opnieuw akkoord geven.
- Het filter op `effort.raw->>'hidden'` sloot 28.470 van 69.498 pogingen (41%) uit. Dat
  veld volgt vrijwel altijd het segment (192 van 25.993 lid-segmentcombinaties wisselen),
  en 10.547 verborgen pogingen hebben toch een `pr_rank`. Het is Strava's "verborgen
  segmenten"-weergave, geen afscherming door het lid. Afgeleid uit API-documentatie en
  datapatroon, niet in de Strava-app nagespeeld.
- Simulatie als alle negen leden tekenen: met het filter 1.745 segmenten met ≥2 rijders,
  zonder 3.671. Gravel/MTB toevoegen levert +1 op en is daarom niet gedaan.
- Ingelezen dekking is laag (bijv. 56 van 1.433 activiteiten). Aanvullen gebeurt sinds
  dezelfde dag automatisch (zie "Automatische inhaalslag"); /beheer/segments blijft als
  handmatige route bestaan.

0154 vervangt de view met exact dezelfde voorwaarden minus `hidden`. De privacyverklaring
noemde "verborgen pogingen" als uitsluiting; die zin somt nu de werkelijke uitsluitingen op.
Geen nieuwe privacyversie: zelfde gegevenscategorie en ontvangers, en op het moment van
wijzigen had alleen de eigenaar 2026-09-13 getekend.

## Automatische inhaalslag (2026-09-13)

Handmatig waren de ~6.000 open ritten van leden met een actieve koppeling ~1.200 klikken.
`runScheduledSegmentBackfill` draait daarom mee in `POST /api/strava/webhook/process`
(cron-job.org, elke 5 min). Bewust geen nieuwe cron-job: die had handmatig ingericht
moeten worden, en een extra job kost extra Netlify-invocaties.

- Alleen als de webhookrij leeg is en niet gelimiteerd; beide delen één budget van 8 s.
  Geen nieuwe ritcall met minder dan 2,5 s over.
- Goedgekeurde leden met actieve koppeling, Ride zonder trainer en zonder
  `efforts_fetched_at`, nieuwste eerst over alle leden heen (max. 20 per run).
- Budget: stopt bij 50% van het 15-minutenvenster of 60% van de daglimiet
  (gemeten 400/4.000), zodat nieuwe ritten van leden nooit wachten.
- Onvolledig antwoord (`skipped`): afgevinkt, anders blokkeert die rit de rij.
  Tijdelijke fout (`failed`): blijft staan; na drie in één run stopt de run.
  Dode token: lid overgeslagen, koppeling **niet** ingetrokken (dat blijft bij
  webhook- en lifecycle-pad).
- Segmentlijnen: elke run eerst één uit de voorrangslijst, zonder open ritten tot zes
  (zie "Inschatting zonder tegenstander en hoogteprofiel"; de eerste versie wachtte
  tot alle ritten binnen waren).

Schatting, niet gemeten: ~5 ritten per run ≈ 1.400 per dag, dus ongeveer 4–5 dagen
voor de ritten. De werkelijke
duur per ritcall op Netlify is niet bekend. Niet lokaal tegen Strava getest; wel
unittests op de beslislogica en de databasequery's alleen-lezen tegen productie.

## Inschatting zonder tegenstander en hoogteprofiel (2026-09-13, migratie 0155)

Na livegang toonde elk segment "Onvoldoende gegevens", ook voor de eigenaar met gewicht,
90-daagse curve en intervals.icu. Twee oorzaken, in de volgorde van `assessSegment`:
geen doeltijd (hij was overal de enige zichtbare rijder; de eigen tijd telt niet als
tegenstander) en geen hoogteprofiel (0 van 19.781 segmenten `ready`, omdat de taak
lijnen pas na alle ritten ophaalde). Eigenaar koos A + C + D:

- **A — eigen record als doel.** `segmentTarget` gebruikt de clubdoeltijd waar die bestaat;
  anders eigen PR − 1 s, met `targetKind: "own"` en in de details "Doel: eigen record".
  Ook bij podium met minder dan drie tegenstanders. Geen eigen tijd → nog steeds geen doel.
- **C — profiel bij openen.** De detailroute haalt na de toegangscontrole van de view een
  ontbrekend profiel op met de koppeling van de kijker (twee calls, gewoon interactief
  budget; een fout pas na een uur opnieuw). Lijst en kaart nemen de nieuwe beoordeling
  meteen over. Leden zonder Strava-koppeling krijgen geen profiel bij openen.
- **D — voorrangslijst.** `segment_geometry_priority` (service_role) ordent pending
  segmenten op aantal goedgekeurde rijders met actieve koppeling (ongeacht privacyversie,
  zodat lijnen klaarliggen bij opnieuw tekenen), dan pogingen; token van de laatste
  rijder. Elke run eerst één lijn, daarna ritten; zonder open ritten tot zes lijnen.
  Een fout segment komt na zeven dagen terug. Zonder 0155 slaat de taak lijnen over.

Wel getest: PGlite-test voor volgorde, indoor-uitsluiting en rechten; unittests voor
doel en taakvolgorde; browsertests. Door de eigenaar bevestigd in productie: openen
geeft een inschatting met "Doel: eigen record".

**Correctie 0155 → 0156.** Op productie brak `segment_geometry_priority` eerst af op de
statement timeout; daarna gemeten 3,1 s, 2,4 s, 1,1 s en 0,6 s (koude tegen warme cache).
De taak wachtte daarop en had daardoor weinig tijd voor ritten (23 ritten in het
eerste halfuur). 0156 geeft dezelfde uitkomst, maar leest voor de rangorde alleen twee
smalle nieuwe indexen en zoekt de token-rijder pas voor de teruggegeven segmenten. De
taak breekt de aanroep bovendien na 2 s af en gaat dan door met ritten. In PGlite met
synthetische data (70.000 pogingen, 20.000 ritten met brede raw-kolommen): 0155 127 ms,
0156 52 ms, identieke uitkomst. Die data haalde de productievertraging niet; de winst
op productie is dus niet gemeten.

## ZWB KOM en minimaal drie rijders (0161, 2026-09-15)

- `zwb_segment_club` toont alleen segmenten met minstens drie meetellende rijders. Kaart,
  lijst, details en clusters volgen daaruit; een segment met twee rijders geeft bij openen 404.
- `zwb_segment_koms` (alleen service_role) bewaart per segment de snelste rijder(s); bij
  een gelijke tijd delen leden de titel. `achieved_at` is de starttijd van de recordpoging.
- Vuil markeren via `zwb_segment_maps.kom_dirty`. Triggers op pogingen (insert/update/
  delete), op ritten (sport, trainer, `raw.private`/`visibility`/`flagged`), op profielen
  (goedkeuring, akkoord ≥ 2026-09-13) en op koppelingen (insert/delete/intrekken).
  Een nieuw segment start vuil. Alle bestaande segmenten zijn na de migratie vuil.
- `refresh_segment_koms(p_limit)` pakt vuile segmenten met `for update skip locked`,
  telt eerst zonder raw-kolommen of er drie rijders zijn, en rekent alleen dan de
  volledige privacyvoorwaarden door (dezelfde als de view). Idempotent.
- De webhook-taak roept dit elke run aan met 200 segmenten en maximaal 1,5 s, vóór de
  inhaalslag. Uitzetten: `?segmentKoms=0`. Een timeout laat segmenten vuil.
- `zwb_segment_kom_club` is de leesview: zelfde kijkers als het klassement, en houder,
  akkoord, koppeling en privésegment worden bij lezen opnieuw gecontroleerd, zodat
  intrekken niet op de taak wacht.
- Dashboard: KOM's met `achieved_at` in de afgelopen zeven dagen (max. 8). Profiel en
  ledenpagina: alle KOM's van het lid; op de ledenpagina onder de badge-zichtbaarheid.
- Niet gebouwd: live berekenen (volledige doorloop liep al tegen de timeout), pushmelding
  bij een gewonnen of verloren KOM, KOM op het publieke profiel (segmentdata is alleen
  voor leden met akkoord), aparte QOM.
- Niet gemeten: looptijd van triggers en refresh op productie; de eerste doorrekening
  van alle segmenten duurt enkele runs.

## Bewuste grenzen

- Geen algemene Strava-KOM/top 10, geen scraping en geen nieuwe handmatige doeltijden.
  De ZWB KOM (0161) is alleen de snelste binnen het ZWB-klassement.
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
