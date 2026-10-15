# Racestrategie in wielrennen en Zwift: onderzoek, regels en toetsing

Opdracht van de eigenaar (2026-10-15): "Ga nu na wat er te vinden is qua
strategie in wielerwedstrijden, zwift racen etc en plaats dat in een onderzoek
zo breed en diepgravend mogelijk. Kijk dan of de lering en tips kan toevoegen
en toetsen aan deze raceprestaties. Kijk daarnaast of je in training ook
eenzelfde filosofie kan toevoegen in trainingsanalyse. Presenteer dit in het
trainer deel zodat de trainer kan besluiten dit in feedback terug te geven."

Dit document is het onderzoek. Het besluit en wat er gebouwd is staan in
`PLAN.md`; de eerdere stappen (ZWBeter racen, de tips per soort race) in
[zrl-analyse.md](zrl-analyse.md).

**Hoe gezocht.** Webzoekopdrachten naar wetenschappelijke reviews en studies
(pacing, tijdrit, aerodynamica van draften, W′ en critical power, durability,
warming-up, voeding, intensiteitsverdeling, intervaltraining, coachfeedback) en
naar de Zwift-praktijk (Zwift Insider, WTRL, ZwiftGopher, coaches). Van de
meeste studies is alleen de samenvatting gelezen; waar een getal uit een
secundaire bron komt, staat dat erbij. Bronnen staan onderaan.

## 1. Pacing: de theorie

- **Soorten pacing.** Abbiss & Laursen (2008) onderscheiden negatieve,
  all-out, positieve, gelijkmatige, paraboolvormige en variabele pacing. Voor
  inspanningen langer dan twee minuten lijkt een gelijkmatige verdeling sneller;
  getrainde atleten kiezen vaak toch een positieve (snel beginnen, dan
  wegzakken). Het tempo wordt in het brein geregeld op basis van wat het lichaam
  meldt en wat er nog komt.
- **Tegenstanders sturen mee.** Konings & Hettinga (2018, 75 studies): het
  gedrag van tegenstanders is een wezenlijke factor in hoe hard iemand rijdt,
  afhankelijk van de situatie en de eigen toestand. Een sneller startende
  (virtuele) tegenstander trekt renners in een 4-km-tijdrit in de eerste 750 m
  harder mee. In een massastart is pacing daardoor geen rekensom maar een reeks
  beslissingen; een analyse achteraf moet daarom vooral naar gevolgen kijken.

**Gevolg voor de regels:** een massastart beoordelen we niet op "gelijkmatig";
een tijdrit wel.

## 2. Tijdrit

- **Variabel vermogen met helling en wind is sneller.** Swain (1997) en
  Atkinson e.a. (2007): harder op klimmen en tegenwind, zachter afdalen en met
  de wind mee. Met ±10% variatie rond 289 W scheelde het in modellen 26 s op een
  vlakke 40 km en tot 126 s op een heuvelachtig parcours. In het veld (4 km,
  golvend) 12 ± 8 s (2,9%) sneller dan constant vermogen. Renners vonden constant
  vermogen op golvend terrein moeilijk vol te houden.
- **Te snel starten.** Renners begonnen in een 16-km-tijdrit uit zichzelf 14%
  boven hun gemiddelde en wonnen 10 tot 12 s met een gelijkmatige of licht
  variabele (±5%) verdeling. In een 30-km-tijdrit verlaagde een snelle start de
  eindsnelheid; hooguit 5% boven het gemiddelde starten gaf de beste tijd. Over
  heel korte afstand (4 km, 5 min) maakt een all-out start weinig uit of helpt
  hij iets.
- **Een te harde start is dus een echte fout in een tijdrit, een iets hardere
  klim niet.**

## 3. Ploegentijdrit

### Aerodynamica

- Blocken e.a. (2013, CFD en windtunnel): de tweede renner heeft 27% (rechtop),
  23% (in de beugels) of 14% (tijdritpositie) minder luchtweerstand. De voorste
  wint 1,3 tot 2,6%. In een rij is de voorlaatste plek de gunstigste (tot 68%
  minder weerstand in een rij van acht). De beste volgorde hangt af van vermogen
  én lichaamsbouw.
- Zwift Insider (snelheidstests, Pack Dynamics 4 en 4.1): in Zwift scheelt de
  tweede plek 22 tot 29%, de derde 29 tot 35%, de vierde 34 tot 36%, afhankelijk
  van versie en fiets. Op een klim veel minder (3 tot 12%), in een afdaling veel
  meer (18 tot 46%).

### Wat de beste ploegen doen (Zwift)

Fitzpatrick (Zwift Insider, 2021, data van vlakke WTRL-ploegentijdritten):

- Kopbeurten van **20 tot 30 seconden**, met vaste timing, en daarna zo'n 3,5
  minuut rust.
- Kopvermogen **minstens 120%, liefst 130% van de gemiddelde FTP** van de ploeg
  (de sterkste ploegen tot 143%).
- In het wiel herstellen op **≥ 85% FTP** vanaf plek drie, **95 tot 100%** op
  plek twee: over-unders tussen 85 en 130%, geen constante drempel.
- Gemiddeld vermogen in de race ongeveer **95% van de FTP**.
- **Samenstelling:** FTP's binnen ±10% van het gemiddelde. Renners **15% onder**
  het gemiddelde weinig beurten, **20% eronder** alleen in het wiel.
- Op het vlakke een wattdoel (een zware renner trekt harder in watt), op
  klimmen boven ~3% een **W/kg-doel** zodat de ploeg bij elkaar blijft.

Andere bronnen spreken dat deels tegen: een uitgewerkt voorbeeld pleit voor
beurten van **minstens 1 tot 2 minuten**, omdat de snelheid na een wissel tijd
nodig heeft om te stabiliseren. In ZWB's eigen race van 13 oktober duurde een
overname mediaan 11 tot 15 s (botlogboek), wat bij beurten van 30 s een groot
deel van de beurt is. Dit is een open vraag; de app zegt er niets over.

### Kopvermogen bijgesteld op eigen data (2026-10-15)

De eigenaar twijfelde aan 120 tot 130%: wie harder trekt, maakt de ploeg sneller,
en dan gaat ook het vermogen in het wiel omhoog. De eigen ploegentijdrit van
13 oktober bevestigt dat:

- **Gemeten** (Stijn, vermogen per seconde, rotatie uit het botlogboek): kop op
  het vlakke 296 tot 314 W, in het wiel 225 tot 263 W, dus 72 tot 89% van het
  kopvermogen.
- **Geschat** voor de anderen uit gemiddeld vermogen, kopvermogen uit het plan en
  koptijd: Koen, Marc en Wouter trapten over de hele race in het wiel 95 tot 96%
  van hun FTP, 81 tot 84% van hun kopvermogen. Hun kopbeurten lagen op 114 tot
  118% van de eigen FTP, hun gemiddelde op 99% van de FTP, met beste 20 minuten
  op 100 tot 103%: aan de grens.
- **Rekensom:** gemiddeld ≈ aandeel kop × kop + aandeel wiel × 0,8 × kop. Met
  vijf renners (20% kop) wordt dat 0,84 × kop. Kop op 125% geeft dan gemiddeld
  105% van de FTP, 40 minuten lang: niet vol te houden. Kop op 105 tot 115% geeft
  88 tot 97%.
- ZRL A (2e van 10) reed met kopbeurten op 108% en zat gemiddeld ook op 98 tot
  101% van de FTP.

De 120 tot 130% van Fitzpatrick komt van topploegen met tot acht renners op
vlakke parcoursen: kopbeurten van 20 tot 30 s met 3,5 minuut rust, dus zo'n 12%
van de tijd op kop, en in een lange rij meer draft. In de ZRL rijden vier of vijf
renners, vaak met klimmen. **Doel in de app: 105 tot 115% van de gemiddelde FTP;
melding onder 100% of boven 120%.** In het wiel trap je ongeveer 80% van het
kopvermogen. Nog niet gemeten: een ploeg van zes tot acht op een vlak parcours.

WTRL-regels: de tijd van de vierde renner telt, niet draften op andere ploegen.
Een bewust "laatste beurt en eraf" van een renner die toch gaat lossen is een
erkende tactiek.

## 4. Massastart

- **Eisen.** Profdata: korte pieken van 5 tot 15 s op 9,5 tot 14 W/kg in de
  minuten voor een ontsnapping, daarna 30 s tot 5 min op 450 tot 500 W (Abbiss
  e.a. 2013). In de laatste 10 minuten voor een sprint loopt het vermogen op van
  316 naar 487 W in de laatste minuut, met een piek van 17,4 W/kg (Menaspà e.a.
  2015). Een rittenkoers: gemiddeld zo'n 220 W, veel rond de drempel.
- **Ontsnappingen.** In de Tour lukte de ontsnapping in 27% van de ritten
  (2,5% kans per renner); vaker op heuvel- en bergritten en met grotere groepen
  (Frontier Economics; Scelles e.a.). Op Zwift lukken ze zelden; de race wordt
  meestal in de laatste honderden meters beslist (Slowtwitch).
- **Draft en positie.** In Zwift wint een zwaardere renner op het vlakke bij
  gelijke W/kg, omdat hij meer watt levert; een lichte renner op een klim. Wie op
  het vlakke het wiel verliest, moet in zijn eentje harder dan de groep
  (Zwift Insider). Niet te veel trappen op hoge snelheid: de marge om in de
  groep te blijven is dan groter.
- **Klimmen in Zwift.** Aanvallen op het steilste stuk of net erna, niet aan de
  voet; doortrappen over de top en het eerste deel van de afdaling, want daar
  vallen de gaten.
- **De start.** In Zwift wordt de start vaak heel hard gereden; de genoemde
  getallen (150 tot 200% FTP in de eerste 30 s) zijn niet onderbouwd. ZwiftPower
  laat de eerste zo'n 30 s weg uit het gemiddelde.

### Puntenrace (ZRL)

- FAL-punten naar plek over de streep van een segment, FTS-punten naar de tien
  snelste tijden, plus finish en podium. Op sprintroutes kunnen de tussensprints
  meer dan driekwart van de punten zijn.
- **"Rust, sprint, herhaal":** rusten tussen de segmenten, alleen voluit waar het
  telt. De meeste renners kiezen één soort segment (klim of sprint) naar hun
  sterkte; de rest rijden ze in het wiel. Diepte wint: de ploeg met de meeste
  renners vooraan bij elke sprint.

## 5. W′ en critical power in een race

- W′ is de reserve boven critical power; boven CP loopt hij leeg, eronder
  herstelt hij. Handig om te zien hoe iemand zijn "lucifers" verdeelde.
- **De modellen zijn onzeker.** Bij 15 renners in echte races gaven drie modellen
  op het moment van uitputting een W′-balans van 0 ± 30% (integraal), 21 ± 28%
  (differentieel, het model van de app) en 42 ± 23% (Bartram). Fouten in CP en W′
  verschuiven de hele lijn.

**Gevolg voor de regels:** een lage W′ is nooit alleen een tip. De app vraagt
er altijd een gemeten gevolg bij: het vermogen in de tweede helft van de klim
zakte weg, of herstel duurde lang.

## 6. Durability

- Durability is wanneer en hoeveel iemands profiel achteruitgaat tijdens lange
  inspanning (Maunder e.a. 2021). Bij profs bleef het vermogen tot ongeveer 3000 kJ
  nagenoeg gelijk; bij beloften zakte het eerder (Leo e.a.). Werk boven CP kost
  meer dan dezelfde kJ eronder (review van 21 studies, 2025).
- Amateurs die beter presteerden, verloren na 1000 kJ half zo veel van hun
  20-minutenvermogen (6,5 tegen 12,5%).

**Gevolg:** het eind van een race zegt iets over durability, maar zonder test
is het niet te scheiden van tactiek. De app geeft er geen tip over.

## 7. Warming-up, voeding

- **Warming-up:** voor korte inspanningen (rond 4 km) soms een kleine winst
  van "priming"; voor 1 tot 10 km vaak geen verschil, en een te zware
  warming-up kan schaden. Zelf gekozen warming-ups werken meestal even goed.
- **Voeding:** in een race van een uur helpt een koolhydraatspoeling of een klein
  beetje koolhydraten (Jeukendrup 2014; meta-analyse 2019: meer vermogen, de tijd
  niet significant). Meer per uur geldt voor langere inspanningen; de precieze
  getallen zijn hier niet nagelezen.

**Gevolg:** geen tips; de protocollen (cafeïne, koolhydraten) staan al in de
app.

## 8. Training

- **Intensiteitsverdeling.** Gepolariseerd of piramidaal verdeeld trainen is bij
  (elite)atleten iets beter dan veel drempeltraining; bij lagere niveaus werken
  alle verdelingen ongeveer even goed. Het advies "houd rustige dagen rustig" is
  breed gedragen, het bewijs voor amateurs dunner.
- **Ontkoppeling (Pw:HR).** Friel: een ontkoppeling van ≤ 5% tussen eerste en
  tweede helft van een gelijkmatige duurrit wijst op een stevige aerobe basis;
  5 tot 10% op beperkingen of vermoeidheid; > 10% meestal te hoog tempo. Een
  vuistregel, geen norm; warmte, voeding en de duur (liefst ~2 uur) tellen mee.
- **Herhalingen.** Bij zelf gekozen tempo zakt het vermogen over drie
  herhalingen ongeveer 3% (Villerius & Grappe); ervaren renners houden het
  vlakker. Coaches hanteren > 10% verschil tussen eerste en laatste herhaling
  als teken dat de eerste te hard was; dat is een vuistregel.
- **RPE.** Sessie-RPE is een valide maat voor belasting bij wielrenners. Een
  RPE die stijgt bij gelijk vermogen is een teken van vermoeidheid; geen enkel
  signaal scheidt vermoeidheid, overreaching en overtraining betrouwbaar. Gebruik
  het naast andere signalen.

## 9. Feedback geven

- Feedback werkt het best als die **empathisch** is, **keuzes** biedt om het te
  verbeteren en uitgaat van **duidelijke, haalbare doelen** die de sporter kent
  (Carpentier & Mageau). Autonomie-ondersteunend coachen hangt samen met
  motivatie en welbevinden; het bewijs is vooral correlationeel.

**Gevolg voor de vorm:** elke suggestie bestaat uit een bevinding (het getal)
en een tip (wat je kunt doen). De app stuurt niets zelf; de trainer kiest,
past aan en stuurt.

## 10. Van onderzoek naar regels

Een tip of suggestie komt er alleen als de data een **gevolg** of een
**afwijking** laat zien die bij het soort race of training past.

### Race: voor de renner (eigen bestand)

| Regel | Onderbouwing | Drempel |
|---|---|---|
| Klim te hard begonnen | pacing, W′-onzekerheid (gevolg vereist) | klim ≥ 90 s, tweede helft ≥ 12% lager, ≥ 20 s voor de top W′ ≤ 5% |
| Start die iets kostte | tijdrit: ≤ 5% boven gemiddelde; ploegtempo | hardste 10 min aan de start ≥ FTP en ≤ 60% W′ aan de voet van de eerste klim |
| Tijdrit: wegzakken, met het eerste tiende | Atkinson, Thomas | tweede helft ≥ 5% lager; eerste tiende vermeld vanaf 5% boven gemiddelde |
| Tijdrit: klim onder eigen kunnen | variabel vermogen | klim < 90% van eigen beste over die duur, mits boven nog ≥ 25% W′ |
| Ploegentijdrit: lang herstel na een klim | beurten volhouden | > 2 min tot 25% W′ |
| Reserve (alleen tijdrit, ploegentijdrit) | race rond 95% FTP | beste 40 min ≤ 85% van 90-dagencurve |

### Race: uit de Zwift-data (renner en captain)

| Regel | Onderbouwing | Drempel |
|---|---|---|
| Gelost, en waar | WTRL: vierde renner telt | > 30 s na de vierde; klim waar ≥ 15 s verloren |
| Meeste watt op een klim (TTT) | zware renner betaalt op klim | hoogste watt van wie de klim met de ploeg reed |
| Segmenten kiezen (puntenrace) | "rust, sprint, herhaal" | ≥ 3 segmenten boven eigen 5-min-W/kg, niet in top 10 en achterste helft over de streep |
| Efficiëntie (puntenrace) | draft 25 tot 35% | ≥ 0,25 W/kg meer dan de vijf renners vlak voor je; niet zonder draft (Race of Truth) |
| Ploeg uit elkaar op een klim (captain) | W/kg-doel op klimmen | vierde renner ≥ 8 s achter de eerste over de klim |
| Plan: zwakke renner met beurten (captain) | ±10%, 15/20%-regel | FTP ≤ 85% (≤ 80%: alleen wiel) van het gemiddelde |
| Plan: kopvermogen (captain) | 105 tot 115% van gem. FTP (eigen meting, zie sectie 3) | mediaan < 100% of > 120% |
| Plan: overbelast (captain) | race ~95% FTP | gelost met gemiddeld ≥ 98% van eigen FTP |

Vervallen na de eerste toets of op aanwijzing van de eigenaar: W′ op boven op
een klim, "op je maximum", hartslagdrift, lage cadans, tijdverlies op de
snelste met een trainingstip, "houd die aanpak vast", en het beste segment als
los compliment.

### Training: suggesties voor de trainer

| Regel | Onderbouwing | Drempel |
|---|---|---|
| Eerste herhaling te hard, daarna weggezakt | interval-pacing | laatste ≥ 10% onder de eerste, eerste ≥ 5% boven doel (grootste groep herhalingen met hetzelfde doel, ≥ 3) |
| Weggezakt terwijl de eerste op doel lag | idem | laatste ≥ 10% onder de eerste |
| Alles onder doel en zwaar | RPE, FTP | gemiddeld ≥ 5% onder doel en RPE ≥ 8 |
| Duur- of herstelrit werd tempo | rustige dagen rustig | zone 3+ ≥ 20% (herstel 10%) boven wat gepland was |
| Ontkoppeling | Friel | ≥ 5% op een duur- of herstelrit ≥ 75 min met VI ≤ 1,10 |
| Rustige rit voelde zwaar | RPE als vermoeidheidssignaal | RPE ≥ 7, alleen als de rit niet te hard gereden is |
| Zware sessie voelde licht | ruimte om op te bouwen | RPE ≤ 4, volgens plan |

## 11. Getoetst op de eigen data

Gedraaid op 2026-10-15 tegen productie, alleen lezen (schrijven geblokkeerd):
alle 28 ZRL-races sinds 1 september van de zeven ZWB-teams (137 renners), en de
eigen ritten van de eigenaar (ZRL en acht FRR-tijdsloten). Trainingsdata van
andere leden is niet gebruikt; de trainingsregels zijn op de eigen trainingen van
de eigenaar getoetst. Ruwe uitkomsten staan lokaal in `.tmp/` (niet in git).

**Eerste ronde: te veel.** 93 van de 137 renners kregen een tip. De regel "je
beste segment" ging naar de helft van alle renners en naar elke FRR-race: een
compliment, geen advies. De planregels vuurden op een concept dat nooit gebruikt
was (Bdev, met een renner die niet reed). Een efficiëntieregel ("je reed meer
dan de renners vlak voor je") hoort niet bij een Race of Truth zonder draft.

**Na bijstellen** (beste segment alleen nog binnen "segmenten kiezen", plannen
alleen gepubliceerd of uit ZwiftGopher geïmporteerd, efficiëntie niet zonder
draft): **28 van de 137 renners** kregen een tip, samen 31.

| Regel | Keer | Voorbeeld |
|---|---|---|
| Renner: segmenten kiezen | 13 (+1 eigen) | 3 tot 5 segmenten boven het eigen vijfminutenvermogen zonder voorin te komen |
| Renner: meeste watt op een klim (TTT) | 9 (+1 eigen) | 330 W op Zwift KOM Reverse, het meest van de ploeg |
| Renner: gelost en waar | 5 | op Zwift KOM los van de ploeg |
| Renner: efficiëntie | 4 | 3,73 W/kg tegen 3,32 van de renners vlak voor |
| Captain: verlies per stuk | 5 | 21,8 s verloren op het vlakke stuk naar de sprint |
| Captain: gelost | 5 | met de klim erbij, en "daarna mocht niemand meer lossen" |
| Captain: puntenverdeling | 5 | één renner 41 tot 45% van de punten |
| Captain: ploeg uit elkaar op een klim | 2 | vierde renner 10 en 36 s achter de eerste |
| Captain: plan kopvermogen | 1 → 0 | kopbeurten op 108% van de gemiddelde FTP; valt sinds de bijgestelde drempel (2026-10-15) binnen het doel |
| Eigen: start met gevolg, klim te hard begonnen | 1 + 1 | ZRL-ploegentijdrit 13 oktober |
| Eigen FRR: start met gevolg, tijdrit-verdeling | 1 + 1 | de twee iTT's; geen tip in de zes FRR-wegraces |

Dezelfde conclusies als het handwerkrapport over Bdev (13 oktober), behalve wat
alleen uit het botlogboek of het plan van ZwiftGopher kwam.

**Training (eigen trainingen, 15 met een bestand).** Eerste ronde: een duurrit
met openers kreeg "werd tempo" terwijl de openers gepland waren; een duurrit die
te hard gereden was kreeg daarnaast "voelde zwaar, vraag naar slaap"; bij een
warming-up telde een blok waar het bestand al gestopt was als herhaling. Na
bijstellen (zone 3+ alleen boven het geplande deel, RPE-regel alleen als de rit
niet te hard was, herhalingen onder de helft van het doel tellen niet): drie
suggesties, alle drie "duurrit werd tempo" (40, 62 en 65% in zone 3 of hoger).
Er zaten geen intervalsessies in de periode: de regels voor herhalingen zijn
alleen met gesimuleerde ritten getest.

## 12. Wat niet kan, en open vragen

- **Positie in de groep, draft en kopbeurten** ziet de app niet: Zwift geeft
  geen positie, en het botlogboek staat niet in het platform. De
  efficiëntieregel is een benadering.
- **De start in Zwift**: de uitslag mist de eerste ~30 s; het eigen bestand
  begint soms later (bij de eigenaar 15 s).
- **Kopbeurtlengte in een ploegentijdrit**: 30 s of 1 tot 2 min? Bronnen
  spreken elkaar tegen; met een Sauce-meting van de eigen ploeg is het te
  toetsen.
- **W′-balans**: de absolute waarde is onzeker; de app gebruikt hem alleen samen
  met een gemeten gevolg.
- **Durability en voeding**: geen regels; te weinig om op te sturen zonder
  test of logboek.

## Bronnen

- Abbiss & Laursen (2008), Describing and understanding pacing strategies during athletic competition, Sports Med. [ro.ecu.edu.au](https://ro.ecu.edu.au/ecuworks/877)
- Konings & Hettinga (2018), Pacing decision making in sport and the effects of interpersonal competition. [researchportal.northumbria.ac.uk](https://researchportal.northumbria.ac.uk/en/publications/pacing-decision-making-in-sport-and-the-effects-of-interpersonal-/); opponent study [northumbria](https://researchportal.northumbria.ac.uk/en/publications/the-behavior-of-an-opponent-alters-pacing-decisions-in-4-km-cycli/)
- Atkinson, Peacock & Passfield (2007), Variable versus constant power strategies during cycling time-trials. [research.tees.ac.uk](https://research.tees.ac.uk/en/publications/variable-versus-constant-power-strategies-during-cycling-time-tri/); Atkinson e.a. (2003), Science and cycling. [research.tees.ac.uk](https://research.tees.ac.uk/en/publications/science-and-cycling-current-knowledge-and-future-directions-for-r/); veldstudie 4 km [kar.kent.ac.uk](https://kar.kent.ac.uk/27855/)
- Snelle start: head/tailwind 16,1 km [research.tees.ac.uk](https://research.tees.ac.uk/en/publications/pacing-strategies-during-a-cycling-time-trial-with-simulated-head/); TT30 [researchonline.jcu.edu.au](https://researchonline.jcu.edu.au/11495/); 5 min all-out [ro.ecu.edu.au](https://ro.ecu.edu.au/ecuworks/456); 4 km [vuir.vu.edu.au](https://vuir.vu.edu.au/46393/1/Effect%20of%20different.pdf)
- Blocken e.a. (2013), CFD simulations of the aerodynamic drag of two drafting cyclists. [preprint](https://www.urbanphysics.net/2013_CAF_BB_TD_EK_JC_PH__Preprint.pdf); pacelines [researchportal.hw.ac.uk](https://researchportal.hw.ac.uk/en/publications/aerodynamic-impact-of-cycling-postures-on-drafting-in-single-pace/); [Velo](https://velo.outsideonline.com/2020/12/these-are-the-best-and-most-surprising-places-to-get-a-draft-in-a-bike-race/)
- Zwift Insider: [How the best teams race Zwift TTTs](https://zwiftinsider.com/how-the-best-race-ttt/), [Draft savings: climbs vs descents vs flats](https://zwiftinsider.com/draft-savings/), [Drafting in Zwift](https://zwiftinsider.com/zwift-drafting/), [4-rider drafting PD4.1](https://zwiftinsider.com/tt-drafting-pd41/), [Lower w/kg](https://zwiftinsider.com/getting-beat-people-lower-wkg/), [ZRL points explainer](https://zwiftinsider.com/zrl-segment-points-fal-fts), [Neon Flats guide](https://zwiftinsider.com/?p=91825), [Sneaking away](https://zwiftinsider.com/sneaking-away), [Power-ups](https://zwiftinsider.com/powerup-usage), [Racing tactics, 9 tips](https://zwiftinsider.com/aki-sato-tips/), [TTT tips](https://zwiftinsider.com/zrl-2-tips/)
- WTRL, [ZRL rules & scoring](https://www.wtrl.racing/zrl/resources/); [ZwiftGopher TTT](https://zwiftgopher.com/TTT/); [optimal TTT strategy](https://www.cyclingapps.net/what-is-the-optimal-team-timetrial-strategy/); [WEZ TTT tips](https://www.worldelitezwifters.com/2023/09/team-time-trial-tips-and-tactics-ttttt.html)
- Roadman Cycling, [Zwift racing tactics](https://roadmancycling.com/blog/zwift-racing-tactics-guide); Slowtwitch, [Zwift racing 101](https://slowtwitch.com/training/zwift-racing-101-quick-start-guide/)
- Abbiss, Menaspà e.a. (2013), Distribution of power output when establishing a breakaway. [ro.ecu.edu.au](https://ro.ecu.edu.au/ecuworks2013/657); Menaspà e.a. (2015), Physical demands of sprinting. [acuresearchbank](https://acuresearchbank.acu.edu.au/item/8vy19/physical-demands-of-sprinting-in-professional-road-cycling); stage racing [lida.sport-iat.de](https://lida.sport-iat.de/ta/Record/4011141)
- Ontsnappingen: [Frontier Economics](https://www.frontier-economics.com/uk/en/news-and-insights/articles/article-i6444-breaking-down-the-breakaway/); Scelles e.a. [emerald](https://www.emerald.com/insight/content/doi/10.1108/TPM-03-2017-0012/full/html); [CyclingTips](https://zenocycleparts.com/blogs/cyclingtips/will-the-breakaway-survive-here-are-the-factors-that-matter)
- W′-balans in races (2023), [lida.sport-iat.de](https://lida.sport-iat.de/ta/Record/4080937?lng=de); W′ uitleg [the5krunner](https://the5krunner.com/2024/02/23/cycling-whats-my-w-how-do-i-calculate-it-and-should-i-care/)
- Durability: review 2025 [Springer](https://link.springer.com/article/10.1007/s00421-025-05885-0); Leo e.a. (2024) [universidadeuropea](https://abacus.universidadeuropea.com/entities/publication/bcbb5e4e-3d3f-4026-908a-617f9a667772/full); amateurs [Frontiers](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1530162/text); [Outside](https://www.outsideonline.com/health/training-performance/fatigue-resistance-research/)
- Warming-up: 10 km sprints [jhse](https://www.jhse.ua.es/article/view/2020-v15-n2-maximal-sprints-warm-up-affect-pacing-performance-cy); 1 km [lida](https://lida.sport-iat.de/ta/Record/4064879); 4 km priming [Loughborough](https://repository.lboro.ac.uk/articles/Improvement_of_oxygen-uptake_kinetics_and_cycling_performance_with_combined_prior_exercise_and_fast_start/9622013/files/17269775.pdf)
- Voeding: Jeukendrup (2014) [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4008807/); spoeling meta-analyse [lida](https://lida.sport-iat.de/ta/Record/4054040?lng=en); Carter e.a. [Birmingham](https://research.birmingham.ac.uk/en/publications/the-effect-of-carbohydrate-mouth-rinse-on-1-h-cycle-time-trial-pe/)
- Intensiteitsverdeling: [PMC 2023](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10641476/); [PMC 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428)
- Ontkoppeling: [TrainingPeaks](https://www.trainingpeaks.com/learn/articles/aerobic-endurance-and-decoupling/)
- Herhalingen: Villerius & Grappe [Thieme](https://www.thieme-connect.com/products/all/doi/10.1055/s-2006-924209); Chorley & Lamb (2023) [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9933020/); [IES 2015](https://content.iospress.com/articles/isokinetics-and-exercise-science/ies584)
- RPE: sRPE bij wielrenners [lida](https://lida.sport-iat.de/ta/Record/4043446); lactaat/RPE [Thieme](https://www.thieme-connect.com/products/ejournals/pdf/10.1055/s-2007-1021141.pdf); LSCT [lida](https://lida.sport-iat.de/ta/Record/4034999)
- Feedback: Carpentier & Mageau [SDT](https://selfdeterminationtheory.org/wp-content/uploads/2016/11/2016_Carpentier_Mageau_JofSportExePsych.pdf); [2014](https://selfdeterminationtheory.org/wp-content/uploads/2015/05/2014_CarpentierMageau_PSAE.pdf); interventie [SDT 2015](https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2015_LangdonHarrisBurdetteRothberger_Development.pdf)
