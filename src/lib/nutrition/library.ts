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
const UCI_POSITION: NutritionSource = {
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

const BURKE_2011: NutritionSource = {
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

const KERKSICK_2017: NutritionSource = {
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
      "Kies dan vooral makkelijk verteerbaar: weinig vet, vezels en eiwit, zodat je maag rustig blijft.",
      "Stapelen voor een wedstrijd of tocht van meer dan 90 minuten: 36–48 uur lang 10–12 g/kg.",
      "Voor een korte Zwift-race is stapelen niet nodig; een gewone koolhydraatrijke maaltijd volstaat.",
      "Probeer een nieuwe aanpak eerst op een training, nooit voor het eerst op de wedstrijddag.",
    ],
    sources: [BURKE_2011, ACSM_2016, KERKSICK_2017],
  },
  {
    slug: "koolhydraten-tijdens-de-rit",
    category: "op-de-fiets",
    title: "Koolhydraten tijdens de rit",
    summary:
      "Hoe langer de rit, hoe meer koolhydraten per uur zinvol zijn. Boven de 60 g per uur heb je een mix van glucose en fructose nodig.",
    points: [
      "Korter dan ongeveer een uur: extra koolhydraten zijn niet nodig.",
      "Eén tot tweeënhalf uur: 30–60 g per uur.",
      "Tweeënhalf tot zes uur: 60–90 g per uur.",
      "Tot 120 g per uur kan bij getrainde renners, maar alleen na darmtraining.",
      "Een verhouding fructose tot glucose van ongeveer 0,6–1,0 werkt het best. Gewone suiker is 1:1.",
      "Drank, gel of reep maakt voor de opname weinig uit; afwisselen helpt je maag.",
      "Het ≥100 g per uur van het profpeloton is niet zonder meer over te zetten naar recreanten.",
    ],
    sources: [
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
    ],
    sources: [UCI_ESPORTS, MORTON_2026_JNUTR],
  },
  {
    slug: "eiwit",
    category: "herstel",
    title: "Eiwit",
    summary:
      "Duursporters hebben meer eiwit nodig dan het algemene advies. Verdeel het over de dag en neem een portie voor het slapen.",
    points: [
      "Per dag: ongeveer 1,6–1,8 g eiwit per kg lichaamsgewicht.",
      "Per maaltijd: ongeveer 0,3–0,4 g/kg, verdeeld over vier tot vijf momenten.",
      "Meer dan ongeveer 1,6 g/kg per dag voegt weinig toe voor spiermassa.",
      "Ongeveer 40 g eiwit voor het slapen, bijvoorbeeld kwark, verhoogt de eiwitaanmaak 's nachts, ook na duurtraining.",
      "Plantaardig kan ook; combineer bronnen en neem wat ruimere porties.",
    ],
    sources: [
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
      {
        citation:
          "Snijders T, Trommelen J, Kouw IWK, Holwerda AM, Verdijk LB, van Loon LJC. The Impact of Pre-sleep Protein Ingestion on the Skeletal Muscle Adaptive Response to Exercise in Humans: An Update. Front Nutr 6:17.",
        year: 2019,
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6415027/",
        kind: "review",
      },
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
    ],
    sources: [ACSM_2016, KERKSICK_2017, UCI_PERIODIZATION],
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
    slug: "supplementen",
    category: "supplementen",
    title: "Supplementen en sportvoeding",
    summary:
      "Eerst de basisvoeding op orde. Een klein aantal supplementen heeft voor wielrennen een sterke onderbouwing, elk voor een specifieke situatie.",
    points: [
      "Sterk onderbouwd voor wielrennen: cafeïne, creatine, natriumbicarbonaat, bèta-alanine, nitraat (bietensap) en glycerol.",
      "Cafeïne: ongeveer 3–6 mg per kg, ongeveer een uur vooraf. Test eerst op training; hogere doses geven vaker bijwerkingen.",
      "Sportdrank, gels en repen zijn gewone sportvoeding: handig, maar niet beter dan gewone koolhydraten.",
      "Supplementen kunnen verontreinigd zijn met verboden stoffen. Kies bij voorkeur NZVT-geteste batches.",
      "ZWB noemt bewust geen merken.",
    ],
    sources: [
      {
        citation:
          "Maughan RJ, Burke LM, Dvorak J, et al. IOC consensus statement: dietary supplements and the high-performance athlete. Br J Sports Med 52(7):439–455.",
        year: 2018,
        url: "https://research-repository.st-andrews.ac.uk/bitstream/handle/10023/13136/Maughan_2018_BJSM_IOCconsensus_CC.pdf",
        kind: "consensus",
      },
      {
        citation:
          "Whitfield J, et al. UCI Sports Nutrition Project: Considerations and Applications for the Use of Sports Foods and Supplements to Improve Performance in Cycling. Int J Sport Nutr Exerc Metab.",
        year: 2026,
        url: "https://pubmed.ncbi.nlm.nih.gov/41570809/",
        kind: "review",
      },
      {
        citation:
          "Guest NS, VanDusseldorp TA, Nelson MT, et al. International society of sports nutrition position stand: caffeine and exercise performance. J Int Soc Sports Nutr 18:1.",
        year: 2021,
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7777221/",
        kind: "consensus",
      },
      {
        citation: "Australian Institute of Sport. AIS Sports Supplement Framework (ABCD-classificatie).",
        year: 2021,
        url: "https://www.ausport.gov.au/ais/nutrition/supplements",
        kind: "richtlijn",
      },
      {
        citation: "Dopingautoriteit. NZVT: Nederlands Zekerheidssysteem Voedingssupplementen Topsport.",
        year: 2026,
        url: "https://www.dopingautoriteit.nl/programmas/nzvt",
        kind: "richtlijn",
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
      {
        citation:
          "Lis DM, et al. UCI Sports Nutrition Project: Plate to Performance—Culinary Nutrition Support for Professional Road Cycling. Int J Sport Nutr Exerc Metab.",
        year: 2026,
        url: "https://pubmed.ncbi.nlm.nih.gov/41946455/",
        kind: "review",
      },
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
