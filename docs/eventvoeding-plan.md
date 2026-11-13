# Eventvoeding: een plan dat sluit op tempo en duur

Voorstel van 2026-11-13. **De besluiten van §6 en de bouwvolgorde van §7 zijn
akkoord van de eigenaar op 2026-11-13** ("Ja, begin stap 1"). Aanleiding: de eigenaar vindt
dat het advies voor eten en drinken bij een event "nogal afwijkt van de
werkelijkheid", en dat ZWB met de data die er al is een sluitend plan moet
kunnen maken uit het verwachte tempo en de duur. Dit document is de analyse en
een bouwvolgorde; elke stap wordt een eigen ronde in `PLAN.md`. Het bouwt
voort op [ritvoeding-plan.md](ritvoeding-plan.md) (het ritplan "Klaarzetten")
en verandert de onderbouwing in [voeding-wielrennen.md](voeding-wielrennen.md)
§3 en §6.

*Tweede versie, dezelfde dag: verwerkt de wens van de eigenaar voor een
keuzeknop (Duur, Tempo, Race) met schuifjes, en de input van clublid Bart de
Groot: ZWB geeft een advies ("ik adviseer 120 g") en jij kiest waar het plan
mee rekent ("reken met 135 g"), en de grens hangt af van wat je meeneemt (2:1
haalt geen 120, banaan en kruidkoek geen 90). Zie §5 en §6.*

**Wat het wordt.** Het ritplan bij een event rekent nu met drie getallen:
duurklasse, zwaarteklasse en 750 ml per uur. Het voorstel maakt er een
balans van: wat je verbruikt bij het verwachte tempo, wat je voorraad aankan,
en wat je dus moet eten en drinken om de finish te halen zonder leeg te
rijden. Die balans wordt een **advies**. Daaronder staat **waar het plan mee
rekent**: dat begint bij het advies, en dat pas je zelf aan met een knop en
schuifjes. Het plan (bidons, porties, momenten) bouwt zich daar direct op. De
grens per uur volgt uit je darmtraining én uit wat je meeneemt. Na het event
legt ZWB het plan naast wat je echt reed en at.

---

## 1. Hoe het nu rekent

*Dit is de stand van vóór het plan (2026-11-13). Stap 1 tot en met 8 zijn
gebouwd; wat er nu is, staat bij elke stap in §7 en in `PLAN.md`.*

`loadEventRidePlan` (`voeding/_data.ts`) → `eventRide` → `ridePlan`
(`src/lib/nutrition/ride-plan.ts`):

| Onderdeel | Nu | Waar |
|---|---|---|
| Duur | Pacingplan, anders de eigen training voor het event, anders `eventWorkoutDefaults` | `eventRide` |
| Zwaarte | Een woord: `race` of `endurance` (per eventtype) | `EVENT_DEFAULTS` |
| Koolhydraten per uur | Band naar duur (< 60 min niets, 60–150: 30–60, ≥ 150: 60–90); `race` = bovenkant, `endurance` = onderkant | `rideTargetPerHour` |
| Grens per uur | 90, of 120 na darmtraining als je dat aanzet. **Los van wat je meeneemt**: alleen een tekst "boven 60 g per uur: meng glucose en fructose" | `targets.ts`, `tips.ts` |
| Vocht | Met zweettest uit de test, anders vast 750 ml per uur | `ride-plan.ts` regel 266 |
| Eetmomenten | Elke 20 minuten vanaf 0:15, tot 10 min voor het einde | `feedMinutes` |
| Laden | Wedstrijd of gran fondo van ≥ 90 minuten | `eventRide` |
| Zelf aanpassen | Alleen de bidonmaat en het recept; de bidonmaat wordt niet bewaard | `ride-plan-view.tsx` |
| Na afloop | Niets: het plan wordt niet naast de echte rit gelegd | — |

Het pacingplan rekent al het gemiddelde vermogen, de IF en de accenten
(klimmen, sprints) uit (`PlanEvaluation` in `src/lib/pacing/plan.ts`), maar het
ritplan gebruikt daarvan alleen `totalSeconds`. De eventpagina heeft ook al een
weersverwachting per uur langs de route (`fetchRouteForecast`), die het ritplan
niet gebruikt.

## 2. Wat de data laat zien

Gelezen op productie op 2026-11-13 (alleen lezen, via de Supabase-connector).
Geplande eventritten van de laatste 120 dagen, gekoppeld aan de rit van die dag
in intervals.icu.

**Duur en tempo per eventtype**

| Type | n | Gepland | Gereden | Verhouding (p10–p90) | kJ per uur | IF |
|---|---|---|---|---|---|---|
| ZRL | 28 | 43 min | 45 min | 1,05 (0,84–1,37) | 826 | 0,91 |
| Flamme Rouge | 12 | 60 | 63 | 1,04 (0,99–1,18) | 855 | 0,89 |
| Club Ladder | 11 | 40 | 40 | 1,01 (0,75–1,26) | 950 | 0,95 |
| SRC | 10 | 70 | 77 | 1,10 (0,90–1,23) | 751 | 0,96 |
| Toertocht | 2 | 105 | 206 | 1,97 | 734 | 0,71 |

**Wat er werkelijk gegeten wordt.** Eén lid (de eigenaar) legt "Tijdens de rit"
vast: 26 maaltijden sinds 1 november, geen enkele via "Gegeten" van het
ritplan. Op de ritdagen kwam dat uit op 66–119 g per uur, ook op ritten waar het
plan 30–60 g gaf. Een Zwift-race van 122 minuten op IF 0,94: 75 g per uur
gegeten, het plan gaf 60. Wat er gegeten werd: een bidon met SiS GO, een SiS GO
gel en ontbijtkoek. De GO Isotonic-gel is volgens de ingrediëntenlijst bij de
winkels maltodextrine zonder fructose; van het GO-poeder is dat niet
nagekeken. Is dat ook alleen maltodextrine, dan ligt de opnamegrens van die
combinatie rond 60 g per uur (§4e).

**Zweettests: nul.** Niemand heeft er een ingevuld, dus elk ritplan rekent met
750 ml per uur, binnen en buiten, in een korte race en een lange toertocht.
Darmtraining: ook nul runs.

## 3. Waar het advies afwijkt, en waarom

1. **Het doel kent geen verbruik.** Een Zwift-race van twee uur op IF 0,94
   verbrandt ruim 200 g koolhydraten per uur; een rustige toertocht ongeveer 130.
   Beide vallen in een vakje van de band, en de grens bij 150 minuten maakt van
   2:29 en 2:31 een sprong van 60 naar 90 g. Wat er tussen verbruik en inname
   zit, komt uit je glycogeenvoorraad, en die balans rekent ZWB nergens uit.
2. **De grens kent je producten niet.** Met alleen glucose (maltodextrine,
   zetmeel) neem je rond 60 g per uur op, met 2:1 glucose:fructose rond 90, met
   1:0,8 of 1:1 tot 120. ZWB geeft iedereen 90 als grens, ook wie alleen
   maltodextrine of alleen gewoon eten meeneemt.
3. **Vocht is een vaste aanname.** 750 ml per uur is binnen op IF 0,9 te weinig
   (zweet ongeveer 1,2 l per uur) en buiten bij 12 °C op duurtempo te veel. Omdat
   niemand een zweettest heeft, geldt die aanname voor iedereen.
4. **Onder een uur is er helemaal geen plan.** Een ZRL-race van 45 minuten krijgt
   geen ritplan, dus ook geen bidon. Juist binnen zweet je dan bijna een liter.
   En met p90 = 1,37 duurt één op de tien ZRL-races langer dan een uur.
5. **De duur is onzeker en het plan doet alsof hij vastligt.** Een toertocht
   zonder afstand valt terug op 120 minuten (`toertocht` staat niet in
   `EVENT_DEFAULTS`) en duurde in werkelijkheid twee keer zo lang. Wie het plan
   volgt, neemt dan 53 g mee voor 3,5 uur.
6. **Je kunt niet zeggen wat je zelf wilt.** Wie bewust 120 of 135 g per uur
   rijdt, of juist een rustige dag maakt van een event, kan het doel niet
   aanpassen; alleen het recept en de bidonmaat.
7. **De eetmomenten kennen de koers niet.** Elke 20 minuten, ook midden in een
   klim, de startsprint van een Zwift-race of de finale.
8. **Er is geen terugkoppeling.** Plan, gereden rit en eetdagboek staan alle drie
   in de database, maar worden nooit naast elkaar gelegd.

## 4. Het model achter het advies

Puur en regelgebaseerd, zoals de rest van de voedingsmodule; één nieuwe module
`src/lib/nutrition/event-fuel.ts`. Elke invoer heeft een standaardwaarde uit de
data en is in het scherm te verschuiven (§5).

**a. Tempo en duur.** Uit het pacingplan (`avgWatts`, `totalSeconds`,
`accents`). Zonder pacingplan: duur uit het schema, IF uit de bestaande
modellen (`zwiftRaceIntensityFactor`, `outdoorRaceIntensityFactor`, of de
IF van de eigen ritten van dat eventtype), vermogen = IF × FTP. De standaardduur
is de lange kant: de p90 van de eigen verhouding gepland/gereden voor dat
eventtype, met de clubverhouding uit §2 als terugval.

**b. Verbruik.**
- Werk per uur (kJ) = gemiddeld vermogen × 3,6.
- Energie per uur ≈ werk / bruto-efficiëntie (22%), dus ongeveer 1,09 kcal per
  kJ werk.
- Aandeel koolhydraten naar IF, lineair tussen deze punten (vertaling van ZWB
  uit Romijn 1993 en van Loon 2001; in stap 1 te toetsen):

  | IF | ≤ 0,55 | 0,65 | 0,75 | 0,85 | ≥ 0,95 |
  |---|---|---|---|---|---|
  | Aandeel koolhydraten | 45% | 58% | 70% | 82% | 92% |

- Verbranding per uur (g) = energie × aandeel / 4.

**c. Balans.**
- Voorraad: ongeveer 6 g per kg lichaamsgewicht, 8 na laden (aanname, in stap 1
  met bron vast te leggen). Te gebruiken: 60% daarvan; de rest is de reserve
  voor de finale (keuze van ZWB, besluit 4).
- Nodig = (verbranding × duur − te gebruiken voorraad) / duur.
- Laden volgt uit de balans: zinvol als de rit zonder laden niet sluit en met
  laden wel. Dat vervangt de vuistregel "≥ 90 minuten en wedstrijd".

**d. Het advies per uur.** Het hoogste van het huidige doel
(`rideTargetPerHour`, met de knop van §5 als zwaarte) en wat nodig is, begrensd
op de **opnamegrens** (e). Het advies komt dus nooit lager uit dan nu. Haalt
ook de grens de balans niet, dan noemt het plan het moment waarop de voorraad
op de reserve komt, met een link naar laden en naar het pacingplan.

**e. De opnamegrens: het laagste van darm en tas.**
- *Darm:* 90 g per uur; het weekgetal tijdens de darmtraining; 120 na een
  afgeronde darmtraining als je dat aanzette (bestaat al, `gut-training.ts`).
- *Tas:* wat je meeneemt, per soort koolhydraten:

  | Soort | Voorbeelden | Grens per uur |
  |---|---|---|
  | Alleen glucose | Maltodextrine, dextrose, de meeste "isotone" gels, rijstwafel, wit brood | ~60 |
  | 2:1 glucose:fructose | De meeste "dual source" gels en drankpoeders | ~90 |
  | 1:0,8 of 1:1 | Hoge-koolhydraatmixen, suiker (sucrose), de clubsportdrank | ~120 |
  | Gewoon eten | Banaan, ontbijtkoek, kruidkoek, broodje | ~60 (praktisch: kauwen, vezels, volume) |

  Bij een mix telt het aandeel per soort, naar gram koolhydraten. De grens van
  "gewoon eten" is een praktische grens van ZWB, geen opnamegrens uit de
  bronnen: banaan en koek bevatten ook fructose (besluit 6).

**f. Vocht zonder zweettest.**
- Warmte per uur = energie − werk. Zweet dat nodig is om die kwijt te raken =
  warmte / 2,43 kJ per gram, maal het deel dat via zweet moet: binnen 1,0,
  buiten afhankelijk van de temperatuur uit de routeverwachting (keuze van ZWB,
  te ijken zodra er zweettests zijn).
- Het vochtdoel blijft zoals in `fluidPerHour`: onder 2% verlies, niet meer dan
  je zweet. Met een zweettest gaat de test voor, zoals nu.
- Ook onder een uur een plan: alleen bidons, geen eten.

**g. Momenten uit de koers.** Met een pacingplan: geen eetmoment in een accent;
een moment kort voor een klim van meer dan vijf minuten; bij een Zwift-race
niets in de eerste tien minuten; vast eten alleen onder IF 0,85 en niet in het
laatste halfuur, daarboven drank of gel. Zonder pacingplan blijft het om de 20
minuten.

### Vier voorbeelden (rekenwerk, 75 kg, niet in de app nagekeken)

| Event | Nu | Advies met het model |
|---|---|---|
| ZRL, 45 min, 826 kJ/u, binnen | Geen plan | Verbranding ~150 g, uit de voorraad. Zweet ~1,2 l/u: één bidon van 750 ml, niets eten |
| Zwift-race, 2 u, 847 kJ/u, IF 0,94 | 60 g/u, 2 bidons | Verbranding ~425 g, voorraad aan te spreken 270: nodig 77, **advies 80 g/u** (naar boven op 5 g, anders sluit het net niet), 2 bidons. Met alleen maltodextrine in de tas: grens 60, de voorraad op de reserve na 1:48 |
| Toertocht, gepland 105 min, gereden 206, IF 0,71, buiten 15 °C | 30 g/u = 53 g, 2 bidons | Duur standaard ~3,5 u (p90): verbranding ~445 g, **60 g/u = ~210 g**; vocht ~0,55 l/u |
| Gran fondo, 5 u, 700 kJ/u, IF 0,72 | 60 g/u | Zonder laden **75 g/u**; met laden sluit 60 g/u: laden is hier het advies |

*Sinds stap 1 (2026-11-13) staan deze vier voorbeelden als eenheidstests in
`tests/unit/nutrition-event-fuel.test.ts`; de getallen hierboven zijn die van
het model, niet meer met de hand.*

## 5. Het scherm: advies, en waar je mee rekent

Op de eventpagina en het racebriefje, op de plek van het huidige Klaarzetten.
Alleen waarden en labels; de uitleg van het model staat op `/hulp#voeding`
(productregel uit `AGENTS.md`).

```
[ Duur ] [ Tempo ] [ Race ]

Intensiteit      ───────●──  IF 0,92 · 255 W
Duur             ─────●────  2:05   (verwacht 1:55)
Vocht per uur    ────●─────  900 ml
Reken met        [ 90 ] g per uur        Advies 75 · grens 90 (2:1)

Verbruik 425 g · eten 190 g · uit voorraad 235 g

  2× bidon 750 ml  Zelfgemaakte sportdrank   70 g
  1× gel …
  0:15  bidon 1 · 0:35  bidon 1 · 0:55  gel · …
```

- **De knop Duur, Tempo, Race** zet de intensiteit (IF ~0,65, ~0,78 en de IF
  uit het racemodel) en daarmee het startpunt van het advies: bij een rit van
  2,5 uur of langer **60, 90 en 120 g per uur**. Bij een kortere rit zakt het
  advies mee met de duur (besluit 1), en het advies gaat nooit boven de
  opnamegrens (§4e): met 2:1-producten zegt Race dus 90, met
  1:0,8 en een afgeronde darmtraining 120. De standaard is de zwaarte van het
  event.
- **Schuifjes** voor intensiteit, duur en vocht per uur. Standaard de waarden
  uit §4 (pacingplan, schema, eigen geschiedenis, zweettest of schatting). Een
  schuifje verschuiven rekent het advies opnieuw uit.
- **Reken met** is het getal waarop het plan bouwt. Het begint bij het advies;
  wie zelf iets anders invult (Bart: "ik adviseer 120, reken met 135"), krijgt
  een plan op dat getal. Boven de opnamegrens kleurt het getal, zonder uitleg in
  het scherm. Bereik 0–150 g per uur (besluit 3).
- **De regel eronder** toont de balans bij de gekozen waarden, zodat je ziet wat
  je keuze betekent.
- **Het plan** (bidons, porties, momenten) rekent in de browser mee:
  `ridePlan` is puur en krijgt het getal en het vochtdoel van buiten. Recept en
  bidonmaat kiezen blijft zoals nu.
- **Bewaard per event** (besluit 7): de herinnering van de avond vooraf,
  Boodschappen en het racebriefje tonen dan hetzelfde plan. "Terug naar het
  advies" zet alles op de standaard.

## 6. Besluiten (voor de eigenaar)

| # | Punt | Voorstel | Waarom |
|---|---|---|---|
| 1 | De knop en 60/90/120 | De knop zet de zwaarte; 60/90/120 is het advies bij ≥ 2,5 uur. Korter: lager, naar de duurband en de balans | Een race van 45 minuten heeft niets nodig en een van 75 minuten geen 120; de richtlijnen geven banden naar duur. Wie toch 120 wil, vult dat in bij Reken met |
| 2 | Advies boven de duurband | Mag, tot de opnamegrens, als de balans dat vraagt; nooit lager dan nu | Besluit 3 van ritvoeding-plan.md zei "binnen de band". Het verbruik zat er toen niet in |
| 3 | Zelf boven de grens | Reken met mag tot 150 g per uur, ook boven je opnamegrens; het advies zelf komt nooit boven de grens. Boven 90 adviseert ZWB alleen na darmtraining (zoals nu) | Het advies blijft onderbouwd; de keuze is van het lid. Darmtraining-150 bestaat al als protocol |
| 4 | Reserve in de voorraad | 40% van de voorraad blijft over voor de finale | Keuze van ZWB; de voorraad per kg en het aandeel koolhydraten worden in stap 1 met bronnen onderbouwd |
| 5 | Soort koolhydraten vastleggen | Op elk recept voor onderweg één keuze: alleen glucose, 2:1, 1:0,8 of 1:1, gewoon eten, weet ik niet. De clubrecepten vult ZWB; bij een gescande gel of drank kies je het zelf, een keer | Open Food Facts en NEVO geven geen fructose. Dit trekt "glucose:fructose per product" uit de lijst "Bewust niet" van ritvoeding-plan.md terug: niet afleiden, wel laten kiezen |
| 6 | "Weet ik niet" en gewoon eten | Beide tellen als grens 60 | Voorzichtig: veel gels zijn alleen maltodextrine (zie §2). Bart noemt banaan en kruidkoek 60 g per uur; dat is een praktische grens, geen opnamegrens |
| 7 | Keuzes bewaren | Per lid per event: zwaarte, duur, vocht, reken met. Kleine tabel, eigen RLS, in de data-export | Zonder bewaren toont de herinnering een ander plan dan je klaarzette |
| 8 | Vocht zonder zweettest | Een geschatte waarde in plaats van 750 ml/u, met de zweettest als betere bron | 0 zweettests; de vaste 750 is nu stilzwijgend voor iedereen het advies |
| 9 | Natrium | Blijft zonder mg-doel (besluit 6 van ritvoeding-plan.md); wel "zout in je bidon" als het geschatte verlies boven 2 l komt of het warm is | Zoutverlies blijft niet uit gewicht af te leiden |
| 10 | Plan naast de werkelijkheid | Na een event: gereden duur en kJ (intervals.icu) en wat je vastlegde, naast het plan; de eigen verhouding per eventtype ijkt de standaardwaarden | Gebruikt data die al verwerkt wordt. Alinea op `/privacy` aanpassen zonder nieuwe versie, vooraf voorleggen |

## 7. Bouwvolgorde

Elke stap een eigen ronde met commit, `PLAN.md`-blok en waar nodig `/hulp`.

1. **Onderbouwing en model, zonder scherm.** `event-fuel.ts` met verbruik,
   balans, opnamegrens en vochtschatting, plus eenheidstests. Bronnen voor
   bruto-efficiëntie, aandeel koolhydraten, glycogeenvoorraad en de grenzen per
   soort in `voeding-wielrennen.md` §3 en §6 (Consensus/PubMed, zoals de
   kennisbank-scan). Een script dat het model over de eventritten van §2 draait
   en het verschil met de echte kJ toont: zit het verbruik er meer dan 10%
   naast, eerst bijstellen. Geen migratie.

   *Gebouwd op 2026-11-13, zie `PLAN.md`: `src/lib/nutrition/event-fuel.ts`,
   19 eenheidstests en `scripts/event-fuel-check.mjs`. Het script is alleen op
   proefdata gedraaid: de Supabase-connector viel tijdens de ronde weg, dus de
   toets tegen de echte events staat nog open. Al duidelijk voor stap 2:
   intervals.icu rekent de IF op het genormaliseerde vermogen, dus zonder
   pacingplan is "IF × FTP" de NP en niet het gemiddelde vermogen dat het
   verbruik bepaalt. Hoeveel lager het gemiddelde ligt, toont het script (kolom
   gem/NP); stap 2 moet dat meenemen, anders schat het model het verbruik te
   hoog.*
2. **Het aanpasbare plan op de eventpagina.** De knop, de schuifjes, Reken met,
   de balansregel en het plan dat meerekent; ook een plan onder een uur (alleen
   drinken). `ridePlan` krijgt het getal en het vochtdoel van buiten. De
   keuzes gelden nog alleen in het scherm. Grens zonder producttype: darm. Geen
   migratie.

   *Gebouwd op 2026-11-13, zie `PLAN.md`: `src/lib/nutrition/event-planner.ts`
   en `event-fuel-planner.tsx`. Zonder pacingplan rekent het van NP naar
   gemiddeld vermogen met een vast deel per knopstand (`AVG_SHARE_OF_NP`, keuze
   van ZWB). Niet in de browser bekeken.*
3. **Soort koolhydraten op recepten** (besluit 5 en 6). Kolom op
   `nutrition_recipes`, gevuld voor de clubrecepten, een keuze bij een eigen
   recept of gescand product; de opnamegrens van §4e telt mee. Migratie.

   *Gebouwd op 2026-11-13, zie `PLAN.md`: migratie
   `0328_nutrition_recipe_carb_mix.sql` (nog niet op productie), de keuze in het
   receptformulier en `planBagCap` in `event-planner.ts`. Een gescand product
   is hier een recept met een barcode en krijgt dezelfde keuze. Zonder de kolom
   laat de planner de tasgrens weg.*
4. **Keuzes bewaren per event** (besluit 7). Herinnering, Boodschappen en
   briefing lezen ze. Migratie, privacyzin en data-export.

   *Gebouwd op 2026-11-13, zie `PLAN.md`: migratie
   `0329_nutrition_event_fuel.sql` (nog niet op productie), bewaren even na
   de laatste wijziging, en naast de keuzes het getal en het vocht waarmee het
   plan rekent, zodat de herinnering en Boodschappen de planner niet nodig
   hebben. De privacyzin staat op `/privacy` (akkoord 2026-11-13).*
5. **Duur met marge.** De eigen verhouding per eventtype (p90) en de
   clubterugval als standaard op het duurschuifje; `toertocht` in
   `EVENT_DEFAULTS`; `racePace` ook doorgeven in `loadEventRidePlan`.

   *Gebouwd op 2026-11-13, zie `PLAN.md`: `src/lib/nutrition/event-duration.ts`.
   Anders dan hier stond, geldt met een route of afstand niet de clubverhouding
   van §2 maar 1,12: die verhoudingen komen grotendeels uit planningen zonder
   route, en met een route rekent het racemodel met je eigen factor al
   nauwkeuriger (p90 van de afwijking 11,6%). Toertocht kreeg 180 minuten
   zonder afstand, maar geen clubmarge (twee events). Geen migratie.*
6. **Vocht naar binnen, buiten en weer.** De vochtschatting met de temperatuur
   uit `fetchRouteForecast` (binnen een week voor het event), anders de
   seizoenswaarde; zout in de bidon bij veel verlies.

   *Gebouwd op 2026-11-13, zie `PLAN.md`. Met `fetchWindForecast` op het
   startpunt halverwege de rit in plaats van `fetchRouteForecast`: die heeft een
   ingelezen GPX nodig, en het startpunt is er bij elk event buiten met
   coördinaten. Seizoen: KNMI-normalen De Bilt 1991–2020 (`SEASON_OUTDOOR_C`).*
7. **Momenten uit het pacingplan.** Accenten, start van een Zwift-race, vast
   eten of gel naar IF.

   *Gebouwd op 2026-11-13, zie `PLAN.md`. Het pacingplan bewaart sinds deze
   stap per accent de doorkomst en de duur (`summary.accents`); een ouder plan
   schat ze uit de km's. De regel voor gewoon eten geldt bij elk event, ook
   zonder pacingplan, want de IF staat altijd op het schuifje. Geen migratie.*
8. **Na het event.** Plan, gereden en gegeten naast elkaar; de standaardwaarden
   van stap 5 komen hieruit. Eerst de privacyzin voorleggen (besluit 10).

   *Gebouwd op 2026-11-13, zie `PLAN.md`: `src/lib/nutrition/event-review.ts`,
   blok "Na afloop" op de eventpagina. De privacyzin is voorgelegd en akkoord.
   De standaardduur uit je eigen events zat al in stap 5 (`durationRatios`);
   die rekent nog met Strava, niet met deze vergelijking. Geen migratie, niets
   bewaard.*

Migraties zijn hier niet lokaal te testen (geen Docker of Supabase-config);
alleen tegen PGlite, en toepassen op productie alleen op verzoek.

Ook de gewone ritten in het schema kunnen hierop over (de training heeft een
vermogensdoel en duur); dat is een vervolg na stap 4, niet dit voorstel.

## 8. Bewust niet

- **Verbruik gelijk aan inname.** Je darm neemt ongeveer 90 g per uur op; de
  rest komt uit de voorraad. Het model rekent het tekort uit, het vult het niet
  "aan".
- **Fructose afleiden uit etiket of ingrediëntenlijst.** Onbetrouwbaar; het lid
  kiest de soort (besluit 5).
- **Een kcal-getal in beeld.** Het verbruik wordt in gram koolhydraten getoond,
  niet in kcal (REDs-keuze, §7 van voeding-wielrennen.md).
- **Een eigen glycogeenmeting of een "tank" die je dagelijks volgt.** Te
  onzeker voor een getal per dag; het model gebruikt alleen de voorraad op de
  startdag.
- **Een harde blokkade boven de grens.** Reken met mag boven de opnamegrens;
  het getal kleurt alleen.
- **AI die het plan maakt.** Blijft regelgebaseerd.
- **Kamertemperatuur of ventilator vragen.** Binnen rekent het model met de
  hele warmte via zweet; de rest volgt uit een zweettest of het vochtschuifje.

## 9. Open punten

- De rekenvoorbeelden van §4 zijn eenheidstests, maar niet in de app bekeken.
- Bruto-efficiëntie (22%), het aandeel koolhydraten per IF, de voorraad per kg,
  de reserve en de grenzen per soort hebben sinds stap 1 een bron of staan als
  keuze van ZWB in voeding-wielrennen.md §3 en §6. De punten per IF en de 6 en
  8 g/kg zijn vertalingen, geen getallen uit één bron; de vindplaats van Ettema
  & Lorås is niet nagekeken.
- Het model is nog niet getoetst aan de echte events (stap 1, script klaar).
- Of het SiS GO-poeder alleen maltodextrine is, is niet nagekeken.
- De IF uit intervals.icu is tegen FTP, die uit het pacingplan tegen CP. Het
  model behandelt ze als gelijk; het verschil is in de orde van een paar
  procent.
- Maar één lid legt eten onderweg vast; of het model "de werkelijkheid" van
  andere leden raakt, is pas na stap 8 te zien.
- De voedingsinhoud is nog steeds niet door een (sport)diëtist nagekeken.

## Bronnen (in stap 1 na te lopen en in voeding-wielrennen.md op te nemen)

- Romijn JA, et al. (1993). Regulation of endogenous fat and carbohydrate metabolism in relation to exercise intensity and duration. *Am J Physiol* 265:E380–E391.
- van Loon LJC, et al. (2001). The effects of increasing exercise intensity on muscle fuel utilisation in humans. *J Physiol* 536:295–304.
- Ettema G, Lorås HW (2009). Efficiency in cycling: a review. *Eur J Appl Physiol* 106:1–14.
- Areta JL, Hopkins WG (2018). Skeletal muscle glycogen content at rest and during endurance exercise in humans: a meta-analysis. *Sports Med* 48:2091–2102.
- Jeukendrup AE (2014). A step towards personalized sports nutrition: carbohydrate intake during exercise. *Sports Med* 44(Suppl 1):S25–S33 (grenzen per soort koolhydraten).
- Al in de kennisbank: Podlogar & Wallis 2022 (1:0,8 tot 120 g/u); Burke et al. 2011; Thomas et al. 2016; Jeukendrup et al. 2026 (UCI, wedstrijdvoeding); Baker 2017; McCubbin 2023; Cheung et al. 2025; Whitfield et al. 2026 (esports en gravel). Zie [voeding-wielrennen.md](voeding-wielrennen.md).
- Intern: [ritvoeding-plan.md](ritvoeding-plan.md) §2 (besluiten 3 en 6) en §4, `src/lib/nutrition/ride-plan.ts`, `src/lib/nutrition/gut-training.ts`, `src/lib/pacing/plan.ts`, `src/lib/weather.ts`.
