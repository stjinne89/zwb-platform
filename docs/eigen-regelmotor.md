# Eigen regelmotor naast de AI

Gestart op 2026-10-17. `PLAN.md` heeft de stand per ronde; dit stuk bewaart het
ontwerp en de afspraken tussen de onderdelen.

## Waarom

Elk trainingsschema komt van OpenAI. In de 30 dagen tot 2026-10-17 waren dat
zo'n 170 generaties voor 8 leden: 91 bijwerkingen, 75 dag-aanpassingen en 4
nieuwe schema's. 18 % van alle bijwerkingen tot dan toe mislukte (39 van 218).
Twee keer dezelfde invoer geeft twee verschillende schema's, en of een schema
de eigen regels volgt, meet niemand.

De regels zelf zijn er al. `defaultTrainingPrompt()` in
`src/lib/training/workouts.ts` is een regelboek van zo'n negentig regels, en de
meeste zijn getallen: piekweek ≥ 85 % van het plafond, ~10 % groei per week,
nooit meer dan een kwart erbij, herstelweek 60-70 %, taper 40-60 % minder,
kamp 1,5-2x, vaste zonebanden. De dag-aanpassing staat er als beslisboom van
vier stappen. De AI vertaalt die regels elke keer opnieuw, en de code repareert
achteraf wat misgaat (`insertPlanWorkouts`).

De motor schrijft die regels als code. Hij vervangt de AI **niet** in deze
ronde: hij draait ernaast, en pas als de meetlat laat zien dat hij minstens zo
goed is, valt er iets te beslissen.

## Wat de motor niet doet

- **Vrije tekst lezen.** `preferences`, `athleteReport`, `planUpdate.reason`:
  de motor negeert ze en zegt dat in cautions als ze er zijn. In de 459
  opgeslagen generaties tot 2026-10-17 had 2 keer een voorkeur; gestructureerde
  voorkeuren bouwen loont pas als dat verandert.
- **De VO2max-varianten met wisselend vermogen** (methodLabel experimenteel).
  Optioneel in de prompt ("je mag"), dus weggelaten.
- **De overbelastingsweek vóór een taper.** Ook optioneel ("twijfel je, sla hem
  over"), dus weggelaten.
- **Coachchat, pacing, maaltijdherkenning.** Buiten deze ronde.

## Contract

`src/lib/training/engine/types.ts` is het contract. In het kort:

```
TrainingAiInput ──► index.ts ──► EnginePlan (= GeneratedTrainingPlan + mode + reasons)
                      │
         ┌────────────┼──────────────────────┐
     plan / plan_update                    daily
         │                                   │
 periodization.ts: WeekPlan[]            daily.ts
         │                                   │
 compose.ts ◄── catalog.ts (BuildSession) ───┘
```

- Invoer en uitvoer zijn die van de AI. Daardoor werkt alles wat er al is
  (`insertPlanWorkouts`, de meetlat, de weergave) ook voor de motor.
- Elke beslissing levert een `EngineReason` op met een vaste `rule`-code. Tests
  toetsen op die codes; cautions en summary komen uit de teksten.
- Puur en deterministisch: geen netwerk, geen klok, geen toeval.
- Gedeeld: `calendar.ts` (beschikbaarheid per dag, vaste afspraken, periodes) en
  `signals.ts` (herstelsignalen met getallen). Gebruik die; schrijf ze niet na.
- Tests in `tests/unit/engine/`, met `baseInput()` uit `fixtures.ts` als
  verzonnen lid. Geen echte ledendata in de repo.

## Onderdelen

### Catalogus (`catalog.ts`)

`buildSession(request): CatalogSession | null` bouwt een sessie per vorm, op
maat van de gevraagde tijd. Geparametriseerd in plaats van een vaste lijst: een
drempelsessie is "N x M min" en past zich aan de tijd en het niveau aan.

- Elke sessie heeft warming-up, kern, herstel tussen de herhalingen en
  cooling-down, uitgeschreven als losse blokken (behalve on/off-herhalingen
  onder een minuut: één blok met `onOff`).
- Doelen in %FTP volgens de promptregels: rustige duur 65-70 % (RPE 4),
  intensieve duur 71-80 % (RPE 5), tempo 81-86 %, sweet spot 87-89 %, drempel
  90-104 % maar ≥ 15 min op 90-95 %, VO2max 105-118 % in blokken ≤ 8 min,
  anaeroob vanaf 119 %. Notities met RPE en wattage bij bekende FTP.
- `intensity` per blok via de zonebanden (`alignBlockIntensity`), de workout via
  `plannedWorkoutIntensity`.
- Titels volgens de regel: vorm + opbouw, ≤ 30 tekens, geen uitleg.
- `level` 0-1 schaalt de kern; `variant` kiest deterministisch tussen
  varianten, zodat niet elke week hetzelfde staat.
- `lowCadence`: notitie "lage cadans 50-70" bij vo2max/anaeroob/sprint.
- Sprint (weinig tijd) en de rit met sprints in de overgangsperiode krijgen
  `methodLabel: "veelbelovend"`.
- Vertrekpunt: de 58 standaardworkouts (migraties `0107`, `0194`, `0221`,
  `0227`, `0228`) — hun opbouw en notities zijn al door de eigenaar goedgekeurd.

### Periodisering (`periodization.ts`)

`planWeeks(input, window): WeekPlan[]` bepaalt per week soort, volume, aantal
sleutelsessies, niveau en de lange rit.

- Plafond per week: het minimum van `maxHoursPerWeek` en de beschikbare
  minuten van die week.
- Vertrek op `recentLoad.hoursPerWeek` (nooit eronder zonder vermoeidheid),
  groei ~10 % per opbouwweek, nooit meer dan 25 %, piekweek ≥ 85 % van het
  plafond.
- Cyclus 3 opbouw + 1 herstel (2 + 1 bij `experienceLevel` beginner), herstel
  60-70 % van de week ervoor.
- Taper alleen naar een A-mikpunt of bij `outdoor_event`/`gran_fondo` naar de
  doeldatum: 1-3 weken (meestal 2), volume 40-60 % omlaag, aantal sessies en
  sleutelsessies gelijk. Geen taper bij `zrl`, `ladder`, `base_fitness`, `ftp`,
  `rebuild` en niet als `planWindow.goalBeyond`.
- Periodes: `rust` = 0, `rustig` = helft en geen sleutelsessies, `kamp` = 1,5-2x
  het normale volume (boven het plafond), na een rust > 10 dagen twee weken
  `heropbouw`.
- Herstelsignalen uit `signals.ts`: `fatigued` verlaagt de eerste week,
  `rampHigh` remt de groei.
- Lange rit: groeit vanaf `recentLoad.longestRideMinutes` in stappen bij
  `gran_fondo`/`outdoor_event`; één per week.
- Een venster dat midweeks begint of eindigt geeft een deelweek met een
  evenredig deel van het volume.

### Samenstellen (`compose.ts`)

`composePlan(args): EngineResult` zet de weken om in workouts op dagen.

- Alleen op dagen met beschikbare minuten (`minutesOn` > 0 of null), nooit
  langer dan die minuten, nooit op een dag met een vaste afspraak, nooit in een
  `rust`-periode.
- Aantal ritten volgt `recentLoad.ridesPerWeek`; gemiddelde duur in de buurt
  van `avgDurationMinutes`.
- Sleutelsessies per doeltype: `zrl` één VO2max/anaeroob/race-prikkel (een
  toegezegde race telt) plus drempel of sweet spot; `ftp` drempel + VO2max;
  `base_fitness` sweet spot/tempo; `gran_fondo`/`outdoor_event` sweet spot/
  drempel plus de lange rit; `rebuild` tempo/sweet spot.
- Nooit twee sleutelsessies op opeenvolgende dagen; geen sleutelsessie de dag
  vóór of na een race of FTP-test (de dag ervoor openers of rustige duur).
- Geen hersteltraining onder 90 minuten: zo'n dag is een rustdag en komt niet in
  de uitvoer.
- Weinig tijd (week < helft van de standaard, of `rustig`): één of twee
  sprintsessies (veelbelovend). Overgangsperiode na het laatste A/B-mikpunt:
  één rustige duurrit met sprints.
- Protocollen: lage cadans via `lowCadence`; hitte als gewone duurrit.
- Summary en cautions in het Nederlands uit de `EngineReason`s; geen klachten bij
  naam.
- Bij `plan_update` alleen `planUpdate.fromDate` tot en met `toDate`.

### Dag-aanpassing (`daily.ts`)

`adaptDay(input): EngineResult`, de beslisboom uit `adaptiveDailyPrompt()`:

1. Vandaag al gereden (`todayRides`) of een vaste afspraak vandaag: niets voor
   vandaag.
2. Gisteren zwaarder dan gepland, of zwaar/slecht/RPE ≥ 8: de eerstvolgende
   sleutelsessie wordt rustige duur.
3. Te moe (`today.feeling` tired of `fatigued`): sleutelsessie wordt rustige
   duur of rust; duur omlaag.
4. Minder tijd dan gepland: inkorten met `resizeBlocks` binnen de minuten, de
   kern blijft.
5. Fris: hooguit iets zwaarder, binnen de weeklimiet.
6. Geen signaal en geen `today`: lege lijst.

Kamp en rust volgen de periode-regels uit de prompt. Bij tegenstrijdige
signalen wint de lichtere keuze.

## Beoordelen

- **Meetlat** (`src/lib/training/schema-check.ts`, eigen ronde): toetst een
  schema aan de harde regels. Dezelfde functie beoordeelt AI en motor.
- **Naspelen**: `prompt_summary` van `training_ai_generations` bevat de
  volledige invoer van elke generatie. Een lokaal script haalt invoer en
  AI-uitvoer op, draait de motor, en vergelijkt met de meetlat. De opgehaalde
  ledendata blijft buiten de repo; alleen de getallen per regel komen in
  `docs/`.
- **Trainers kijken blind mee**: een vergelijking van AI en motor op dezelfde
  invoer, zonder te zeggen welke welke is. Volgt na het naspelen.

Overstappen is een apart besluit van de eigenaar, op basis van die cijfers.

## Stand na het naspelen (2026-10-17)

Alle onderdelen zijn samengevoegd; `generateEnginePlan()` in
`src/lib/training/engine/index.ts` is de ingang. `scripts/engine-export.mjs`
haalt de opgeslagen generaties op, `scripts/engine-replay.mjs` draait de motor
op elke invoer en legt beide schema's langs de meetlat. Uitkomst:
[regelmotor-naspelen](regelmotor-naspelen.md).

Generaties met minstens één fout volgens de meetlat, vanaf 2026-09-17 (de
prompt had toen vrijwel alle regels):

| Soort | Aantal | AI | Motor |
|---|---:|---:|---:|
| Dagelijkse aanpassing | 75 | 9 % | 0 % |
| Bijwerking | 70 | 59 % | 11 % |
| Nieuw schema | 4 | 2 | 0 |

De motor faalt op geen enkele van de 420 invoeren. Zijn fouten zijn vooral
één regelconflict (hieronder) en weken die net onder `recentLoad` of net boven
het plafond uitkomen, bijvoorbeeld omdat een race maar een deel van een dag
vult. De AI maakt vooral zonefouten (blok- en workoutintensiteit): die maakt
de motor niet. Groeisprongen maakt hij minder vaak.

De motor verandert bij de dagelijkse aanpassing veel minder: 7 % van de keren
tegen 47 % bij de AI. Of de AI die andere 40 % terecht ingreep, zegt de meetlat
niet: die toetst regels, geen trainingswaarde.

### Besluit: de groeigrens gaat vóór de piekweek (eigenaar, 2026-10-17)

Ligt `recentLoad` ver onder het plafond (3 uur per week tegen 14), dan kunnen
"piekweek ≥ 85 % van het plafond" en "nooit meer dan een kwart erbij" niet
allebei. De eigenaar koos de groeigrens, zoals de periodisering al deed: de
piekweek komt dan zo hoog als binnen een kwart per week kan, en cautions zegt
waarom. De meetlat volgt dat besluit: een lagere piek is geen fout als 85 %
alleen met grotere sprongen te halen was (met vijf procent marge). De AI-prompt
is niet aangepast; de AI kiest nog meestal de piek.

### Bijgesteld tijdens het samenvoegen

- **Samenstellen.** Het piekmoment (doeldatum of A-mikpunt) telt niet als
  volume van zijn week; een event op een dag met een vaste afspraak komt er niet
  bij; een week die niet in de gekozen dagen past krijgt een rit erbij; een
  sleutelsessie die langer uitvalt dan zijn deel gaat af van de lange of
  langste duurrit, en boven het urenplafond vervalt de kortste duurrit;
  afronden op vijf minuten brengt een week niet meer onder haar doel; een
  opbouwweek groeit hooguit een kwart boven wat de vorige opbouwweek wérkelijk
  kreeg (bijvoorbeeld na een week met zeven races), maar nooit onder
  `recentLoad`; de piekweek is van die rem uitgezonderd.
- **Periodisering.** Het piekdoel wordt naar boven afgerond op vijf minuten.
- **Kalender.** De dag vóór een A- of B-mikpunt is licht, net als vóór een race.
- **Dag-aanpassing.** Een hersteltraining wordt bij vermoeidheid niet ingekort
  tot onder de 90 minuten, tenzij het lid zelf om een korte rit vraagt.
- **Rustige duur.** Sinds 2026-10-26 wordt ook een rustige duurrit onder de 90
  minuten een rustdag; de overgangsrit met sprints heet "Duur met sprints".
  Het weekbudget gaat daarom niet meer gelijk over alle rustige ritten: hun
  minuten komen samen op zo min mogelijk dagen met minstens 90 minuten tijd,
  zodat die ritten 90 minuten of langer worden; de overige worden rustdag.
  Scheelt het maar een paar minuten, dan wordt een rit toch 90 als de week
  daardoor minder boven haar doel komt dan ze er anders onder zou zakken. Een
  dag met minder dan 90 minuten krijgt nooit een rustige rit (2026-10-26).
- **Ingang.** Invoer van vóór september 2026 mist de ritmevelden van
  `recentLoad`; die worden uit de totalen afgeleid. Events zonder duur slaat
  de motor over.
- **Meetlat.** Vier regels oordeelden strenger dan de prompt; zie
  [schema-meetlat](schema-meetlat.md), "Bijgesteld".

### Nog niet gedaan

- **Trainers blind laten vergelijken.** De meetlat toetst harde regels; of een
  schema goed traint, moeten trainers zien. Een vergelijking op dezelfde invoer,
  zonder te zeggen welk schema van wie is, is de volgende stap.
- **De motor in de app.** Hij draait alleen in tests en het naspeelscript.
