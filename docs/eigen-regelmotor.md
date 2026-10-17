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
