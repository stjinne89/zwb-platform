# Live ZRL-dashboard — proefmeting en bouwplan

Vraag van de eigenaar (2026-09-22): kunnen we een Zwift Racing League-race live
volgen, met de WTRL-puntentelling erbij als dashboard, voor ploegleiders én
supporters? Codex begon het onderzoek en liep vast op de tijdslimiet; Claude nam
het over en mat een echte race.

## Conclusie

**Ja, de puntentelling kan live.** Zwift zelf geeft via zijn segmentresultaten
elke passage van elke renner over elke sprint en KOM, ongeacht waar de camera
staat. Daarmee zijn FAL en FTS voor de hele divisie te berekenen, binnen ongeveer
een halve minuut na de passage. Live posities van het hele veld zijn er **niet**:
een camera (Sauce, Fan View) ziet alleen renners in de buurt.

Keuzes van de eigenaar (2026-09-22):

- **Databron:** het platform haalt zelf op, met het bestaande
  ZWB-Zwift-serviceaccount. Er hoeft tijdens de race geen computer aan te staan.
- **Teams van tegenstanders:** automatisch op de teamtag in de Zwift-naam, en een
  ploegleider stelt renners zonder of met afwijkende tag één keer bij.

## Proefmeting 22 september 2026

Race: *ZRL 26/27 Fresh & Fast, Open Topaz League Division 1 — Race 1*, Zwift-event
`5711259`, Montmartre Mixer (Parijs, 27,6 km), Race of Truth (puntenrace zonder
draften). Twee bezette subgroepen: B `7354711` (34 inschrijvingen, start 14:01) en
C `7354709` (51, start 14:02). De teams in B en C verschillen volledig, dus het
gaat om twee klassementen in één Zwift-event.

Opstelling: Sauce for Zwift 2.3.3 op een tweede Windows-computer in hetzelfde
netwerk (`http://<ip>:1080/api`), ingelogd met een kijkaccount en een
monitoraccount. Een alleen-lezen script logde elke 15 s de segmentresultaten van
de ingeschreven renners, elke 5 s wie Sauce in de buurt zag, en elke 5 min de
Zwift-uitslag.

Punten die tellen (Zwift Insider, ronde 1 week 1): alle zeven passages — Lutece
Sprint, Monceau Sprint (2×), Église Sprint, Montmartre KOM (2×) en Tchou Tchou
Sprint. De Zwift-segmentvolgorde van de route staat ook in `zwift-data`
(`segmentsOnRoute`).

### Wat de meting liet zien

- **Dekking tijdens de race: 559 van 560 passages.** Voor elke finisher zeven
  passages verwacht: B 230 van 231 (één KOM-passage ontbrak), C 329 van 329. De
  38 passages daarbovenop waren renners die na de finish doorfietsten; die
  negeert de puntentelling op basis van de finishtijd.
- Finishers: B 33 van 34, C 47 van 51 (twee DNS, de rest DNF). Starters met
  minstens één passage: B 34, C 47.

- **`getSegmentResults` is de sleutel.** Sauce roept daarmee Zwifts
  `/api/segment-results` aan (protobuf, `world_id=1`, `segment_id`, optioneel
  `player_id`, `from`, `to`). Het levert de passages van *iedereen* in de wereld
  in het venster, niet alleen van renners in de buurt: in het uur vóór de race al
  388 passages van 235 renners op Monceau Sprint.
- **Vertraging:** over 603 gelogde passages stond een passage mediaan 9 s na het
  passeren in het log, p95 17 s, maximaal 45 s. Het grootste deel daarvan is het
  pollinterval van 15 s.
- **Nabije renners zonder Fan View:** Sauce zag hooguit 3 deelnemers tegelijk.
- **Fan View:** hield op deze opstelling 10–30 s stand en viel dan terug op het
  eigen account. Ook dán zag Sauce alleen de gevolgde renner: in een Race of Truth
  liggen de renners te ver uit elkaar.
- **Teamtags zijn rommelig:** in C hadden 19 van de 51 renners geen tag in hun
  naam, en één team kwam in vier spellingen voor ("BMTR Cubs 🦬", "BMTR Racing -
  Cubs", "BMTR Racing Cubs", …). Zonder bijstelling is het teamklassement fout.

## WTRL-puntentelling (puntenrace)

Bron: [WTRL ZRL resources](https://www.wtrl.racing/zrl/resources/), gelezen
2026-09-22.

| Onderdeel | Regel |
| --- | --- |
| FAL | Per passage: 1e krijgt het aantal starters, dan telkens 1 minder. |
| FTS | Per segment over de hele race: top 10 snelste tijden, 15-12-10-8-6-5-4-3-2-1. Eén renner kan meerdere keren scoren. |
| FIN | 1e finisher krijgt het aantal starters, aflopend tot 1. |
| Podium | 10-8-6-4-2 voor de eerste vijf. |
| DNF/DQ | Punten vervallen en schuiven niet door. |
| Team | Som van de rennerspunten; volle leaguepunten alleen met 4 starters, met 3 minder, daaronder niets. |

Gevolg voor het dashboard: FTS kan tot de laatste renner binnen is nog
verschuiven, en punten van een renner die niet finisht vallen weg. Het dashboard
toont dus *voorlopig* totdat Zwift de uitslag definitief heeft, en de officiële
WTRL-uitslag blijft leidend (we linken ernaar, we halen hem niet op: WTRL-
voorwaarden, zie `src/lib/teams/zrl-season.ts`).

## Bouwplan en stand

Stap 0 t/m 4 zijn op 2026-09-22 gebouwd en lokaal getest (unit-tests, `tsc`,
ESLint). **Niet** in de browser bekeken: er is hier geen `.env.local`, dus geen
Supabase en geen Zwift-inloggegevens. De snapshot en de pagina zijn daarom nooit
tegen echte Zwift-data gedraaid; alleen de puntentelling is dat (met de data van
de proefmeting).

Uitgangspunt: niets opslaan tijdens de race behalve de teambijstelling. Het
dashboard rekent bij elke aanvraag uit Zwift-data die 15 s gecachet is
(`unstable_cache`, het patroon van `src/lib/live/external-timing.ts`). Zo is de
belasting op Zwift gelijk bij één of duizend kijkers, en er is geen cron nodig.

### Stap 0 — bewijzen dat de server het mag (klein, eerst)

Een knop "Test segmentresultaten" op `/beheer/event-scan`, naast de bestaande
clubkoppeling-diagnose. Roept met het serviceaccount `/api/segment-results` aan
voor één segment in het laatste uur en toont het aantal passages.

- Hergebruik token en headers uit `src/lib/events/zwift-club.ts` (`fetchToken`,
  `ZWIFT_DEFAULT_HEADERS`), met `accept: application/x-protobuf-lite` zoals Sauce.
- Kleine protobuf-decoder voor `SegmentResults` zonder nieuwe dependency
  (varint/length-delimited, alleen de velden die we gebruiken: athleteId, namen,
  worldTime, elapsed, avgPower, segmentId, id).
- De knop toont ook de ruwe protobufvelden van het eerste resultaat. De
  veldnummers komen van Sauce/zwift-offline en zijn **niet** tegen een echt
  Zwift-antwoord gecontroleerd; klopt de indeling niet, dan is dat hier te zien.
- **Kan niet lokaal:** er zijn hier geen Zwift-inloggegevens. Pas na een deploy en
  één klik op productie is dit bewezen. Weigert Zwift, dan terug naar de
  eigenaar (de Sauce-route is dan het alternatief).

### Stap 1 — puntentelling als pure module

`src/lib/zrl-live/scoring.ts`, puur en getest:

- Invoer: passages (segment, renner, `ts`, `elapsed`), de segmentvolgorde van de
  route, starters, finishuitslag (optioneel), teamtoewijzing.
- Passage-index per renner per segment (Monceau en de KOM komen twee keer voor).
- FAL op volgorde van `ts` per passage; FTS top 10 per segment over alle
  passages; FIN + podium uit de uitslag; DNF-punten eraf.
- Uitvoer: per renner verdiend en voorlopig, per team som en rang.
- Unit-tests met kleine, verzonnen races. Daarnaast één keer met de hand op de
  volledige log van de proefmeting gedraaid (niet in de repo: de log bevat namen
  van derden). Uitkomst: B 34 starters, passages 34/34/34/34/34/33/34, één renner
  zonder finish; C 47 starters, op alle zeven passages 47. Teamtop in C: ZIRT
  1310 (6 renners). In B stonden "Bulldozers" en "Bulldozer" als twee teams —
  precies waarvoor de bijstelling is. Niet vergeleken met de WTRL-uitslag: die
  stond op het moment van schrijven nog niet online.

### Stap 2 — data ophalen en snapshot

- `fetchSegmentResults` in `src/lib/events/zwift-club.ts`: per segment met
  `from = vroegste subgroepstart`, gefilterd op inschrijvers. Passages vóór de
  eigen start of na de eigen finish tellen niet.
- Segmenten per route: statische tabel `src/lib/zwift/route-segments.json`
  (313 routes, 143 segmenten, in rijvolgorde), eenmalig uit Sauce geëxporteerd.
  `zwift-data` kent wel de volgorde maar niet de Zwift-ID's; koppelen op naam
  faalde voor 46 van de 80 segmenten. Een nieuwe Zwift-route vraagt een nieuwe
  export; tot dan meldt het dashboard "route onbekend".
- Inschrijvers: bestaande entrants-endpoint (`zwift-club.ts`), uitslag:
  `/api/race-results/entries?event_subgroup_id=…` (JSON, per 50).
- Welke subgroep: die waarin de Zwift-ID's van ons team staan.
- `src/lib/zrl-live/snapshot.ts` (`loadZrlLive`): Zwift-kant 15 s gecachet per
  Zwift-event. Geen aparte API-route; de pagina ververst zichzelf.
- "Definitief" is een benadering: er is een uitslag en 15 minuten geen nieuwe
  passage of finish meer. Zwift heeft geen vlag die zegt dat de uitslag af is.
- Belasting op Zwift per cachevenster: één eventverzoek, per subgroep inschrijvers
  en uitslag, en één verzoek per segment op de route (7 unieke → 5). Ongeveer
  elke 15 s zolang iemand kijkt; niemand kijkt, geen verzoeken.

### Stap 3 — dashboard

Publieke pagina `/live/zrl/[eventId]` (ZWB-event-ID van een ZRL-teamevent),
ververst elke 15 s (`src/app/omnium/_components/auto-refresh.tsx`):

- **Teamklassement** bovenaan, met ons team gemarkeerd.
- **Laatste passages**: per segment wie welke punten pakte.
- **Onze renners**: FAL/FTS/FIN per renner, en FTS-plekken die nog kunnen vallen.
- Status "voorlopig" tot de Zwift-uitslag definitief is, daarna een link naar de
  WTRL-uitslag.

Knop "Live stand" in de Raceinfo van een ZRL-teamevent met Zwift-event. Geen
uitleg in het scherm (zie AGENTS.md). Uitleg op `/hulp` is nog niet geschreven.

### Stap 4 — teambijstelling

Migratie `0187_zrl_team_assignments.sql`: per league-sleutel (seizoen, league,
divisie, Zwift-subgroep, uit de eventnaam) de toewijzing Zwift-ID → teamnaam.
Volgorde: eigen renners (uit `wtrl_team_riders` en teamleden met Zwift-ID) →
bijstelling → tag in de naam. Wie `teams.manage_results` heeft (captains, bestuur)
ziet "Teams bijstellen" op de pagina; de server leidt de sleutel zelf af uit het
event, niet uit het formulier.

### Bewust niet

- **Geen live kaart of posities van het veld:** geen bron voor. Sauce of Fan View
  ziet alleen de omgeving van één renner.
- **Geen WTRL-uitslagen ophalen:** hun voorwaarden. We rekenen zelf met hun
  gepubliceerde regels op Zwift-data, en linken naar hun uitslag.
- **Geen Sauce-verzamelprogramma** in deze ronde: de eigenaar koos voor ophalen
  door de server. Blijft de terugvaloptie als Zwift de server weigert.
- **Geen opslag van passages** tijdens de race: onnodig zolang de cache volstaat.
  Pas nodig als we achteraf willen terugkijken, en dat is niet gevraagd.
