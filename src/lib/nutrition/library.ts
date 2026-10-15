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

export const EVIDENCE_KINDS = ["consensus", "review", "studie", "richtlijn"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_LABELS: Record<EvidenceKind, string> = {
  consensus: "Consensus",
  review: "Review",
  studie: "Studie",
  richtlijn: "Richtlijn",
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
  title: string;
  summary: string;
  points: string[];
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

const MORTON_2026_JNUTR: NutritionSource = {
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

export const NUTRITION_ARTICLES: NutritionArticle[] = [
  {
    slug: "brandstof-volgens-training",
    category: "basis",
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
      "Bewust met weinig koolhydraten trainen (train-low) kan adaptaties versterken, maar alleen gericht en niet vóór sessies waar kwaliteit telt.",
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
    sources: [UCI_POSITION, BURKE_2011, ACSM_2016, KERKSICK_2017],
  },
  {
    slug: "koolhydraten-tijdens-de-rit",
    category: "op-de-fiets",
    title: "Koolhydraten tijdens de rit",
    summary:
      "Hoe langer de rit, hoe meer koolhydraten per uur zinvol zijn. Boven de 60 g per uur heb je een mix van glucose en fructose nodig.",
    points: [
      "Korter dan ongeveer een uur: extra koolhydraten zijn niet nodig. Bij een harde inspanning van 40–75 minuten kan spoelen met sportdrank (5–10 seconden in je mond) helpen.",
      "Eén tot tweeënhalf uur: 30–60 g per uur.",
      "Langer dan tweeënhalf uur: 60–90 g per uur, met 90 als doel als je het verdraagt.",
      "Tot 120 g per uur komt bij profs voor en vraagt darmtraining. Of het extra oplevert, is nog niet aangetoond.",
      "Een verhouding fructose tot glucose van ongeveer 0,6–1,0 werkt het best. Gewone suiker is 1:1.",
      "Drank, gel of reep maakt voor de opname weinig uit; afwisselen helpt je maag.",
      "Het ≥100 g per uur van het profpeloton is niet zonder meer over te zetten naar recreanten.",
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
      {
        citation:
          "Wilson PB. A Narrative Review of the High-Carbohydrate Fueling Revolution (≥100 g/h) in the Professional Peloton. Sports Med 56(2):295–313.",
        year: 2025,
        url: "https://link.springer.com/article/10.1007/s40279-025-02372-6",
        kind: "review",
      },
      {
        citation:
          "Jeukendrup AE, et al. UCI Sports Nutrition Project: Race Nutrition for Road Cycling. Int J Sport Nutr Exerc Metab.",
        year: 2026,
        url: "https://pubmed.ncbi.nlm.nih.gov/41911900/",
        kind: "review",
      },
    ],
  },
  {
    slug: "darmtraining",
    category: "op-de-fiets",
    title: "Darmtraining en maagklachten",
    summary:
      "Je maag en darmen wennen aan eten tijdens inspanning. Wie structureel meer per uur wil opnemen, bouwt dat stap voor stap op.",
    points: [
      "Oefen op trainingen met de hoeveelheid en de producten die je op wedstrijddag wilt gebruiken.",
      "Verhoog in stappen van ongeveer 10–15 g per uur over een aantal weken.",
      "Klachten nemen af als je binnen de aanbevolen hoeveelheden blijft en glucose en fructose mengt.",
      "Voor low-FODMAP-eten en probiotica is het bewijs nog beperkt.",
      "Bij aanhoudende klachten: overleg met een sportdiëtist of arts.",
    ],
    sources: [
      {
        citation: "Jeukendrup AE. Training the Gut for Athletes. Sports Med 47(Suppl 1):101–110.",
        year: 2017,
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5371619/",
        kind: "review",
      },
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
    title: "Vocht en zout",
    summary:
      "Begin gehydrateerd en drink naar wat je zweet. Extra natrium is vooral nodig bij lange ritten en veel zweetverlies.",
    points: [
      "Weeg jezelf voor en na een rit: elke kilo verlies is ongeveer een liter vocht.",
      "Drink tijdens lange ritten zo dat je niet meer dan ongeveer 2% van je gewicht verliest, maar drink niet meer dan je zweet.",
      "Bij ritten tot een paar uur volstaat zout naar smaak in je gewone eten.",
      "Bij lange of hete ritten helpt natrium in je bidon. Zweetverlies verschilt sterk per persoon.",
      "Natrium voorladen heeft alleen in specifieke situaties in de hitte zin.",
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
    ],
  },
  {
    slug: "indoor-zwift",
    category: "op-de-fiets",
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
    sources: [UCI_ESPORTS, UCI_POSITION, MORTON_2026_JNUTR],
  },
  {
    slug: "eiwit",
    category: "herstel",
    title: "Eiwit",
    summary:
      "Duursporters hebben meer eiwit nodig dan het algemene advies. Verdeel het over de dag en neem een portie voor het slapen.",
    points: [
      "Per dag: ongeveer 1,6–2,1 g eiwit per kg lichaamsgewicht.",
      "De bovenkant past op een rustdag na zwaar werk en in periodes waarin je weinig koolhydraten of energie binnenkrijgt.",
      "Per maaltijd: ongeveer 0,3–0,4 g/kg, verdeeld over vier tot vijf momenten. Of die verdeling op lange termijn extra oplevert is onzeker; het helpt wel om je dagtotaal te halen.",
      "Op dagen met heel veel koolhydraten is het dagtotaal lastig te halen. Haal het dan in op de rustdag.",
      "Ongeveer 40 g eiwit voor het slapen, bijvoorbeeld kwark, verhoogt de eiwitaanmaak 's nachts, ook na duurtraining.",
      "Plantaardig kan ook; combineer bronnen en neem wat ruimere porties.",
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
    ],
  },
  {
    slug: "herstel",
    category: "herstel",
    title: "Herstel tussen sessies",
    summary:
      "Heb je binnen ongeveer acht uur weer een zware sessie, dan telt snel aanvullen. Met meer tijd telt vooral wat je die dag in totaal eet.",
    points: [
      "Snel herstel nodig: 1,0–1,2 g koolhydraten per kg per uur in de eerste vier uur, in kleine porties.",
      "Neem er eiwit bij, ongeveer 0,3 g/kg; dat helpt spierherstel en maakt snel aanvullen makkelijker.",
      "Volgende zware sessie pas morgen: gewone maaltijden met genoeg koolhydraten volstaan.",
      "Chocolademelk of kwark met fruit zijn praktische opties direct na de rit.",
      "In een kleine studie met duursporters hielden ze het de dag na een uitputtende rit langer vol als ze in de eerste twee uur eiwit én koolhydraten namen, in plaats van evenveel energie uit alleen koolhydraten.",
      "Een eiwitshake is handig onderweg, maar niet beter dan gewoon eten met evenveel eiwit.",
      "Meer dan 2% van je gewicht verloren aan zweet? Drink in de vier tot zes uur erna 125–150% van dat verlies.",
      "Zout in je herstelmaaltijd of -drank helpt het vocht vast te houden.",
    ],
    sources: [UCI_POSITION, ACSM_2016, KERKSICK_2017, UCI_PERIODIZATION, RUSTAD_2016],
  },
  {
    slug: "genoeg-eten-reds",
    category: "gezondheid",
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
    title: "Vrouwen en voeding",
    summary:
      "Voor vrouwelijke renners verdienen ijzer en genoeg energie extra aandacht. Algemene voedingsregels per cyclusfase zijn niet te onderbouwen.",
    points: [
      "IJzertekort komt bij vrouwelijke duursporters vaker voor; laat bij klachten je bloed prikken.",
      "Een onregelmatige of uitblijvende menstruatie kan wijzen op te weinig energie. Ga daarmee naar een arts.",
      "Het effect van cyclusfase op prestatie is gemiddeld triviaal en verschilt sterk per persoon.",
      "Houd liever bij hoe jij je voelt, bijvoorbeeld in het logboek, dan algemene fase-regels te volgen.",
      "Klachten zoals krampen, een opgeblazen gevoel of vermoeidheid lijken meer uit te maken dan de fase zelf. Pas je eten aan op de klacht, bijvoorbeeld minder vet en minder scherp gekruid bij darmklachten.",
      "Wees voorzichtig met apps die je training of eten alleen op cyclusfase aanpassen.",
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
    ],
  },
  {
    slug: "ijzer",
    category: "gezondheid",
    title: "IJzer",
    summary:
      "IJzer is nodig voor zuurstoftransport. Tekorten komen bij duursporters vaak voor, maar suppleren doe je alleen op basis van bloedwaarden.",
    points: [
      "Vooral vrouwen, veel trainende renners en wie weinig of geen vlees eet, lopen risico.",
      "Goede bronnen: rood vlees, peulvruchten, volkorenproducten en groene groenten. Vitamine C bij de maaltijd helpt de opname.",
      "Thee en koffie bij de maaltijd remmen de opname.",
      "Slik geen ijzer op eigen houtje: te veel ijzer is ook schadelijk. Laat eerst je ferritine en hemoglobine meten.",
    ],
    sources: [
      {
        citation:
          "Sim M, Garvican-Lewis LA, Cox GR, et al. Iron considerations for the athlete: a narrative review. Eur J Appl Physiol 119(7):1463–1478.",
        year: 2019,
        url: "https://pubmed.ncbi.nlm.nih.gov/31055680/",
        kind: "review",
      },
    ],
  },
  {
    slug: "botgezondheid",
    category: "gezondheid",
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
    sources: [UCI_BONE, UCI_POSITION, REDS_2023, HAAKONSSEN_2015],
  },
  {
    slug: "weerstand",
    category: "gezondheid",
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
    sources: [UCI_ILLNESS, UCI_POSITION, HEMILA_2013, NAULT_2024, PAULSEN_2014],
  },
  {
    slug: "masters",
    category: "gezondheid",
    title: "Ouder worden als renner",
    summary:
      "Met de jaren reageren spieren minder sterk op training en eiwit, en nemen spier- en botmassa af. Eten kan dat afremmen.",
    points: [
      "Eiwit wordt belangrijker: haal je dagtotaal en verdeel het over de dag.",
      "Genoeg energie, calcium en vitamine D tellen zwaarder, omdat veel fietsen en ouder worden allebei aan je botten trekken. Rond de overgang geldt dat extra.",
      "Dorst wordt een minder betrouwbaar signaal. Drink in de hitte volgens plan in plaats van op gevoel.",
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
    title: "Supplementen en sportvoeding",
    summary:
      "Eerst de basisvoeding op orde. Een klein aantal supplementen heeft voor wielrennen een sterke onderbouwing, elk voor een specifieke situatie. Voor herstel en gezondheid is het bewijs dunner.",
    points: [
      "Sterk onderbouwd voor prestatie: cafeïne, creatine, natriumbicarbonaat, bèta-alanine, nitraat (bietensap) en glycerol. Voor elk staat een protocol.",
      "Sportdrank, gels, repen, elektrolyten en eiwitpoeder zijn gewone sportvoeding: handig, maar niet beter dan gewoon eten met dezelfde inhoud.",
      "IJzer, calcium en vitamine D alleen bij een tekort of een duidelijk risico. Voor vitamine D in de winter staat een protocol.",
      "Veelbelovend, maar het bewijs is dun of wisselend: kersensap en andere polyfenolen, collageen, visolie, probiotica, curcumine en menthol. Kersensap en collageen hebben een protocol.",
      "Geen of te weinig bewijs: BCAA's, magnesium tegen kramp, CBD en ketonen.",
      "Supplementen kunnen verontreinigd zijn met verboden stoffen. Kies bij voorkeur NZVT-geteste batches.",
      "Supplementprotocollen zijn er vanaf 18 jaar. Daaronder zijn eten en sportvoeding genoeg.",
      "ZWB noemt bewust geen merken.",
    ],
    sources: [IOC_SUPPLEMENTS, UCI_SUPPLEMENTS, GUEST_2021_NUTRITION, AIS_FRAMEWORK, NZVT],
  },
  {
    slug: "kersensap",
    category: "supplementen",
    title: "Kersensap en andere polyfenolen",
    summary:
      "Zuur kersensap kan je kracht na een zware inspanning sneller terugbrengen, maar alleen als je er een paar dagen vóór begint. Alleen na de wedstrijd drinken is niet onderbouwd.",
    points: [
      "Een meta-analyse vond sneller herstel van kracht en vermogen na zware inspanning, en een kleiner effect op spierpijn.",
      "Een review van vijftien studies: de winst kwam steeds als het sap al een paar dagen vóór de inspanning werd gedronken. Voor alleen achteraf drinken is geen bewijs. Kersenpoeder werkte niet.",
      "Bij wielrenners die drie dagen achter elkaar zware ritten reden, daalden de ontstekingswaarden; hun tijdrit werd niet beter.",
      "In de studies: twee keer per dag 30 ml concentraat of een glas sap, vanaf vier à vijf dagen voor tot twee dagen na de inspanning.",
      "Voor prestatie zelf is het bewijs dun: een meta-analyse zag een klein effect op duurprestatie, in kleine studies en zonder verband met de dosis.",
      "Gebruik het rond wedstrijden en zware blokken, niet het hele jaar. Hoge doses vitamine C en E remden in een studie de aanpassing aan duurtraining; voor kersensap is dat niet onderzocht.",
      "Curcumine verminderde in een meta-analyse spierpijn en bloedwaarden van spierschade, maar de studies zijn klein. Daarvoor staat geen protocol.",
    ],
    sources: [HILL_2021, MCHUGH_2022, BELL_2014, HOWATSON_2010, GAO_2020, PAULSEN_2014, BEBA_2022],
  },
  {
    slug: "collageen",
    category: "supplementen",
    title: "Collageen en gelatine",
    summary:
      "Gelatine of collageen met vitamine C, een uur voor korte belasting, verhoogt de aanmaak van collageen. Bij een pees- of bandblessure is het een redelijke aanvulling, geen bewezen behandeling.",
    points: [
      "In een studie met acht mannen verdubbelde 15 gram gelatine met vitamine C, een uur voor zes minuten touwtjespringen, een bloedwaarde voor collageenaanmaak. 5 gram deed minder.",
      "Een meta-analyse vond dat collageen naast maandenlange krachttraining kleine winst gaf in kracht en spieropbouw en een dikkere pees. Dat ging over krachttraining, niet over fietsen.",
      "Dat een blessure er sneller door geneest, is niet aangetoond.",
      "Fietsen belast pezen weinig. Het ligt vooral voor de hand bij revalidatie, bijvoorbeeld na een val, naast de oefeningen van je fysiotherapeut.",
    ],
    sources: [SHAW_2017, BISCHOF_2024, IOC_SUPPLEMENTS],
  },
  {
    slug: "vitamine-d",
    category: "supplementen",
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
    sources: [GR_VITAMINE_D, OWENS_2018, UCI_BONE],
  },
  {
    slug: "omega-3",
    category: "supplementen",
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
    sources: [PHILPOTT_2019, IOC_SUPPLEMENTS],
  },
  {
    slug: "probiotica",
    category: "supplementen",
    title: "Probiotica",
    summary:
      "Probiotica kunnen bij sommige sporters luchtweginfecties en darmklachten iets verminderen, maar het effect hangt af van de bacteriestam en is wisselend.",
    points: [
      "Het ISSN-standpunt ziet mogelijke voordelen voor afweer en darmklachten, steeds voor een bepaalde stam. Wat voor de ene stam geldt, geldt niet voor een andere.",
      "ZWB noemt geen merken en dus geen stammen; daarom staat er geen protocol.",
      "Yoghurt, kwark en kefir horen gewoon bij gevarieerd eten.",
    ],
    sources: [JAGER_2019, UCI_ILLNESS],
  },
  {
    slug: "mondspoelen",
    category: "supplementen",
    title: "Mondspoelen met koolhydraten of menthol",
    summary:
      "Spoelen zonder door te slikken geeft je hersenen een seintje. Bij een korte tijdrit of in de hitte is er een klein effect.",
    points: [
      "Koolhydraten: spoel met sportdrank en spuug uit. In een meta-analyse van tijdritten steeg het gemiddelde vermogen iets, maar de finishtijd niet.",
      "Het heeft alleen zin bij een korte, harde inspanning waarin je niet wilt eten. Bij een rit van meer dan een uur neem je beter gewoon koolhydraten.",
      "Menthol: een meta-analyse vond in de hitte een klein voordeel, vooral bij inname via de mond, en een koeler gevoel. Het effect op prestatie lag op de grens van significant.",
      "Probeer het eerst op een training. Geen protocol: het effect is klein en hangt sterk af van de situatie.",
    ],
    sources: [BRIETZKE_2019, JEFFRIES_2019],
  },
  {
    slug: "geen-bewijs",
    category: "supplementen",
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
    sources: [WOLFE_2017, GARRISON_2020, MCCARTNEY_2020, PAULSEN_2014],
  },
  {
    slug: "ketonen",
    category: "supplementen",
    title: "Ketonen",
    summary:
      "Ketondrankjes verhogen de ketonen in je bloed, maar maken je in een wedstrijd niet sneller. ZWB raadt ze af.",
    points: [
      "Een meta-analyse van dertien proeven vond geen effect op prestatie, ook niet op tijdritten en niet voor ketonesters.",
      "Ze zijn duur, en daarom staat er geen protocol voor in ZWB.",
    ],
    sources: [
      {
        citation:
          "Valenzuela PL, Morales JS, Castillo-García A, Lucia A. Acute ketone supplementation and exercise performance: a systematic review and meta-analysis of randomized controlled trials. Int J Sports Physiol Perform 15(3):298–308.",
        year: 2020,
        url: "https://doi.org/10.1123/ijspp.2019-0918",
        kind: "review",
      },
    ],
  },
  {
    slug: "low-carb-keto",
    category: "basis",
    title: "Low-carb en keto",
    summary:
      "Ketogeen eten laat je meer vet verbranden, maar je wordt er bij wedstrijdtempo minder efficiënt van. Voor prestatie is het af te raden.",
    points: [
      "In een studie met toprenners op een ketogeen dieet steeg de vetverbranding flink.",
      "Tegelijk kostte hetzelfde tempo meer zuurstof, en het prestatievoordeel van het trainingsblok verdween.",
      "De groepen met veel of gericht geperiodiseerde koolhydraten werden wél sneller.",
      "Gericht een sessie met weinig koolhydraten doen is iets anders dan structureel low-carb eten; zie brandstof volgens de training.",
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
