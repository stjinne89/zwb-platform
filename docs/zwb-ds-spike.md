# ZWB DS — live race-informatie zonder Sauce (onderzoek)

Vraag van de eigenaar (2026-10-17): kan het platform de gegevens die Sauce for
Zwift als overlay toont zelf maken, voor leden die Zwift op een tablet rijden
of die verbindingsproblemen hebben? Werktitel: **ZWB DS** (directeur sportif).

Alleen onderzocht, niets gebouwd. Niets hieronder is tegen Zwift gemeten: er
staan geen Zwift-inloggegevens in de worktree en de Sauce-pc
(`192.168.0.134:1080`) was niet bereikbaar.

## Conclusie

**Waarschijnlijk wel mogelijk, maar het belangrijkste is nog niet bewezen.**
Sauce haalt de data van één renner niet alleen uit zijn gameclient, maar ook
via een gewoon HTTP-endpoint van Zwift. Dat endpoint kan het platform met een
Zwift-account aanroepen, zoals het nu al segmentresultaten ophaalt. Twee dingen
zijn onbekend: of Zwift dat endpoint aan het ZWB-serviceaccount geeft, en hoe
vaak het mag. Daar hangt van af of DS alleen de eigen renner en ploeg kan tonen,
of het hele veld van een subgroep.

## Hoe Sauce aan zijn data komt

Bron: `src/zwift.mjs` en `src/zwift.proto` op de `main`-branch van
[SauceLLC/sauce4zwift](https://github.com/SauceLLC/sauce4zwift) (GPL-3.0),
gelezen 2026-10-17.

1. **Een eigen, versleutelde gameclient** (het "monitoraccount"). Sauce logt in
   met een tweede, gratis Zwift-account (`/api/users/login` met een eigen
   AES-sleutel), opent een relaysessie over TCP (poort 3025) en UDP (3024) en
   stuurt elke seconde een kijkersstatus (`justWatching`, `watchingAthleteId`).
   Zwift stuurt dan de `playerStates` van de renners rond de gevolgde renner
   terug, plus `eventPositions`. Eén verbinding per account: het openen ervan
   "causes Zwift to close any other TCP connections for this athlete".
2. **HTTP per renner.** `getPlayerState(id)` haalt
   `/relay/worlds/1/players/{id}` op als `PlayerState`-protobuf. Sauce gebruikt
   dat als terugval voor de gevolgde renner, hooguit om de 3 s, en na fouten
   oplopend tot 30 s ("Stop harassing relay servers"). Een renner met de
   Ninja-powerup komt niet terug; een 404 geeft niets.
3. **De rest via de gewone API**, waarvan ZWB er al een aantal gebruikt:
   `/api/segment-results`, `/api/race-results/entries`, entrants en events.

Sauce heeft dus geen eigen account nodig, maar wel twee Zwift-logins en een
computer waarop het draait. Dat laatste hebben de tabletgebruikers niet.

## Wat een PlayerState bevat

Uit `zwift.proto`: `power`, `heartrate`, `_cadence`, `_speed`, `draft`,
`distance`, `_eventDistance`, `x`/`y`/`z`, `climbing`, `laps`, `time`,
`timeGap`, `routeId`, `eventSubgroupId`, `courseId`, `sport`. Met het gewicht
uit het Zwift-profiel en het routeprofiel (`docs/zwift-routeprofiel-spike.md`)
geeft dat: watt en W/kg, hartslag, cadans, snelheid, draft, afgelegde en
resterende afstand, en de plek op het hoogteprofiel. Een gat tussen twee renners
volgt uit het verschil in `_eventDistance` en de snelheid.

## Twee routes voor ZWB

### A. Het platform vraagt de spelersstatus op (voorkeur)

- De server haalt per renner `/relay/worlds/1/players/{id}` op, gecachet per
  subgroep op een paar seconden. Hetzelfde patroon als de live ZRL-stand
  (`src/lib/zrl-live/snapshot.ts`): de belasting op Zwift is gelijk bij één of
  honderd kijkers.
- Welke renners: het lid zelf, de ploeggenoten in dezelfde subgroep, en als de
  limiet het toelaat het hele veld uit de inschrijvingen. Dat laatste zou meer
  zijn dan Sauce: een camera ziet alleen de omgeving van één renner
  (`docs/live-zrl-dashboard.md`).
- Sluit aan op wat er al is: segmentpassages, FAL/FTS en de ZRL-stand.
- **Grenzen.** Een meting om de paar seconden, geen 1 Hz. Dus geen exacte
  3-secondengemiddelden, NP of W'bal, en Sauce' `eventPositions` (de officiële
  plaats) niet: de volgorde komt uit de afgelegde afstand.
- **Onbekend.** Of het serviceaccount (client `Zwift_Mobile_Link`) het endpoint
  krijgt. De limiet: op `/race-results/entries` is dat twee verzoeken per
  seconde voor het hele account. Geldt dat hier ook, dan kost een veld van 50
  renners 25 s per ronde en blijft alleen de eigen ploeg over. Ook onbekend: wat
  het antwoord geeft bij een renner die in een event rijdt, en hoe vers het is.

### B. Een eigen monitor, zoals Sauce (afgeraden)

Een altijd draaiende gameclient: 1 Hz, de renners rond de gevolgde renner en
`eventPositions`. Daarvoor is nodig: een server die altijd aan staat (niet
Netlify; ook de TTT-bot is bewust niet in de cloud gezet), één Zwift-account per
gevolgde renner, en het versleutelde protocol nabouwen uit GPL-code of Sauce
headless draaien. Breekt bij elke protocolwijziging van Zwift en gaat verder dan
wat ZWB nu met de API doet. Alleen overwegen als route A te grof blijkt.

## Risico's en kosten

- **Zwift-voorwaarden.** Het is dezelfde onofficiële API als nu, maar veel
  vaker. Blokkeert Zwift het serviceaccount, dan vallen ook de event-scan, de
  live ZRL-stand en de Omnium-uitslagen weg. Een apart Zwift-account voor DS
  houdt dat gescheiden.
- **Netlify-tegoed.** De cache houdt Zwift rustig, maar elke kijker vraagt de
  server om de paar seconden. Eén kijker, één uur, elke 5 s is 720 aanroepen.
  Hoe dat zich tot het tegoed verhoudt, is niet uitgerekend.
- **Privacy.** DS toont live data van tegenstanders. Hartslag is een
  gezondheidsgegeven: alleen voor het lid zelf tonen, niet voor anderen. Niets
  opslaan. De privacyverklaring moet het noemen (eerst aan de eigenaar
  voorleggen).
- **Featurepauze.** Het bestuur overweegt die; zie de actieve volgorde in
  `PLAN.md`.

## Voorgestelde eerste stap

Een meting voordat er iets gebouwd wordt, zoals stap 0 van het live
ZRL-dashboard: voor een opgegeven Zwift-ID de spelersstatus ophalen, de ruwe
velden tonen, en met een korte reeks verzoeken de limiet zien. Moet gebeuren
terwijl die renner rijdt, liefst in een race.

- **Lokaal, zonder deploy:** een alleen-lezen script met Zwift-inloggegevens in
  `.env.local`. Kost geen Netlify-tegoed. **Gekozen door de eigenaar.**
- **Op productie:** een knop op `/beheer/event-scan`. Kost een deploy.

Pas na die meting is te zeggen welke versie van DS haalbaar is.

## Meetscript

`scripts/zwift-playerstate-probe.mjs` (2026-10-17). Leest
`ZWIFT_DS_USERNAME`/`ZWIFT_DS_PASSWORD` uit `.env.local`, of anders het
serviceaccount (`ZWIFT_USERNAME`/`ZWIFT_PASSWORD`). Een apart account heeft de
voorkeur: het serviceaccount deelt zijn limiet met het platform, dus een meting
tijdens een race kan de live ZRL-stand een 429 bezorgen. `--subgroup auto` neemt
de subgroep uit de status van de eerste eigen renner.

```
node scripts/zwift-playerstate-probe.mjs --ids <eigen Zwift-ID's> --subgroup auto --minutes 10
node scripts/zwift-playerstate-probe.mjs --ids <één Zwift-ID> --minutes 1 --burst 20
```

Wat het meet, en welke vraag het beantwoordt:

| Uitvoer | Vraag |
| --- | --- |
| Statussen (200/401/403/404/429) | Krijgt dit account het endpoint? |
| Eerste antwoord per renner, ruw | Kloppen de veldnummers uit Sauce' `zwift.proto`? |
| Leeftijd van de status | Hoe vers is wat Zwift geeft? |
| Nieuwe status / antwoorden, tijd ertussen | Hoe vaak verandert de status echt? |
| Duur van een ronde, eerste 429 | Past het hele veld binnen een paar seconden? |
| Renners met deze subgroep in hun status | Zit `eventSubgroupId` erin tijdens een race? |
| Burst | Waar ligt de limiet? |

Per verzoek een regel in `.tmp/` (in `.gitignore`), zonder namen; hartslag
alleen van de renners in `--ids`, van de rest alleen óf er hartslag was. Na een
429 wacht het 30 s, zoals Sauce.

### Eerste meting, 2026-10-17 14:24 (eigenaar, één renner, 1 minuut)

Met het serviceaccount (de `.env.local` was een kopie van die uit de
hoofdmap), één renner in de startvak van een event.

- **Het endpoint werkt voor een gewoon account.** Eerst 5 keer 404 (15 s; de
  renner was waarschijnlijk nog niet in de wereld), daarna 15 keer 200.
- **Vers:** elke status was nieuw ten opzichte van de vorige (om de 3 s), en 2
  à 3 s oud bij binnenkomst. Antwoordtijd ongeveer 175 ms.
- **`eventSubgroupId` staat er al in de startvak in**, dus `--subgroup auto`
  werkt vóór de start.
- De veldnummers kloppen met Sauce' `zwift.proto`. De "onbekende velden" 14, 22,
  36, 37, 38, 41 en 43 staan wel in die proto (o.a. `lean`, `canSteer`), maar
  het script leest ze bewust niet.
- **Nog niet gezien:** vermogen, snelheid en afstand tijdens het rijden (alles
  stond op 0 in de startvak), het veld, en de limiet.

### Tweede meting, 2026-10-17 14:28–14:35 (eigenaar, hele subgroep)

Serviceaccount, `--subgroup auto`: subgroep `7381538`, 25 ingeschrevenen. Cijfers
uit het log tot 14:35:42 (295 verzoeken); de run liep door tot 14:39.
De logs van beide metingen zijn daarna bij het testen van het script per ongeluk
gewist; de cijfers hier zijn alles wat ervan over is.

- **Het hele veld komt terug.** 22 van de 25 renners gaven een status, 19 reden
  (snelheid > 0). 51 keer 404: renners die (nog) niet in de wereld waren.
- **Vers tijdens het rijden:** mediaan 2,5 s, p95 3,9 s oud.
- **De limiet is ongeveer 45 verzoeken per minuut per account.** De eerste 429
  kwam na 47 verzoeken in 32 s. Daarna elke minuut één 429, telkens na 41 tot 45
  verzoeken in de voorgaande 60 s; ook direct na 30 s pauze. Dat past bij een
  schuivend venster van een minuut, niet bij een limiet per seconde. Of die
  limiet per account of per IP-adres geldt, en of hij gedeeld wordt met de
  andere Zwift-endpoints die het platform gebruikt, is niet gemeten.

**Gevolg voor route A.** Met één account en ~45 per minuut:

| Wat | Verversing | Renners |
| --- | --- | --- |
| Eén renner live | elke 3 s | 2 tegelijk |
| Eigen renner + ploeg | elke 5 s | 3 à 4 |
| Hele veld van 25 | elke ~35 s | 25 |

Live gaten en W/kg rond een renner, zoals Sauce, zijn hiermee niet te maken
voor meer dan een paar leden tegelijk. Wel kan: per race een overzicht van het
hele veld (plek op de route, afstand tot elkaar) om de halve minuut, iets wat
Sauce niet geeft. Meer renners kan alleen met meer accounts (grijs gebied in de
Zwift-voorwaarden) of met route B (de gameclient, zonder deze limiet).

De burst-test (stap 7) is niet meer nodig: de limiet is hiermee bekend.

**Getest:** de decoder met een nagebouwde PlayerState
(`tests/unit/zwift-playerstate-probe.test.ts`), en het hele script één keer
tegen een nagemaakt Zwift (login, inschrijvingen, 200/404/429, burst). **Niet**
tegen Zwift zelf: dat is de meting.

## Bouwplan route A: het raceoverzicht (voorstel, 2026-10-17)

De eigenaar koos route A en vroeg een bouwplan, met een voorstel waar het
overzicht in de app komt. Nog niet gebouwd; eerst de keuzes hieronder.

### Nog één meting: de drop-in-lijst

In Sauce' broncode staat een tweede bron: `/relay/dropin`, de lijst waaruit je in
Zwift bij iemand aansluit. Eén verzoek geeft per wereld lijsten renners
(`others`, `followees`, `proPlayers`, `pacerBots`) met `athleteId`, `distance`,
`power`, `speed`, `wkg`, `x`/`y` en `routeId`, maar zonder `eventSubgroupId`.
Staan de renners van een race daarin, dan is één verzoek om de paar seconden
genoeg voor **alle** races tegelijk, en speelt de limiet van ~45 per minuut geen
rol meer. Onbekend is hoeveel renners zo'n lijst bevat; voor de drop-in-knop
zou een steekproef volstaan.

Meten tijdens een race (sinds 2026-10-17 in het meetscript):

```
node scripts/zwift-playerstate-probe.mjs --ids <eigen Zwift-ID> --subgroup auto --dropin --minutes 5
```

De samenvatting zegt hoeveel van de ingeschreven renners in de lijst staan. Ook
na te kijken in het log: of `distance` in de lijst gelijk loopt met de afstand
in het event (in de startvak stond de afstand van de spelersstatus op 0).

| Uitkomst | Databron | Wat het overzicht haalt |
| --- | --- | --- |
| Bijna het hele veld staat erin | dropin, elke 5 s, één verzoek voor alle races | elke 5 s, alle races tegelijk |
| Weinig of niemand | spelersstatus per renner, ~40 per minuut verdeeld | 1 race: elke ~35 s; ZRL-avond met 7 divisies: elke paar minuten |

In het tweede geval schat het overzicht de plek tussen twee metingen met de
laatste snelheid, en ankert het op de sprint- en KOM-passages die het platform al
ophaalt. Op een ZRL-avond met zeven divisies tegelijk is het dan grof; dat moet
de eigenaar weten voordat er gebouwd wordt.

### Waar het in de app komt

**Eén nieuwe pagina, `/ds/[eventId]`: "ZWB DS".** Per ZWB-event met een
Zwift-event, dus niet alleen ZRL maar ook clubraces, FRR en andere races in de
kalender (`events.zwift_event_id`). Achter de login, in de app-schil. Gemaakt
als tweede scherm: Zwift op de tablet, ZWB DS op de telefoon ernaast.

Ingangen, allemaal plekken waar de race nu al staat:

1. **Dashboard, "Mijn races".** Tijdens het racevenster (15 min voor de start
   tot 2 uur erna, hetzelfde venster als nu) krijgt de tegel een rode knop
   **ZWB DS**, voor elke race met een Zwift-event. Bij ZRL komt die naast de
   huidige "Live stand".
2. **Eventpagina, Raceinfo-kaart.** Knop **ZWB DS** naast "Pacingplan" en "Live
   stand".
3. **Live ZRL-stand** (`/live/zrl/[eventId]`): een knop naar ZWB DS, en in DS
   een knop terug naar de stand. De stand zelf blijft publiek en ongewijzigd,
   voor supporters en de Sauce-overlay.
4. **`/hulp`:** wat ZWB DS is, hoe vaak het ververst, en de tip dat wie op een
   computer zwift ook Sauce kan gebruiken. Geen uitleg in het scherm zelf
   (AGENTS.md).

Bewust niet: in het hoofdmenu (alleen nuttig tijdens een race), publiek (live
data van tegenstanders), in de Sauce-overlay (wie Sauce heeft, heeft dit niet
nodig).

### Wat op de pagina staat

Van boven naar beneden, op een telefoon in één kolom:

- **Kop:** racenaam, de subgroep (standaard die van het ingelogde lid, anders die
  met de meeste ZWB-renners; wisselen met chips), en "bijgewerkt 12 s geleden".
- **Koersbalk:** de route als balk van start tot finish, met sprints en KOM's
  (uit `route-segments.json`), de groepen als stippen en ZWB-renners in
  clubkleur. Een hoogteprofiel kan later, als het pacingplan er een voor de
  route heeft.
- **Groepen:** van voor naar achter, per groep het aantal renners, de
  achterstand op kop in seconden, en welke ZWB-renners erin zitten. Een groep
  openklappen toont de renners met W/kg.
- **Onze renners:** per ZWB-renner de plek in het veld, achterstand op kop, nog
  te rijden kilometers, en de volgende sprint of KOM over zoveel km.
- **Bij ZRL:** de huidige stand van het team in één regel, met de knop naar de
  volledige stand.

Geen hartslag van wie dan ook (gezondheidsgegeven), geen kaart.

### Bouwstappen

0. **Dropin-meting** in een race (hierboven). Bepaalt de databron.
1. **Pure module** `src/lib/ds/field.ts`: van metingen (renner, afstand,
   snelheid, tijdstip) naar plekken, groepen en achterstanden op één moment,
   met schatten tussen metingen. Unit-tests met verzonnen velden.
2. **Zwift-kant:** protobuf-decoder in `src/lib/zwift/` (uit het meetscript),
   ophalen in `zwift-club.ts` met een apart account (`ZWIFT_DS_USERNAME` /
   `ZWIFT_DS_PASSWORD` in Netlify). Dropin: één cache-item voor alle races, 5 s.
   Spelersstatus: een gedeeld budget over alle Netlify-instanties, met de
   laatste status per renner in een kleine tabel (migratie), na de race leeg.
3. **Snapshot** `loadDsView(eventId)`: event → Zwift-event → subgroepen →
   inschrijvingen → ZWB-renners (Zwift-ID's van leden) → veld.
4. **Pagina** `/ds/[eventId]`, ververst elke 15 s zolang het tabblad zichtbaar
   is (patroon van `AutoRefresh`), alleen in het racevenster.
5. **Ingangen**, `/hulp`, en de privacyverklaring (tekst eerst aan de eigenaar).
6. **Proef in een echte race** door de eigenaar, dan pas pushen.

### Kosten en risico's

- **Netlify:** elke kijker ververst elke 15 s: 240 aanroepen per kijker per uur.
  Twintig kijkers bij een race van een uur: 4.800. Nog niet tegen het tegoed
  gelegd.
- **Zwift:** apart account, zodat een blokkade het serviceaccount niet raakt.
  Bij de dropin-route is de belasting vast (12 per minuut), los van het aantal
  races en kijkers.
- **Featurepauze:** het bestuur overweegt die nog.

### Keuzes van de eigenaar (2026-10-17)

Akkoord met de plaatsing hierboven, en met de drie voorstellen:

1. Alleen voor ingelogde leden, niet publiek.
2. W/kg van tegenstanders wel tonen, zoals Zwift in het spel; hartslag niet.
3. Eerst alleen de kalender (`events`); de Omnium later.

Volgende stap: de eigenaar draait de dropin-meting tijdens een race.

### Dropin-meting, 2026-10-17 15:42 (eigenaar)

Serviceaccount, subgroep `7383020` (15 ingeschrevenen), elke 5 s, 45 verzoeken
op het moment van plakken.

- **De drop-in-lijst bevat het veld niet.** 16 werelden, samen 21 renners: 6
  profs, 14 pacerbots en 1 renner die het account volgt. `others` was in elke
  wereld leeg, ook in werelden met honderden zwifters. **0 van de 15** renners
  uit de race stonden erin.
- **Gevolg:** de dropin-route vervalt. Overblijft de spelersstatus per renner,
  met ~40 verzoeken per minuut per account (zie de tabel bij de tweede meting):
  bij één race het veld elke ~35 s, op een ZRL-avond met zeven divisies
  tegelijk elke paar minuten.
- **Wat opviel:** wie het account volgt, staat wél in de lijst (`followees`).
  Volgt het DS-account de ZWB-renners, dan komen die misschien met één verzoek
  per 5 s binnen, voor alle races tegelijk, en gaat het budget per renner
  helemaal naar de tegenstanders. Niet gemeten: of `followees` alle gevolgde
  renners geeft of een deel, en of `distance` daar de afstand in het event is.

## Gebouwd (2026-10-17)

Na de dropin-meting koos de eigenaar om te bouwen met de spelersstatus per
renner. Wat er staat, wat bewust niet en wat nog niet geverifieerd is: zie het
blok "Gebouwd — ZWB DS" in `PLAN.md`. Afwijkingen van het bouwplan hierboven:

- Geen aparte API-route: de pagina zelf ververst elke 15 s en vraagt dan
  hooguit 8 renners op (`src/lib/ds/snapshot.ts`).
- Het budget is een emmer van 30 per minuut tot 10, niet "~40 verdeeld": zo
  komt een minuut nooit boven 40, ook niet na een rustige periode.
- Geen W/kg per groep, wel per renner, en alleen als de startlijst een gewicht
  geeft; anders watt.

