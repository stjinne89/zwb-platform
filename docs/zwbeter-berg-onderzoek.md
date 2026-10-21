# ZWBeter-berg: onderzoek, model en ijkwaarden

Onderzoek voor de ZWBeter-berg (2026-10-21): welke factoren in één score horen,
hoe ze worden gewogen en waar de ijkwaarden vandaan komen. Gezocht in PubMed en
Consensus. De code staat in `src/lib/berg/` (`norms.ts` voor de ijkwaarden en
gewichten, `score.ts` voor de berekening).

Het model is op 2026-10-21 twee keer bijgestuurd door de eigenaar: eerst zeven
graten, een gewogen score en consistentie ten opzichte van jezelf (uit een fork
van de bouwsessie), daarna virtuele niveaus in plaats van echte bergketens en
geen meters meer, en tot slot punten in plaats van decimalen: **100 punten per
niveau, zonder plafond.**

## De score

**Punten, 100 per niveau, zonder plafond**: 455 punten is niveau 4 (Gevorderde),
nog 45 punten tot Sterke amateur. Een hoger getal dat in kleine stappen groeit
motiveert meer dan decimalen (eigenaar, 2026-10-21). Intern rekent de code met
het niveau als getal (4,55; `points()` maakt er 455 van); zo staat het ook in
`zwbeter_berg_snapshots.score`.

| Punten | Niveau | Drempel (man) | Drempel (vrouw) |
|---|---|---|---|
| 100 | Starter | 1,9 W/kg | 1,6 W/kg |
| 200 | Recreant | 2,6 W/kg | 2,2 W/kg |
| 300 | Toerrijder | 3,3 W/kg | 2,8 W/kg |
| 400 | Gevorderde | 4,0 W/kg | 3,4 W/kg |
| 500 | Sterke amateur | 4,6 W/kg | 3,9 W/kg |
| 600 | Elite-amateur | 5,3 W/kg | 4,5 W/kg |
| 700 | Profpeloton | 5,8 W/kg | 4,9 W/kg |
| 800 | Wereldtop | 6,5 W/kg | 5,5 W/kg |

Voorbij 800 telt de score gewoon door (900, 1.000, …). Punten worden afgekapt,
niet afgerond: 499,9 is nog 499, en 500 verschijnt pas bij het volgende niveau.

**De berg.** Eén berg: in het midden de hoofdtop op je score, met zeven graten
die naar buiten lopen. Op elke graat staat een echte, spitse piek die precies tot
de punten van die graat komt; een sterke kant steekt boven de hoofdtop uit, een
zwakke blijft eronder. Achter de berg staan de niveaus als virtuele,
niet-bestaande ijkbergen; hun hoogte is alleen beeld.

**Achter elk getal de meting en de formule.** Elke graat toont de meting met
eenheid en de omrekening, bijvoorbeeld: "Drempel 4,3 W/kg ligt tussen 400 (4,0)
en 500 (4,6): 400 + (4,3 − 4,0) ÷ (4,6 − 4,0) × 100 = 450". Voorbij 800 loopt de
lijn van 700 naar 800 door; onder de nulwaarde is het 0.

## Zeven graten

Rond de berg, als doorlopende lijn van kort naar lang vermogen, dan vermoeid,
fitheid en racen, en terug naar sprint:

| Graat | Meting | Gewicht | Waarom | Bronnen |
|---|---|---|---|---|
| Sprint | beste 15 s, W/kg | 12,5% | Het korte deel van het vermogensprofiel tekent sprinters. | Pinot & Grappe 2011; Valenzuela 2022 |
| Anaeroob | beste minuut, W/kg | 12,5% | Punchers en aanvallen. | idem |
| VO2max | beste 5 min, W/kg | 12,5% | Klimmen en gaten dichtrijden. | Leo 2021; Muriel 2023 |
| Drempel | beste 20 min, W/kg | 12,5% | Tijdrijden en lange klimmen; reproduceerbaar uit veldgegevens. | Leo 2021; Quod 2010 |
| Durability | verval op 20 min, % per 10 kJ/kg | 20% | Onderscheidt niveaus beter dan vers vermogen, ook bij amateurs, en staat los van FTP en VO2max. | van Erp 2021; Mateo-March 2022, 2025; Barsumyan 2025 (twee studies); Spragg 2024 |
| Fitheid | CTL, TSS/dag | 15% | Goede trend, zwakke voorspeller. | Marchal 2025; Busso 2023; Borresen 2009 |
| Racen | Zwift Racing Score | 15% | Het resultaat in de praktijk, wereldwijd vergelijkbaar. | Zwift: categorieën per Racing Score |

**Gewichten** zijn een keuze van ZWB (eigenaar, 2026-10-21): het vermogensprofiel
samen 50% als sterkste voorspeller (Leo 2021; Valenzuela 2023), durability 20%,
fitheid en racen elk 15%. Ontbreekt een graat, dan gaan de gewichten van de
aanwezige graten samen weer naar 100%. Met minder dan twee graten is er geen score.

**Vorm is profiel.** Een sprinter heeft een piek aan de sprintkant die ver boven de
hoofdtop uitsteekt, een diesel hoge pieken bij drempel, durability en fitheid.
(De eerste regel, lengte van een graat = (niveau ÷ score)^1,8, vervalt met de
berg van zeven pieken; `ridgeReach` blijft tot de bouw van de pagina staan.)

**Rekenvoorbeeld (man):** sprint 13,2 W/kg → 4,80; anaeroob 7,6 → 4,25; VO2max
5,1 → 4,43; drempel 4,3 → 4,50; durability 4,2%/10 kJ/kg → 4,57; CTL 78 → 4,65;
ZRS 640 → 4,60. Score 4,55, op het scherm **455 punten**: niveau 4 (Gevorderde),
nog 45 punten tot Sterke amateur. Staat als test in `tests/unit/berg-score.test.ts`.

## Consistentie, altijd ten opzichte van jezelf

Geen absolute uren: die zitten al in Fitheid, en dan zou veel rijden dubbel
tellen. Het past bij de regel dat beschikbaarheid geen belastbaarheid is.

- **Regelmaat R**: het aandeel van de laatste twaalf afgesloten weken waarin je
  minstens 60% van je eigen norm reed. Norm: de beschikbaarheid uit het schema
  (uren per week), zonder schema je eigen mediaan van de weekuren over het
  afgelopen jaar. Meer dan de norm telt als gehaald, nooit als straf. Een week
  die er nog niet was (nieuw lid) telt als niet gereden.
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
- Telt niet mee in de score. Op de berg is het de breedte en stevigheid van de
  voet: voet = 0,6 + 0,4 × consistentie, met afbrokkelende flanken bij een lage
  waarde (niet spitser, want een smalle voet maakt een berg juist indrukwekkend).

## Bewust niet als graat

- **HRV en readiness**: HRV-gestuurd trainen geeft hooguit een klein voordeel op
  prestaties (Düking 2021; Manresa-Rocamora 2021; Granero-Gallegos 2020). Het
  hoort bij het weer van de dag, alleen voor het lid zelf.
- **Vorm (TSB) en vermoeidheid (ATL)**: schommelen per dag en voorspellen slecht;
  het weer op de berg, niet de score.
- **Herhaalbaarheid** (herhaalde inspanningen boven 95% van het maximum):
  onderscheidde WorldTour en ProTeam niet (Mateo-March 2021).
- **vELO**: de koppeling met ZwiftRacing.app is nog nooit tegen de echte API
  getest, en de officiële categoriegrenzen waren niet te vinden (de site gaf een
  429). Racen draagt voorlopig alleen ZRS.
- **Echte bergketens en meters** (de eerste versie, Heuvelland tot Himalaya):
  vervangen door virtuele niveaus, omdat een norm per niveau duidelijker zegt waar
  een renner staat dan de hoogte van een echte berg.

## De ijkwaarden

Alle ijkwaarden zijn **inschattingen van ZWB**, gegrond op de bronnen hieronder.
Geen studie koppelt vermogen aan niveaus 1 tot 8; de koppeling is van ons. Wat de
bronnen wel geven, staat per rij.

**Vermogen, mannen (W/kg)**

| Duur | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| 15 s | 4 | 7,5 | 9 | 10,5 | 12 | 13,5 | 15 | 16,5 | 19 |
| 1 min | 3 | 5 | 5,8 | 6,6 | 7,4 | 8,2 | 9 | 9,8 | 11 |
| 5 min | 1,2 | 2,4 | 3,2 | 4 | 4,8 | 5,5 | 6,2 | 6,7 | 7,5 |
| 20 min | 1 | 1,9 | 2,6 | 3,3 | 4 | 4,6 | 5,3 | 5,8 | 6,5 |

Houvast: U23-elite in grote rittenkoersen rijden gemiddeld 5,5 W/kg over 20 minuten
(Mateo-March 2026); critical power van profs ligt rond 5,3 tot 5,6 W/kg (Spragg
2022, 2024); de beste renners ter wereld zitten daar duidelijk boven. De lagere
niveaus volgen de gebruikelijke indeling per duur, van ongetraind tot
wereldklasse.

**Vermogen, vrouwen**: dezelfde niveaus bij 80% (15 s), 82% (1 min), 84% (5 min) en
85% (20 min) van de waarden voor mannen. Het aandeel volgt de normen van
vrouwelijke profs (Mateo-March 2022: 1 min 8,4 en 60 min 4,2 W/kg) tegenover die
van mannelijke profs (Valenzuela 2022). Zonder opgegeven geslacht rekent de berg
met de waarden voor mannen.

**Durability (verval in % per 10 kJ/kg, op de beste 20 of 5 minuten)**

| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| 18 | 12,5 | 9,5 | 7 | 5 | 3,6 | 2,6 | 1,8 | 1,2 |

Houvast: na 45 kJ/kg verliezen WorldTour-renners 4,7 tot 8,8% en ProTeam-renners
7,6 tot 11,6% (Mateo-March 2022), ongeveer 1,5 en 2,2% per 10 kJ/kg. Succesvolle
amateurs verliezen 6,5% en minder succesvolle 12,5% op 20 minuten na 1000 kJ
(Barsumyan 2025), bij 75 kg ongeveer 5 en 9,6% per 10 kJ/kg. Pas vanaf 10 kJ/kg
voorafgaand werk telt een curve mee (daaronder is het verval klein, Mateo-March
2025). De drempels voor de curves stelt elk lid zelf in intervals.icu in.
Beperking: alleen de hoeveelheid werk telt, niet hoe zwaar het was, terwijl werk
boven CP meer kost (Spragg 2024; Mateo-March 2024).

**Fitheid (CTL, TSS/dag)**: 0, 15, 30, 45, 65, 85, 105, 125, 150. Profs zitten rond
120 tot 160; de lagere niveaus zijn een inschatting van ZWB.

**Racen (Zwift Racing Score, 0–1000)**: 0, 100, 250, 400, 550, 700, 800, 900, 1000.
Zwift deelt in in E 0–200, D 200–400, C 400–600, B 600–800 en A 800–1000; de top van
de schaal is niveau 8. Omdat ZRS bij 1000 ophoudt, komt deze graat nooit boven
niveau 8.

## Bronnen

- Barsumyan A et al. (2025). Durability as an independent parameter of endurance performance in cycling. *BMC Sports Sci Med Rehabil*. [doi:10.1186/s13102-025-01238-8](https://doi.org/10.1186/s13102-025-01238-8)
- Barsumyan A et al. (2025). Enhanced durability predicts success in amateur road cycling. *Front Sports Act Living*. [doi:10.3389/fspor.2025.1530162](https://doi.org/10.3389/fspor.2025.1530162)
- Borresen J, Lambert MI (2009). The quantification of training load, the training response and the effect on performance. *Sports Med*. [doi:10.2165/11317780-000000000-00000](https://doi.org/10.2165/11317780-000000000-00000)
- Busso T et al. (2023). Validity and accuracy of impulse-response models for modeling and predicting training effects on performance of swimmers. *Med Sci Sports Exerc*. [doi:10.1249/mss.0000000000003139](https://doi.org/10.1249/mss.0000000000003139)
- Drew MK, Finch CF (2016). The relationship between training load and injury, illness and soreness. *Sports Med*. [doi:10.1007/s40279-015-0459-8](https://doi.org/10.1007/s40279-015-0459-8)
- Düking P et al. (2021). Monitoring and adapting endurance training on the basis of heart rate variability monitored by wearable technologies. *J Sci Med Sport* (via PubMed). [doi:10.1016/j.jsams.2021.04.012](https://doi.org/10.1016/j.jsams.2021.04.012)
- Foster C (1998). Monitoring training in athletes with reference to overtraining syndrome. *Med Sci Sports Exerc*. [doi:10.1097/00005768-199807000-00023](https://doi.org/10.1097/00005768-199807000-00023)
- Granero-Gallegos A et al. (2020). HRV-based training for improving VO2max in endurance athletes. *Int J Environ Res Public Health* (via PubMed). [doi:10.3390/ijerph17217999](https://doi.org/10.3390/ijerph17217999)
- Leo P et al. (2021). Power profiling and the power-duration relationship in cycling: a narrative review. *Eur J Appl Physiol*. [doi:10.1007/s00421-021-04833-y](https://doi.org/10.1007/s00421-021-04833-y)
- Manresa-Rocamora A et al. (2021). Heart rate variability-guided training for enhancing cardiac-vagal modulation, aerobic fitness, and endurance performance. *Int J Environ Res Public Health* (via PubMed). [doi:10.3390/ijerph181910299](https://doi.org/10.3390/ijerph181910299)
- Marchal A et al. (2025). Statistical flaws of the fitness-fatigue sports performance prediction model. *Sci Rep*. [doi:10.1038/s41598-025-88153-7](https://doi.org/10.1038/s41598-025-88153-7)
- Mateo-March M et al. (2021). Durability and repeatability of professional cyclists during a Grand Tour. *Eur J Sport Sci*. [doi:10.1080/17461391.2021.1987528](https://doi.org/10.1080/17461391.2021.1987528)
- Mateo-March M et al. (2022). The record power profile of male professional cyclists: fatigue matters. *Int J Sports Physiol Perform*. [doi:10.1123/ijspp.2021-0403](https://doi.org/10.1123/ijspp.2021-0403)
- Mateo-March M et al. (2022). The record power profile in professional female cyclists: normative values. *Int J Sports Physiol Perform*. [doi:10.1123/ijspp.2021-0372](https://doi.org/10.1123/ijspp.2021-0372)
- Mateo-March M et al. (2024). Is all work the same? Performance after accumulated work of differing intensities. *J Sci Med Sport*. [doi:10.1016/j.jsams.2024.03.005](https://doi.org/10.1016/j.jsams.2024.03.005)
- Mateo-March M et al. (2025). Reliability of the durability concept in professional cyclists. *Int J Sports Med*. [doi:10.1055/a-2555-8961](https://doi.org/10.1055/a-2555-8961)
- Mateo-March M et al. (2026). The record power profile of male under-23 cyclists: normative values and fatigue effects. *Scand J Med Sci Sports*. [doi:10.1111/sms.70278](https://doi.org/10.1111/sms.70278)
- Muriel X et al. (2023). Is the record power profile repeatable? *J Strength Cond Res*. [doi:10.1519/jsc.0000000000004419](https://doi.org/10.1519/jsc.0000000000004419)
- Pinot J, Grappe F (2011). The record power profile to assess performance in elite cyclists. *Int J Sports Med*. [doi:10.1055/s-0031-1279773](https://doi.org/10.1055/s-0031-1279773)
- Quod MJ et al. (2010). The power profile predicts road cycling MMP. *Int J Sports Med*. [doi:10.1055/s-0030-1247528](https://doi.org/10.1055/s-0030-1247528)
- Raysmith BP, Drew MK (2016). Performance success or failure is influenced by weeks lost to injury and illness in elite Australian track and field athletes. *J Sci Med Sport*.
- Spragg J et al. (2022). The relationship between physiological characteristics and durability in male professional cyclists. *Med Sci Sports Exerc*. [doi:10.1249/mss.0000000000003024](https://doi.org/10.1249/mss.0000000000003024)
- Spragg J et al. (2024). The intensity rather than the quantity of prior work determines the subsequent downward shift in the power duration relationship. *Eur J Sport Sci*. [doi:10.1002/ejsc.12077](https://doi.org/10.1002/ejsc.12077)
- Valenzuela PL et al. (2022). The record power profile of male professional cyclists: normative values. *Int J Sports Physiol Perform*. [doi:10.1123/ijspp.2021-0263](https://doi.org/10.1123/ijspp.2021-0263)
- Valenzuela PL et al. (2023). Laboratory-based determinants of simulated time trial performance in cyclists. *Biol Sport*. [doi:10.5114/biolsport.2023.122484](https://doi.org/10.5114/biolsport.2023.122484)
- van Erp T et al. (2021). Maintaining power output with accumulating levels of work done is a key determinant for success in professional cycling. *Med Sci Sports Exerc*. [doi:10.1249/mss.0000000000002656](https://doi.org/10.1249/mss.0000000000002656)
- Zwift: categorieën per Racing Score (E 0–200 tot A 800–1000), zoals op Zwift's eigen eventpagina's en in de Racing Score FAQ ([support.zwift.com](https://support.zwift.com/en_us/racing-score-faq-BkG9_Rqrh)).
