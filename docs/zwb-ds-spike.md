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

**Getest:** de decoder met een nagebouwde PlayerState
(`tests/unit/zwift-playerstate-probe.test.ts`), en het hele script één keer
tegen een nagemaakt Zwift (login, inschrijvingen, 200/404/429, burst). **Niet**
tegen Zwift zelf: dat is de meting.
