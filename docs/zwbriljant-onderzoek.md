# ZWBriljant: onderzoek, model en ijkwaarden

Onderzoek voor ZWBriljant (2026-10-21): welke factoren in één score horen, hoe ze
worden gewogen en waar de ijkwaarden vandaan komen. Gezocht in PubMed en
Consensus. De code staat in `src/lib/briljant/` (`norms.ts` voor de klassen,
ijkwaarden en gewichten, `score.ts` voor de berekening, `view.ts` voor wat de
pagina toont); de steen zelf in `src/components/briljant/`.

Het model is op 2026-10-21 een paar keer bijgestuurd door de eigenaar: zeven
facetten (eerst "graten"), een gewogen score en consistentie ten opzichte van
jezelf; virtuele niveaus in plaats van echte bergketens, zonder meters; punten in
plaats van decimalen (**100 punten per niveau, zonder plafond**); de gewichten
naar de literatuur; en tot slot geen berg maar één ruwe edelsteen met de
klassen van vELO. Tot die laatste stap heette het onderdeel de ZWBeter-berg.

## De score

**Punten, 100 per niveau, zonder plafond.** Een hoger getal dat in kleine stappen
groeit motiveert meer dan decimalen (eigenaar, 2026-10-21). Intern rekent de code
met het niveau als getal (4,27; `points()` maakt er 427 van); zo staat het ook in
`zwbriljant_snapshots.score`.

**Score = profielscore × (0,8 + 0,2 × consistentie).** De profielscore is het
gewogen gemiddelde van de zeven facetten; consistentie telt als factor tot 20%
(eigenaar, 2026-10-21). Volledig consistent houdt de volle profielscore, bij 55%
blijft 91% over. Zonder ritgegevens is de factor 1: ontbrekende gegevens kosten
niets. Een factor en geen achtste facet, omdat consistentie tegen je eigen norm
wordt gemeten: als facet zou trouw trainen op een laag niveau Robijn-punten
opleveren.

**De klassen van vELO.** Namen, volgorde en kleuren zijn die van de tien
vELO-klassen van ZwiftRacing.app (reference/categories, met de login van de
eigenaar gelezen op 2026-10-21); de grenzen zijn van ZWB: 100 punten per klasse,
op de ijkwaarden hieronder (eigenaar, 2026-10-21). vELO zelf deelt in naar
rating (Copper 0–650 tot Diamond 2200+, met een eigen ladder voor vrouwen); die
grenzen nemen we niet over, want vELO verdeelt renners over even grote groepen en
onze klassen hangen aan wattages en records. Wel overgenomen: dezelfde namen voor
vrouwen bij andere waarden. Racen (ZRS) is een rechte lijn en hangt bewust niet
aan een groep, al toont het facet wel de kleur van zijn klasse.

| Punten | Klasse | Kleur | Drempel (man) | Drempel (vrouw) |
|---|---|---|---|---|
| 0–99 | Koper | #f19269 | onder 2,15 W/kg | onder 1,85 W/kg |
| 100 | Brons | #754514 | 2,15 W/kg | 1,85 W/kg |
| 200 | Zilver | #8e8e8e | 2,6 W/kg | 2,25 W/kg |
| 300 | Goud | #d9b24e | 3,05 W/kg | 2,6 W/kg |
| 400 | Platina | #d8dfdf | 3,45 W/kg | 3,0 W/kg |
| 500 | Amethist | #9966cc | 3,9 W/kg | 3,4 W/kg |
| 600 | Saffier | #0f52ba | 4,35 W/kg | 3,8 W/kg |
| 700 | Smaragd | #009473 | 4,75 W/kg | 4,15 W/kg |
| 800 | Robijn | #9b111e | 5,2 W/kg | 4,55 W/kg |
| 900 | Diamant | #82d5f7 | 5,6 W/kg | 4,95 W/kg |

Voorbij 900 telt de score met dezelfde stap door (1.000, …). **Diamant** is sinds
2026-10-21 zwaar maar haalbaar: 3 standaarddeviaties boven het gemiddelde, ongeveer de
beste 1 op 1000 (eigenaar: "Diamant zou haalbaar moeten zijn, maar dit blijft dan
oneindig doorlopen"). De records liggen daar ver boven, de recordsteen op 1136 punten
(mannen) en 1131 (vrouwen). Eerst waren Robijn de WorldTour-winnaars en Diamant de
records (drempel 6,4 en 7,1 W/kg), zodat alleen een perfecte renner Diamant haalde. Punten worden
afgekapt, niet afgerond: 499,9 is nog 499, en 500 verschijnt pas bij de volgende
klasse. Eerder heetten de niveaus Starter tot Wereldtop en Aliens.

**De steen.** Eén ruwe edelsteen uit één stuk (eigenaar: "1 grote edelsteen en
niet allerlei pieken"). De zeven facetten duwen de steen samen in hun eigen
richting naar buiten, een sterk facet verder dan een zwak; het omhulsel eromheen
is de steen. Hoogte en grootte zijn de score, dus consistentie maakt hem via de
factor kleiner; een gouden draadmodel toont de steen bij volledige consistentie.
Kleur en materiaal volgen de klasse (metaal dof en ondoorzichtig, edelsteen
doorschijnend, diamant fonkelend), de kop de echte kristalvorm van die steen. Hij
staat op een zwarte sokkel in een donkere studio, met de tien klassen als
ijkstenen erachter. Zonder WebGL: een vlakke steen en de facetten als lijst.

**Op het scherm de waarden, de formules op /hulp** (eigenaar). Elk facet toont de
meting als balk van de grens van zijn klasse tot de volgende (racen over de hele
schaal, 0 tot 1000 ZRS, met eronder hoeveel ZRS tot de volgende klasse), met wat er
gemeten is, de periode en hoeveel het meetelt. De omrekening ("400 + (4,3 − 4,0) ÷ (4,6 − 4,0) × 100 = 450") staat
alleen op `/hulp/training#zwbriljant`. Voorbij Diamant loopt de laatste lijn
door; onder de nulwaarde is het 0.

## Zeven facetten

Rond de steen, als doorlopende lijn van kort naar lang vermogen, dan vermoeid,
fitheid en racen, en terug naar sprint:

| Facet | Meting | Gewicht | Waarom | Bronnen |
|---|---|---|---|---|
| Sprint | beste 15 s, W/kg | 7,5% | Beslist alleen sprintfinishes; daalt na twee uur nauwelijks nog. | van Erp 2021 (top 5); Klaris 2024; Pinot & Grappe 2011 |
| Anaeroob | beste minuut, W/kg | 12,5% | Punchers en aanvallen; beslissend in Zwift-races en bij de top 5 van profvrouwen. | Varesco 2025; van Erp & Lamberts 2022 |
| VO2max | beste 5 min, W/kg | 22,5% | De sterkste enkele voorspeller van uitslagen en niveau. | Leo 2022; Mateo-March 2025; Mougin 2026 |
| Drempel | beste 20 min, W/kg | 17,5% | Aerobe basis, tijdrijden en lange klimmen. | Valenzuela 2023; Mateo-March 2025; Quod 2010 |
| Durability | verval op de beste minuut, % per 10 kJ/kg | 15% | Onderscheidt niveaus beter dan vers vermogen, ook bij amateurs, en staat los van FTP en VO2max. | van Erp 2021; Mateo-March 2022, 2025; Barsumyan 2025 (twee studies); Spragg 2024 |
| Fitheid | CTL, TSS/dag | 10% | Goede trend, zwakke voorspeller, en zit al in het vermogen. | Marchal 2025; Sanders 2017; Vermeire 2019; Gallo 2022 |
| Racen | Zwift Racing Score | 15% | Wat vermogen niet verklaart: tactiek, positie, wedstrijddynamiek. | Westmattelmann 2022; Phillips 2020 |

**Gewichten naar de literatuur** (eigenaar, 2026-10-21, na een ronde PubMed en
Consensus). Geen studie geeft kant-en-klare gewichten; dit is de vertaling van hoe
sterk elk onderdeel uitslagen en niveau voorspelt:

- **Vermogen samen 60%**, niet gelijk verdeeld. Het vermogensprofiel voorspelde
  klassement en UCI-punten met R² 0,90–0,99 (Leo 2021, Tour of the Alps), en in
  virtuele races verklaart relatief vermogen 77–99% van de uitslag
  (Westmattelmann 2022). Binnen het profiel weegt 5 minuten het zwaarst: bij U23
  voorspelde 5-min-vermogen het podium het best (Leo 2022; ook de basis van de
  Compound Score waarmee vELO nieuwe renners indeelt), de top 5 van de Monumenten
  verschilt op 5, 10 en 20 minuten en niet op korte duren (Mateo-March 2025), en
  VO2max verklaart 65–76% van het prestatieniveau van recreant tot wereldklasse
  (Mougin 2026). Drempel en omslagpunten verklaren samen 92% van een tijdrit
  (Valenzuela 2023). Korte duren hangen af van het type race: onder de minuut
  beslist sprintfinishes (van Erp 2021, top 5 WorldTour), vermogen tot een minuut
  besliste wie doorging op het Zwift-WK (Varesco 2025, +15%) en de top 5 bij
  profvrouwen (van Erp & Lamberts 2022). Daarom de minuut boven de sprint.
- **Durability 15%** (was 20%). Het bewijs is sterk, maar Zwift-races duren meestal
  30–60 minuten, waar voorafgaand werk minder vaak beslist dan in lange buitenritten.
- **Racen 15%.** Vermogen verklaart niet alles: het restant ("performance-result
  gap", Westmattelmann 2022) zit in tactiek, positie en wedstrijddynamiek
  (Phillips 2020). Over de ZRS zelf bestaat geen literatuur.
- **Fitheid 10%** (was 15%). Trainingsbelasting hangt samen met verandering in
  fitheid (Sanders 2017, r = 0,54–0,81), maar bij recreanten is er geen lineair
  verband met vooruitgang (Vermeire 2019) en bij profs alleen een klein verband
  (Gallo 2022). CTL is een input die al in de vermogenswaarden zit; trouw trainen
  wordt verder beloond via de consistentiefactor.

Eerst (tot deze ronde) telde elke duur 12,5% (vermogen 50%), durability 20% en
fitheid en racen elk 15%. Ontbreekt een facet, dan gaan de gewichten van de
aanwezige facetten samen weer naar 100%. Met minder dan twee facetten is er geen score.

**Vorm is profiel.** Een sprinter krijgt een steen die aan de sprintkant uitpuilt,
een diesel een steen die breed is aan de kant van drempel, durability en fitheid.
(De lengteregel van de berg, `ridgeReach`, en de voetbreedte `footWidth` zijn
met de steen vervallen.)

**Rekenvoorbeeld (man), op de schaal met een haalbare Diamant (2026-10-21):**
sprint 13,2 W/kg → 710 punten; anaeroob 7,6 → 693; VO2max 5,1 → 610; drempel 4,3
→ 588; durability 4,2%/10 kJ/kg → 480; CTL 78 → 580; ZRS 640 → 640. Profielscore
**606 punten**: Saffier, nog 94 tot Smaragd; met consistentie 55% 552. (Met Robijn en
Diamant als prowaarden was dit 593; op de oude, gelijk verdeelde vermogensschaal 480.)
Staat als test in `tests/unit/briljant-score.test.ts` en `briljant-view.test.ts`.

## Consistentie, altijd ten opzichte van jezelf

Geen absolute uren: die zitten al in Fitheid, en dan zou veel rijden dubbel
tellen. Het past bij de regel dat beschikbaarheid geen belastbaarheid is.

- **Regelmaat R**: het aandeel van de laatste twaalf afgesloten weken waarin je
  minstens 60% van je eigen norm haalde. **Sinds 2026-10-21 in TSS** als intervals.icu
  de trainingsbelasting geeft (de dagbelasting uit de wellness, `ctl_load`), anders
  in uren (eigenaar: belasting zegt meer dan alleen duur). Norm, **per week**: wat het
  schema die week plande (in TSS geschat als uren × IF² × 100, met een IF per soort
  training: herstel 0,55, duur 0,68, tempo 0,78, drempel 0,85, VO2max 0,82, anaeroob
  0,78, wedstrijd 0,9; het schema kent zelf geen TSS); een week zonder schema krijgt
  je eigen mediaan over het afgelopen jaar. Meer dan de norm telt als gehaald, nooit als
  straf. Een week die er nog niet was (nieuw lid) telt als niet gereden.
  *Eerst was de norm de beschikbaarheid van de huidige week, voor alle weken. Dat
  is een plafond voor het plannen, geen doel: de eigenaar volgde sinds 31 augustus
  zijn schema (4,3 tot 7,7 uur per week) maar haalde tegen 11 uur beschikbaarheid
  (60% = 6,6 uur) maar 4 van 12 weken en geen reeks. Tegen zijn schema zijn het 10
  van 12 weken en een reeks van 7 (2026-10-21).*
- **Volhouden V** = 1 − e^(−weken/12), met weken de huidige ononderbroken reeks.
- **Naleving N**: het deel van de geplande trainingsminuten dat gedaan is, over
  twaalf weken; alleen met een schema, anders valt N weg.
- **Consistentie** = R × (0,5 + 0,5 · V) × N, van 0 tot 1. Voorbeeld van de
  eigenaar: R 0,83, V 0,81, N 0,85 → 0,64.
- **Geplande herstelweek**: een week waarin het schema minder dan 75% van de week
  ervoor plant (de bovengrens van "grofweg 60–70%" uit `schema-check.ts`). Die
  telt als gehaald en breekt de reeks niet. Een week ziek of niets breekt hem wel.
  *Kanttekening:* het voorbeeld van de eigenaar (R 0,83 met een reeks van twintig
  weken) kan zo niet tegelijk voorkomen, want twee gemiste weken in het venster
  breken de reeks. Gekozen is om een herstelweek nooit als gemist te tellen; wie
  het schema volgt, verliest daar niets aan.
- Onderbouwing: Raysmith & Drew 2016 (wie meer dan 80% van de geplande
  trainingsweken afmaakte, haalde ongeveer zeven keer zo vaak zijn doel);
  Foster 1998.
- **Telt mee als factor**: score = profielscore × (0,8 + 0,2 × consistentie),
  en daarmee de grootte van de steen. Op het scherm staat consistentie als
  percentage bij de sokkel. (Op de berg was het de breedte van de voet.)

## Bewust niet als facet

- **HRV en readiness**: HRV-gestuurd trainen geeft hooguit een klein voordeel op
  prestaties (Düking 2021; Manresa-Rocamora 2021; Granero-Gallegos 2020). Het
  hoort bij het weer van de dag, alleen voor het lid zelf.
- **Vorm (TSB) en vermoeidheid (ATL)**: schommelen per dag en voorspellen slecht;
  het weer van de dag, niet de score (nog niet op de pagina).
- **Herhaalbaarheid** (herhaalde inspanningen boven 95% van het maximum):
  onderscheidde WorldTour en ProTeam niet (Mateo-March 2021).
- **vELO als meting**: de koppeling met ZwiftRacing.app is nog nooit tegen de
  echte API getest. Racen draagt voorlopig alleen ZRS; van vELO gebruiken we alleen
  de namen en kleuren van de klassen.
- **Echte bergketens en meters** (de eerste versie, Heuvelland tot Himalaya):
  vervangen door virtuele niveaus, omdat een norm per niveau duidelijker zegt waar
  een renner staat dan de hoogte van een echte berg.
- **De berg zelf**: vervangen door de edelsteen (eigenaar, 2026-10-21). Ook een
  kristalgroep met een kristal per facet is geprobeerd en afgewezen: het moest één
  steen zijn.

## De ijkwaarden

Alle ijkwaarden zijn **inschattingen van ZWB**, gegrond op de bronnen hieronder.
Geen studie koppelt vermogen aan klassen; de koppeling is van ons. Wat de
bronnen wel geven, staat per rij.

**Vermogen naar de spreiding (sinds 2026-10-21, eigenaar).** Eerst liepen de
klassen in gelijke stappen van ongetraind naar wereldklasse; dan lag het
clubgemiddelde laag op de schaal en stonden sterke amateurs al bij de profs. Nu volgen
Brons tot Smaragd de spreiding onder Zwift-renners, net als fitheid:

- **Bron:** de vermogensverdeling van Zwift-renners per duur, geslacht en leeftijd
  (onderste 10%, gemiddelde, bovenste 10%; [Zwift Insider](https://zwiftinsider.com/?p=136905)).
  We nemen de leeftijd 30 tot 49 jaar (de kern van ZWB) en tellen er 5% bij: Zwift
  meet de beste waarde uit Zwift-ritten, wie ook buiten rijdt haalt zijn beste
  curve daar niet altijd.
- **Spreiding:** de afstand van het gemiddelde tot de grens van 10% gedeeld door 1,28
  (normale verdeling) is één standaarddeviatie (SD).
- **Klassen:** Goud is het gemiddelde, Brons 1 SD eronder, daartussen en daarboven
  stappen van een halve SD tot Diamant (3 SD erboven, ongeveer de beste 1 op 1000);
  Smaragd is 2 SD (ongeveer de beste 2%), Robijn 2,5. Daarboven loopt de schaal met
  dezelfde stap door. Koper (0) is een ondergrens voor wie net begint.
- **15 seconden** staat niet in de bron: 5 seconden × 0,83.
- De clubgegevens (12 vermogensprofielen, 60 zFTP-waarden uit de ZRL: gemiddeld 3,56
  W/kg, SD 0,59) waren te dun om de schaal zelf op te bouwen, maar liggen in lijn.

**Vermogen, mannen (W/kg)**

| Duur | 0 | 1 Brons | 2 | 3 Goud | 4 | 5 | 6 | 7 Smaragd | 8 Robijn | 9 Diamant |
|---|---|---|---|---|---|---|---|---|---|---|
| 15 s | 1,1 | 4,05 | 5,55 | 7,05 | 8,55 | 10,05 | 11,55 | 13,05 | 14,55 | 16,05 |
| 1 min | 1,7 | 3,2 | 3,9 | 4,65 | 5,4 | 6,15 | 6,9 | 7,65 | 8,4 | 9,15 |
| 5 min | 1,5 | 2,5 | 3 | 3,5 | 4 | 4,55 | 5,05 | 5,55 | 6,05 | 6,55 |
| 20 min | 1,3 | 2,15 | 2,6 | 3,05 | 3,45 | 3,9 | 4,35 | 4,75 | 5,2 | 5,6 |

**Vermogen, vrouwen (W/kg)**: uit dezelfde bron voor vrouwen, niet meer als vast
percentage van de mannen.

| Duur | 0 | 1 Brons | 2 | 3 Goud | 4 | 5 | 6 | 7 Smaragd | 8 Robijn | 9 Diamant |
|---|---|---|---|---|---|---|---|---|---|---|
| 15 s | 0,95 | 3,1 | 4,15 | 5,25 | 6,3 | 7,35 | 8,45 | 9,5 | 10,55 | 11,6 |
| 1 min | 1,45 | 2,6 | 3,2 | 3,8 | 4,35 | 4,95 | 5,55 | 6,1 | 6,7 | 7,25 |
| 5 min | 1,2 | 2,1 | 2,55 | 3 | 3,45 | 3,9 | 4,3 | 4,75 | 5,2 | 5,65 |
| 20 min | 1,05 | 1,85 | 2,25 | 2,6 | 3 | 3,4 | 3,8 | 4,15 | 4,55 | 4,95 |

Zonder opgegeven geslacht rekent ZWBriljant met de waarden voor mannen.

**De records** (gepubliceerde schattingen; profs publiceren hun gegevens zelden, dus
officiële records bestaan niet). Eerst waren dit de ijkwaarden van Diamant; sinds
2026-10-21 liggen ze ver boven Diamant en vormen ze de recordsteen in de zaal (mannen
1136, vrouwen 1131 punten; vrouwen: 15,6, 9,2, 6,4 en 6,05 W/kg); de houder staat erbij waar die bekend is (drempel en VO2max:
Pogačar). Bij sprint en anaeroob is de waarde een afronding naar boven zonder één houder
(de hoogst gepubliceerde minuut is Campenaerts' 10,1 W/kg), en durability, fitheid en
racen hebben geen houder.
- Drempel: ongeveer 6,85 tot 7,0 W/kg over ongeveer 40 minuten (Pogačar, Plateau de
  Beille, Tour 2024; Berg in *Journal of Science and Cycling*, via
  [BikeRadar](https://www.bikeradar.com/news/tadej-pogacar-v02-max-study) en
  [Lanterne Rouge](https://lanternerouge.com/2024/07/14/greatest-climbing-performances-of-all-time-on-plateau-de-beille-tour-de-france-2024-stage-15/)).
  Over 20 minuten ligt dat iets hoger: 7,1.
- VO2max: 7,2 W/kg over 5 minuten binnen een rit van vier uur (Pogačar, Tour 2020;
  [Stages](https://stagescycling.com/us/news/stages-power-and-stages-dash-in-the-2020-tour-de-france/)).
  Fris ligt hoger; 7,6.
- Sprint: 17 tot 19 W/kg om een Tourspurt te winnen; piekvermogen in profsprints
  17,4 ± 1,7 W/kg ([Murdoch University](https://researchportal.murdoch.edu.au/esploro/outputs/journalArticle/Sprinting-for-the-win-Distribution-of/991005543935407891)). 19,5.
- Anaeroob: 10,1 W/kg over een minuut (Campenaerts, Ronde van Vlaanderen 2022;
  [Velo](https://velo.outsideonline.com/2022/04/big-numbers-mathieu-van-der-poels-strava-file-with-power/?scope=anon)).
  De beste punchers zitten hoger; 11,2.

Houvast voor Robijn: U23-elite in grote rittenkoersen rijden gemiddeld 5,5 W/kg over
20 minuten (Mateo-March 2026); critical power van profs ligt rond 5,3 tot 5,6 W/kg
(Spragg 2022, 2024). Vrouwen: de normen van vrouwelijke profs (Mateo-March 2022: 1 min
8,4 en 60 min 4,2 W/kg).

**Schaalversie.** Snapshots dragen de versie van de schaal (`provenance.scale`, nu
`2026-10-21-sd`). Historie, het ZWB-gemiddelde, de tegel en de wekelijkse job lezen
alleen snapshots van de huidige versie; bij een nieuwe versie maakt de job de
terugblik opnieuw, zodat oude en nieuwe punten nooit door elkaar staan.

**Durability (verval in % per 10 kJ/kg, op de beste minuut)**

Sinds 2026-10-21 op de beste minuut in plaats van de beste 20 (of 5) minuten
(eigenaar): een volle 20 minuten rijd je na veel werk bijna nooit, dus die
vermoeide curve zei vooral dat je aan het eind niet voluit reed, niet dat je
inzakte. Een minuut rijd je na veel werk wel vaak, in races en op klimmetjes. Bij
de eigenaar (83 kg) ging het van 9,3% (20 minuten: 282 naar 212 W na 2000 kJ) naar
5,9% per 10 kJ/kg (de minuut: 481 naar 399 W), van 207 naar ongeveer 355 punten. De
ijkwaarden hieronder bleven; ze komen uit het verval van het hele vermogensprofiel
en zijn voor de minuut dus een inschatting.

| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 (ProTeam) | 9 (Diamant, WorldTour) |
|---|---|---|---|---|---|---|---|---|---|
| 18 | 12,5 | 9,5 | 7 | 5 | 4 | 3,2 | 2,6 | 2,2 | 1,5 |

Sinds 2026-10-21 is Diamant het verval van de WorldTour en Robijn dat van ProTeam,
zodat Diamant haalbaar is; daarboven loopt de schaal door tot geen verval (ongeveer
1100). Eerst: 12,5, 9,5, 7, 5, 3,6, 2,6, 1,8, 1,2 en 0,7.

Houvast: na 45 kJ/kg verliezen WorldTour-renners 4,7 tot 8,8% en ProTeam-renners
7,6 tot 11,6% (Mateo-March 2022), ongeveer 1,5 en 2,2% per 10 kJ/kg. Succesvolle
amateurs verliezen 6,5% en minder succesvolle 12,5% op 20 minuten na 1000 kJ
(Barsumyan 2025), bij 75 kg ongeveer 5 en 9,6% per 10 kJ/kg. Pas vanaf 10 kJ/kg
voorafgaand werk telt een curve mee (daaronder is het verval klein, Mateo-March
2025). De drempels voor de curves stelt elk lid zelf in intervals.icu in.
Beperkingen: alleen de hoeveelheid werk telt, niet hoe zwaar het was, terwijl werk
boven CP meer kost (Spragg 2024; Mateo-March 2024). En intervals.icu geeft vermoeide
curves alleen voor de twee drempels die het lid zelf instelt (bij de eigenaar 2000 en
3000 kJ); een curve na 1000 kJ, zoals de eigenaar wil, kan niet per verzoek
([forum](https://forum.intervals.icu/t/calulate-power-best-after-2000kj/2045)).

**Fitheid (CTL, TSS/dag)**: 0, 30, 40, 50, 60, 70, 80, 90, 100, 110 (Diamant), en
daarboven elke 10 CTL 100 punten (de WorldTour, 150, is 1300). Tot 2026-10-21 waren
Robijn 120 en Diamant 150; zie hieronder.
Verdeeld naar de spreiding onder amateurs (eigenaar, 2026-10-21: "100 is voor een
amateur zeer hoog en 150/160 voor niet prof onhaalbaar, maar mag wel een betere
waardering krijgen"). Aanname van ZWB, nog zonder clubgegevens: amateurs die
gestructureerd trainen zitten rond CTL 50 met een spreiding van ongeveer 20. Brons
tot Smaragd liggen een halve standaarddeviatie (10) uit elkaar, van gemiddeld min
één (30) tot plus twee (90); Robijn (120) is de top van de amateurs en de lagere
profs, Diamant (150) de WorldTour in het seizoen. Na een grote ronde (170 tot 180;
[Fast Talk Labs](https://fasttalklabs.com/training/chronic-training-load-ctl-isnt-everything))
kom je voorbij 900. Eerst: 15, 30, 45, 65, 85, 105, 125, 150, 180 in bijna gelijke
stappen naar de profs; daardoor was 100 maar Saffier (580) en scoorde een
amateur met veel volume te laag. Let op: CTL meet hoeveel je traint ten opzichte van
je eigen FTP, niet hoe sterk je bent. Zodra er genoeg snapshots zijn, de verdeling
nalopen tegen de club.

**Racen (Zwift Racing Score, 0–1000)**: een rechte lijn, elke ZRS is een punt:
Diamant vanaf 900 ZRS, 1000 ZRS is 1000 punten (sinds 2026-10-21; eerst was 1000 ZRS
precies Diamant). Bewust niet gekoppeld
aan Zwift's categorieën: een score is geen groep (eigenaar, 2026-10-21). Scores
boven 900 komen voor; 1000 is nog door niemand gehaald
([Zwift-forum](https://forums.zwift.com/t/zwift-racing-score-october-2024/636179?page=51)).
Omdat ZRS bij 1000 ophoudt, komt dit facet nooit boven 1000 punten.

## Aliens (2026-10-21, niet gebouwd)

*Uitkomst: de eigenaar liet de Aliens daarna toch weg en koos voor de recordsteen: één
steen met elk onderdeel op de recordwaarde, met de naam van de houder waar die bekend is
(`src/lib/briljant/records.ts`; houders: Pogačar bij drempel en VO2max, zie "De
records"). Sinds Diamant haalbaar is, ligt die steen ver boven 900. Het onderzoek hieronder blijft staan, zodat het niet
opnieuw hoeft.*

Profs met een steen in de zaal, op verzoek van de eigenaar uit Pogačar, Seixas, Del Toro,
Vingegaard, Evenepoel, Van Aert en Van der Poel. Eerst alleen gemeten data (hun eigen
Strava- of TrainingPeaks-bestand); daarna mochten ook breed geaccepteerde berekeningen
mee, ter inspiratie: de power-analyses van Velo en Cyclingnews en peer-reviewed onderzoek.
Niet gebruikt: profielsites met modelwaarden (Watts2Win, Cyclists Hub) en coachingsites.

**Regel.** Een onderdeel (15 s, 1, 5, 20 min) telt alleen met een inspanning die hooguit
15% korter is dan die duur, of hooguit twee keer zo lang: een langere inspanning is een
ondergrens voor de kortere, maar een veel langere zegt te weinig. Minder dan vier
onderdelen: de renner doet niet mee. Durability, fitheid en racen hebben voor profs geen
gepubliceerde waarden en blijven leeg.

| Renner | Onderdelen | Uitkomst |
|---|---|---|
| Van der Poel | 15 s 1137 W, 1 min 727 W, 5 min 502 W (Ronde van Vlaanderen 2022, zijn Strava-bestand, 75 kg; [road.cc](https://road.cc/content/news/mathieu-van-der-poel-uploads-tour-flanders-win-strava-291643)); 20 min 378 W, 5,17 W/kg (Amstel Gold Race 2019, zijn Strava-bestand; [Cycling Weekly](https://www.cyclingweekly.com/news/racing/mathieu-van-der-poel-shares-incredible-data-amstel-gold-race-strava-421180)) | 4 gemeten: doet mee, 758 (Smaragd) |
| Pogačar | 15 s: sprint Jebel Jais, ~800 W, 12,3 W/kg over 20 s (UAE Tour 2025); 5 min: 5:31 op 490 W, 7,5 W/kg (Jebel Hafeet, UAE Tour 2025; beide [Velo](https://velo.outsideonline.com/road/power-analysis-pogacar-dominates-uae-tour/)); 1 min: 1:13 op ~640 W, 9,8 W/kg (Oude Kwaremont, Vlaanderen 2026; [Velo](https://velo.outsideonline.com/road/road-racing/tour-of-flanders-power-analysis-2026)); 20 min: 38:38 op 453 W, 6,9 W/kg (Plateau de Beille 2024; Berg 2025, *Journal of Science and Cycling*, via [Velo](https://velo.outsideonline.com/road/road-racing/pogacar-data-tour-de-france/)) | 4 schattingen: doet mee, 829 (Robijn). Zijn eigen bestanden zijn sinds 2019 privé; de Strava-rit van februari 2026 was een duurrit. |
| Van Aert | 1 min 852 W en 5 min 551 W (Giro 2025, zijn TrainingPeaks); 15 s: 13 s op 1215 W (Tirreno 2021, Velon) | 3: geen 20 minuten binnen de regel (zijn beste uur, 428 W, is te lang). Doet niet mee. |
| Del Toro | 1 min: 69 s, 9,6 W/kg; 20 min: 22:31, 6,6 W/kg (Jebel Hafeet); 5 min: meer dan 7,5 W/kg (Finestre, Giro 2025; alle Velo) | 3: geen sprint. Doet niet mee. |
| Vingegaard | 20 min: 22:56, ongeveer 6,9 W/kg (Marie Blanque 2023, Velo); 5 min: 7:30 op 420 W (Pila, Giro 2026, Velon) | 2. Doet niet mee. |
| Seixas | 20 min: 23 min op 375 W, 6,1 W/kg (Lombardia 2026, Velo) | 1 (andere inspanningen te kort of te lang). Doet niet mee. |
| Evenepoel | Drempel 425 W (lactaattest, eigen video), 38 min op 392 W (Algarve 2022) | 0 binnen de regel. Doet niet mee. |

**Diamant.** Op de schaal van toen (Diamant waren de records) kwamen de Aliens niet in
Diamant: hun bekende inspanningen zijn niet hun beste ooit (Van der Poels 20 minuten komen
uit een koers van 2019), en Pogačars sprintschatting lag onder de Smaragd-grens van toen.

## Bronnen

- Barsumyan A et al. (2025). Durability as an independent parameter of endurance performance in cycling. *BMC Sports Sci Med Rehabil*. [doi:10.1186/s13102-025-01238-8](https://doi.org/10.1186/s13102-025-01238-8)
- Barsumyan A et al. (2025). Enhanced durability predicts success in amateur road cycling. *Front Sports Act Living*. [doi:10.3389/fspor.2025.1530162](https://doi.org/10.3389/fspor.2025.1530162)
- Borresen J, Lambert MI (2009). The quantification of training load, the training response and the effect on performance. *Sports Med*. [doi:10.2165/11317780-000000000-00000](https://doi.org/10.2165/11317780-000000000-00000)
- Busso T et al. (2023). Validity and accuracy of impulse-response models for modeling and predicting training effects on performance of swimmers. *Med Sci Sports Exerc*. [doi:10.1249/mss.0000000000003139](https://doi.org/10.1249/mss.0000000000003139)
- Drew MK, Finch CF (2016). The relationship between training load and injury, illness and soreness. *Sports Med*. [doi:10.1007/s40279-015-0459-8](https://doi.org/10.1007/s40279-015-0459-8)
- Düking P et al. (2021). Monitoring and adapting endurance training on the basis of heart rate variability monitored by wearable technologies. *J Sci Med Sport* (via PubMed). [doi:10.1016/j.jsams.2021.04.012](https://doi.org/10.1016/j.jsams.2021.04.012)
- Ferguson HA et al. (2023). Power-duration relationship comparison in competition sprint cyclists from 1-s to 20-min. *PLOS ONE*. [doi:10.1371/journal.pone.0280658](https://doi.org/10.1371/journal.pone.0280658)
- Foster C (1998). Monitoring training in athletes with reference to overtraining syndrome. *Med Sci Sports Exerc*. [doi:10.1097/00005768-199807000-00023](https://doi.org/10.1097/00005768-199807000-00023)
- Gallo G et al. (2022). Relationships between training dose and record power outputs in professional road cyclists. *Biol Sport*. [doi:10.5114/biolsport.2023.114284](https://doi.org/10.5114/biolsport.2023.114284)
- Granero-Gallegos A et al. (2020). HRV-based training for improving VO2max in endurance athletes. *Int J Environ Res Public Health* (via PubMed). [doi:10.3390/ijerph17217999](https://doi.org/10.3390/ijerph17217999)
- Klaris MB et al. (2024). Performance and fatigue patterns in elite cyclists during 6 h of simulated road racing. *Scand J Med Sci Sports* (via PubMed). [doi:10.1111/sms.14699](https://doi.org/10.1111/sms.14699)
- Leo P et al. (2021). Power profiling, workload characteristics, and race performance of U23 and professional cyclists during the multistage race Tour of the Alps. *Int J Sports Physiol Perform* (via PubMed). [doi:10.1123/ijspp.2020-0381](https://doi.org/10.1123/ijspp.2020-0381)
- Leo P et al. (2022). Predictors of cycling performance success: traditional approaches and a novel method to assess performance capacity in U23 road cyclists. *J Sci Med Sport* (via PubMed). [doi:10.1016/j.jsams.2022.11.005](https://doi.org/10.1016/j.jsams.2022.11.005)
- Leo P et al. (2021). Power profiling and the power-duration relationship in cycling: a narrative review. *Eur J Appl Physiol*. [doi:10.1007/s00421-021-04833-y](https://doi.org/10.1007/s00421-021-04833-y)
- Manresa-Rocamora A et al. (2021). Heart rate variability-guided training for enhancing cardiac-vagal modulation, aerobic fitness, and endurance performance. *Int J Environ Res Public Health* (via PubMed). [doi:10.3390/ijerph181910299](https://doi.org/10.3390/ijerph181910299)
- Marchal A et al. (2025). Statistical flaws of the fitness-fatigue sports performance prediction model. *Sci Rep*. [doi:10.1038/s41598-025-88153-7](https://doi.org/10.1038/s41598-025-88153-7)
- Mateo-March M et al. (2021). Durability and repeatability of professional cyclists during a Grand Tour. *Eur J Sport Sci*. [doi:10.1080/17461391.2021.1987528](https://doi.org/10.1080/17461391.2021.1987528)
- Mateo-March M et al. (2022). The record power profile of male professional cyclists: fatigue matters. *Int J Sports Physiol Perform*. [doi:10.1123/ijspp.2021-0403](https://doi.org/10.1123/ijspp.2021-0403)
- Mateo-March M et al. (2022). The record power profile in professional female cyclists: normative values. *Int J Sports Physiol Perform*. [doi:10.1123/ijspp.2021-0372](https://doi.org/10.1123/ijspp.2021-0372)
- Mateo-March M et al. (2024). Is all work the same? Performance after accumulated work of differing intensities. *J Sci Med Sport*. [doi:10.1016/j.jsams.2024.03.005](https://doi.org/10.1016/j.jsams.2024.03.005)
- Mateo-March M et al. (2025). Reliability of the durability concept in professional cyclists. *Int J Sports Med*. [doi:10.1055/a-2555-8961](https://doi.org/10.1055/a-2555-8961)
- Mateo-March M et al. (2026). The record power profile of male under-23 cyclists: normative values and fatigue effects. *Scand J Med Sci Sports*. [doi:10.1111/sms.70278](https://doi.org/10.1111/sms.70278)
- Mateo-March M et al. (2025). Decoding victory in cycling's grand monuments: a performance analysis of top-5 versus top-6–30 finishers. *Scand J Med Sci Sports*. [doi:10.1111/sms.70057](https://doi.org/10.1111/sms.70057)
- Mougin L et al. (2026). 35 years of Joyner's endurance performance model: assessing the contribution of physiological determinants in 888 individuals. *Sports Med*. [doi:10.1007/s40279-026-02439-y](https://doi.org/10.1007/s40279-026-02439-y)
- Muriel X et al. (2023). Is the record power profile repeatable? *J Strength Cond Res*. [doi:10.1519/jsc.0000000000004419](https://doi.org/10.1519/jsc.0000000000004419)
- Phillips KE et al. (2020). Determinants of cycling performance: a review of the dimensions and features regulating performance in elite cycling competitions. *Sports Med Open*. [doi:10.1186/s40798-020-00252-z](https://doi.org/10.1186/s40798-020-00252-z)
- Pinot J, Grappe F (2011). The record power profile to assess performance in elite cyclists. *Int J Sports Med*. [doi:10.1055/s-0031-1279773](https://doi.org/10.1055/s-0031-1279773)
- Quod MJ et al. (2010). The power profile predicts road cycling MMP. *Int J Sports Med*. [doi:10.1055/s-0030-1247528](https://doi.org/10.1055/s-0030-1247528)
- Raysmith BP, Drew MK (2016). Performance success or failure is influenced by weeks lost to injury and illness in elite Australian track and field athletes. *J Sci Med Sport*.
- Sanders D et al. (2017). Methods of monitoring training load and their relationships to changes in fitness and performance in competitive road cyclists. *Int J Sports Physiol Perform*. [doi:10.1123/ijspp.2016-0454](https://doi.org/10.1123/ijspp.2016-0454)
- Spragg J et al. (2022). The relationship between physiological characteristics and durability in male professional cyclists. *Med Sci Sports Exerc*. [doi:10.1249/mss.0000000000003024](https://doi.org/10.1249/mss.0000000000003024)
- Spragg J et al. (2024). The intensity rather than the quantity of prior work determines the subsequent downward shift in the power duration relationship. *Eur J Sport Sci*. [doi:10.1002/ejsc.12077](https://doi.org/10.1002/ejsc.12077)
- Valenzuela PL et al. (2022). The record power profile of male professional cyclists: normative values. *Int J Sports Physiol Perform*. [doi:10.1123/ijspp.2021-0263](https://doi.org/10.1123/ijspp.2021-0263)
- Valenzuela PL et al. (2023). Laboratory-based determinants of simulated time trial performance in cyclists. *Biol Sport*. [doi:10.5114/biolsport.2023.122484](https://doi.org/10.5114/biolsport.2023.122484)
- van Erp T, Lamberts RP (2022). Performance characteristics of TOP5 versus NOT-TOP5 races in female professional cycling. *Int J Sports Physiol Perform* (via PubMed). [doi:10.1123/ijspp.2021-0488](https://doi.org/10.1123/ijspp.2021-0488)
- van Erp T et al. (2021). Power profile of top 5 results in World Tour cycling races. *Int J Sports Physiol Perform* (via PubMed). [doi:10.1123/ijspp.2021-0081](https://doi.org/10.1123/ijspp.2021-0081)
- van Erp T et al. (2021). Maintaining power output with accumulating levels of work done is a key determinant for success in professional cycling. *Med Sci Sports Exerc*. [doi:10.1249/mss.0000000000002656](https://doi.org/10.1249/mss.0000000000002656)
- Varesco G et al. (2025). Performance analysis in high-level virtual cycling: data from the 2023 Zwift UCI Cycling E-Sports World Championships. *J Sci Cycling*. [doi:10.28985/1425.jsc.10](https://doi.org/10.28985/1425.jsc.10)
- Vermeire KM et al. (2019). Training progression in recreational cyclists: no linear dose-response relationship with training load. *J Strength Cond Res*. [doi:10.1519/jsc.0000000000003340](https://doi.org/10.1519/jsc.0000000000003340)
- Westmattelmann D et al. (2022). The performance-result gap in mixed-reality cycling: evidence from the Virtual Tour de France 2020 on Zwift. *Front Physiol*. [doi:10.3389/fphys.2022.868902](https://doi.org/10.3389/fphys.2022.868902)
- Zwift: Racing Score van 0 tot 1000, Racing Score FAQ ([support.zwift.com](https://support.zwift.com/en_us/racing-score-faq-BkG9_Rqrh)).
