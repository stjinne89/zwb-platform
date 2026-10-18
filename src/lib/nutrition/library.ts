// De kennisbibliotheek voeding.
//
// Bewust in code en niet in de database: elke bewering en elke bron gaat via
// een commit, dus via review, en de test in tests/unit/nutrition-library.test.ts
// bewaakt dat er bij elk artikel een navolgbare bron staat. Een beheerscherm
// levert daar niets bij op.
//
// De onderbouwing per artikel, met de beperkingen van het bewijs, staat
// uitgebreider in docs/voeding-wielrennen.md. Teksten zijn eigen samenvattingen;
// we citeren de bronnen niet letterlijk.

import type { ArticleConclusion, ArticleEvidence } from "@/lib/knowledge/evidence";

// "meting" (2026-10-18): een gepubliceerde meting in een windtunnel, op een
// testbank of in het veld, zoals bij de kennisbank materiaal.
export const EVIDENCE_KINDS = ["consensus", "review", "studie", "richtlijn", "meting"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_LABELS: Record<EvidenceKind, string> = {
  consensus: "Consensus",
  review: "Review",
  studie: "Studie",
  richtlijn: "Richtlijn",
  meting: "Meting",
};

export const NUTRITION_CATEGORIES = [
  "basis",
  "op-de-fiets",
  "herstel",
  "gezondheid",
  "supplementen",
] as const;
export type NutritionCategory = (typeof NUTRITION_CATEGORIES)[number];

export const NUTRITION_CATEGORY_LABELS: Record<NutritionCategory, string> = {
  basis: "Basis",
  "op-de-fiets": "Op de fiets",
  herstel: "Herstel",
  gezondheid: "Gezondheid",
  supplementen: "Supplementen",
};

export type NutritionSource = {
  citation: string;
  year: number;
  url: string;
  kind: EvidenceKind;
};

export type NutritionArticle = {
  slug: string;
  category: NutritionCategory;
  /** Hoe gegrond het centrale advies is; zie src/lib/knowledge/evidence.ts. */
  evidence: ArticleEvidence;
  /** "geen-effect" of "nadelig" als de conclusie is dat iets niet helpt; staat in de badge. */
  conclusion?: ArticleConclusion;
  title: string;
  summary: string;
  points: string[];
  /** Wat het onderzoek níét laat zien, of wat een eigen keuze van ZWB is. */
  limits: string[];
  sources: NutritionSource[];
};

// Bronnen die in meer dan één artikel terugkomen.
export const UCI_POSITION: NutritionSource = {
  citation:
    "Burke LM, Dolan E, Gonzalez JT, Mujika I, Jeukendrup AE, et al. UCI Sports Nutrition Project: Position Statement on Nutrition for Cycling. Int J Sport Nutr Exerc Metab.",
  year: 2026,
  url: "https://pubmed.ncbi.nlm.nih.gov/42744290/",
  kind: "consensus",
};

const UCI_PERIODIZATION: NutritionSource = {
  citation:
    "Morton JP, Hearris M, Fell MJ, Owens DJ, Halson S, Trommelen J. UCI Sports Nutrition Project: Nutritional Periodization. Int J Sport Nutr Exerc Metab.",
  year: 2025,
  url: "https://pubmed.ncbi.nlm.nih.gov/41130458/",
  kind: "review",
};

const ACSM_2016: NutritionSource = {
  citation:
    "Thomas DT, Erdman KA, Burke LM. Position of the Academy of Nutrition and Dietetics, Dietitians of Canada, and the American College of Sports Medicine: Nutrition and Athletic Performance. J Acad Nutr Diet 116(3):501–528.",
  year: 2016,
  url: "https://pubmed.ncbi.nlm.nih.gov/26920240/",
  kind: "consensus",
};

export const BURKE_2011: NutritionSource = {
  citation:
    "Burke LM, Hawley JA, Wong SHS, Jeukendrup AE. Carbohydrates for training and competition. J Sports Sci 29(S1):S17–S27.",
  year: 2011,
  url: "https://www.tandfonline.com/doi/full/10.1080/02640414.2011.585473",
  kind: "review",
};

export const MORTON_2026_JNUTR: NutritionSource = {
  citation:
    "Morton JP, Fell JM, Gonzalez JT, Hearris MA, Podlogar T, Pugh JN, Wallis GA. Carbohydrate fueling for endurance athletes during exercise. J Nutr 156(5):101442.",
  year: 2026,
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC13197957/",
  kind: "review",
};

export const KERKSICK_2017: NutritionSource = {
  citation:
    "Kerksick CM, Arent S, Schoenfeld BJ, et al. International Society of Sports Nutrition position stand: nutrient timing. J Int Soc Sports Nutr 14:33.",
  year: 2017,
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5596471/",
  kind: "consensus",
};

const UCI_ESPORTS: NutritionSource = {
  citation:
    "Whitfield J, Mujika I, Burke LM. UCI Sports Nutrition Project: Nutrition for the Emerging Cycling Disciplines of Esports and Gravel. Int J Sport Nutr Exerc Metab.",
  year: 2026,
  url: "https://pubmed.ncbi.nlm.nih.gov/41569815/",
  kind: "review",
};

const REDS_2023: NutritionSource = {
  citation:
    "Mountjoy M, Ackerman KE, et al. 2023 International Olympic Committee's (IOC) consensus statement on Relative Energy Deficiency in Sport (REDs). Br J Sports Med 57(17):1073–1097.",
  year: 2023,
  url: "https://stillmed.olympics.com/media/Documents/Athletes/Medical-Scientific/Consensus-Statements/REDs/BJSM-IOC-consensus-statement-on-Relative-Energy-Deficiency-in-Sport-REDs.pdf",
  kind: "consensus",
};

export const UCI_BONE: NutritionSource = {
  citation:
    "Saffioti N, Takarabe L, Perfeito L, Ribeiro W, Hilkens L, Van Dyk J, Dolan E. UCI Sports Nutrition Project: Does Cycling Create a “Perfect Storm” for Bone Health? Int J Sport Nutr Exerc Metab 36(3):324–334.",
  year: 2026,
  url: "https://doi.org/10.1123/ijsnem.2025-0033",
  kind: "review",
};

export const UCI_ILLNESS: NutritionSource = {
  citation:
    "Wilson PB, Pyne DB, Rotunno A. UCI Sports Nutrition Project: The Role of Nutrition in the Prevention and Management of Illnesses and Injuries in Elite Cycling. Int J Sport Nutr Exerc Metab 36(3):352–368.",
  year: 2026,
  url: "https://doi.org/10.1123/ijsnem.2025-0144",
  kind: "review",
};

const UCI_PLATE: NutritionSource = {
  citation:
    "Lis DM, Strobel N. UCI Sports Nutrition Project: Plate to Performance—Culinary Nutrition Support for Professional Road Cycling. Int J Sport Nutr Exerc Metab 36(3):335–351.",
  year: 2026,
  url: "https://doi.org/10.1123/ijsnem.2025-0198",
  kind: "review",
};

// Supplementen voor herstel en gezondheid (ronde 2026-10-14). De onderbouwing
// staat in docs/supplementen-onderzoek.md; de protocollen gebruiken dezelfde
// bronnen, daarom staan ze hier en niet bij een artikel.
export const UCI_SUPPLEMENTS: NutritionSource = {
  citation:
    "Whitfield J, Egan B, Del Coso J, Derave W, Saunders B, Burke LM. UCI Sports Nutrition Project: Considerations and Applications for the Use of Sports Foods and Supplements to Improve Performance in Cycling. Int J Sport Nutr Exerc Metab 36(3):187–214.",
  year: 2026,
  url: "https://pubmed.ncbi.nlm.nih.gov/41570809/",
  kind: "review",
};

export const IOC_SUPPLEMENTS: NutritionSource = {
  citation:
    "Maughan RJ, Burke LM, Dvorak J, et al. IOC consensus statement: dietary supplements and the high-performance athlete. Br J Sports Med 52(7):439–455.",
  year: 2018,
  url: "https://research-repository.st-andrews.ac.uk/bitstream/handle/10023/13136/Maughan_2018_BJSM_IOCconsensus_CC.pdf",
  kind: "consensus",
};

export const HILL_2021: NutritionSource = {
  citation:
    "Hill JA, Keane KM, Quinlan R, Howatson G. Tart Cherry Supplementation and Recovery From Strenuous Exercise: A Systematic Review and Meta-Analysis. Int J Sport Nutr Exerc Metab 31(2):154–167.",
  year: 2021,
  url: "https://doi.org/10.1123/ijsnem.2020-0145",
  kind: "review",
};

export const MCHUGH_2022: NutritionSource = {
  citation:
    "McHugh MP. “Precovery” versus recovery: Understanding the role of cherry juice in exercise recovery. Scand J Med Sci Sports 32(6):940–950.",
  year: 2022,
  url: "https://doi.org/10.1111/sms.14141",
  kind: "review",
};

export const BELL_2014: NutritionSource = {
  citation:
    "Bell PG, et al. Montmorency cherries reduce the oxidative stress and inflammatory responses to repeated days high-intensity stochastic cycling. Nutrients 6(2):829–843.",
  year: 2014,
  url: "https://doi.org/10.3390/nu6020829",
  kind: "studie",
};

export const HOWATSON_2010: NutritionSource = {
  citation:
    "Howatson G, McHugh MP, Hill JA, et al. Influence of tart cherry juice on indices of recovery following marathon running. Scand J Med Sci Sports 20(6):843–852.",
  year: 2010,
  url: "https://doi.org/10.1111/j.1600-0838.2009.01005.x",
  kind: "studie",
};

const GAO_2020: NutritionSource = {
  citation:
    "Gao R, Chilibeck PD. Effect of Tart Cherry Concentrate on Endurance Exercise Performance: A Meta-analysis. J Am Coll Nutr 39(7):657–664.",
  year: 2020,
  url: "https://doi.org/10.1080/07315724.2020.1713246",
  kind: "review",
};

const BEBA_2022: NutritionSource = {
  citation:
    "Beba M, Mohammadi H, Clark CCT, Djafarian K. The effect of curcumin supplementation on delayed-onset muscle soreness, inflammation, muscle strength, and joint flexibility: A systematic review and dose-response meta-analysis of randomized controlled trials. Phytother Res 36(7):2767–2778.",
  year: 2022,
  url: "https://doi.org/10.1002/ptr.7477",
  kind: "review",
};

export const PAULSEN_2014: NutritionSource = {
  citation:
    "Paulsen G, Cumming KT, Holden G, et al. Vitamin C and E supplementation hampers cellular adaptation to endurance training in humans: a double-blind, randomised, controlled trial. J Physiol 592(8):1887–1901.",
  year: 2014,
  url: "https://doi.org/10.1113/jphysiol.2013.267419",
  kind: "studie",
};

export const SHAW_2017: NutritionSource = {
  citation:
    "Shaw G, Lee-Barthel A, Ross ML, Wang B, Baar K. Vitamin C–enriched gelatin supplementation before intermittent activity augments collagen synthesis. Am J Clin Nutr 105(1):136–143.",
  year: 2017,
  url: "https://doi.org/10.3945/ajcn.116.138594",
  kind: "studie",
};

export const BISCHOF_2024: NutritionSource = {
  citation:
    "Bischof K, Moitzi AM, Stafilidis S, König D. Impact of Collagen Peptide Supplementation in Combination with Long-Term Physical Training on Strength, Musculotendinous Remodeling, Functional Recovery, and Body Composition in Healthy Adults: A Systematic Review with Meta-analysis. Sports Med 54(11):2865–2888.",
  year: 2024,
  url: "https://doi.org/10.1007/s40279-024-02079-0",
  kind: "review",
};

export const OWENS_2018: NutritionSource = {
  citation:
    "Owens DJ, Allison R, Close GL. Vitamin D and the Athlete: Current Perspectives and New Challenges. Sports Med 48(Suppl 1):3–16.",
  year: 2018,
  url: "https://doi.org/10.1007/s40279-017-0841-9",
  kind: "review",
};

export const GR_VITAMINE_D: NutritionSource = {
  citation: "Gezondheidsraad. Evaluatie van de voedingsnormen voor vitamine D. Den Haag, publicatienr. 2012/15.",
  year: 2012,
  url: "https://www.gezondheidsraad.nl/documenten/adviezen/2012/09/26/evaluatie-van-de-voedingsnormen-voor-vitamine-d",
  kind: "richtlijn",
};

const PHILPOTT_2019: NutritionSource = {
  citation:
    "Philpott JD, Witard OC, Galloway SDR. Applications of omega-3 polyunsaturated fatty acid supplementation for sport performance. Res Sports Med 27(2):219–237.",
  year: 2019,
  url: "https://doi.org/10.1080/15438627.2018.1550401",
  kind: "review",
};

const JAGER_2019: NutritionSource = {
  citation:
    "Jäger R, Mohr AE, Carpenter KC, et al. International Society of Sports Nutrition Position Stand: Probiotics. J Int Soc Sports Nutr 16(1):62.",
  year: 2019,
  url: "https://doi.org/10.1186/s12970-019-0329-0",
  kind: "consensus",
};

const HEMILA_2013: NutritionSource = {
  citation:
    "Hemilä H, Chalker E. Vitamin C for preventing and treating the common cold. Cochrane Database Syst Rev 2013(1):CD000980.",
  year: 2013,
  url: "https://doi.org/10.1002/14651858.CD000980.pub4",
  kind: "review",
};

const NAULT_2024: NutritionSource = {
  citation:
    "Nault D, Machingo TA, Shipper AG, et al. Zinc for prevention and treatment of the common cold. Cochrane Database Syst Rev 2024(5):CD014914.",
  year: 2024,
  url: "https://doi.org/10.1002/14651858.CD014914.pub2",
  kind: "review",
};

const GARRISON_2020: NutritionSource = {
  citation:
    "Garrison SR, Korownyk CS, Kolber MR, et al. Magnesium for skeletal muscle cramps. Cochrane Database Syst Rev 2020(9):CD009402.",
  year: 2020,
  url: "https://doi.org/10.1002/14651858.CD009402.pub3",
  kind: "review",
};

const WOLFE_2017: NutritionSource = {
  citation:
    "Wolfe RR. Branched-chain amino acids and muscle protein synthesis in humans: myth or reality? J Int Soc Sports Nutr 14:30.",
  year: 2017,
  url: "https://doi.org/10.1186/s12970-017-0184-9",
  kind: "review",
};

const MCCARTNEY_2020: NutritionSource = {
  citation:
    "McCartney D, et al. Cannabidiol and Sports Performance: a Narrative Review of Relevant Evidence and Recommendations for Future Research. Sports Med Open 6:27.",
  year: 2020,
  url: "https://doi.org/10.1186/s40798-020-00251-0",
  kind: "review",
};

const JEFFRIES_2019: NutritionSource = {
  citation:
    "Jeffries O, Waldron M. The effects of menthol on exercise performance and thermal sensation: a meta-analysis. J Sci Med Sport 22(6):707–715.",
  year: 2019,
  url: "https://doi.org/10.1016/j.jsams.2018.12.002",
  kind: "review",
};

const BRIETZKE_2019: NutritionSource = {
  citation:
    "Brietzke C, Franco-Alvarenga PE, Coelho-Júnior HJ, et al. Effects of Carbohydrate Mouth Rinse on Cycling Time Trial Performance: A Systematic Review and Meta-Analysis. Sports Med 49(1):57–66.",
  year: 2019,
  url: "https://doi.org/10.1007/s40279-018-1029-7",
  kind: "review",
};

const HAAKONSSEN_2015: NutritionSource = {
  citation:
    "Haakonssen EC, Ross ML, Knight EJ, et al. The Effects of a Calcium-Rich Pre-Exercise Meal on Biomarkers of Calcium Homeostasis in Competitive Female Cyclists: A Randomised Crossover Trial. PLoS One 10(5):e0123302.",
  year: 2015,
  url: "https://doi.org/10.1371/journal.pone.0123302",
  kind: "studie",
};

export const RUSTAD_2016: NutritionSource = {
  citation:
    "Rustad PI, Sailer M, Cumming KT, et al. Intake of Protein Plus Carbohydrate during the First Two Hours after Exhaustive Cycling Improves Performance the following Day. PLoS One 11(4):e0153229.",
  year: 2016,
  url: "https://doi.org/10.1371/journal.pone.0153229",
  kind: "studie",
};

export const VAN_ROSENDAL_2010: NutritionSource = {
  citation:
    "van Rosendal SP, Osborne MA, Fassett RG, Coombes JS. Guidelines for glycerol use in hyperhydration and rehydration associated with exercise. Sports Med 40(2):113–129.",
  year: 2010,
  url: "https://doi.org/10.2165/11530760-000000000-00000",
  kind: "review",
};

export const SNIJDERS_2019: NutritionSource = {
  citation:
    "Snijders T, Trommelen J, Kouw IWK, Holwerda AM, Verdijk LB, van Loon LJC. The Impact of Pre-sleep Protein Ingestion on the Skeletal Muscle Adaptive Response to Exercise in Humans: An Update. Front Nutr 6:17.",
  year: 2019,
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6415027/",
  kind: "review",
};

const AIS_FRAMEWORK: NutritionSource = {
  citation: "Australian Institute of Sport. AIS Sports Supplement Framework (ABCD-classificatie).",
  year: 2021,
  url: "https://www.ausport.gov.au/ais/nutrition/supplements",
  kind: "richtlijn",
};

const NZVT: NutritionSource = {
  citation: "Dopingautoriteit. NZVT: Nederlands Zekerheidssysteem Voedingssupplementen Topsport.",
  year: 2026,
  url: "https://www.dopingautoriteit.nl/programmas/nzvt",
  kind: "richtlijn",
};

const GUEST_2021_NUTRITION: NutritionSource = {
  citation:
    "Guest NS, VanDusseldorp TA, Nelson MT, et al. International society of sports nutrition position stand: caffeine and exercise performance. J Int Soc Sports Nutr 18:1.",
  year: 2021,
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7777221/",
  kind: "consensus",
};

// Hertoetst in de wetenschappelijke toets, fase 3 (2026-10-16). DOI's via PubMed
// bevestigd; zie docs/wetenschappelijke-toets.md.
export const WITARD_2025: NutritionSource = {
  citation:
    "Witard OC, Hearris M, Morgan PT. Protein nutrition for endurance athletes: a metabolic focus on promoting recovery and training adaptation. Sports Med 55(6):1361-1376.",
  year: 2025,
  url: "https://doi.org/10.1007/s40279-025-02203-8",
  kind: "review",
};

export const TROMMELEN_2023_DOSE: NutritionSource = {
  citation:
    "Trommelen J, van Lieshout GAA, Nyakayiru J, et al. The anabolic response to protein ingestion during recovery from exercise has no upper limit in magnitude and duration in vivo in humans. Cell Rep Med 4(12):101324.",
  year: 2023,
  url: "https://doi.org/10.1016/j.xcrm.2023.101324",
  kind: "studie",
};

export const VALENZUELA_2023: NutritionSource = {
  citation:
    "Valenzuela PL, Alejo LB, Montalvo-Pérez A, et al. Pre-sleep protein supplementation in professional cyclists during a training camp: a three-arm randomized controlled trial. J Int Soc Sports Nutr 20(1):2166366.",
  year: 2023,
  url: "https://doi.org/10.1080/15502783.2023.2166366",
  kind: "studie",
};

export const SOLLIE_2023: NutritionSource = {
  citation:
    "Sollie O, Clauss M, Jeppesen PB, et al. Similar performance after intake of carbohydrate plus whey protein and carbohydrate only in the early phase after non-exhaustive cycling. Scand J Med Sci Sports 33(7):1091-1103.",
  year: 2023,
  url: "https://doi.org/10.1111/sms.14364",
  kind: "studie",
};

export const NORTE_2026: NutritionSource = {
  citation:
    "Norte BR, Slinn MM, Johnson KO, et al. Graded carbohydrate ingestion up to 120 g·h-1 attenuates the reduction in critical power following 3 h of moderate-intensity exercise in a dose-dependent manner. Scand J Med Sci Sports 36(6):e70326.",
  year: 2026,
  url: "https://doi.org/10.1111/sms.70326",
  kind: "studie",
};

export const FLEITAS_PANIAGUA_2026: NutritionSource = {
  citation:
    "Fleitas-Paniagua PR, Rasica L, Azevedo RA, et al. Recommended but not high carbohydrate dose improves performance after heavy- but not moderate-intensity exercise in recreationally trained participants. Scand J Med Sci Sports 36(5):e70288.",
  year: 2026,
  url: "https://doi.org/10.1111/sms.70288",
  kind: "studie",
};

export const HEARRIS_2022: NutritionSource = {
  citation:
    "Hearris MA, Pugh JN, Langan-Evans C, et al. 13C-glucose-fructose labeling reveals comparable exogenous CHO oxidation during exercise when consuming 120 g/h in fluid, gel, jelly chew, or coingestion. J Appl Physiol 132(6):1394-1406.",
  year: 2022,
  url: "https://doi.org/10.1152/japplphysiol.00091.2022",
  kind: "studie",
};

export const RAVIKANTI_2025: NutritionSource = {
  citation:
    "Ravikanti S, Silang KG, Martyn HJ, et al. 13C-labelled glucose-fructose show greater exogenous and whole-body CHO oxidation and lower O2 cost of running at 120 versus 60 and 90 g·h-1 in elite male marathoners. J Appl Physiol 139(6):1581-1595.",
  year: 2025,
  url: "https://doi.org/10.1152/japplphysiol.00665.2025",
  kind: "studie",
};

export const WILSON_2025: NutritionSource = {
  citation:
    "Wilson PB. A Narrative Review of the High-Carbohydrate Fueling Revolution (≥100 g/h) in the Professional Peloton. Sports Med 56(2):295–313.",
  year: 2025,
  url: "https://doi.org/10.1007/s40279-025-02372-6",
  kind: "review",
};

export const COSTA_2017: NutritionSource = {
  citation:
    "Costa RJS, Miall A, Khoo A, et al. Gut-training: the impact of two weeks repetitive gut-challenge during exercise on gastrointestinal status, glucose availability, fuel kinetics, and running performance. Appl Physiol Nutr Metab 42(5):547-557.",
  year: 2017,
  url: "https://doi.org/10.1139/apnm-2016-0453",
  kind: "studie",
};

export const MIALL_2018: NutritionSource = {
  citation:
    "Miall A, Khoo A, Rauch C, et al. Two weeks of repetitive gut-challenge reduce exercise-associated gastrointestinal symptoms and malabsorption. Scand J Med Sci Sports 28(2):630-640.",
  year: 2018,
  url: "https://doi.org/10.1111/sms.12912",
  kind: "studie",
};

export const MARTINEZ_2023: NutritionSource = {
  citation:
    "Martinez IG, Mika AS, Biesiekierski JR, Costa RJS. The Effect of Gut-Training and Feeding-Challenge on Markers of Gastrointestinal Status in Response to Endurance Exercise: A Systematic Literature Review. Sports Med 53(6):1175-1200.",
  year: 2023,
  url: "https://doi.org/10.1007/s40279-023-01841-0",
  kind: "review",
};

export const KING_2022: NutritionSource = {
  citation:
    "King AJ, Etxebarria N, Ross ML, et al. Short-Term Very High Carbohydrate Diet and Gut-Training Have Minor Effects on Gastrointestinal Status and Performance in Highly Trained Endurance Athletes. Nutrients 14(9):1929.",
  year: 2022,
  url: "https://doi.org/10.3390/nu14091929",
  kind: "studie",
};

export const RAUCH_2022: NutritionSource = {
  citation:
    "Rauch CE, McCubbin AJ, Gaskell SK, Costa RJS. Feeding Tolerance, Glucose Availability, and Whole-Body Total Carbohydrate and Fat Oxidation in Male Endurance and Ultra-Endurance Runners in Response to Prolonged Exercise, Consuming a Habitual Mixed Macronutrient Diet and Carbohydrate Feeding During Exercise. Front Physiol 12:773054.",
  year: 2022,
  url: "https://doi.org/10.3389/fphys.2021.773054",
  kind: "studie",
};

export const PRIETO_BELLVER_2024: NutritionSource = {
  citation:
    "Prieto-Bellver G, Diaz-Lara J, Bishop DJ, et al. A five-week periodized carbohydrate diet does not improve maximal lactate steady-state exercise capacity and substrate oxidation in well-trained cyclists compared to a high-carbohydrate diet. Nutrients 16(2):318.",
  year: 2024,
  url: "https://doi.org/10.3390/nu16020318",
  kind: "studie",
};

export const GOULET_2019: NutritionSource = {
  citation:
    "Goulet EDB, Hoffman MD. Impact of ad libitum versus programmed drinking on endurance performance: a systematic review with meta-analysis. Sports Med 49(2):221-232.",
  year: 2019,
  url: "https://doi.org/10.1007/s40279-018-01051-z",
  kind: "review",
};

export const KENEFICK_2018: NutritionSource = {
  citation:
    "Kenefick RW. Drinking strategies: planned drinking versus drinking to thirst. Sports Med 48(Suppl 1):31-37.",
  year: 2018,
  url: "https://doi.org/10.1007/s40279-017-0844-6",
  kind: "review",
};

export const BROOKS_2022: NutritionSource = {
  citation:
    "Brooks E, Lamothe G, Nagpal TS, et al. Acute ingestion of ketone monoesters and precursors do not enhance endurance exercise performance: a systematic review and meta-analysis. Int J Sport Nutr Exerc Metab 32(3):214-225.",
  year: 2022,
  url: "https://doi.org/10.1123/ijsnem.2021-0280",
  kind: "review",
};

export const POFFE_2019: NutritionSource = {
  citation:
    "Poffé C, Ramaekers M, Van Thienen R, et al. Ketone ester supplementation blunts overreaching symptoms during endurance training overload. J Physiol 597(12):3009-3027.",
  year: 2019,
  url: "https://doi.org/10.1113/JP277831",
  kind: "studie",
};

export const TAYLOR_2024: NutritionSource = {
  citation:
    "Taylor MY, Osborne JO, Topranin VM, et al. Menstrual cycle phase has no influence on performance-determining variables in endurance-trained athletes: the FENDURA project. Med Sci Sports Exerc 56(9):1595-1605.",
  year: 2024,
  url: "https://doi.org/10.1249/MSS.0000000000003447",
  kind: "studie",
};

export const VON_SIEBENTHAL_2023: NutritionSource = {
  citation:
    "von Siebenthal HK, Gessler S, Vallelian F, et al. Alternate day versus consecutive day oral iron supplementation in iron-depleted women: a randomized double-blind placebo-controlled study. EClinicalMedicine 65:102286.",
  year: 2023,
  url: "https://doi.org/10.1016/j.eclinm.2023.102286",
  kind: "studie",
};

export const CARVALHO_2022: NutritionSource = {
  citation:
    "Carvalho A, Marticorena FM, Grecco BH, et al. Can I have my coffee and drink it? A systematic review and meta-analysis to determine whether habitual caffeine consumption affects the ergogenic effect of caffeine. Sports Med 52(9):2209-2220.",
  year: 2022,
  url: "https://doi.org/10.1007/s40279-022-01685-0",
  kind: "review",
};

export const ZHU_2026: NutritionSource = {
  citation:
    "Zhu J, Zhang Y, Li M, et al. Acute caffeine ingestion and exercise performance in women: a systematic review and meta-analysis of menstrual-cycle phase and hormonal contraceptive status. Front Nutr 13:1876198.",
  year: 2026,
  url: "https://doi.org/10.3389/fnut.2026.1876198",
  kind: "review",
};

export const CHEN_2024: NutritionSource = {
  citation:
    "Chen B, Ding L, Qin Q, et al. Effect of caffeine ingestion on time trial performance in cyclists: a systematic review and meta-analysis. J Int Soc Sports Nutr 21(1):2363789.",
  year: 2024,
  url: "https://doi.org/10.1080/15502783.2024.2363789",
  kind: "review",
};

export const LEACH_2023: NutritionSource = {
  citation:
    "Leach NK, Hilton NP, Tinnion D, et al. Sodium bicarbonate ingestion in a fasted state improves 16.1-km cycling time-trial performance. Med Sci Sports Exerc 55(12):2299-2307.",
  year: 2023,
  url: "https://doi.org/10.1249/MSS.0000000000003263",
  kind: "studie",
};

export const SHANNON_2024: NutritionSource = {
  citation:
    "Shannon ES, Regnier A, Dobson B, et al. The effect of sodium bicarbonate mini-tablets ingested in a carbohydrate hydrogel system on 40 km cycling time trial performance and metabolism in trained male cyclists. Eur J Appl Physiol 124(12):3671-3682.",
  year: 2024,
  url: "https://doi.org/10.1007/s00421-024-05567-3",
  kind: "studie",
};

export const GURTON_2021: NutritionSource = {
  citation:
    "Gurton WH, Faulkner SH, James RM. Effect of warm-up and sodium bicarbonate ingestion on 4-km cycling time-trial performance. Int J Sports Physiol Perform 16(11):1573-1579.",
  year: 2021,
  url: "https://doi.org/10.1123/ijspp.2020-0743",
  kind: "studie",
};

export const DE_OLIVEIRA_2020: NutritionSource = {
  citation:
    "de Oliveira LF, Saunders B, Yamaguchi G, et al. Is individualization of sodium bicarbonate ingestion based on time to peak necessary? Med Sci Sports Exerc 52(8):1801-1808.",
  year: 2020,
  url: "https://doi.org/10.1249/MSS.0000000000002313",
  kind: "studie",
};

export const POON_2025: NutritionSource = {
  citation:
    "Poon ET, Iu JC, Sum WM, et al. Dietary nitrate supplementation and exercise performance: an umbrella review of 20 published systematic reviews with meta-analyses. Sports Med 55(5):1213-1231.",
  year: 2025,
  url: "https://doi.org/10.1007/s40279-025-02194-6",
  kind: "review",
};

export const QIN_2026: NutritionSource = {
  citation:
    "Qin G, Kim S. Effects of beetroot juice supplementation on maximal oxygen uptake during aerobic exercise: a systematic review and meta-analysis. Front Nutr 13:1858216.",
  year: 2026,
  url: "https://doi.org/10.3389/fnut.2026.1858216",
  kind: "review",
};

export const RORIZ_2022: NutritionSource = {
  citation:
    "Roriz M, Brito P, Teixeira FJ, et al. Performance effects of internal pre- and per-cooling across different exercise and environmental conditions: a systematic review. Front Nutr 9:959516.",
  year: 2022,
  url: "https://doi.org/10.3389/fnut.2022.959516",
  kind: "review",
};

export const GEORGIOU_2024: NutritionSource = {
  citation:
    "Georgiou GD, Antoniou K, Antoniou S, et al. Effect of beta-alanine supplementation on maximal intensity exercise in trained young male individuals: a systematic review and meta-analysis. Int J Sport Nutr Exerc Metab 34(6):397-412.",
  year: 2024,
  url: "https://doi.org/10.1123/ijsnem.2024-0027",
  kind: "review",
};

export const FERNANDEZ_LANDA_2023: NutritionSource = {
  citation:
    "Fernández-Landa J, Santibañez-Gutierrez A, Todorovic N, et al. Effects of creatine monohydrate on endurance performance in a trained population: a systematic review and meta-analysis. Sports Med 53(5):1017-1027.",
  year: 2023,
  url: "https://doi.org/10.1007/s40279-023-01823-2",
  kind: "review",
};

export const BARRANCO_GIL_2024: NutritionSource = {
  citation:
    "Barranco-Gil D, Alejo LB, Revuelta C, et al. High-dose short-term creatine supplementation without beneficial effects in professional cyclists: a randomized controlled trial. J Int Soc Sports Nutr 21(1):2340574.",
  year: 2024,
  url: "https://doi.org/10.1080/15502783.2024.2340574",
  kind: "studie",
};

export const FORBES_2023: NutritionSource = {
  citation:
    "Forbes SC, Candow DG, Neto JHF, et al. Creatine supplementation and endurance performance: surges and sprints to win the race. J Int Soc Sports Nutr 20(1):2204071.",
  year: 2023,
  url: "https://doi.org/10.1080/15502783.2023.2204071",
  kind: "review",
};

export const DAAB_2026: NutritionSource = {
  citation:
    "Daab W, Bouzid MA, Nassis GP, et al. Effects of tart cherry juice supplementation on recovery from exercise-induced muscle damage in athletes: a systematic review and meta-analysis. Sports Med Open 12(1).",
  year: 2026,
  url: "https://doi.org/10.1186/s40798-026-00993-3",
  kind: "review",
};

export const HAGELE_2026: NutritionSource = {
  citation:
    "Hagele AM, Levers KS, Holley KF, et al. Impact of powdered tart cherry supplementation on performance recovery following repeated sprint exercise. Nutrients 18(3):443.",
  year: 2026,
  url: "https://doi.org/10.3390/nu18030443",
  kind: "studie",
};

export const JERGER_2022: NutritionSource = {
  citation:
    "Jerger S, Centner C, Lauber B, et al. Effects of specific collagen peptide supplementation combined with resistance training on Achilles tendon properties. Scand J Med Sci Sports 32(7):1131-1141.",
  year: 2022,
  url: "https://doi.org/10.1111/sms.14164",
  kind: "studie",
};

export const BALSHAW_2023: NutritionSource = {
  citation:
    "Balshaw TG, Funnell MP, McDermott EJ, et al. The effect of specific bioactive collagen peptides on tendon remodeling during 15 wk of lower body resistance training. Med Sci Sports Exerc 55(11):2083-2095.",
  year: 2023,
  url: "https://doi.org/10.1249/MSS.0000000000003242",
  kind: "studie",
};

export const NUTRITION_ARTICLES: NutritionArticle[] = [
  {
    slug: "brandstof-volgens-training",
    category: "basis",
    evidence: "sterk",
    title: "Brandstof volgens de training",
    summary:
      "Hoeveel koolhydraten je nodig hebt, hangt af van wat je die dag en de dag erna rijdt. Het UCI-consensusstuk noemt dat eten naar het werk dat gedaan moet worden.",
    points: [
      "Rustige dag of korte, lichte rit: ongeveer 3–5 g koolhydraten per kg lichaamsgewicht.",
      "Ongeveer een uur matig trainen: 5–7 g/kg.",
      "Eén tot drie uur training met zwaardere blokken: 6–10 g/kg.",
      "Vier tot vijf uur of meer: 8–12 g/kg.",
      "Eiwit blijft elke dag ongeveer gelijk; koolhydraten schuiven mee met de training.",
      "Ook het soort eten schuift mee. Zware dag: koolhydraatrijk, licht verteerbaar, weinig vezels en weinig volume. Rustdag: meer eiwit, vezels, groente en fruit.",
      "Vet beweegt tegengesteld aan koolhydraten: weinig op zware dagen, wat meer op rustige dagen.",
      "Bewust met weinig koolhydraten trainen (train-low) verandert je stofwisseling, maar goed getrainde fietsers werden er in vijf weken niet sneller van dan met evenveel energie en veel koolhydraten. Doe het hooguit gericht, en nooit vóór sessies waar kwaliteit telt.",
    ],
    limits: [
      "De banden per dagtype komen uit consensusstukken; ze zijn niet per dagtype in proeven getest.",
      "Wat je nodig hebt hangt ook af van je tempo en van hoeveel je naast het fietsen beweegt.",
    ],
    sources: [
      UCI_POSITION,
      UCI_PERIODIZATION,
      {
        citation:
          "Impey SG, Hearris MA, Hammond KM, et al. Fuel for the Work Required: A Theoretical Framework for Carbohydrate Periodization and the Glycogen Threshold Hypothesis. Sports Med 48:1031–1048.",
        year: 2018,
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5889771/",
        kind: "review",
      },
      BURKE_2011,
      ACSM_2016,
      UCI_PLATE,
      PRIETO_BELLVER_2024,
      {
        citation:
          "Stellingwerff T, Morton JP, Burke LM. A Framework for Periodized Nutrition for Athletics. Int J Sport Nutr Exerc Metab 29(2):141.",
        year: 2019,
        url: "https://pubmed.ncbi.nlm.nih.gov/30632439/",
        kind: "review",
      },
    ],
  },
  {
    slug: "voor-de-rit",
    category: "op-de-fiets",
    evidence: "sterk",
    title: "Voor de rit en koolhydraatstapelen",
    summary:
      "Een koolhydraatrijke maaltijd een paar uur vooraf vult je lever- en spierglycogeen aan. Stapelen heeft pas zin voor inspanningen van meer dan ongeveer anderhalf uur.",
    points: [
      "Eén tot vier uur voor een zware of lange rit: ongeveer 1–4 g koolhydraten per kg, hoe dichter bij de start hoe minder.",
      "Kies dan vooral makkelijk verteerbaar. Veel vet of eiwit in de laatste één tot drie uur vertraagt je maag en geeft sneller klachten.",
      "Stapelen voor een wedstrijd of tocht van meer dan 90 minuten: 36–48 uur lang 10–12 g/kg.",
      "Voor een korte Zwift-race is stapelen niet nodig; een gewone koolhydraatrijke maaltijd volstaat.",
      "Probeer een nieuwe aanpak eerst op een training, nooit voor het eerst op de wedstrijddag.",
    ],
    limits: [
      "Hoeveel je vooraf verdraagt, verschilt sterk per persoon; de bandbreedte is daarom ruim.",
      "De winst van stapelen is gemeten bij inspanningen van meer dan ongeveer anderhalf uur, niet bij korte races.",
    ],
    sources: [UCI_POSITION, BURKE_2011, ACSM_2016, KERKSICK_2017],
  },
  {
    slug: "koolhydraten-tijdens-de-rit",
    category: "op-de-fiets",
    evidence: "sterk",
    title: "Koolhydraten tijdens de rit",
    summary:
      "Hoe langer de rit, hoe meer koolhydraten per uur zinvol zijn. Boven de 60 g per uur heb je een mix van glucose en fructose nodig.",
    points: [
      "Korter dan ongeveer een uur: extra koolhydraten zijn niet nodig. Bij een harde inspanning van 40–75 minuten kan spoelen met sportdrank (5–10 seconden in je mond) helpen.",
      "Eén tot tweeënhalf uur: 30–60 g per uur.",
      "Langer dan tweeënhalf uur: 60–90 g per uur, met 90 als doel als je het verdraagt.",
      "Tot 120 g per uur komt bij profs voor en vraagt darmtraining. Bij getrainde renners zakte hun critical power na drie uur minder met 120 dan met 60 g per uur; of dat in een wedstrijd winst geeft, is niet getest.",
      "Meer is niet vanzelf beter: bij recreanten werkte 40 g per uur na anderhalf uur rijden beter dan 90 g.",
      "Een verhouding fructose tot glucose van ongeveer 0,6–1,0 werkt het best. Gewone suiker is 1:1.",
      "Drank, gel of reep maakt voor de opname weinig uit; afwisselen helpt je maag.",
      "Het ≥100 g per uur van het profpeloton is niet zonder meer over te zetten naar recreanten.",
      "Boven 120 g per uur is nooit getest. Je verbrandt hooguit ongeveer 100 g per uur van wat je eet; de rest blijft in je darmen, en daar komen de klachten vandaan.",
    ],
    limits: [
      "De meeste proeven zijn gedaan met getrainde mannen in een lab.",
      "De banden zijn een startpunt; welke hoeveelheid voor jou het best werkt, verschilt per persoon.",
    ],
    sources: [
      UCI_POSITION,
      MORTON_2026_JNUTR,
      {
        citation:
          "Podlogar T, Wallis GA. New Horizons in Carbohydrate Research and Application for Endurance Athletes. Sports Med 52(Suppl 1):5–23.",
        year: 2022,
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9734239/",
        kind: "review",
      },
      WILSON_2025,
      {
        citation:
          "Jeukendrup AE, et al. UCI Sports Nutrition Project: Race Nutrition for Road Cycling. Int J Sport Nutr Exerc Metab.",
        year: 2026,
        url: "https://pubmed.ncbi.nlm.nih.gov/41911900/",
        kind: "review",
      },
      NORTE_2026,
      FLEITAS_PANIAGUA_2026,
      HEARRIS_2022,
      RAVIKANTI_2025,
    ],
  },
  {
    slug: "darmtraining",
    category: "op-de-fiets",
    evidence: "sterk",
    title: "Darmtraining en maagklachten",
    summary:
      "Je maag en darmen wennen aan eten tijdens inspanning. Wie structureel meer per uur wil opnemen, bouwt dat stap voor stap op.",
    points: [
      "Oefen op trainingen met de hoeveelheid en de producten die je op wedstrijddag wilt gebruiken.",
      "Verhoog in stappen van ongeveer 10–15 g per uur over een aantal weken.",
      "Bij hardlopers halveerden twee weken lang elke dag een uur met 90 g per uur de maagklachten ongeveer, en ze namen meer op.",
      "Wie 120 g per uur zonder klachten haalt, kan in een vervolgprotocol naar 150. Dat is profpraktijk, geen getest advies.",
      "Klachten nemen af als je binnen de aanbevolen hoeveelheden blijft en glucose en fructose mengt.",
      "Voor low-FODMAP-eten en probiotica is het bewijs nog beperkt.",
      "Bij aanhoudende klachten: overleg met een sportdiëtist of arts.",
    ],
    limits: [
      "Er is geen vast onderzocht schema; de stappen per week zijn een afleiding uit de reviews.",
      "De studies zijn klein en duren hooguit een paar weken. Ze gingen tot 90 g per uur, en bij topsporters gaf het geen extra prestatiewinst.",
    ],
    sources: [
      {
        citation: "Jeukendrup AE. Training the Gut for Athletes. Sports Med 47(Suppl 1):101–110.",
        year: 2017,
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5371619/",
        kind: "review",
      },
      COSTA_2017,
      MIALL_2018,
      MARTINEZ_2023,
      KING_2022,
      {
        citation:
          "Costa RJS, Gaskell SK, Henningsen K, et al. Sports Dietitians Australia and Ultra Sports Science Foundation Joint Position Statement: Exercise-Associated Gastrointestinal Perturbations and Symptoms. Sports Med 55:1097–1134.",
        year: 2025,
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12106582/",
        kind: "consensus",
      },
      {
        citation:
          "Nutritional strategies for minimizing gastrointestinal symptoms during endurance exercise: systematic review of the literature. J Int Soc Sports Nutr 22(1).",
        year: 2025,
        url: "https://www.tandfonline.com/doi/full/10.1080/15502783.2025.2529910",
        kind: "review",
      },
    ],
  },
  {
    slug: "vocht-en-zout",
    category: "op-de-fiets",
    evidence: "sterk",
    title: "Vocht en zout",
    summary:
      "Begin gehydrateerd en drink naar wat je zweet. Extra natrium is vooral nodig bij lange ritten en veel zweetverlies.",
    points: [
      "Weeg jezelf voor en na een rit: elke kilo verlies is ongeveer een liter vocht.",
      "Tot ongeveer anderhalf uur in gewoon weer volstaat drinken op dorst; in proeven reed dat even goed als een vast drinkschema.",
      "Bij lange of warme ritten loont een plan: drink zo dat je niet meer dan ongeveer 2% van je gewicht verliest, maar drink niet meer dan je zweet.",
      "Bij ritten tot een paar uur volstaat zout naar smaak in je gewone eten.",
      "Bij lange of hete ritten helpt natrium in je bidon. Zweetverlies verschilt sterk per persoon.",
      "Natrium voorladen heeft alleen in specifieke situaties in de hitte zin.",
    ],
    limits: [
      "Zweet- en zoutverlies verschillen zo sterk per persoon dat een algemeen getal weinig zegt; wegen voor en na zegt meer.",
      "Dat 2% vochtverlies prestatie kost, geldt vooral bij warmte en lange duur, niet bij korte ritten in koel weer.",
    ],
    sources: [
      {
        citation:
          "McCubbin AJ, Allanson BA, et al. Sports Dietitians Australia Position Statement: Nutrition for Exercise in Hot Environments. Int J Sport Nutr Exerc Metab 30(1):83.",
        year: 2020,
        url: "https://journals.humankinetics.com/view/journals/ijsnem/30/1/article-p83.xml",
        kind: "consensus",
      },
      {
        citation:
          "McCubbin AJ. Modelling sodium requirements of athletes across a variety of exercise scenarios. Eur J Sport Sci.",
        year: 2023,
        url: "https://onlinelibrary.wiley.com/doi/10.1080/17461391.2022.2083526",
        kind: "studie",
      },
      {
        citation:
          "Cheung S, et al. UCI Sports Nutrition Project: Special Environments. Int J Sport Nutr Exerc Metab.",
        year: 2025,
        url: "https://pubmed.ncbi.nlm.nih.gov/41468209/",
        kind: "review",
      },
      ACSM_2016,
      GOULET_2019,
      KENEFICK_2018,
    ],
  },
  {
    slug: "indoor-zwift",
    category: "op-de-fiets",
    evidence: "beperkt",
    title: "Indoor fietsen en Zwift",
    summary:
      "Binnen zweet je meer door gebrek aan rijwind, en races zijn vaak kort en hard. De UCI-review over esports beschrijft wat dat voor je eten en drinken betekent.",
    points: [
      "Zet een ventilator aan en zorg voor genoeg drinken binnen handbereik; je zweetverlies is binnen vaak hoger dan buiten.",
      "Korte races tot ongeveer een uur: een goede maaltijd vooraf is belangrijker dan eten tijdens de race.",
      "Langere groepsritten of races: dezelfde richtlijnen per uur als buiten.",
      "Eten gaat binnen makkelijker dan op de weg; dat maakt de trainer een goede plek voor darmtraining.",
      "Cafeïne kan ook bij korte, intensieve races helpen (zie supplementen).",
      "Droog jezelf niet uit voor een weging. Het vochttekort kost binnen, zonder rijwind, meer dan het lagere gewicht oplevert.",
    ],
    limits: [
      "Er zijn nauwelijks studies naar voeding bij Zwift-races; de adviezen komen van buitenwedstrijden en het UCI-stuk over esports.",
      "Hoeveel meer je binnen zweet, hangt af van je ventilator en de temperatuur in de kamer.",
    ],
    sources: [UCI_ESPORTS, UCI_POSITION, MORTON_2026_JNUTR],
  },
  {
    slug: "eiwit",
    category: "herstel",
    evidence: "matig",
    title: "Eiwit",
    summary:
      "Duursporters hebben meer eiwit nodig dan het algemene advies. Verdeel het over de dag en neem een portie voor het slapen.",
    points: [
      "Per dag: ongeveer 1,6–2,1 g eiwit per kg lichaamsgewicht, met 1,8 als midden.",
      "De bovenkant past op een rustdag na zwaar werk en in periodes waarin je weinig koolhydraten of energie binnenkrijgt.",
      "Per maaltijd: ongeveer 0,3–0,4 g/kg, verdeeld over vier tot vijf momenten. Dat is geen plafond: na 100 g eiwit maakte het lichaam meer en langer eiwit aan dan na 25 g. Verdelen helpt vooral om je dagtotaal te halen.",
      "Op dagen met heel veel koolhydraten is het dagtotaal lastig te halen. Haal het dan in op de rustdag.",
      "Ongeveer 40 g eiwit voor het slapen, bijvoorbeeld kwark, verhoogt de eiwitaanmaak 's nachts, ook na duurtraining. Bij profs die al veel eiwit aten, gaf het geen beter herstel of betere prestatie. Het is vooral een makkelijke manier om je dagtotaal te halen.",
      "Plantaardig kan ook; combineer bronnen en neem wat ruimere porties.",
    ],
    limits: [
      "De meeste eiwitstudies meten de eiwitaanmaak in de spier, niet of je er sneller van wordt.",
      "Het onderzoek naar de portie per maaltijd is vooral gedaan na krachttraining; voor duursporters is er geen goed getal.",
    ],
    sources: [
      UCI_POSITION,
      UCI_PERIODIZATION,
      {
        citation:
          "Kato H, et al. Protein Requirements Are Elevated in Endurance Athletes after Exercise as Determined by the Indicator Amino Acid Oxidation Method. PLoS One 11(6):e0157406.",
        year: 2016,
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4913918/",
        kind: "studie",
      },
      {
        citation:
          "Morton RW, Murphy KT, McKellar SR, et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. Br J Sports Med 52(6):376–384.",
        year: 2018,
        url: "https://pubmed.ncbi.nlm.nih.gov/28698222/",
        kind: "review",
      },
      SNIJDERS_2019,
      {
        citation:
          "Trommelen J, van Lieshout GAA, Pabla P, et al. Pre-sleep Protein Ingestion Increases Mitochondrial Protein Synthesis Rates During Overnight Recovery from Endurance Exercise: A Randomized Controlled Trial. Sports Med 53:1445–1455.",
        year: 2023,
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10289916/",
        kind: "studie",
      },
      KERKSICK_2017,
      WITARD_2025,
      TROMMELEN_2023_DOSE,
      VALENZUELA_2023,
    ],
  },
  {
    slug: "herstel",
    category: "herstel",
    evidence: "sterk",
    title: "Herstel tussen sessies",
    summary:
      "Heb je binnen ongeveer acht uur weer een zware sessie, dan telt snel aanvullen. Met meer tijd telt vooral wat je die dag in totaal eet.",
    points: [
      "Snel herstel nodig: 1,0–1,2 g koolhydraten per kg per uur in de eerste vier uur, in kleine porties.",
      "Neem er eiwit bij, ongeveer 0,3 g/kg, voor je spierherstel en je dagtotaal. Bij genoeg koolhydraten vult eiwit je glycogeen niet sneller aan.",
      "Volgende zware sessie pas morgen: gewone maaltijden met genoeg koolhydraten volstaan.",
      "Chocolademelk of kwark met fruit zijn praktische opties direct na de rit.",
      "In een kleine studie met duursporters hielden ze het de dag na een uitputtende rit langer vol als ze in de eerste twee uur eiwit én koolhydraten namen, in plaats van evenveel energie uit alleen koolhydraten. In een andere proef gaf eiwit erbij vijf uur later geen betere tijdrit.",
      "Een eiwitshake is handig onderweg, maar niet beter dan gewoon eten met evenveel eiwit.",
      "Meer dan 2% van je gewicht verloren aan zweet? Drink in de vier tot zes uur erna 125–150% van dat verlies.",
      "Zout in je herstelmaaltijd of -drank helpt het vocht vast te houden.",
    ],
    limits: [
      "Dat eiwit erbij de prestatie de dag erna helpt, rust op één kleine studie; een andere proef vond geen verschil.",
      "De 1,0–1,2 g/kg per uur is getest bij renners die leeg gereden waren; na een gewone training is haast niet nodig.",
    ],
    sources: [UCI_POSITION, ACSM_2016, KERKSICK_2017, UCI_PERIODIZATION, RUSTAD_2016, SOLLIE_2023, WITARD_2025],
  },
  {
    slug: "genoeg-eten-reds",
    category: "gezondheid",
    evidence: "sterk",
    title: "Genoeg eten: energiebeschikbaarheid en REDs",
    summary:
      "Structureel te weinig eten voor je training schaadt je gezondheid én je prestatie. Wielrenners lopen extra risico door de focus op een laag gewicht.",
    points: [
      "Bij REDs (Relative Energy Deficiency in Sport) houdt je lichaam na de training te weinig energie over voor gewone functies.",
      "Gevolgen kunnen zijn: minder sterke botten, hormonale verstoringen, vaker ziek, slechter herstel en lagere prestaties. Dat geldt voor vrouwen én mannen.",
      "Signalen: aanhoudende vermoeidheid, stagnerende vorm, vaker blessures of ziek, bij vrouwen een onregelmatige of uitblijvende menstruatie.",
      "Afvallen tijdens zware trainingsblokken vergroot het risico.",
      "Herken je dit? Ga naar een sportarts of sportdiëtist. ZWB geeft bewust geen afvaladvies.",
    ],
    limits: [
      "Energiebeschikbaarheid is buiten een lab moeilijk te meten; er is geen betrouwbare thuistest.",
      "Over mannelijke recreanten is minder bekend dan over vrouwen en profs.",
    ],
    sources: [
      REDS_2023,
      {
        citation:
          "Burke LM, et al. UCI Sports Nutrition Project: Body Composition, Energy Requirements, and Energy Availability in Cycling. Int J Sport Nutr Exerc Metab.",
        year: 2026,
        url: "https://pubmed.ncbi.nlm.nih.gov/41911915/",
        kind: "review",
      },
      UCI_POSITION,
    ],
  },
  {
    slug: "vrouwen",
    category: "gezondheid",
    evidence: "matig",
    title: "Vrouwen en voeding",
    summary:
      "Voor vrouwelijke renners verdienen ijzer en genoeg energie extra aandacht. Algemene voedingsregels per cyclusfase zijn niet te onderbouwen.",
    points: [
      "IJzertekort komt bij vrouwelijke duursporters vaker voor; laat bij klachten je bloed prikken.",
      "Een onregelmatige of uitblijvende menstruatie kan wijzen op te weinig energie. Ga daarmee naar een arts.",
      "Het effect van cyclusfase op prestatie is gemiddeld triviaal en verschilt sterk per persoon. Bij duursporters van wie de cyclus met bloedmetingen was bevestigd, vond een studie geen verschil tussen de fases.",
      "Houd liever bij hoe jij je voelt, bijvoorbeeld in het logboek, dan algemene fase-regels te volgen.",
      "Klachten zoals krampen, een opgeblazen gevoel of vermoeidheid lijken meer uit te maken dan de fase zelf. Pas je eten aan op de klacht, bijvoorbeeld minder vet en minder scherp gekruid bij darmklachten.",
      "Wees voorzichtig met apps die je training of eten alleen op cyclusfase aanpassen.",
    ],
    limits: [
      "Bijna alle studies zijn klein, en lang niet allemaal bevestigen ze de cyclusfase met een bloedmeting.",
      "Over vrouwen die hormonale anticonceptie gebruiken, is minder bekend.",
    ],
    sources: [
      {
        citation:
          "Sims ST, Kerksick CM, Smith-Ryan AE, et al. International society of sports nutrition position stand: nutritional concerns of the female athlete. J Int Soc Sports Nutr 20(1):2204066.",
        year: 2023,
        url: "https://www.tandfonline.com/doi/full/10.1080/15502783.2023.2204066",
        kind: "consensus",
      },
      {
        citation:
          "McNulty KL, Elliott-Sale KJ, Dolan E, et al. The Effects of Menstrual Cycle Phase on Exercise Performance in Eumenorrheic Women: A Systematic Review and Meta-Analysis. Sports Med 50:1813–1827.",
        year: 2020,
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7497427/",
        kind: "review",
      },
      UCI_POSITION,
      REDS_2023,
      TAYLOR_2024,
    ],
  },
  {
    slug: "ijzer",
    category: "gezondheid",
    evidence: "matig",
    title: "IJzer",
    summary:
      "IJzer is nodig voor zuurstoftransport. Tekorten komen bij duursporters vaak voor, maar suppleren doe je alleen op basis van bloedwaarden.",
    points: [
      "Vooral vrouwen, veel trainende renners en wie weinig of geen vlees eet, lopen risico.",
      "Goede bronnen: rood vlees, peulvruchten, volkorenproducten en groene groenten. Vitamine C bij de maaltijd helpt de opname.",
      "Thee en koffie bij de maaltijd remmen de opname.",
      "Slik geen ijzer op eigen houtje: te veel ijzer is ook schadelijk. Laat eerst je ferritine en hemoglobine meten.",
      "Schrijft je arts ijzer voor, dan gaf om de dag innemen even goede waarden met minder maagklachten dan elke dag.",
    ],
    limits: [
      "Welke ferritinewaarde voor sporters te laag is, staat niet vast; artsen hanteren verschillende grenzen.",
      "De studie naar om de dag innemen ging over jonge vrouwen met een tekort, niet specifiek over sporters.",
    ],
    sources: [
      {
        citation:
          "Sim M, Garvican-Lewis LA, Cox GR, et al. Iron considerations for the athlete: a narrative review. Eur J Appl Physiol 119(7):1463–1478.",
        year: 2019,
        url: "https://pubmed.ncbi.nlm.nih.gov/31055680/",
        kind: "review",
      },
      VON_SIEBENTHAL_2023,
    ],
  },
  {
    slug: "botgezondheid",
    category: "gezondheid",
    evidence: "matig",
    title: "Botgezondheid",
    summary:
      "Wielrenners hebben gemiddeld een lagere botdichtheid dan andere sporters. Fietsen belast je botten nauwelijks, en lange ritten verhogen de botafbraak.",
    points: [
      "Genoeg eten is de basis: te weinig energie, en vooral te weinig koolhydraten, verstoort de botstofwisseling.",
      "Calcium: 800–1200 mg per dag. Zuivel, verrijkte plantaardige zuivel, groene groenten en noten leveren het meeste.",
      "Een calciumrijke maaltijd twee uur voor een lange rit remde in een studie met wielrensters de botafbraakwaarden in het bloed tijdens het fietsen. Of dat op termijn je botten sterker maakt, is niet onderzocht.",
      "Vitamine D komt uit zonlicht, vette vis en verrijkte producten. Laat bij twijfel je bloedwaarde meten; streefwaarde boven 50 en liefst 75 nmol/l.",
      "Eiwit (1,6–2,1 g/kg per dag) is ook voor je botten nodig.",
      "Dit geldt extra voor jonge renners, die nog botmassa opbouwen, en voor oudere renners.",
    ],
    limits: [
      "Dat een calciumrijke maaltijd vooraf je botten op termijn sterker maakt, is niet onderzocht; de studie mat bloedwaarden tijdens één rit.",
      "Studies die de botten van renners jarenlang volgen naast hun voeding, ontbreken.",
    ],
    sources: [UCI_BONE, UCI_POSITION, REDS_2023, HAAKONSSEN_2015],
  },
  {
    slug: "weerstand",
    category: "gezondheid",
    evidence: "matig",
    title: "Weerstand en ziek zijn",
    summary:
      "Verkoudheid en griep komen bij renners vaker voor in zware trainings- en wedstrijdperiodes. Genoeg energie en koolhydraten zijn de belangrijkste voedingsfactor.",
    points: [
      "Te weinig energie of koolhydraten rond zware training verzwakt je afweer.",
      "Eiwit, ijzer, zink, vitamine C, vitamine D en omega-3-vetzuren spelen een rol. Een gevarieerd menu met groente, fruit, vis en volkoren dekt dat.",
      "Voor probiotica is het bewijs bij sporters wisselend.",
      "Vitamine C halveerde in een Cochrane-review het aantal verkoudheden bij mensen onder zware fysieke belasting, zoals marathonlopers. Bij gewone mensen was er geen effect, en pas beginnen als je al verkouden bent hielp niet.",
      "Zinkzuigtabletten bij de eerste klachten maken een verkoudheid misschien een paar dagen korter, maar het bewijs is onzeker en misselijkheid of een vieze smaak komt vaak voor.",
      "Antioxidanten als supplement kunnen trainingsaanpassing afremmen; bewaar ze voor periodes waarin snel herstel telt. Uit gewone voeding is dat geen punt.",
      "Slaap en stress tellen mee voor je afweer.",
    ],
    limits: [
      "Het effect van vitamine C geldt voor mensen onder zware fysieke belasting, in kleine studies; bij clubrenners is het niet apart onderzocht.",
      "Het bewijs voor zink is onzeker.",
    ],
    sources: [UCI_ILLNESS, UCI_POSITION, HEMILA_2013, NAULT_2024, PAULSEN_2014],
  },
  {
    slug: "masters",
    category: "gezondheid",
    evidence: "matig",
    title: "Ouder worden als renner",
    summary:
      "Met de jaren reageren spieren minder sterk op training en eiwit, en nemen spier- en botmassa af. Eten kan dat afremmen.",
    points: [
      "Eiwit wordt belangrijker: haal je dagtotaal en verdeel het over de dag.",
      "Genoeg energie, calcium en vitamine D tellen zwaarder, omdat veel fietsen en ouder worden allebei aan je botten trekken. Rond de overgang geldt dat extra.",
      "Dorst wordt een minder betrouwbaar signaal. Drink in de hitte volgens plan in plaats van op gevoel.",
    ],
    limits: [
      "Er zijn weinig studies met oudere renners zelf; de adviezen komen vooral uit onderzoek bij oudere niet-sporters.",
      "Welke portie eiwit per maaltijd een oudere renner nodig heeft, staat niet vast.",
    ],
    sources: [
      UCI_POSITION,
      UCI_BONE,
      {
        citation:
          "Aragon AA, Tipton KD, Schoenfeld BJ. Age-related muscle anabolic resistance: inevitable or preventable? Nutr Rev 81(4):441–454.",
        year: 2023,
        url: "https://doi.org/10.1093/nutrit/nuac062",
        kind: "review",
      },
    ],
  },
  {
    slug: "supplementen",
    category: "supplementen",
    evidence: "sterk",
    title: "Supplementen en sportvoeding",
    summary:
      "Eerst de basisvoeding op orde. Een klein aantal supplementen is voor wielrennen stevig onderbouwd, elk voor een specifieke situatie. Voor herstel en gezondheid is het bewijs dunner.",
    points: [
      "Stevig onderbouwd voor prestatie: cafeïne, creatine, natriumbicarbonaat en bèta-alanine. Onderbouwd: nitraat (bietensap) en glycerol. Voor elk staat een protocol.",
      "Sportdrank, gels, repen, elektrolyten en eiwitpoeder zijn gewone sportvoeding: handig, maar niet beter dan gewoon eten met dezelfde inhoud.",
      "IJzer, calcium en vitamine D alleen bij een tekort of een duidelijk risico. Voor vitamine D in de winter staat een protocol.",
      "Het bewijs is dun of wisselend: kersensap en andere polyfenolen, collageen, visolie, probiotica, curcumine en menthol. Kersensap en collageen hebben een protocol.",
      "Geen of te weinig bewijs: BCAA's, magnesium tegen kramp, CBD en ketonen.",
      "Supplementen kunnen verontreinigd zijn met verboden stoffen. Kies bij voorkeur NZVT-geteste batches.",
      "Supplementprotocollen zijn er vanaf 18 jaar. Daaronder zijn eten en sportvoeding genoeg.",
      "ZWB noemt bewust geen merken.",
    ],
    limits: [
      "Het bewijs per supplement komt vooral van getrainde mannen.",
      "Effecten zijn gemiddelden: de ene renner reageert wel, de andere niet.",
    ],
    sources: [IOC_SUPPLEMENTS, UCI_SUPPLEMENTS, GUEST_2021_NUTRITION, AIS_FRAMEWORK, NZVT],
  },
  {
    slug: "kersensap",
    category: "supplementen",
    evidence: "matig",
    title: "Kersensap en andere polyfenolen",
    summary:
      "Zuur kersensap kan je kracht na een zware inspanning sneller terugbrengen, maar alleen als je er een paar dagen vóór begint. Alleen na de wedstrijd drinken is niet onderbouwd.",
    points: [
      "Een meta-analyse vond sneller herstel van kracht en vermogen na zware inspanning, en een kleiner effect op spierpijn. Een nieuwere meta-analyse van negentien proeven bevestigt het herstel van kracht, met lage tot matige zekerheid.",
      "Een review van vijftien studies: de winst kwam steeds als het sap al een paar dagen vóór de inspanning werd gedronken. Voor alleen achteraf drinken is geen bewijs. Kersenpoeder werkte niet, ook niet in een recente proef.",
      "Bij wielrenners die drie dagen achter elkaar zware ritten reden, daalden de ontstekingswaarden; hun tijdrit werd niet beter.",
      "In de studies: twee keer per dag 30 ml concentraat of een glas sap, vanaf vier à vijf dagen voor tot twee dagen na de inspanning.",
      "Voor prestatie zelf is het bewijs dun: een meta-analyse zag een klein effect op duurprestatie, in kleine studies en zonder verband met de dosis.",
      "Gebruik het rond wedstrijden en zware blokken, niet het hele jaar. Hoge doses vitamine C en E remden in een studie de aanpassing aan duurtraining; voor kersensap is dat niet onderzocht.",
      "Curcumine verminderde in een meta-analyse spierpijn en bloedwaarden van spierschade, maar de studies zijn klein. Daarvoor staat geen protocol.",
    ],
    limits: [
      "Kleine studies, een deel betaald door de kersenindustrie.",
      "Of het effect blijft bij langer gebruik, en of het de aanpassing aan training remt, is niet onderzocht.",
    ],
    sources: [HILL_2021, MCHUGH_2022, BELL_2014, HOWATSON_2010, GAO_2020, PAULSEN_2014, BEBA_2022, DAAB_2026, HAGELE_2026],
  },
  {
    slug: "collageen",
    category: "supplementen",
    evidence: "beperkt",
    title: "Collageen en gelatine",
    summary:
      "Gelatine of collageen met vitamine C, een uur voor korte belasting, verhoogt de aanmaak van collageen. Bij een pees- of bandblessure is het een redelijke aanvulling, geen bewezen behandeling.",
    points: [
      "In een studie met acht mannen verdubbelde 15 gram gelatine met vitamine C, een uur voor zes minuten touwtjespringen, een bloedwaarde voor collageenaanmaak. 5 gram deed minder.",
      "Een meta-analyse vond dat collageen naast maandenlange krachttraining kleine winst gaf in kracht en spieropbouw en een dikkere pees. Dat ging over krachttraining, niet over fietsen.",
      "Losse proeven spreken elkaar tegen: 5 g per dag gaf een dikkere achillespees, 15 g per dag deed niets extra voor de kniepees.",
      "Dat een blessure er sneller door geneest, is niet aangetoond.",
      "Fietsen belast pezen weinig. Het ligt vooral voor de hand bij revalidatie, bijvoorbeeld na een val, naast de oefeningen van je fysiotherapeut.",
    ],
    limits: [
      "De studie met gelatine voor het oefenen had acht proefpersonen en mat een bloedwaarde, niet de pees zelf.",
      "Geen van de proeven ging over wielrenners.",
    ],
    sources: [SHAW_2017, BISCHOF_2024, IOC_SUPPLEMENTS, JERGER_2022, BALSHAW_2023],
  },
  {
    slug: "vitamine-d",
    category: "supplementen",
    evidence: "matig",
    title: "Vitamine D",
    summary:
      "Vitamine D maak je vooral aan in de zon. Wie weinig buiten komt, heeft volgens de Gezondheidsraad baat bij een supplement; train je in de winter vooral binnen, dan val je daar waarschijnlijk ook onder.",
    points: [
      "Het advies van de Gezondheidsraad: 10 microgram per dag voor wie weinig buiten komt of een donkere huid heeft, 20 microgram vanaf 70 jaar.",
      "Extra vitamine D helpt je prestatie alleen als je een tekort hebt. Bij een goede waarde levert het niets op.",
      "Neem geen hoge doses op eigen houtje. Reviewers wijzen erop dat zeer hoge doses ook nadelen kunnen hebben, en dat routinematig meten zonder klachten weinig zin heeft.",
      "Vette vis en verrijkte producten leveren ook vitamine D.",
      "Vitamine D en calcium tellen samen voor je botten; zie botgezondheid.",
    ],
    limits: [
      "Of extra vitamine D in de winter blessures of ziekte bij renners voorkomt, is niet aangetoond.",
      "Het advies van de Gezondheidsraad gaat over wie weinig buiten komt; dat dit geldt voor wie in de winter binnen traint, is een afleiding van ZWB.",
    ],
    sources: [GR_VITAMINE_D, OWENS_2018, UCI_BONE],
  },
  {
    slug: "omega-3",
    category: "supplementen",
    evidence: "beperkt",
    title: "Visolie en omega-3",
    summary:
      "Omega-3-vetzuren uit vis zijn goed voor je gezondheid. Als supplement voor prestatie is het bewijs mager; eet liever vette vis.",
    points: [
      "Er zijn aanwijzingen voor sneller herstel na spierbeschadigende inspanning en een iets lager zuurstofverbruik, maar de meeste claims rusten op mechanismen, niet op prestatiestudies.",
      "Voor spieropbouw of spierbehoud bij sporters is onvoldoende bewijs.",
      "Eén keer per week vis, bij voorkeur vette vis, staat al in de Nederlandse richtlijnen (zie gezonde basis).",
      "Eet je geen vis, dan is een supplement met EPA en DHA een vervanger voor je gezondheid, niet voor je prestatie.",
      "Er is geen dosis met aangetoonde winst voor wielrenners, dus geen protocol.",
    ],
    limits: [
      "Prestatiestudies zijn klein en zelden bij fietsers gedaan.",
      "Of visolie iets toevoegt voor wie al vis eet, is niet aangetoond.",
    ],
    sources: [PHILPOTT_2019, IOC_SUPPLEMENTS],
  },
  {
    slug: "probiotica",
    category: "supplementen",
    evidence: "beperkt",
    title: "Probiotica",
    summary:
      "Probiotica kunnen bij sommige sporters luchtweginfecties en darmklachten iets verminderen, maar het effect hangt af van de bacteriestam en is wisselend.",
    points: [
      "Het ISSN-standpunt ziet mogelijke voordelen voor afweer en darmklachten, steeds voor een bepaalde stam. Wat voor de ene stam geldt, geldt niet voor een andere.",
      "ZWB noemt geen merken en dus geen stammen; daarom staat er geen protocol.",
      "Yoghurt, kwark en kefir horen gewoon bij gevarieerd eten.",
    ],
    limits: [
      "Elk effect geldt voor een bepaalde stam en dosis; een resultaat is niet over te zetten op een ander product.",
      "De studies bij sporters zijn klein en lopen kort.",
    ],
    sources: [JAGER_2019, UCI_ILLNESS],
  },
  {
    slug: "mondspoelen",
    category: "supplementen",
    evidence: "matig",
    title: "Mondspoelen met koolhydraten of menthol",
    summary:
      "Spoelen zonder door te slikken geeft je hersenen een seintje. Bij een korte tijdrit of in de hitte is er een klein effect.",
    points: [
      "Koolhydraten: spoel met sportdrank en spuug uit. In een meta-analyse van tijdritten steeg het gemiddelde vermogen iets, maar de finishtijd niet.",
      "Het heeft alleen zin bij een korte, harde inspanning waarin je niet wilt eten. Bij een rit van meer dan een uur neem je beter gewoon koolhydraten.",
      "Menthol: een meta-analyse vond in de hitte een klein voordeel, vooral bij inname via de mond, en een koeler gevoel. Het effect op prestatie lag op de grens van significant.",
      "Probeer het eerst op een training. Geen protocol: het effect is klein en hangt sterk af van de situatie.",
    ],
    limits: [
      "Spoelen met koolhydraten gaf een iets hoger vermogen, maar geen snellere tijd.",
      "Menthol is vooral in de hitte getest.",
    ],
    sources: [BRIETZKE_2019, JEFFRIES_2019],
  },
  {
    slug: "geen-bewijs",
    category: "supplementen",
    evidence: "matig",
    conclusion: "geen-effect",
    title: "Wat niet werkt",
    summary:
      "Een aantal populaire supplementen heeft geen of te weinig bewijs. Zonde van je geld, en elk supplement is een risico op verontreiniging.",
    points: [
      "BCAA's: geen studie laat zien dat losse BCAA's de spieropbouw verhogen. Gewoon eiwit bevat ze al.",
      "Magnesium tegen kramp: in een Cochrane-review verminderde het de kramp niet, al ging het vooral om nachtelijke kramp bij ouderen. Voor kramp tijdens het sporten is geen bewijs.",
      "CBD: er zijn geen studies naar CBD en sportprestatie. CBD staat niet op de dopinglijst, THC wel.",
      "Vitamine C en E in hoge doses: remden in een studie de aanpassing aan duurtraining.",
      "Ketonen: geen effect op prestatie, zie het artikel over ketonen.",
    ],
    limits: [
      "Geen bewijs betekent hier: niet onderzocht, of onderzocht zonder effect bij gezonde sporters.",
      "De Cochrane-review over magnesium ging vooral over nachtelijke kramp bij ouderen.",
    ],
    sources: [WOLFE_2017, GARRISON_2020, MCCARTNEY_2020, PAULSEN_2014],
  },
  {
    slug: "ketonen",
    category: "supplementen",
    evidence: "sterk",
    conclusion: "geen-effect",
    title: "Ketonen",
    summary:
      "Ketondrankjes verhogen de ketonen in je bloed, maar maken je in een wedstrijd niet sneller. ZWB raadt ze af.",
    points: [
      "Een meta-analyse van dertien proeven vond geen effect op prestatie, ook niet op tijdritten en niet voor ketonesters. Een nieuwere meta-analyse vond hetzelfde voor een drankje vlak voor of tijdens de inspanning.",
      "Na elke training in een zwaar blok van drie weken remde een ketonester de signalen van overbelasting, en de renners hielden meer vol. Dat is één onderzoeksgroep met kleine groepen mannen.",
      "Ze zijn duur en het bewijs voor herstel is dun; daarom staat er geen protocol voor in ZWB.",
    ],
    limits: [
      "Het herstelonderzoek komt van één groep, met kleine aantallen mannen en een trainingsbelasting die clubrenners zelden halen.",
    ],
    sources: [
      {
        citation:
          "Valenzuela PL, Morales JS, Castillo-García A, Lucia A. Acute ketone supplementation and exercise performance: a systematic review and meta-analysis of randomized controlled trials. Int J Sports Physiol Perform 15(3):298–308.",
        year: 2020,
        url: "https://doi.org/10.1123/ijspp.2019-0918",
        kind: "review",
      },
      BROOKS_2022,
      POFFE_2019,
    ],
  },
  {
    slug: "low-carb-keto",
    category: "basis",
    evidence: "matig",
    conclusion: "nadelig",
    title: "Low-carb en keto",
    summary:
      "Ketogeen eten laat je meer vet verbranden, maar je wordt er bij wedstrijdtempo minder efficiënt van. Voor prestatie is het af te raden.",
    points: [
      "In een studie met toprenners op een ketogeen dieet steeg de vetverbranding flink.",
      "Tegelijk kostte hetzelfde tempo meer zuurstof, en het prestatievoordeel van het trainingsblok verdween.",
      "De groepen met veel of gericht geperiodiseerde koolhydraten werden wél sneller.",
      "Gericht een sessie met weinig koolhydraten doen is iets anders dan structureel low-carb eten; zie brandstof volgens de training.",
    ],
    limits: [
      "De hoofdstudie ging over snelwandelaars van wereldniveau, niet over fietsers.",
      "Over effecten op lange termijn bij recreanten is weinig bekend.",
    ],
    sources: [
      {
        citation:
          "Burke LM, Ross ML, Garvican-Lewis LA, et al. Low carbohydrate, high fat diet impairs exercise economy and negates the performance benefit from intensified training in elite race walkers. J Physiol 595(9):2785–2807.",
        year: 2017,
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5407976/",
        kind: "studie",
      },
      UCI_PERIODIZATION,
    ],
  },
  {
    slug: "gezonde-basis",
    category: "basis",
    evidence: "sterk",
    title: "Gezonde basis",
    summary:
      "Sportvoeding bouwt voort op gewoon gezond eten. De Nederlandse richtlijnen gelden ook voor renners; je eet er alleen meer bij.",
    points: [
      "Eet dagelijks ruim groente en fruit, volkorenproducten, peulvruchten en een handje ongezouten noten.",
      "Eet één keer per week vis, bij voorkeur vette vis.",
      "Beperk rood en bewerkt vlees en suikerhoudende dranken buiten de fiets.",
      "Suiker en snelle koolhydraten hebben op en rond de fiets een functie; daarbuiten kies je liever de volkorenvariant.",
      "De voedingswaarden in de recepten komen uit het Nederlands Voedingsstoffenbestand (NEVO) van het RIVM.",
    ],
    limits: [
      "De Richtlijnen goede voeding gaan over de gezondheid van de hele bevolking, niet over prestatie.",
    ],
    sources: [
      {
        citation: "Gezondheidsraad. Richtlijnen goede voeding 2015. Den Haag.",
        year: 2015,
        url: "https://www.gezondheidsraad.nl/documenten/2015/11/04/richtlijnen-goede-voeding-2015",
        kind: "richtlijn",
      },
      {
        citation: "RIVM. NEVO-online versie 2025/9.0. Bilthoven.",
        year: 2025,
        url: "https://www.rivm.nl/nederlands-voedingsstoffenbestand",
        kind: "richtlijn",
      },
      UCI_PLATE,
    ],
  },
];

export function articleBySlug(slug: string): NutritionArticle | null {
  return NUTRITION_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function articlesByCategory(): { category: NutritionCategory; articles: NutritionArticle[] }[] {
  return NUTRITION_CATEGORIES.map((category) => ({
    category,
    articles: NUTRITION_ARTICLES.filter((article) => article.category === category),
  })).filter((group) => group.articles.length > 0);
}
