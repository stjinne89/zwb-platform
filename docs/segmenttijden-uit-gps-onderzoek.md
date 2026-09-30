# Segmenttijden uit een GPS-spoor — onderzoek

Datum: 2026-09-30
Status: **onderzoek, geen code.** Aanleiding: bij de bulkupload van GPX'en
(`PLAN.md`, ronde "meerdere GPX'en tegelijk") vroeg Stijn of ook de segmentdata
mee kon. Een GPX levert nu cols, ZWB Segments (voltooid, zonder tijd) en
ZWBlokken op. Tijden en KOM's komen alleen uit een Strava-koppeling. Stijn wil
eerst weten of ZWB die tijden zelf kan berekenen.

Dit is dezelfde vraag als fase 3 uit [Verder zonder Strava](zonder-strava-onderzoek.md)
("eigen segmentmatching en eigen geometrie"). Wat hier staat, geldt dus ook
voor ritten via intervals.icu.

Wat over onze code staat, is in de code nagekeken. Wat over Strava's
voorwaarden staat, is **niet** in de beleidstekst zelf nagelezen (zie 5).

## Antwoord in het kort

1. **Technisch kan het.** Een GPX heeft per punt een tijd. Wie de start- en
   eindlijn van een segment kent, kan de doorkomsttijden interpoleren en het
   verschil nemen. Zo werkt Strava in grote lijnen ook.
2. **Voor cols is het nauwkeurig genoeg, voor korte segmenten niet
   vanzelf.** De meetfout is een paar seconden. Op een klim van twintig minuten
   is dat verwaarloosbaar. Op een sprint van veertig seconden beslist het over
   de KOM.
3. **De echte blokkade is de geometrie, niet het rekenen.** De ZWB-segmenten
   en de segmentverkenner gebruiken lijnen die van Strava komen. Daarmee ritten
   timen die níet van Strava komen, botst waarschijnlijk met de voorwaarden van
   Strava. Cols hebben wel eigen coördinaten, maar alleen van de top, niet van
   de start.
4. **Een GPX is bewerkbare tekst.** Tijden aanpassen is makkelijk. Een
   KOM-titel met pushmelding naar anderen op basis van een upload is daardoor
   kwetsbaarder dan op basis van Strava.

**Advies:** begin, als je het wilt, met **coltijden op eigen geometrie**:
een startpunt per col erbij, tijden uit GPX en intervals.icu, zichtbaar als
eigen tijd. Laat de segmentverkenner en de ZWB KOM/QOM voorlopig bij Strava.
Sectie 8 zet de keuzes op een rij.

## 1. Hoe tijden nu binnenkomen

| Wat | Bron | Waar |
|---|---|---|
| Welke cols je reed | eigen matching: spoor tegen de top (`summit_lat/lon`, straal standaard 500 m) | `lib/cols/detector.ts` |
| Coltijd | Strava-segmentinspanning van het segment dat aan de col hangt (`cols.strava_segment_id`, sinds `0044`/`0064`) | `lib/cols/segment-times.ts` |
| ZWB Segments, voltooid | gespiegeld uit de cols (`mirrorLegacyColsToSegments`) en uit Strava-inspanningen | `lib/segments/sync.ts` |
| Segmenttijden, klassement | `strava_activity_segment_efforts`, alleen uit Strava (`include_all_efforts`) | `lib/segments/sync.ts`, `ingest-activity.ts` |
| Segmentverkenner en ZWB KOM/QOM | Strava-segmenten met minstens drie leden (`zwb_segment_maps`, `zwb_segment_koms`, `0152`/`0161`) | `lib/segments/explorer.ts`, `koms.ts`, `kom-notifications.ts` |
| Segmentgeometrie | Strava: `/segments/{id}` en de streams, bewaard in `zwb_segment_maps.polyline` en `track` | `lib/segments/geometry-sync.ts` |

Alles wat een tijd heeft, komt dus van Strava. Het enige dat ZWB zelf matcht,
is "reed je langs deze top".

## 2. Wat een spoor bij ons heeft

- **GPX-upload.** Bij het inlezen heeft de server het volledige bestand: elk
  punt met breedte, lengte, hoogte en tijd. **Bewaard wordt alleen een
  uitgedunde lijn van hooguit 500 punten, zonder tijden** (`encodeTrackPolyline`).
  Tijden moeten dus bij het uploaden berekend worden, of we moeten meer
  bewaren. Een oude GPX opnieuw uploaden kan altijd: de import is idempotent.
- **intervals.icu.** We vragen nu alleen de `latlng`-stream op
  (`lib/intervals/client.ts`). De `time`-stream bestaat ook, maar is nog niet
  tegen een echte rit gecontroleerd (spikepunt 4 in het andere onderzoek).
- **Opnamefrequentie.** Een fietscomputer met "slimme opname" legt niet elke
  seconde een punt vast, maar bij veranderingen, soms met gaten van vijf tot
  tien seconden. Met "elke seconde" is het één punt per seconde. Zwift schrijft
  elke seconde.

## 3. Het matchen

Per rit en per segment:

1. **Voorfilter.** Snijdt het omsluitende vak van de rit dat van het segment?
   Zo nee: klaar. Dit doet de col-detector al.
2. **Start.** Zoek een doorgang langs de startlijn: een lijnstuk tussen twee
   opeenvolgende punten dat binnen ongeveer 25 meter van het startpunt komt.
   Interpoleer de tijd van dat moment uit de twee punttijden.
3. **Route.** Volg het spoor vanaf daar. Het segment telt alleen als de rit
   het segment echt volgt, bijvoorbeeld als 90% van de segmentpunten binnen
   ongeveer 30 meter van het spoor ligt, in de goede volgorde. Dat sluit
   afsnijden en de omgekeerde richting uit.
4. **Einde.** Eerste doorgang langs de eindlijn daarna, weer geïnterpoleerd.
5. **Meerdere keren.** Een rit kan een segment vaker rijden (rondjes); elke
   doorgang is een poging, de snelste telt.

Voor cols is de eindlijn de top, die al bekend is. Het startpunt ontbreekt nog.

**Omvang.** Het algoritme zelf is een paar honderd regels plus tests, van
dezelfde orde als de col-detector. Het kan puur blijven, zoals `import.ts`.

## 4. Nauwkeurigheid

- **Interpolatie.** Met een punt per seconde is de fout per doorgang onder de
  seconde. Bij slimme opname met gaten van vijf seconden kan hij oplopen tot
  een paar seconden aan beide kanten.
- **GPS-ruis.** Tien tot twintig meter afwijking is normaal, onder bomen en
  tussen gebouwen meer. Op 40 km/u is 15 meter ruim een seconde.
- **Andere methode dan Strava.** Strava gebruikt een eigen, niet gepubliceerde
  matching. Onze tijd voor dezelfde rit zal een paar seconden afwijken. Tijden
  uit twee methodes in één klassement zijn dus niet helemaal vergelijkbaar.

**Gevolg:**
- **Cols.** De klimmen in `cols` duren tien minuten tot ruim een uur. Een paar
  seconden is minder dan 1%.
- **Korte segmenten.** Een sprint of een heuveltje van een minuut: de fout is
  even groot als de verschillen tussen leden.

## 5. Geometrie: van wie?

- **Cols.** De top is van ons (`0040`, `0048` voor Watopia). Voor een tijd is
  ook een startpunt nodig. Dat kan uit openbare bronnen, of eenmalig uit een
  eigen rit worden aangeklikt. Dat is beheerwerk, maar de lijst is klein
  (ongeveer vijftig cols in de migraties).
- **ZWB-segmenten en segmentverkenner.** De lijn komt van Strava. Volgens het
  andere onderzoek (sectie 2.3 en 4) mag Strava-data hooguit zeven dagen in een
  cache en alleen aan het lid zelf getoond worden. Die lijn gebruiken om ritten
  van buiten Strava te timen en aan de club te tonen, ligt nog verder van wat
  Strava toestaat. **Niet nagelezen in de beleidstekst**; hoort bij spikepunt 6
  van het andere onderzoek.
- **Eigen segmentlijnen.** Tekenen in de app, of vastleggen uit de GPX van een
  lid, is mogelijk. Dat is een eigen editor met beheer. Groter werk, en het
  klassement begint dan leeg.

## 6. Eerlijkheid en misbruik

- Een GPX is tekst. Tijdstempels verschuiven kost weinig moeite. Strava kent
  ook vervalsing, maar heeft meldingen en controles; wij niet.
- De ZWB KOM/QOM heeft een titel op het dashboard, op het ledenprofiel en een
  pushmelding naar wie hem verliest (`kom-notifications.ts`). Eén valse upload
  raakt dus anderen.
- In een club van zo'n 35 leden is sociale controle sterk. Toch is dit de
  reden om eigen tijden eerst als persoonlijk record te tonen, met herkomst, en
  niet meteen mee te laten dingen naar de titel.

## 7. Datamodel-schets (niet gebouwd)

- `cols`: `start_lat`, `start_lon` erbij (migratie).
- Eigen inspanningen apart van `strava_activity_segment_efforts`, bijvoorbeeld
  `ride_col_efforts (activity_id, col_slug, elapsed_seconds, started_at,
  method)`. Apart houden voorkomt dat de retentie- en ontkoppelcode van Strava
  eigen tijden meeneemt, en omgekeerd.
- `profile_climbed_cols.best_time_seconds` krijgt de snelste van beide bronnen,
  met de herkomst erbij, zodat de UI "eigen meting" kan tonen.
- GPX: berekenen bij het uploaden, in `importMyStravaFile`, want daar is het
  volledige bestand. intervals.icu: `time` bij de streams vragen en dan
  hetzelfde doen.
- Privacy: de bullet "Zelf geüploade ritten" noemt dan ook tijden op cols.
  Binnen de bestaande categorie; volgens eerdere keuzes alleen tekst, maar
  voorleggen.

## 8. Keuzes voor Stijn

| # | Vraag | Opties |
|---|---|---|
| 1 | Wil je eigen tijden überhaupt? | nee, Strava blijft de enige bron / ja, voor cols / ja, ook voor segmenten |
| 2 | Tellen eigen tijden mee voor titels (ZWB KOM/QOM, snelste op een col)? | alleen persoonlijk record / apart klassement / één klassement met herkomstlabel |
| 3 | Waar komen de startpunten van cols vandaan? | openbare bron / zelf aanklikken in beheer |
| 4 | Ook voor intervals.icu-ritten? | ja, meteen / later, na spikepunt 4 |

**Aanbevolen:** 1 = cols, 2 = persoonlijk record met herkomst, 3 = beheer,
4 = meteen als de `time`-stream er is. Geschatte omvang: middel, één migratie,
een pure matcher met tests, en de koppeling in de import en de intervals-sync.

## 9. Bewust niet voorgesteld, en waarom

- **Tijden uit het bewaarde spoor van 500 punten.** Geen tijden, en te grof: op
  een lange rit ligt er honderden meters tussen twee punten.
- **Strava-geometrie gebruiken voor niet-Strava-ritten.** Zie 5.
- **Eigen tijden direct in de segmentverkenner en de KOM-titels.** Zie 4 en 6.
- **Het volledige spoor met tijden bewaren "voor later".** Meer persoonlijke
  data dan nodig, en een GPX opnieuw uploaden kan altijd.
