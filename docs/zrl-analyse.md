# ZRL-analyse: van één rapport naar ZWBeter racen

Vraag van de eigenaar (2026-10-14): een analyse van efficiëntie en kwaliteit
per renner en voor de ploeg, voor ZWB Bdev in de ploegentijdrit van 13 oktober.
Dat rapport is met de hand gemaakt op de pc van de eigenaar, met de skill
`zrl-analyse`; het staat lokaal in `.tmp/zrl-analyse/` en niet in git (vermogen
en gewicht van ploeggenoten). Daarna (2026-10-15): "Kun je kijken of dit soort
analyses ook voor andere leden van andere teams kunnen en kun je dit inbouwen in
de app, mss in een nieuwe zwbeter racen?" Dit document legt vast wat haalbaar
bleek, wat gebouwd is en wat niet.

## Wat het handwerk liet zien

De bronnen van het rapport, en of ze in de app bruikbaar zijn:

| Bron | In het rapport | In de app |
|---|---|---|
| Uitslagrij van Zwift (`race-results/entries`) | gemiddeld vermogen, hartslag, gewicht, type meter, beste 15 s/1/5/20 min, finishmoment | ja, sinds deze ronde bewaard in de snapshot (zonder hartslag) |
| Segmentresultaten van Zwift | vermogen en gewicht per passage | ja, idem |
| Tussentijden per ploeg (`scoreRace`, `splits`) | winst en verlies per stuk | ja, bestond al voor de live stand |
| Botlogboek (`bot/.cache/ttt-*.log`) | kopbeurten, overname, wattmeldingen | **nee**: staat alleen op de pc waar de bot draait |
| ZwiftGopher-plannen | plan per renner, verwisseling deel 1/2 | sinds 2026-10-15 te importeren in de TTT Planner (`ttt_plans`); de analyse gebruikt ze nog niet |
| Bestand per seconde (intervals.icu) | NP, W′-balans, hartslagdrift, cadans | ja, voor het lid zelf, met de eigen sleutel |

Gemeten bij het handwerk, en bevestigd in de app:

- **De finishtijd telt vanaf de eigen startrij.** Einde min duur valt voor alle
  33 renners van groep B precies op een hele minuut (de rijstart). Daarmee is de
  eigen start van een renner bekend zonder de rij te raden.
- **Zwift geeft segmentvermogen ook achteraf.** Een dag later voor 13 oktober,
  en op 2026-10-15 nog voor de race van 29 september (310 passages van de
  inschrijvers, allemaal met vermogen). Oudere snapshots zijn dus aan te vullen.
- **Het bestand uit intervals.icu begint niet op de start** (15 s later). Het
  vermogen per segment uit Zwift lijnt het bestand op de seconde uit: bij een
  verschuiving van 15 s klopten alle vier de segmenten op de watt.

## Voor wie het kan (gemeten 2026-10-15, alleen lezen)

- **Ploeganalyse: alle zeven ZRL-teams.** 28 gereden races sinds 1 september,
  alle met een Zwift-event; 15 hebben een bevroren snapshot, de rest haalt de
  live stand nog bij Zwift en bevriest dan. De Zwift-data dekt iedere renner,
  ook wie geen ZWB-account heeft. Proefgedraaid op een ploegentijdrit (Bdev,
  C) en op puntenraces (Bdev, Zwiftladies B).
- **Eigen rit: ongeveer 12 van de 31 platformleden in die teams.** 15 hebben
  intervals.icu gekoppeld; 12 daarvan hebben ritten met een eigen bestand
  (intervals-ID met `i`), 2 alleen ritten die via Strava binnenkwamen, en
  daarvan geeft intervals.icu geen streams.
- **Kopbeurten en plantrouw: voor niemand automatisch.** Zie "Bewust niet
  gebouwd".

## Wat gebouwd is

- **Snapshot met vermogen.** `fetchSubgroupResults` houdt uit de uitslagrij nu
  ook vermogen, gewicht, meter, beste vermogens en finishmoment over
  (`resultPowerFields`); passages houden vermogen en gewicht. Nieuwe data heeft
  `withPower`. Oudere snapshots vult `loadZrlRaceData` bij het eerste bezoek één
  keer aan en bewaart ze terug, met dezelfde `frozen_at`.
- **Ploeganalyse** (`src/lib/zrl-analysis/race.ts`, puur): plaats, ploegtijd
  of punten, de tegenstander (de ploeg direct ervoor, of bij een eerste plaats
  de tweede), in een TTT de voorsprong per tussenpunt en per stuk met de snelste
  ploeg, hoe dicht de vier snelsten binnenkwamen, wie los finishte, en per
  renner vermogen, W/kg, beste 1/5/20 minuten en per sprint of klim W/kg en plek.
- **Eigen rit** (`src/lib/zrl-analysis/ride.ts`, puur): uitlijnen, NP, IF,
  stukken (vlak tussen de klimmen), beste vermogen tegenover de 90-dagencurve,
  CP en W′ uit die curve (3 tot 20 minuten), W′-balans (Skiba), watt per
  hartslag op het eerste en laatste vlakke stuk, cadans boven de FTP.
- **ZWBeter racen**: een vijfde pijler met `/zwbeter-worden/racen` (lijst) en
  `/zwbeter-worden/racen/[eventId]` (analyse).

## Verder doorgetrokken: FRR en elke Zwift-race (2026-10-15)

Vraag van de eigenaar: "Kan dit verder doorgetrokken worden tot alles wat een
Zwiftrace is dus ook de FRR?" en daarna "ja beiden" (ook een link plakken).

Gemeten (alleen lezen): in de kalender staan sinds half augustus 46
FRR-tijdsloten met een Zwift-event (Tour Ignite) naast de 28 ZRL-races; een
Ladder-race heeft er geen. Zeven leden reden een FRR-slot, vier hebben
intervals.icu. In intervals.icu staan ook Zwift-races buiten de kalender
(bijvoorbeeld een HEXAGONE-race), maar zonder Zwift-event: die zijn alleen te
koppelen als het lid de link geeft. SRC rijdt op MyWhoosh en valt erbuiten.

- **Eén basis voor elke Zwift-race** (`personal.ts`): plek en tijd in de eigen
  startgroep, achterstand op de winnaar, per segment het verlies op de
  snelste van de groep, de ZWB'ers in dezelfde race (plek en tijd).
- **FRR** (`loadFrrContext`): de ZWB'ers in dezelfde etappe over alle
  tijdsloten (uit `frr_stage_results`) en de eigen plek in het klassement van
  FRR (`frr_gc_standings`).
- **Tips voor een individuele race** (`personalAdvice`): in een tijdrit
  wegzakken (de tweede helft 5% of meer onder de eerste) of sterker eindigen,
  en de klim met het meeste verlies op de snelste (vanaf 10 s); in een race het
  relatief beste segment. De tips uit het eigen bestand zonder ploegwoorden.
- **Een geplakte link** (`/zwbeter-worden/racen/zwift/[id]`): staat de race in
  de kalender, dan naar die race; anders eerst event en uitslag, en de
  segmenten pas als het lid in de uitslag staat. Zo laat een lid het
  serviceaccount geen willekeurige races ophalen.
- **Bewaren buiten de ZRL** (`minimizeRaceData`): van wie niet bij ZWB hoort
  alleen plek, tijd en segmenttijden; geen naam, vermogen, gewicht of meter. De
  analyse van de eigen race blijft daarmee gelijk (getest).
- **De lijst**: ZRL zoals voorheen, plus FRR-slots met een eigen finishtijd en
  elke bewaarde race met het eigen Zwift-ID in de uitslag. Een geplakte race
  staat er dus in zodra hij één keer bekeken is; een tabel per lid is niet nodig.

Proefgedraaid op productie, schrijven geblokkeerd: etappe 8 van Tour Ignite
voor een lid dat reed (plek in de groep, achterstand, segmenten, vier ZWB'ers in
de etappe, plek in het klassement, eigen rit uitgelijnd) en voor een lid dat
niet reed (geen toegang; alleen event en uitslag opgehaald, geen segmenten).

## Keuzes

- **Wie wat ziet (eigenaar, 2026-10-15):** een lid alleen de eigen races (in de
  opstelling, of met de eigen Zwift-ID in de uitslag van het team), met tips
  voor zichzelf bovenaan. Een captain of co-captain alle races van zijn teams,
  ook de subteams van een hoofdteam (de captains staan bij "ZRL B", niet bij
  Bdev), met tips voor de ploeg en per renner. Wie uitslagen of rosters beheert
  ziet alles. De live stand is openbaar, maar vermogen per renner niet.
- **Tips** (`advice.ts`): vaste regels met het getal erbij. Voor de renner uit
  het eigen bestand: harde start (het hardste blok van 10 minuten begon bij de
  start en lag op of boven de FTP), W′ op (≤10%) boven op een klim met vlak erna,
  op het maximum (≥95% van de 90-dagencurve over 40 min) of reserve (≤85%),
  hartslagdrift (≤−10% watt per slag) en lage cadans (≥25% van de tijd boven
  de FTP onder 70 rpm). Uit de race: waar een geloste renner los kwam (15 s
  trager dan de ploeg over een klim), wie op een klim het meeste vermogen nodig
  had van wie die klim met de ploeg reed, in een puntenrace het beste segment,
  en geschat vermogen. Voor de captain: het grootste verlies en de grootste
  winst per stuk (vanaf 2 s), wie loste, en in een puntenrace of één renner
  40% of meer van de punten pakte. Tegen het handwerkrapport gelegd: dezelfde
  conclusies, behalve die over het plan en de kopbeurten.
- **Alleen Zwift-data in de ploeganalyse.** Geen FTP of trainingsdata van
  ploeggenoten: die zijn privé (RLS laat ze alleen aan lid en trainer zien). Zo
  is er geen %FTP per ploeggenoot; W/kg en de beste 20 minuten nemen die plaats in.
- **Geen hartslag uit de uitslagrij.** Gezondheidsgegeven, ook van renners van
  andere clubs, en de analyse toont het niet.
- **De eigen rit wordt niet bewaard**; hij wordt bij elk bezoek opgehaald
  (lijst, streams, curve: drie verzoeken aan intervals.icu).
- **Tegenstander in een puntenrace:** de ploeg één plaats hoger. Een stuk loopt
  tot en met het genoemde segment, dus "het stuk naar de Zwift KOM" omvat de klim.

## Bewust niet gebouwd

- **Kopbeurten, overname en wattmeldingen uit het botlogboek.** De bot draait
  lokaal en stuurt niets naar het platform ("Geen live data naar het platform",
  `docs/ttt-discord-bot.md`). Een upload van het logboek zou kunnen, maar het
  logboek meet wie Sauce vooraan zag, niet wie trok (zie het rapport: 24
  verleggingen, meldingen van −70 tot −95 W die geen kopbeurt waren). Eerst de
  meting met `sauce-ttt-probe.mjs` doen, dan beslissen.
- **Plan tegenover uitvoering.** Het plan kwam uit ZwiftGopher en werd niet
  opgeslagen; `ttt_plans` van de planner werd in 2 van de 28 races gebruikt.
  *Sinds 2026-10-15 importeert de TTT Planner een ZwiftGopher-plan in
  `ttt_plans` (kopbeurt-watts en -duur, FTP en IF per renner). Daarmee kan de
  analyse een geïmporteerd plan naast het gereden vermogen leggen; nog niet
  gebouwd.*
- **%FTP en wattage per kopbeurt van ploeggenoten**: zie Keuzes.
- **De eigen rit bij de trainer.** Kan later met `current_user_in_training_chat`;
  eerst zien of leden het gebruiken.
- **Automatische adviezen** (zoals "plan stond 20 W te hoog"). Het rapport
  haalde dat uit plan plus curve; zonder plan in de app is het niet te zeggen.
- **Ladder en SRC.** De Ladder heeft geen Zwift-event in de kalender, SRC rijdt
  op MyWhoosh.
- **Zelf races vinden buiten de kalender.** Een rit in intervals.icu noemt de
  race, maar niet het Zwift-event; zoeken op naam zou raden zijn. Het lid plakt
  de link.

## Niet geverifieerd

- De pagina's in de browser: inloggen kan alleen de eigenaar. De laadfuncties
  zijn wel tegen productie gedraaid, met schrijfacties geblokkeerd.
- De tijd van een eerste bezoek aan een oudere race op Netlify (lokaal 8 tot
  18 s, `maxDuration` 30).
- De waarde van `powerType` bij zPower (niet gezien; alle 33 renners hadden een
  vermogensmeter).
