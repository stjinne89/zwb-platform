# Spike: uitslagen uit de Zwift-API voor het Omnium

**Datum:** 2026-08-20. **Vraag:** kunnen de uitslagen van een Omnium-onderdeel
automatisch binnenkomen, zodat er tijdens de uitzending niet vier keer geplakt
hoeft te worden?

**Antwoord: ja, voor drie van de vier onderdelen.** Met milliseconden en met de
Zwift-ID erbij. De Sprint Quali blijft handwerk.

## Hoe er is gemeten

Met het bestaande ZWB-club-serviceaccount en dezelfde auth als
`src/lib/events/zwift-club.ts`: password-grant op `secure.zwift.com`, de
app-identity-headers (`Platform`, `Source`, `User-Agent`, `Zwift-Api-Version:
2.7`) en `accept: application/json`. Getest op een echt, afgelopen Zwift-event
waar een ZWB'er in reed (`5594893`, 22 juni 2026, vijf categorieën, 25
finishers). Alleen leesverzoeken; ZwiftPower is niet aangeraakt.

**Zonder `accept: application/json` krijg je protobuf.** De eerste ronde van deze
spike leek te mislukken omdat er binaire troep terugkwam; het is gewoon de
standaard-wire-format van die API. Met de header komt er JSON.

## Wat werkt

| Endpoint | Levert |
| --- | --- |
| `GET /api/events/{eventId}` | Event + `eventSubgroups[]` met `subgroupLabel` A/B/C/D/E |
| `GET /api/race-results/entries?event_id={eventId}` | De uitslag, één entry per finisher |
| `GET /api/events/subgroups/entrants/{subgroupId}?type=all&participation=signed_up` | De inschrijvers (draait al in productie) |

Eén entry uit `race-results/entries`:

```
rank                                    1
profileId                               8193860        ← Zwift-ID
profileData.firstName / lastName        Shaun / Hutchinson (WCC)
eventSubgroupId                         7163135        ← categorie via subgroupLabel
activityData.durationInMilliseconds     1904547        ← milliseconden
activityData.endDate                    2026-06-22T20:41:44.547+0000
flaggedCheating / flaggedSandbagging    false / false
qualified / lateJoin                    true / false
sensorData.avgWatts, heartRateData      302w, 148bpm
criticalP{15Seconds,1Minute,5Minutes,20Minutes}
```

De nummers 1 en 2 in dat event scheelden 322 milliseconden (1904547 vs 1904869).
Dat is precies het probleem dat de plak-import niet kan oplossen: ZwiftPower
toont "+0.322s" als tekst, hier staat het als getal.

## Wat dit oplost

Alle drie de gebreken die de proefdraai op editie 7 aan het licht bracht
(zie `PLAN.md`, ronde "Proefdraai Omnium op editie 7") verdwijnen:

1. **Tijdformaat.** Geen leiderstijd-plus-verschil meer om te parsen; het is een
   getal in milliseconden.
2. **Precisie.** Ook in `numeric(9,3)` past dat exact — migratie `0134` was dus
   sowieso nodig, ook op deze route.
3. **Rennerherkenning.** `profileId` is de Zwift-ID. Geen naamvarianten meer,
   geen "Martin Coffey" naast "Martin CoffeyA-P-V", geen `mergeRiders`-scherm
   voor nieuwe edities.

En het lost de vierde vraag op die nog open stond: **de gast.** De entrants van
een subgroep zijn opvraagbaar, dus wie niet is ingeschreven kan er vóór het
scoren uit — precies wat er vorig seizoen met de hand gebeurde.

Bijvangst: `flaggedCheating`, `flaggedSandbagging` en `qualified` komen mee. Dat
is informatie die de jury nu nergens ziet.

## Wat niet werkt

- `segment-results?...` geeft **406** met `accept: application/json` en **400**
  met protobuf-accepts. Het endpoint bestaat, maar wil andere parameters
  (vermoedelijk een `segment_id`) en spreekt geen JSON. Voor de **Sprint Quali**
  — snelste tijd op een KOM-segment — is er dus geen bruikbare bron gevonden.
- `race-results/entries?...&type=SEGMENT` negeert die parameter en geeft
  gewoon dezelfde finishuitslag terug.
- `events/{id}/results`, `event-results/{id}`, `events/subgroups/{id}/results`:
  allemaal 404.
- **De tussensprints van de Crit Royale** staan per definitie in geen enkele
  uitslag. Wie als eerste over een sprintlijn gaat, ziet alleen de commentator.

## Wat er nog niet is bewezen

- **Of de uitslag tijdens het event al binnenkomt.** Er stond geen live event om
  op te testen. De endpoint is dezelfde die de companion-app gebruikt en vult
  zich naarmate renners finishen, maar dat is redenering, geen meting. Te
  bevestigen op de eerstvolgende clubrit.
- **Hoe snel** een entry na de finish verschijnt.
- Of een event met vijf subgroepen alle categorieën in één `entries`-lijst geeft
  (waarschijnlijk wel, `eventSubgroupId` staat per entry) of dat er per subgroep
  moet worden opgehaald.

## Wat dit zou betekenen voor de uitzending

Prologue, Scratch en de finish van de Crit Royale komen automatisch binnen, met
categorie en al. De Sprint Quali en de tussensprints blijven handwerk: twee
momenten in plaats van vier, en de twee die overblijven zijn precies de twee
waar een mens sowieso naar zit te kijken.

De pollstructuur ligt er al: `/api/live/timing/[eventId]` haalt nu elke twintig
seconden een externe tijdregistratie op voor buitenritten. Hetzelfde patroon met
`race-results/entries` erachter geeft een Omnium-onderdeel dat zichzelf vult.

## Risico's

- **Onofficiële API.** Zwift kan endpoints wijzigen. Dat geldt al voor de
  club-sync die hierop draait; het serviceaccount en de env-configuratie
  (`ZWIFT_API_BASE`, paden) zijn er al op ingericht.
- **Serviceaccount.** Eén account, wachtwoord-grant, lockout-risico bij te veel
  verzoeken. Bij een poll van 20 seconden over negentig minuten zijn dat 270
  verzoeken per editie — netjes cachen zoals `external-timing.ts` doet.
- **Blijft een tweede route nodig.** Als de API het op de avond zelf begeeft,
  moet de plak-import er nog steeds zijn. Die vervalt dus niet.
