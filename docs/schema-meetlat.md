# Meetlat voor trainingsschema's

**Gemeten op 2026-10-17**, over alle voltooide AI-generaties in productie.

**Bijgesteld op 2026-10-26**: `piekweek`, `onder-recente-belasting` en `opbouwgroei` toetsen belasting (TSS) in plaats van uren; zie de tabel en [schema-belasting-2026-10-26](schema-belasting-2026-10-26.md). De cijfers hieronder zijn van de oude regels.

**Bijgesteld op 2026-10-17**, bij het naspelen van de regelmotor: vier regels oordeelden te streng, voor AI en motor gelijk. De cijfers hieronder zijn van vóór die bijstelling; de actuele AI-cijfers staan naast die van de motor in [regelmotor-naspelen](regelmotor-naspelen.md). Zie "Bijgesteld" onderaan.

De meetlat is `checkTrainingPlan()` in
[`src/lib/training/schema-check.ts`](../src/lib/training/schema-check.ts): een pure,
deterministische functie die een schema toetst aan de harde regels die tot nu toe
alleen als tekst in de prompt stonden (`defaultTrainingPrompt`, `adaptiveDailyPrompt`,
`planUpdatePrompt` in `workouts.ts`). Hij krijgt de invoer van de planner
(`TrainingAiInput`) en de workouts zoals de planner ze teruggaf, vóór de
reparaties in `insertPlanWorkouts()`.

Het doel is schaduwdraaien: dezelfde controle beoordeelt straks ook de schema's
van een eigen regelmotor, zodat AI en motor op dezelfde maat naast elkaar
liggen. Deze meting is de nulmeting van de AI.

## Wat er getoetst wordt

| Regel | Ernst | Wat telt als overtreding |
|---|---|---|
| `ongeldige-datum` | fout | Workoutdatum die geen `YYYY-MM-DD` is. Niet gevraagd, wel gevonden: de AI gaf vier keer een datum als `2026-10-25},{` terug. |
| `beschikbaarheid` | fout | Training op een dag met 0 minuten, of langer dan de minuten van die dag. Eerst de eigen week uit `availability.weeks`, dan `availability.default`, dan `goal.availableDays`. Bij een dag-aanpassing geldt voor vandaag `today.availableMinutes`. In een kamp telt alleen een apart ingevulde week; een toegezegd event (`upcomingEvents`, intensity `race`) wordt niet op beschikbaarheid beoordeeld. |
| `vaste-afspraak` | fout | Training op een dag met een `fixedWorkout`. |
| `weekplafond` | fout | Weekvolume (eigen workouts plus vaste afspraken) boven `goal.maxHoursPerWeek`, buiten een kampweek. Alleen in weken waarin de planner zelf iets zette. De race op de doeldatum of een A-mikpunt telt niet mee. |
| `piekweek` | fout | Sinds 2026-10-26: de zwaarste week van een opbouwblok ligt in geschatte TSS niet minstens 10% boven `currentLoad` (het hoogste van CTL × 7 en de gereden TSS per week), met 5% marge voor de blok-som. Geen oordeel zonder belastingsbron, of als de week zijn beschikbare tijd al voor 95% vult. Vervalt bij een vermoeidheidssignaal. Tot 2026-10-26: onder 85% van `maxHoursPerWeek`; dat las beschikbare tijd als doel ([schema-belasting-2026-10-26](schema-belasting-2026-10-26.md)). |
| `opbouwgroei` | waarschuwing | Opbouwweek met meer dan 25% meer belasting (geschatte TSS; tot 2026-10-26: minuten) dan de opbouwweek ervoor. Na een herstelweek vergelijken we met de opbouwweek daarvóór: terug naar het oude niveau is geen sprong. |
| `herstelweek` | waarschuwing | Herstelweek buiten 55-75% van de week ervoor. De prompt zegt "grofweg 60-70%"; de marge van vijf punten is een keuze van de meetlat. |
| `onder-recente-belasting` | fout | Opbouwweek met minder geschatte TSS dan 95% van `currentLoad`, zonder vermoeidheidssignaal, tenzij de week zijn beschikbare tijd al voor 95% vult. Zonder belastingsbron (geen CTL, geen ritten met TSS) zoals voorheen: onder `recentLoad.hoursPerWeek`, of onder het plafond als dat lager ligt. |
| `blokintensiteit` | fout | Intensity van een blok valt niet in de zone van het midden van zijn doel (`alignBlockIntensity`). Alleen blokken met een leesbaar % of wattdoel. |
| `workoutintensiteit` | fout | Intensity van de workout is niet die van het kernwerk (`alignWorkoutIntensities`, `keyWorkPct`). |
| `drempelblok-lang` | fout | Drempelblok van 15 minuten of langer met een bovengrens boven 95% FTP. |
| `boven-ftp-lang` | fout | Bovengrens boven 100% FTP in een blok langer dan 8 minuten, zonder `onSeconds`. |
| `korte-herstelrit` | fout | Hersteltraining of rustige duur (`isEasyRide`, sinds 2026-10-26) korter dan 90 minuten. Niet als het lid vandaag zelf om een rit vroeg, en niet bij openers op de dag vóór een race of test. Tot 2026-10-26 alleen intensity `recovery`. |
| `rustdag-als-workout` | waarschuwing | Een rustdag als workout teruggegeven (intensity `rest` of 0 minuten). |
| `taper-zonder-piek` | fout | Taper zonder `outdoor_event`/`gran_fondo` als doel of een A-mikpunt. Herkend aan "taper" in een titel, of aan twee weken op rij minstens 10% minder aan het eind van de periode. |
| `sleutelsessies-aaneen` | fout | Threshold, VO2max of anaeroob op twee opeenvolgende dagen (eigen workouts, vaste afspraken en bij een dag-aanpassing de rest van `currentPlan`), buiten een kamp. |
| `sleutelsessie-voor-race` | fout | Sleutelsessie op de dag vóór een race, FTP-test of A/B-mikpunt. |

**Vermoeidheidssignaal**: wellness `fatigued`, TSB ≤ -20, ramp rate ≥ 8,
klachtenscore > 0,65 of `today.feeling` `tired`. De prompt noemt "sterk negatieve
TSB" en "hoge ramp_rate" zonder getal; deze grenzen zijn de keuze van de meetlat.

**Weekregels** gelden alleen voor weken die helemaal in de periode van het schema
vallen. Bij een dag-aanpassing toetsen we alleen het plafond, over de rest van
`currentPlan` plus de gewijzigde dagen. Kamp-, rust- en rustigweken en de weken
rond een toegestane taper doen niet mee aan de vorm van de opbouw. Bij een
bijwerking slaan we het eerste blok over voor de piekregel, en de eerste week voor
de recentLoad-regel: wat daarvóór kwam, is niet te zien.

## Uitkomst

420 voltooide generaties met workouts, van 2026-05-27 tot 2026-10-17, samen 4.334
workouts, voor 8 leden. Mislukte generaties (zonder antwoord) zijn niet te
toetsen; die zitten hier niet in.

"In prompt" zijn de generaties waarvan de prompt de regel al bevatte. Een regel
die er toen nog niet in stond, kon de AI niet breken. De kolom "alle" laat zien
hoe vaak het gebeurde vóórdat de regel er was.

| Soort | Generaties | Workouts | Leden | Zonder bevinding | Zonder bevinding op regels in de prompt |
|---|---:|---:|---:|---:|---:|
| nieuw schema | 25 | 579 | 8 | 2 (8%) | 17 (68%) |
| bijwerking | 157 | 3.531 | 8 | 22 (14%) | 82 (52%) |
| dag-aanpassing (lid) | 20 | 35 | 4 | 8 (40%) | 19 (95%) |
| dagelijkse aanpassing | 218 | 189 | 7 | 64 (29%) | 204 (94%) |

| Regel | Ernst | In prompt | Gebroken in (in prompt) | Bevindingen (in prompt) | Bevindingen (alle) |
|---|---|---:|---:|---:|---:|
| ongeldige-datum | fout | 420 | 4 (1%) | 4 | 4 |
| beschikbaarheid | fout | 418 | 3 (1%) | 3 | 7 |
| vaste-afspraak | fout | 396 | 2 (1%) | 2 | 2 |
| weekplafond | fout | 418 | 0 | 0 | 0 |
| piekweek | fout | 393 | 12 (3%) | 12 | 24 |
| opbouwgroei | waarschuwing | 393 | 43 (11%) | 49 | 51 |
| herstelweek | waarschuwing | 393 | 12 (3%) | 17 | 29 |
| onder-recente-belasting | fout | 393 | 14 (4%) | 17 | 17 |
| blokintensiteit | fout | 112 | 15 (13%) | 48 | 1.720 |
| workoutintensiteit | fout | 112 | 10 (9%) | 11 | 842 |
| drempelblok-lang | fout | 3 | 0 | 0 | 30 |
| boven-ftp-lang | fout | 3 | 0 | 0 | 40 |
| korte-herstelrit | fout | 149 | 0 | 0 | 653 |
| rustdag-als-workout | waarschuwing | 149 | 13 (9%) | 13 | 101 |
| taper-zonder-piek | fout | 388 | 0 | 0 | 8 |
| sleutelsessies-aaneen | fout | 418 | 7 (2%) | 7 | 7 |
| sleutelsessie-voor-race | fout | 418 | 1 (0%) | 1 | 1 |

**Laatste 30 dagen** (na 2026-09-17): 149 generaties, 1.162 workouts. Dat is
de prompt van nu of daar dichtbij, en dus waar een regelmotor tegen moet opboksen.

| Regel | Gebroken in | Bevindingen |
|---|---:|---:|
| opbouwgroei | 20 van 149 (13%) | 24 |
| blokintensiteit | 15 van 112 (13%) | 48 |
| onder-recente-belasting | 12 van 149 (8%) | 13 |
| rustdag-als-workout | 13 van 149 (9%) | 13 |
| workoutintensiteit | 10 van 112 (9%) | 11 |
| herstelweek | 5 van 149 (3%) | 9 |
| piekweek | 2 van 149 (1%) | 2 |
| vaste-afspraak | 2 van 149 (1%) | 2 |
| ongeldige-datum | 1 van 149 (1%) | 1 |
| sleutelsessie-voor-race | 1 van 149 (1%) | 1 |
| beschikbaarheid, weekplafond, korte-herstelrit, taper-zonder-piek, sleutelsessies-aaneen | 0 | 0 |
| drempelblok-lang, boven-ftp-lang | 0 van 3 | 0 |

## Wat dit zegt

- **Regels op dag- en weekniveau houdt de AI goed vast.** Plafond, beschikbaarheid,
  vaste afspraken, taper en twee sleutelsessies op rij: in de laatste maand
  vrijwel nooit gebroken. Het plafond haalt hij vaak precies: veel weken staan op
  100%.
- **Promptregels werken, maar pas als ze erin staan.** Korte herstelritten: 653
  keer voordat de regel in de prompt kwam (2026-09-19), daarna nul. Blok- en
  workoutintensiteit: 1.720 en 842 keer vóór 2026-09-28, daarna 48 en 11.
- **De zwakke plek is de vorm van de opbouw.** Sprongen van meer dan een kwart
  tussen opbouwweken (13% van de generaties), opbouwweken onder wat het lid nu
  rijdt (8%) en herstelweken die niet diep genoeg zakken. Dat zijn rekenregels
  over meerdere weken: precies wat een regelmotor deterministisch kan en een
  taalmodel kennelijk niet betrouwbaar doet.
- **Intensiteit per blok** blijft in 13% van de recente generaties mis, ook met
  de zones in de prompt. `alignWorkoutIntensities()` repareert dat al bij het
  opslaan, dus het lid ziet het niet. Een regelmotor die zijn blokken uit de
  bibliotheek haalt, heeft dit probleem niet.
- **Drempelblok- en FTP-grenzen** staan pas sinds 2026-10-16 in de prompt: drie
  generaties, te weinig om iets over te zeggen.

## Grenzen van deze meting

- **Interpretatiekeuzes.** De groeigrens van 25% is de ruimste lezing van "vermijd
  sprongen van meer dan een kwart"; tot 2026-10-16 zei de prompt "ongeveer 10%",
  en ook die generaties toetsen we op 25%. Bij `onder-recente-belasting` geldt
  het plafond als grens als het lid nu meer rijdt dan dat. Elke opbouwweek onder
  het plafond telt dan, ook bij geleidelijke groei. Daar spreekt de prompt zichzelf
  tegen (groeien én nooit onder recentLoad).
- **Herkenning van week-soorten.** Een week die meer dan 15% zakt, is een
  herstelweek; anders een opbouwweek. De AI labelt zijn weken niet. Een taper bij
  een doel zonder piek herkennen we alleen aan de titel of aan twee weken afbouw
  op rij.
- **Niet getoetst**: alles wat in `cautions` of `summary` moet staan (de reden voor
  minder volume, de FTP-test-aanbeveling); het ritme van `recentLoad.ridesPerWeek`;
  de kamp-, protocol- en voorkeurregels; titels; RPE-bij-wattage.
- **Dubbel tellen.** Een korte rit die als `endurance` is opgegeven maar onder 60%
  ligt, telt zowel bij `korte-herstelrit` als bij `workoutintensiteit`.
- **Generaties van vóór migratie 0131** hadden één week beschikbaarheid
  (`{ source, weekStart, minutesByDay }`). Het script leest die als standaard,
  zoals de AI dat toen deed.

## Herhalen

```bash
node scripts/schema-meetlat.mjs
```

Het script leest alleen. Het haalt de generaties op met de gekoppelde Supabase
CLI (`supabase db query --linked`, net als `npm run db:health`), toetst ze en
schrijft het rapport naar `.tmp/schema-meetlat/rapport.md`. De ruwe rijen bevatten
namen en gezondheidsdata. Ze blijven in `.tmp/schema-meetlat/generaties.json`
(staat in `.gitignore`); `--cache` rapporteert opnieuw op die ophaling.

De invoer van de planner staat in `prompt_summary` (de JSON van `TrainingAiInput`).
`prompt_text` is de prompt zelf; daaruit leest het script alleen of een regel er
toen al in stond.

**Waarom de CLI en niet de Supabase-connector.** De connector geeft
queryresultaten terug in het gesprek. 420 generaties zijn samen zo'n 10 MB JSON,
ruim boven wat daar past. Een proef met 20 generaties via de connector werkte, maar
op die schaal zou de meting uit steekproeven moeten bestaan. De CLI schrijft naar
een bestand, en dat bleek de bestaande, alleen-lezende route van `db-health.mjs`.

## Bijgesteld bij het naspelen (2026-10-17)

Bij het naspelen van de regelmotor bleek de meetlat op vier plekken iets af te keuren dat de prompt toestaat. Elke bijstelling geldt voor AI en motor gelijk; tests in `tests/unit/training-schema-check.test.ts` ("bijgesteld bij het naspelen").

- **Kamp en beschikbaarheid.** De prompt zet een kamp boven `availability.default` en `goal.availableDays`; alleen een week die het lid apart heeft ingevuld blijft leidend. De meetlat toetste in een kamp toch aan de standaardweek.
- **Toegezegd event.** De duur van een event is volgens de prompt een gegeven. Staat het niet in `fixedWorkouts` en neemt de planner het daarom zelf op, dan oordeelt de meetlat niet meer over de beschikbaarheid van die dag.
- **Piekmoment en weekplafond.** De race op de doeldatum (gran fondo, outdoor event) of op een A-mikpunt telt niet tegen het urenplafond van zijn week. Anders kon een taperweek naast een gran fondo van zes uur niets meer bevatten.
- **Taperzone.** De meetlat zag elke week binnen drie weken vóór het piekmoment als taper, en sloot het opbouwblok daar af. Een taper van twee weken met de piekweek ervóór werd zo afgerekend op een te vroege "piek". Nu is een week in die zone pas taper als het volume echt zakt (onder 90 % van de week ervoor).

Daarna, na het besluit van de eigenaar dat de groeigrens vóór de piekweek gaat:

- **Piekweek binnen de groeigrens.** Een piek onder 85 % van het plafond is geen fout als die 85 % alleen te halen was met sprongen van meer dan een kwart per week, gerekend vanaf de week vóór het blok (of `recentLoad`), met vijf procent marge voor afronding. Sinds 2026-10-26 geldt dit in belasting: de piek hoeft niet hoger dan een kwart per week groei vanaf de belasting van de week vóór het blok (of `currentLoad`).
- **Laatste blok van een bijwerking.** Een bijwerking eindigt op de einddatum van het oude schema, niet op een blokeinde. Loopt het laatste opbouwblok daar nog, dan oordeelt de meetlat niet over zijn piek; die kan erna liggen (spiegel van de bestaande uitzondering voor het eerste blok).

De grens voor "sterk negatieve TSB" bleef -20. De motor plant zelf met -30 (`src/lib/training/engine/signals.ts`); de meetlat is als scheidsrechter bewust ruimer, zodat geen van beide planners wordt afgerekend op een grens die de prompt niet noemt.
