# Pacingplan na ZRL R2 W2: te voorzichtig? (2026-11-25)

Analyse na de ZRL-scratchrace van 24 november 2026 (Muir and the Mountain,
39,0 km, 914 hm, voor A en B; Elevation Evaluation, 27,7 km, voor C). Vraag
van de eigenaar: leden reden voluit en het pacingplan leek veel te voorzichtig.
De voorstellen zijn later die dag gebouwd; zie "Gebouwd" onderaan. Namen staan
hier niet in; de eigenaar is "de eigenaar", de andere renners zijn A tot en met F.

## Conclusie

Ja, voor wie voluit reed was het plan te voorzichtig. Op de beslissende klim
plande het 13–15 % onder wat werd gereden. Dat komt door drie dingen in de
rekenkern, die elkaar versterken:

1. **W′ is te laag.** De eigen fit op de vermogenscurve geeft bij 28 van 29
   leden een lagere W′ dan intervals.icu, met als mediaan een factor 1,61.
   CP komt wel overeen. In de race verbruikten de drie renners die voluit reden
   meer reserve dan het plan dacht dat ze hadden.
2. **De vermoeidheidscorrectie weegt te zwaar in een race van 75 minuten.** Bij
   de eigenaar zakt CP in het model 16 % na 1000 kJ. Gemeten bij amateurs is dat
   6,5–12,5 %. Zonder die correctie gebruikt zijn plan 44 % van de reserve. Met
   de correctie is dat 93 %, terwijl elke klim onder CP is gepland. Er blijft dan
   geen ruimte over om op te schalen.
3. **Het plan schaalt alleen omlaag, nooit omhoog.** `rebalancePlan` haalt pieken
   weg als de reserve opraakt. Blijft er reserve over, dan gebeurt er niets. Van
   de 42 opgeslagen wedstrijdplannen eindigen er 17 met minder dan 60 % verbruik.

Het plan is niet voor iedereen te voorzichtig. Twee renners met een racebestand
reden onder of rond hun plan (zie de tabel). Dat is een reden om de reserve vóór
de sprint te houden en niet alles op te schalen.

## Wat er gereden is tegenover het plan

Alle 13 plannen voor deze race waren basisvoorstellen (geen AI). Vijf leden
hebben een racebestand in intervals.icu. De klimwaarden komen uit de
records van intervals.icu: dat venster valt in tijd samen met de klim.

| | Plan: gem. vermogen | Gereden: gem. / NP | Plan: hoofdklim | Gereden: hoofdklim | Leeg volgens intervals | W′ in plan |
|---|---|---|---|---|---|---|
| A (B1) | 267 W, IF 0,82 | 314 / 326 W | Epic KOM 300 W (92 % CP) | 339 W over 27 min (104 %) | 22,9 kJ | 21,0 kJ |
| Eigenaar (B3) | 234 W, IF 0,80 | 244 / 282 W | Epic KOM 261 W (89 %) | 301 W over 20 min (103 %, PR) | 24,4 kJ | 17,3 kJ |
| B (C) | 212 W, IF 0,83 | 229 / 253 W | The Grade 246 W (97 %) | 284 W over 17 min (112 %) | 36,1 kJ | 8,3 kJ |
| C (Bdev) | 263 W, IF 0,81 | 250 / 285 W | Epic KOM 294 W (90 %) | – | 11,8 kJ | 12,5 kJ |
| D (B2) | 221 W, IF 0,81 | 235 / 246 W | Epic KOM 249 W (92 %) | – | 6,6 kJ | 13,2 kJ |

- A, B en de eigenaar reden voluit: intensiteit 0,96–1,01 volgens intervals.icu,
  een nieuwe FTP (A, B) of een 20-minutenrecord (eigenaar).
- C en D reden niet voluit: intensiteit 0,88–0,89 en weinig reserve verbruikt.
  Voor C lag het plan zelfs boven wat hij reed.
- "Leeg volgens intervals" is `icu_max_wbal_depletion`. Dat is berekend met de CP
  en W′ van intervals.icu, niet met die van de app. Zie
  [Onzekerheden](#onzekerheden).

## De drie oorzaken

### 1. W′ uit de eigen fit is stelselmatig te laag

`fitCpWPrime` (`src/lib/pacing/cp.ts`) fit P = CP + W′/t op de 90-dagencurve
tussen 2 en 20 minuten. CP klopt daarmee: de FTP van intervals.icu ligt in
de mediaan op 0,997 × de gefitte CP. W′ klopt niet:

- Bij 29 leden met beide waarden is de W′ van intervals.icu
  (`icu_rolling_w_prime`) in de mediaan 1,61 × de fit (0,85–4,39). Maar
  één lid zit lager.
- Bij de race: 8 van de 8 deelnemers met beide waarden zitten lager in de fit,
  van 1,08 tot 3,2 ×.
- Waarom: een 90-dagencurve bevat zelden echt maximale inspanningen van 2 à 3
  minuten. De korte kant van de curve is daardoor te vlak, en W′ is de helling.
  Renner B is het duidelijkste voorbeeld: 311 W op 2 minuten en 272 W op 20
  minuten. Dat geeft een W′ van 8,3 kJ, terwijl hij in de race 36 kJ verbruikte.
- Bron 1 in `resolveCpWPrime` ("door intervals.icu zelf gefit") werkt nooit:
  `profile_sport_settings.cp_watts` is bij alle 37 rijen leeg. Bij zes leden
  staat er wel een W′. Die wordt genegeerd zodra de curvefit lukt.

De ronde van 2026-11-23 liet W′ uit intervals bewust liggen, "omdat niet
vaststaat welke waarde beter is". Deze race is dat bewijs: bij de drie renners die
voluit reden verbruikten ze meer dan de gefitte W′. De literatuur blijft
voorzichtig met W′ uit racedata (Spragg 2023, Karsten 2013, zie
`docs/wetenschappelijke-toets.md` §5C). Daarom blijft de reserve staan.

### 2. Vermoeidheid na 1000 kJ te zwaar voor een korte race

`durability.ts` leidt de CP-afname af uit de curves "na X kJ" van intervals.icu.
Dat zijn de beste waarden die iemand ná X kJ toevallig reed, en geen maximum. De
ondergrens van 2026-11-23 (eigen lange inspanningen) helpt, maar steunt zelf op
de te lage W′.

| Renner | CP vers | CP na 750 kJ | CP na 1000 kJ |
|---|---|---|---|
| Eigenaar | 303 W | 269 W (−11 %) | 253 W (−16 %) |
| C | 327 W | 313 W (−4 %) | 289 W (−12 %) |
| E (Bdev) | 248 W | 237 W (−4 %) | 221 W (−11 %) |
| A | 328 W | 320 W (−2 %) | 316 W (−4 %) |

(CP vers is de fit van vandaag, na de race. Het plan rekende met 292 W voor de
eigenaar.)

Gemeten: amateurs verloren na 1000 kJ 6,5–12,5 % op 20 minuten (Barsumyan
2025, in `docs/wetenschappelijke-toets.md` §2B). De eigenaar zit daar met 16 %
boven. Hij reed bovendien een NP van 282 W over 74 minuten en 1089 kJ, en dat
past niet bij een CP die tegen het eind op 250 W ligt.

Het commentaar in `durability.ts` zegt "Voor een Zwift-race van een uur maakt
dat weinig uit". Deze race spreekt dat tegen. Het commentaar in `w-prime.ts`
("die klopt tot een uur of twee prima") gaat over het model zonder correctie en
blijft staan.

### 3. Geen opschaling als er reserve over is

`buildBaselinePlan` kiest een basis naar de verwachte duur. Bij 80 minuten is
dat 0,87 × CP, en tussen de accenten 0,97 daarvan. Een klim krijgt een kleine
opslag: +4,6 % op Epic KOM, verdeeld over begin (0,96) en slot (1,04). De
afdaling van 7,5 km telt als 0 W. Over het geheel komt dat uit op IF 0,80–0,82,
en op de hoofdklim op 0,87–0,94 × CP.

Volgens het eigen CP/W′-model kan 27 minuten ongeveer CP + W′/1620, oftewel
zo'n 104 % van CP. Na Radio Tower volgt een afdaling van 7,5 km, waarin de
reserve weer aanvult. `rebalancePlan` controleert alleen of de reserve niet opraakt. Een
plan dat de helft over houdt, laat het zoals het is.

## Herberekening

De opgeslagen plannen zijn opnieuw doorgerekend met dezelfde code (`evaluatePlan`,
`buildBaselinePlan`, `rebalancePlan`), de route uit de database en de CP en W′ van
het plan zelf. De basis komt overeen met het opgeslagen plan, op een paar
seconden en watt na. "Opvullen" is een proefversie van voorstel 3: de klimstukken
gaan in stappen van 1 % omhoog, zolang het plan haalbaar blijft en hoogstens 80 %
van de reserve gebruikt.

Hoofdklim in % van CP / IF over de hele rit:

| | Nu | + opvullen | + W′ intervals, zonder vermoeidheid, opvullen | + ook de tussenstukken mee | Gereden |
|---|---|---|---|---|---|
| A | 92 % / 0,82 | 94 % / 0,83 | 98 % / 0,84 | 98 % / 0,86 | 104 % / 0,96 (gem.) |
| Eigenaar | 89 % / 0,80 | 89 % / 0,80 | 99 % / 0,85 | 99 % / 0,88 | 103 % / 0,84 (gem.), 0,97 (NP) |
| B | 97 % / 0,84 | 102 % / 0,85 | 105 % / 0,87 | 103 % / 0,92 | 112 % / 0,90 (gem.), 1,0 (NP) |
| C | 90 % / 0,81 | 90 % / 0,81 | 98 % / 0,84 | 98 % / 0,87 | – / 0,76 (gem.) |

- Opvullen alleen helpt weinig. Bij de eigenaar en C doet het niets, omdat de
  vermoeidheid de reserve al opsoupeert.
- Alle drie samen brengen de hoofdklim op ongeveer CP en de rit 3–5 % hoger.
- Ook dan plant het model onder wat A, B en de eigenaar reden. Zij reden een
  record of een nieuwe FTP. Een plan uit de beste waarden van de afgelopen 90
  dagen voorziet dat niet, en hoort dat ook niet te doen.
- Het plan van renner F in ZRL A meldde nog "reserve raakt op". Met de huidige
  code is het al haalbaar (87 % verbruik), met de W′ van intervals komt het op
  65–74 %.

## Voorstel

In volgorde van bewijs. Elk punt staat op zichzelf.

1. **W′ van intervals.icu gebruiken, CP uit de eigen fit houden.**
   `loadRiderContext` leest de meest recente `icu_rolling_w_prime` uit
   `intervals_activities.raw`. Daarna de opgeslagen `w_prime_joules`, en pas
   dan de fit. `resolveCpWPrime` krijgt een bron "curve + W′ intervals". Bestaande
   plannen worden vanzelf als verouderd gemeld, omdat `checkStaleness` naar W′
   kijkt. Effect: bij 28 van 29 leden een hogere W′, en meer plannen die
   haalbaar uitkomen. Geen migratie.
2. **Vermoeidheid begrenzen naar het verzette werk.** Zet een maximale afname
   per kJ in plaats van één plafond van 25 %. Bijvoorbeeld hoogstens 10 % bij
   1000 kJ, oplopend naar 25 % bij 2000 kJ of meer. Dat sluit aan bij de 6,5–12,5
   % na 1000 kJ uit Barsumyan 2025. Lange ritten houden hun correctie. Het
   commentaar in `durability.ts` over races van een uur moet dan mee.
   `DURABILITY_VERSION` naar 3.
3. **Opvullen in een Zwift-wedstrijd.** Na `rebalancePlan` de klimaccenten
   ophogen tot het diepste punt op 1 − `RACE_RESERVE_FRACTION` (80 %) ligt. Alleen
   bij format "race". Een tijdrit eindigt nu al op 93 % in de mediaan, een
   ploegentijdrit rekent met beurten. Tussenstukken, start en sprint blijven zoals
   ze zijn.

Samen leveren 1 tot en met 3 de kolom "W′ intervals, zonder vermoeidheid,
opvullen" op, met punt 2 als zachtere versie van "zonder vermoeidheid".

### Bewust niet voorgesteld

- **De tussenstukken mee ophogen.** In de groep bepaalt het tempo van de groep
  het vermogen op het vlak, niet het plan. Meer watt plannen op het vlak in de
  slipstream zegt weinig, en het levert IF op zonder dat de klim er iets aan
  heeft.
- **Een record inplannen.** De plafonds komen uit de gemeten curve
  (`ceilingWatts` neemt de laagste van model en meting). Zo'n record komt na de
  sync vanzelf in de curve. Een plan dat rekent op een record dat er nog niet
  is, is gokken. Het plafond was in de herberekening ook nergens bepalend.
- **Snelheid en slipstream bijstellen.** De ritbestanden waren 5–13 % sneller
  dan het plan voorspelde, ook bij renners die minder trapten dan gepland. Maar
  de bestanden bevatten 0,3 tot 2,3 km extra na de streep, en de officiële
  rittijden zijn niet naast het plan gelegd. Dat is zonder streams niet hard te
  maken.

## Vervolg: plannen op een doeldag

De eigenaar, na het eerste voorstel: wie het pacingplan gebruikt, heeft een doel.
Op zo'n dag kan een record realistisch zijn, door een taper of door extra focus.
Een plan dat nooit boven de beste waarde van de afgelopen 90 dagen komt, maakt
een record per definitie onhaalbaar.

### Wat de data en het onderzoek zeggen

- **Records in clubraces.** Sinds 2025-11-25 zijn er 573 races met een eFTP van
  intervals.icu, verdeeld over 28 leden. In 9,9 % daarvan ging de eFTP omhoog,
  tegen 5,1 % bij andere ritten. Ging hij omhoog, dan in de mediaan met 1,9 %.
  Het 90e percentiel lag op 6,4 %.
- **Vorm voorspelt het niet.** Bij een frisse vorm (CTL ≥ ATL) ging de eFTP in
  10,2 % van de races omhoog. Licht vermoeid was dat 10,5 %, vermoeid 8,6 %. Maar
  98 van de 573 races werden fris gereden, en de ATL in het bestand bevat de race
  zelf al. Een bonus koppelen aan de vorm kan met deze data niet.
- **Taper.** Een meta-analyse vond een matige verbetering op de tijdrit (SMD
  −0,45; [Wang 2023](https://doi.org/10.1371/journal.pone.0282838)).
- **Wedstrijd en tegenstander.** De uitkomsten verschillen. Tegen een virtuele
  tegenstander ging het gemiddelde vermogen op 4 km van 272 naar 290 W
  ([Konings 2017](https://doi.org/10.1123/ijspp.2017-0220)). Head-to-head over
  2000 m was 2 % sneller, door meer anaerobe inbreng
  ([Corbett 2011](https://doi.org/10.1249/mss.0b013e31823378b1)). Andere studies
  vonden geen effect van een tegenstander
  ([Hibbert 2018](https://doi.org/10.3389/fpsyg.2018.01212),
  [Massey 2020](https://doi.org/10.1016/j.psychsport.2020.101681)).

### Voorstel 4: doeldag

- **Een schakelaar "Doeldag" op de pacingpagina, standaard aan.** De
  pacingplanner is bedoeld voor een doel. Wie een gewone rit plant, zet hem uit.
  De keuze wordt bewaard bij het plan. Gebouwd als `assumptions.targetDayPct`, niet
  in de Zwift-opzet, zodat hij ook bij een .gpx-route werkt.
- **De bonus: 3 % op CP en W′.** Dat ligt net boven de mediaan van 1,9 % uit de
  clubdata en ruim onder het 90e percentiel van 6,4 %. Eén getal voor de hele
  lijn, omdat de data geen verschil tussen CP en W′ laat zien. Onderzoek wijst
  eerder naar W′ (Corbett 2011), maar dat is te weinig om op te bouwen.
- **Het plafond schuift mee.** `ceilingWatts` neemt nu de laagste van model en
  gemeten curve. Op een doeldag wordt dat de gemeten curve × 1,03. Een record is
  dan mogelijk, maar niet meer dan de bonus toelaat.
- **Wat blijft.** De reserve van 20 % vóór de sprint, en de vermoeidheid (die
  krijgt de grens uit voorstel 2).
- **Op het scherm.** Eén label bij de bron, bijvoorbeeld "doeldag +3 %". De
  uitleg komt op `/hulp`, niet in het formulier.
- **Geschat effect samen met voorstel 1 tot en met 3.** De hoofdklim komt op 101 % van de
  huidige CP bij A (gereden: 104 %), 102 % bij de eigenaar (103 %) en 108 % bij B
  (112 %). Dat is de herberekening × 1,03, niet apart doorgerekend.

### Bewust niet in voorstel 4

- **De bonus afleiden uit de vorm of uit een taper in het trainingsschema.** In
  de clubdata hangt de vorm niet samen met records. De training-engine weet wel
  wanneer een taper gepland is, maar of die ook gereden is, weet hij niet.
- **Een eigen percentage per lid.** Dat is een schuifregelaar zonder ijkpunt. Wie
  meer wil, kan de stukken al zelf ophogen.
- **De bonus alleen voor W′.** Zie hierboven: te weinig data.

## Onzekerheden

- Vijf racebestanden, waarvan drie van renners die voluit reden. Het patroon
  over de W′ steunt wel op 29 leden.
- De klimwaarden komen uit de records van intervals.icu (beste 17, 20 en 27
  minuten). Die vallen in tijd samen met de klim, maar zijn geen
  segmentmetingen. Streams zijn niet opgehaald.
- De diepte waarop de reserve leeg was (`icu_max_wbal_depletion`) is berekend
  met de CP van intervals.icu. Bij de eigenaar ligt die hoger dan in de app
  (306 tegen 292 W): met de CP van de app zou het verbruik nog hoger uitkomen.
  Bij B ligt hij lager (244 tegen 254 W), maar 36 kJ blijft ver boven 8,3 kJ.
- De herberekening gebruikt de curves van vandaag, dus na de race. CP en W′
  komen uit het plan zelf. Op vermoeidheid en plafonds kan dat een paar watt
  schelen.
- Niets hiervan is in de browser bekeken.

## Gebouwd (2026-11-25)

De eigenaar koos voorstel 1 tot en met 4. Wat er van het voorstel afwijkt:

- **Opvullen.** Een opslag telt alleen als `rebalancePlan` niets hoeft terug te
  schalen. Zonder die eis schoot het terugschalen te ver door en kwam een hogere
  opslag soms lager uit. Doelen gaan per 0,01 w/kg; op een klim van tien minuten is
  dat 2–4 % van W′, dus het plan stopt meestal net onder de 80 %.
- **Herberekenen.** Een basisvoorstel zonder doeltijd wordt opnieuw opgebouwd,
  anders zou de knop het nooit hoger laten uitkomen.
- **Doeldag.** De keuze staat bij het plan, niet in de Zwift-opzet. Een plan van
  vóór 25 november meldt zich één keer als verouderd.

De schattingen hierboven zijn niet opnieuw doorgerekend met de gebouwde code. Zie
de ronde "Gebouwd — Pacingplan na ZRL R2 W2" in `PLAN.md`.
