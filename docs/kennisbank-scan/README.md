# Maandelijkse literatuurscan van de kennisbank

Opdracht van de eigenaar (2026-10-16): elke maand de nieuwe wetenschappelijke
artikelen scannen op bruikbaarheid voor de app, en daaruit een voorstel maken
wat aangescherpt, toegevoegd of verwijderd moet worden.

De werkwijze staat in `.claude/skills/kennisbank-scan/SKILL.md`. Een geplande
taak in de Claude-app op de eigen pc start hem op de eerste van de maand. Elke
scan schrijft hier een voorstel (`JJJJ-MM.md`) op een eigen branch
`kennisbank-scan/JJJJ-MM`. Uitvoeren gebeurt pas na akkoord, en dan pas komt er
een ronde in `PLAN.md`.

Dit bestand is het geheugen van de scan: waar de vorige ophield, welke
zoekvragen er zijn, en welke artikelen al bekeken en bewust gelaten zijn. Zonder
die lijst komt hetzelfde artikel elke maand terug.

## Logboek

Eén regel per scan. De scan begint bij de datum van de vorige regel.

| Scan | Venster | Zoekvragen | Bekeken | Voorstellen | Voorstel | Status |
|---|---|---|---|---|---|---|
| Nulmeting | t/m 2026-10-16 | — | — | — | `docs/wetenschappelijke-toets.md` | Afgerond: de wetenschappelijke toets verwerkte de literatuur tot deze datum |
| 2026-11 | 2026-10-16 t/m 2026-11-02 | 58 (Consensus 27, PubMed 31) + 18 retractie/errata | 85 PubMed, 536 Consensus (47 inhoudelijk) | 9 | `2026-11.md` | Uitgevoerd 2026-11-03, alle negen (zie PLAN.md) |

## Zoekvragen per thema

Elke scan draait elk thema één keer in Consensus en één keer in PubMed, beperkt
tot het venster. Een thema met treffers mag één gerichte vervolgvraag krijgen.
Komt er een onderwerp in de kennisbank bij, dan hoort hier een thema bij; een
scan die een gat ziet, stelt een nieuwe zoekvraag voor.

**Consensus** zoekt op betekenis: de Engelse zoekvraag hieronder. Met een
jaarfilter komt er veel ruis mee (zwemmers, voetballers, biomarkers); schiften
op titel en abstract is dus het werk.

**PubMed** zoekt letterlijk: de termen hieronder, plus `AND S` waar dat staat,
met S het sportersblok:

```
(cyclists[tiab] OR cycling[tiab] OR "endurance athletes"[tiab] OR triathletes[tiab] OR "endurance-trained"[tiab])
```

Geen jokertekens (`*`): de PubMed-connector weigert ze. Geef `date_from` én
`date_to` mee, met `datetype: "edat"`; alleen `date_from` wordt genegeerd en
geeft alle jaren (getest 2026-10-16). Eén verzoek tegelijk; bij "rate limit"
twee seconden wachten. Meer dan zestig treffers: voeg
`AND (randomized[tiab] OR "systematic review"[tiab] OR "meta-analysis"[tiab])` toe.

| # | Thema | Raakt | Consensus (Engels) | PubMed |
|---|---|---|---|---|
| T1 | Intensiteitsverdeling | Gepolariseerd of piramidaal; Rustige ritten rustig | training intensity distribution polarized pyramidal endurance cyclists | ("intensity distribution"[tiab] OR polarized[tiab] OR polarised[tiab] OR pyramidal[tiab] OR "low-intensity training"[tiab]) AND S |
| T2 | Korte en VO2max-intervallen | Korte intervallen (30/15); VO2max met wisselend vermogen; Sprints als onderhoud | high-intensity interval training short intervals VO2max cyclists | ("high-intensity interval"[tiab] OR "interval training"[tiab] OR "sprint interval"[tiab] OR "short intervals"[tiab]) AND S |
| T3 | Duurvermogen en lange ritten | Lange ritten; protocol Duurtest; `pacing/durability.ts` | durability fatigue resistance prolonged exercise power profile cyclists | (durability[tiab] OR "fatigue resistance"[tiab] OR "prolonged exercise"[tiab] OR decoupling[tiab]) AND S |
| T4 | FTP, CP en drempels meten | Je FTP; Zones; `ftp-test.ts`, `pacing/cp.ts` | functional threshold power critical power ramp test validity MLSS | "functional threshold power"[tiab] OR "critical power"[tiab] OR "ramp test"[tiab] OR "maximal lactate steady state"[tiab] |
| T5 | Opbouw en belasting | Opbouwen; `wellness.ts` TSB-banden | training load progression acute chronic workload injury illness endurance athletes | ("training load"[tiab] OR "acute:chronic"[tiab] OR detraining[tiab] OR "training progression"[tiab]) AND S |
| T6 | Taper en overbelasting | Taper | taper functional overreaching endurance performance | (tapering[tiab] OR taper[tiab] OR overreaching[tiab]) AND S |
| T7 | Herstel meten | Herstel meten; `wellness.ts` HRV-band en readiness | heart rate variability guided training resting heart rate sleep endurance athletes | ("heart rate variability"[tiab] OR "resting heart rate"[tiab] OR "HRV-guided"[tiab]) AND S |
| T8 | Warming-up | Warming-up; `race-warmup.ts` | warm-up priming exercise cycling performance | ("warm-up"[tiab] OR warmup[tiab] OR priming[tiab]) AND S |
| T9 | Hitte | Hittetraining; beide hitteprotocollen; `core-temperature.ts` | heat acclimation heat training hemoglobin mass cyclists core temperature sensor | ("heat acclimation"[tiab] OR "heat acclimatization"[tiab] OR "heat training"[tiab] OR "hemoglobin mass"[tiab] OR "core temperature"[tiab]) AND S |
| T10 | Ademspiertraining | Ademspiertraining (artikel en protocol) | inspiratory muscle training endurance performance | "inspiratory muscle training"[tiab] OR "respiratory muscle training"[tiab] |
| T11 | Herstelmethoden | Koud water na de training; Herstel tussen sessies | cold water immersion recovery adaptation endurance training | ("cold water immersion"[tiab] OR cryotherapy[tiab] OR "recovery strategies"[tiab]) AND S |
| T12 | Cadans | Lage cadans (artikel en protocol) | low cadence torque training cycling | (cadence[tiab] OR "torque training"[tiab]) AND training[tiab] AND S |
| T13 | Vrouwen | Vrouwen en voeding; `docs/training-en-cyclus.md` | female cyclists menstrual cycle training performance | ("menstrual cycle"[tiab] OR "hormonal contraceptive"[tiab] OR "sex differences"[tiab]) AND S |
| T14 | Koolhydraten op de fiets | Koolhydraten tijdens de rit; Darmtraining; beide darmprotocollen | carbohydrate intake during exercise 90 120 g per hour gut training | carbohydrate[tiab] AND ("during exercise"[tiab] OR "gut training"[tiab] OR gastrointestinal[tiab] OR "per hour"[tiab]) AND S |
| T15 | Koolhydraten rond de training | Brandstof volgens de training; Voor de rit; Low-carb en keto; `nutrition/targets.ts` | carbohydrate periodization train low glycogen loading endurance | ("carbohydrate periodization"[tiab] OR "train low"[tiab] OR glycogen[tiab] OR "low-carbohydrate"[tiab] OR ketogenic[tiab]) AND S |
| T16 | Eiwit en herstel | Eiwit; Herstel tussen sessies; Herstellen na een zware wedstrijd | protein intake endurance athletes recovery pre-sleep protein | ("protein intake"[tiab] OR "protein ingestion"[tiab] OR "pre-sleep protein"[tiab] OR "protein requirements"[tiab]) AND S |
| T17 | Energiebeschikbaarheid | Genoeg eten (REDs); Botgezondheid; IJzer; Wielrennen en je botten | low energy availability REDs bone health iron cyclists | ("energy availability"[tiab] OR REDs[tiab] OR "RED-S"[tiab] OR "bone mineral density"[tiab] OR iron[tiab] OR ferritin[tiab]) AND S |
| T18 | Vocht en zout | Vocht en zout; protocollen IJsslush en Glycerol | hydration sodium glycerol ice slurry endurance exercise heat | (hydration[tiab] OR dehydration[tiab] OR sodium[tiab] OR glycerol[tiab] OR "ice slurry"[tiab]) AND S |
| T19 | Prestatiesupplementen | Supplementen; protocollen cafeïne, bicarbonaat, nitraat, bèta-alanine, creatine; Ketonen | caffeine sodium bicarbonate nitrate beta-alanine creatine ketone cycling performance | (caffeine[tiab] OR bicarbonate[tiab] OR nitrate[tiab] OR "beta-alanine"[tiab] OR creatine[tiab] OR ketone[tiab]) AND performance[tiab] AND S |
| T20 | Gezondheidssupplementen | Vitamine D; Visolie; Probiotica; Kersensap; Collageen; Wat niet werkt | vitamin D omega-3 probiotics polyphenols tart cherry collagen athletes | ("vitamin D"[tiab] OR "omega-3"[tiab] OR probiotic[tiab] OR probiotics[tiab] OR polyphenols[tiab] OR "tart cherry"[tiab] OR collagen[tiab]) AND (athletes[tiab] OR S) |
| T21 | Masters | Ouder worden als renner; Kracht als je ouder wordt | masters athletes aging endurance training nutrition | "masters athletes"[tiab] OR "master athletes"[tiab] OR "older athletes"[tiab] OR "masters cyclists"[tiab] |
| T22 | Krachttraining | De vijf krachtartikelen; protocol Kracht op de fiets | strength training cyclists concurrent training performance | ("strength training"[tiab] OR "resistance training"[tiab] OR "concurrent training"[tiab]) AND S |
| T23 | Rug, core en mobiliteit | Lage rugpijn; Core-training; Rekken; Stijve hamstrings | low back pain cyclists core stability stretching before exercise | ("low back pain"[tiab] OR "core stability"[tiab] OR stretching[tiab] OR "hamstring flexibility"[tiab]) AND S |
| T24 | Pacing en W′ | `pacing/w-prime.ts`; `docs/racestrategie-onderzoek.md` | W prime balance model pacing cycling races | ("W prime"[tiab] OR "W balance"[tiab] OR "anaerobic work capacity"[tiab] OR pacing[tiab]) AND S |
| T25 | Indoor en Zwift | Indoor fietsen en Zwift; `ride-physics.ts` | indoor cycling smart trainer esports virtual cycling | "indoor cycling"[tiab] OR "smart trainer"[tiab] OR esports[tiab] OR "virtual cycling"[tiab] OR Zwift[tiab] |
| T26 | Blokperiodisering | Blokweken; protocollen Blokweek drempel en Blokweek 30/15 | block periodization high-intensity training block endurance cyclists | ("block periodization"[tiab] OR "block periodisation"[tiab] OR "training block"[tiab]) AND S |
| T27 | Mentale vermoeidheid en BFR | Brain endurance training (artikel en protocol); Trainen met bloedstroombeperking | brain endurance training mental fatigue blood flow restriction endurance performance | ("brain endurance training"[tiab] OR "mental fatigue"[tiab] OR "blood flow restriction"[tiab]) AND (S OR endurance[tiab]) |

## Gezien en bewust gelaten

Artikelen die een scan bekeek en niet voorstelde, met de reden. Een volgende
scan slaat ze over, tenzij er iets nieuws is (een erratum, een vervolgstudie).

| Scan | Bron (DOI of PMID) | Thema | Reden |
|---|---|---|---|
| 2026-11 | PMID 42933463 | T4 | Nieuwe veldtest (RPO 1-12), één studie |
| 2026-11 | PMID 42902450 | T24 | W′bal bij hardlopers, niet bij fietsers |
| 2026-11 | PMID 42947243 | T25 | Ergonomie plus training gecombineerd; effect niet toe te wijzen |
| 2026-11 | PMID 42968311 | T15 | Narratief over veel koolhydraten en ketonen, voegt niets toe |
| 2026-11 | PMID 42932892 | T18 | Koude of warme sportdrank in hitte, n=11, verandert geen advies |
| 2026-11 | PMID 42942424 | T17 | Narratief over botten bij triatleten |
| 2026-11 | PMID 42931583 | T17 | Pilot-casusreeks energiebeschikbaarheid |
| 2026-11 | PMID 42963039 | T19 | Bietensap in hypoxie, niet ZWB-relevant |
| 2026-11 | PMID 42937137 | T19 | Ketonen in hypoxie, post-hoc n=5 |
| 2026-11 | PMID 42959925 | T19 | Narratief creatine en bèta-alanine |
| 2026-11 | PMID 42935441 | T20 | Opinie-review omega-3 |
| 2026-11 | PMID 42887879 | T20 | Verslag van een congressessie |
| 2026-11 | PMID 42884750 | T20 | Eén probioticum (SLAB51), klein |
| 2026-11 | PMID 42939527 | T20 | Narratief microbioom |
| 2026-11 | PMID 42931560 | T7 | Handknijpkracht als readiness-maat, geen meerwaarde |
| 2026-11 | PMID 42948296 | T21 | Hoogtetraining bij profs |
| 2026-11 | PMID 42926219 | T21 | Aorta bij masters-hardlopers, cardiologie |
| 2026-11 | PMID 42893206 | T21 | Master@Heart, cardiologie, buiten scope |
| 2026-11 | PMID 42890927 | T27 | BFR bij niet-sporters boven 70 |
| 2026-11 | PMID 42924702 | T27 | Narratief BFR deel 3 |
| 2026-11 | PMID 42931574 | T8 | Deadlift als PAPE, geen effect |
| 2026-11 | PMID 42961775 | T24 | Pacing in monumenten bij profs, geen abstract |
| 2026-11 | PMID 42931597 | T25 | Videosysteem voor binnenfietsen, techniek |
| 2026-11 | PMID 42952497 | T10 | Ademspiertraining bij jeugdlopers |
| 2026-11 | PMID 42965396 | T11 | Massage na Ironman |
| 2026-11 | PMID 42924681 | T23 | Enquête klachten triatleten |
| 2026-11 | https://doi.org/10.1123/ijspp.2026-0214 | T5 | Eén profrenner |
| 2026-11 | https://doi.org/10.1080/02640414.2026.2741755 | T4 | Nieuwe 8-minutentest, geen langetermijndata |
| 2026-11 | https://doi.org/10.1080/02701367.2026.2742219 | T4 | Geen bruikbare uitkomst voor ZWB |
| 2026-11 | https://doi.org/10.1186/s13102-026-02134-5 | T2 | Sprintherhaling in hypoxie |
| 2026-11 | https://doi.org/10.1080/15502783.2026.2723237 | T16 | Kikkererwteneiwit, niche |
| 2026-11 | https://doi.org/10.3390/nu18193267 | T16 | Whey bij uitdroging, niet ZWB-relevant |
| 2026-11 | https://doi.org/10.1007/s00774-026-01761-9 | T17 | Kaas en botten, geen sporters |
| 2026-11 | https://doi.org/10.3390/sports14100435 | T18 | Elektrolytdrank, klein |
| 2026-11 | https://doi.org/10.55860/caqcy191 | T9 | Koeling, n=7 |
| 2026-11 | https://doi.org/10.1007/s00421-026-06456-7 | T19 | Cafeïne plus capsaïcine, combinatie niet in gebruik |
| 2026-11 | https://doi.org/10.1002/advs.77664 | T20 | Probioticum, dierexperimenteel/mechanistisch |
| 2026-11 | https://doi.org/10.1007/s00421-026-06460-x | T19 | Bietensap plus krachttraining |
| 2026-11 | https://doi.org/10.1186/s40798-026-01124-8 | T4 | VT1-algoritme, nog niet toepasbaar |
| 2026-11 | https://doi.org/10.1519/jsc.0000000000005610 | T13 | Hormonen, geen trainingsadvies |
| 2026-11 | https://doi.org/10.1002/ejsc.70265 | T13 | Model voor cyclustracking, geen advies |
| 2026-11 | https://doi.org/10.1016/j.jnphys.2026.100047 | T19 | Cafeïne en glycogeen, mechanistisch |
| 2026-11 | https://doi.org/10.1080/02640414.2026.2739775 | T24 | 24-uurs MTB-pacing, niche |
| 2026-11 | https://doi.org/10.7717/peerj.21807 | T2 | Review bij elitesporters, geen fietsers |
| 2026-11 | https://doi.org/10.1186/s40798-026-01123-9 | T8 | Scoping review warming-up, geen nieuw advies |
| 2026-11 | https://doi.org/10.1519/jsc.0000000000005692 | T10 | Apparaat voor ademspiertraining |
| 2026-11 | https://doi.org/10.3390/sports14100426 | T21 | Zwemmers |
| 2026-11 | https://doi.org/10.3390/sports14100430 | T21 | Masters-zwemmers |
| 2026-11 | https://doi.org/10.1186/s13102-026-02121-w | T23 | Coretraining bij teamsporten, geen duuruitkomsten |
