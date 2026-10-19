// De kennisbank racen (2026-10-19): tactiek in een Zwift-race.
//
// Zelfde opzet als de kennisbanken trainen, voeding, kracht en materiaal: in
// code, zodat elke bewering en elke bron via een commit gaat. Het niveau per
// artikel staat in docs/beoordelingsbeleid-bewijsniveau.md; een test houdt code
// en tabel gelijk. Teksten zijn eigen samenvattingen van de samenvattingen
// (abstracts) van de bronnen.
//
// Anders dan bij de andere kennisbanken:
// - Over tactiek in Zwift-races is weinig gepubliceerd. Het meeste bewijs komt
//   uit de echte koers (slipstreammetingen, analyses van ontsnappingen en
//   sprints) en geldt voor Zwift alleen voor zover het spel de natuurkunde
//   nabootst. Zulke adviezen zijn "afgeleid" (Eerste aanwijzingen), zoals bij
//   Indoor fietsen en Zwift in de kennisbank voeding.
// - De spelregels van Zwift (powerups, Pack Dynamics, supertuck) komen van Zwift
//   zelf en uit tests van Zwift Insider. Dat is geen gepubliceerd onderzoek; het
//   staat als achtergrond in de tekst en bij de beperkingen, niet als bron.
//   Achtergrond: docs/zwbgame-tactiek.md.

import type { ArticleConclusion, ArticleEvidence } from "@/lib/knowledge/evidence";
import { doi, type KnowledgeSource } from "@/lib/knowledge/source";

export const RACEN_CATEGORIES = ["groep", "koers", "aanval", "ploeg", "spel"] as const;
export type RacenCategory = (typeof RACEN_CATEGORIES)[number];

export const RACEN_CATEGORY_LABELS: Record<RacenCategory, string> = {
  groep: "Het wiel en de groep",
  koers: "Het verloop van een race",
  aanval: "Aanvallen en wegrijden",
  ploeg: "Als ploeg",
  spel: "Het spel Zwift",
};

export type RacenArticle = {
  slug: string;
  category: RacenCategory;
  /** Hoe gegrond de conclusie is; zie src/lib/knowledge/evidence.ts. */
  evidence: ArticleEvidence;
  /** "geen-effect" of "nadelig" als de conclusie is dat iets niet helpt; staat in de badge. */
  conclusion?: ArticleConclusion;
  title: string;
  summary: string;
  points: string[];
  /** Wat de bronnen níét laten zien, of wat een eigen keuze van ZWB is. */
  limits: string[];
  sources: KnowledgeSource[];
};

// Slipstream
const EDWARDS_2007: KnowledgeSource = {
  citation:
    "Edwards AG, Byrnes WC. Aerodynamic characteristics as determinants of the drafting effect in cycling. Med Sci Sports Exerc 39(1):170-176.",
  year: 2007,
  url: doi("10.1249/01.mss.0000239400.85955.12"),
  kind: "meting",
};
const BARRY_2015_PURSUIT: KnowledgeSource = {
  citation:
    "Barry N, Burton D, Sheridan J, Thompson M, Brown NAT. Aerodynamic drag interactions between cyclists in a team pursuit. Sports Eng 18(2):93-103.",
  year: 2015,
  url: doi("10.1007/s12283-015-0172-8"),
  kind: "meting",
};
const FITTON_2017: KnowledgeSource = {
  citation:
    "Fitton B, Caddy O, Symons D. The impact of relative athlete characteristics on the drag reductions caused by drafting when cycling in a velodrome. Proc Inst Mech Eng P J Sports Eng Technol 232(1):39-49.",
  year: 2017,
  url: doi("10.1177/1754337117692280"),
  kind: "meting",
};
const SPOELSTRA_2021: KnowledgeSource = {
  citation:
    "Spoelstra A, Sciacchitano A, Scarano F, Mahalingesh N. On-site drag analysis of drafting cyclists. J Wind Eng Ind Aerodyn 219:104797.",
  year: 2021,
  url: doi("10.1016/j.jweia.2021.104797"),
  kind: "meting",
};
const BLOCKEN_2018_PELOTON: KnowledgeSource = {
  citation:
    "Blocken B, van Druenen T, Toparlar Y, et al. Aerodynamic drag in cycling pelotons: new insights by CFD simulation and wind tunnel testing. J Wind Eng Ind Aerodyn 179:319-337.",
  year: 2018,
  url: doi("10.1016/j.jweia.2018.06.011"),
  kind: "meting",
};
const BLOCKEN_2018_TTT: KnowledgeSource = {
  citation:
    "Blocken B, Toparlar Y, van Druenen T, Andrianne T. Aerodynamic drag in cycling team time trials. J Wind Eng Ind Aerodyn 182:128-145.",
  year: 2018,
  url: doi("10.1016/j.jweia.2018.09.015"),
  kind: "meting",
};
const VAN_DRUENEN_2021: KnowledgeSource = {
  citation: "van Druenen T, Blocken B. Aerodynamic analysis of uphill drafting in cycling. Sports Eng 24(1):10.",
  year: 2021,
  url: doi("10.1007/s12283-021-00345-2"),
  kind: "meting",
};
const BEAUMONT_2025: KnowledgeSource = {
  citation:
    "Beaumont F, Murer S, Bogard F, Polidori G. Aerodynamic drafting in mass-start non-motorized sports: a systematic review. J Biomech 184:112641.",
  year: 2025,
  url: doi("10.1016/j.jbiomech.2025.112641"),
  kind: "review",
};

// Zwift-races
const VARESCO_2025: KnowledgeSource = {
  citation:
    "Varesco G, Dorel S, Seiler S, Millour G. Performance analysis in high-level virtual cycling: data from the 2023 Zwift UCI Cycling E-Sports World Championships. J Sci Cycling.",
  year: 2025,
  url: doi("10.28985/1425.jsc.10"),
  kind: "studie",
};
const WESTMATTELMANN_2022: KnowledgeSource = {
  citation:
    "Westmattelmann D, Stoffers B, Sprenger M, Grotenhermen JG, Schewe G. The performance-result gap in mixed-reality cycling: evidence from the Virtual Tour de France 2020 on Zwift. Front Physiol 13:868902.",
  year: 2022,
  url: doi("10.3389/fphys.2022.868902"),
  kind: "studie",
};
const BJAREHED_2023: KnowledgeSource = {
  citation:
    "Bjärehed J, Bjärehed M. Competitive racing in virtual cycling: is it possible, realistic, and fair? J Electron Gaming Esports 1(1).",
  year: 2023,
  url: doi("10.1123/jege.2022-0006"),
  kind: "studie",
};
const SKIBA_2012: KnowledgeSource = {
  citation:
    "Skiba PF, Chidnok W, Vanhatalo A, Jones AM. Modeling the expenditure and reconstitution of work capacity above critical power. Med Sci Sports Exerc 44(8):1526-1532.",
  year: 2012,
  url: doi("10.1249/MSS.0b013e3182517a80"),
  kind: "studie",
};

// Koers: positie, sprint, ontsnapping
const MENASPA_2013: KnowledgeSource = {
  citation:
    "Menaspà P, Abbiss CR, Martin DT. Performance analysis of a world-class sprinter during cycling grand tours. Int J Sports Physiol Perform 8(3):336-340.",
  year: 2013,
  url: doi("10.1123/ijspp.8.3.336"),
  kind: "studie",
};
const VAN_ERP_2021: KnowledgeSource = {
  citation:
    "van Erp T, Kittel M, Lamberts RP. Sprint tactics in the Tour de France: a case study of a world-class sprinter (part II). Int J Sports Physiol Perform 16(9):1371-1377.",
  year: 2021,
  url: doi("10.1123/ijspp.2020-0701"),
  kind: "studie",
};
const MERKES_2020: KnowledgeSource = {
  citation: "Merkes P, Menaspà P, Abbiss C. Sprinting in road cycling: literature review. J Sci Cycling 9(3):1-24.",
  year: 2020,
  url: doi("10.28985/1220.jsc.03"),
  kind: "review",
};
const MOFFATT_2014: KnowledgeSource = {
  citation:
    "Moffatt J, Scarf P, Passfield L, McHale IG, Zhang K. To lead or not to lead: analysis of the sprint in track cycling. J Quant Anal Sports 10(2).",
  year: 2014,
  url: doi("10.1515/jqas-2013-0112"),
  kind: "studie",
};
const BABAULT_2020: KnowledgeSource = {
  citation:
    "Babault N, Paizis C, Trimble M, Trimble DA, Cometti C. Pacing and positioning strategies during an elite fixed-gear cycling criterium. Front Sports Act Living 2:586568.",
  year: 2020,
  url: doi("10.3389/fspor.2020.586568"),
  kind: "studie",
};
const PHILLIPS_2020: KnowledgeSource = {
  citation:
    "Phillips KE, Hopkins WG. Determinants of cycling performance: a review of the dimensions and features regulating performance in elite cycling competitions. Sports Med Open 6(1):23.",
  year: 2020,
  url: doi("10.1186/s40798-020-00252-z"),
  kind: "review",
};
const OLDS_1998: KnowledgeSource = {
  citation: "Olds T. The mathematics of breaking away and chasing in cycling. Eur J Appl Physiol 77(6):492-497.",
  year: 1998,
  url: doi("10.1007/s004210050365"),
  kind: "studie",
};
const BROUWER_2019: KnowledgeSource = {
  citation: "Brouwer T, Potters J. Friends for (almost) a day: studying breakaways in cycling races. J Econ Psychol 75:102092.",
  year: 2019,
  url: doi("10.1016/j.joep.2018.08.001"),
  kind: "studie",
};
const SCELLES_2018: KnowledgeSource = {
  citation:
    "Scelles N, Mignot JF, Cabaud B, François A. Temporary organizational forms and coopetition in cycling: what makes a breakaway successful in the Tour de France? Team Perform Manag 24(3/4):122-134.",
  year: 2018,
  url: doi("10.1108/tpm-03-2017-0012"),
  kind: "studie",
};
const GAUL_2018: KnowledgeSource = {
  citation:
    "Gaul LH, Thomson SJ, Griffiths IM. Optimizing the breakaway position in cycle races using mathematical modelling. Sports Eng 21(4):297-310.",
  year: 2018,
  url: doi("10.1007/s12283-018-0270-5"),
  kind: "studie",
};

// Ploegentijdrit
const HEIMANS_2017: KnowledgeSource = {
  citation:
    "Heimans L, Dijkshoorn WR, Hoozemans MJ, de Koning JJ. Optimizing the team for required power during track-cycling team pursuit. Int J Sports Physiol Perform 12(10):1385-1391.",
  year: 2017,
  url: doi("10.1123/ijspp.2016-0451"),
  kind: "meting",
};
const BOILLET_2024: KnowledgeSource = {
  citation:
    "Boillet A, Noble M, Sachet I, Messonnier LA, Cohen C. Individualized optimal strategy in team pursuit for track cycling. Sci Rep 14(1):25308.",
  year: 2024,
  url: doi("10.1038/s41598-024-75963-4"),
  kind: "studie",
};

const ZWIFT_ACHTERGROND =
  "Hoe Zwift de slipstream, powerups en supertuck rekent, publiceert Zwift niet volledig. De getallen voor Zwift komen uit tests van Zwift Insider en uit de uitleg van Zwift, geen gepubliceerd onderzoek; Zwift past zijn model soms aan (Pack Dynamics 4 in 2023).";

export const RACEN_ARTICLES: RacenArticle[] = [
  {
    slug: "in-het-wiel",
    category: "groep",
    evidence: "sterk",
    title: "In het wiel: wat de slipstream scheelt",
    summary:
      "Achter een andere renner trap je een kwart tot de helft minder tegen de wind in, en midden in een groep nog veel minder. Op een klim scheelt het weinig, op het vlak en in een afdaling veel.",
    points: [
      "In de windtunnel had een ploeg van vier gemiddeld 45 % minder luchtweerstand op de tweede plek en 55 tot 57 % op de derde en vierde. De renner vooraan kreeg er ook 5 % voordeel bij.",
      "Op de baan maten onderzoekers bij zes renners 42 tot 48 % minder luchtweerstand op plek twee tot vier.",
      "Op de weg scheelde het wiel 35 tot 50 % van de luchtweerstand, ruim 100 tot 160 W. Hoe groter de renner voor je, hoe meer je spaart.",
      "Opzij uit het wiel ben je het voordeel snel kwijt: de afstand opzij telt meer dan de afstand naar achteren.",
      "Midden achter in een groot peloton kan de luchtweerstand dalen tot 5 à 10 % van die van een renner alleen (berekend, en getoetst in de windtunnel met modellen).",
      "Bergop rijd je langzamer en telt de lucht minder, maar het wiel scheelt ook daar nog: ruim 7 % vermogen bij 7,5 % stijging en 6 m/s.",
      "Zwift rekent iets vergelijkbaars. In tests van Zwift Insider spaarde de tweede in een rij van vier ongeveer een kwart, de vierde bijna 40 %, en op een steile klim maar een paar procent.",
    ],
    limits: [
      "Hoeveel je spaart, verschilt per renner: lengte, houding en hoe dicht je op het wiel zit.",
      "De getallen voor een groot peloton komen uit berekeningen, getoetst met modellen in de windtunnel, niet met renners op de weg.",
      ZWIFT_ACHTERGROND,
    ],
    sources: [EDWARDS_2007, BARRY_2015_PURSUIT, FITTON_2017, SPOELSTRA_2021, BLOCKEN_2018_PELOTON, VAN_DRUENEN_2021, BEAUMONT_2025],
  },
  {
    slug: "positie-in-de-groep",
    category: "groep",
    evidence: "beperkt",
    title: "Je plek in de groep",
    summary:
      "Wie aan het eind vooraan in de groep zit, wint vaker. Zit de rest van de race in het wiel, maar schuif op tijd naar voren: voor een klim, een sprint en de laatste kilometer.",
    points: [
      "Bij een topsprinter in de grote ronden zat hij bij gewonnen sprints 60, 30 en 15 seconden voor de streep dichter vooraan, met meer ploeggenoten om zich heen, dan bij verloren sprints.",
      "Bij een andere topsprinter hing de uitslag vooral samen met zijn plek een halve minuut voor de streep.",
      "In een criterium hing de eindplek samen met hoe ver vooraan een renner gemiddeld reed.",
      "Achteraan sla je gaten dicht van renners die lossen. Vooraan zit je in de wind. Ergens in het voorste derde heb je het wiel en ruimte om te reageren.",
      "In Zwift kun je niet sturen. Naar voren schuiven kost vermogen: sinds Pack Dynamics 4.1 kom je alleen langs een renner in de wind als je zelf genoeg trapt.",
    ],
    limits: [
      "Het zijn verbanden uit wedstrijden, vooral bij één of twee topsprinters en één criterium. Dat vooraan zitten de oorzaak is van winnen, laten ze niet zien: sterke renners zitten ook vaker vooraan.",
      "Het voorste derde is een vuistregel uit de praktijk, geen gemeten getal.",
      ZWIFT_ACHTERGROND,
    ],
    sources: [MENASPA_2013, VAN_ERP_2021, BABAULT_2020, MERKES_2020],
  },
  {
    slug: "wat-een-zwift-race-vraagt",
    category: "koers",
    evidence: "matig",
    title: "Wat een Zwift-race vraagt",
    summary:
      "Zwift-races zijn even zwaar als races buiten. Je vermogen per kilo over de race verklaart het grootste deel van de uitslag; korte inspanningen tot een minuut en het herstel ertussen maken het verschil.",
    points: [
      "Bij drie topraces op Zwift (116 renners) leken de inspanningen op die van races op de weg, en kwamen verschillende vermogensmeters goed overeen.",
      "In de virtuele Tour de France van 2020 verklaarde het vermogen per kilo over de hele rit 77 tot 99 % van de verschillen in uitslag. Wat overblijft, is wat tactiek, materiaal en wedstrijdverloop nog uitmaken.",
      "Op het WK e-sport van 2023 trapten renners die doorgingen naar de volgende ronde zo'n 15 % meer per kilo over inspanningen tot een minuut dan renners die eruit gingen.",
      "Daar is ook W′ gevolgd: de reserve boven je drempel. Wie die te vroeg opmaakt, heeft hem niet meer voor de finale. Elke aanval, elk gat dichten en elke sprint kost ervan.",
      "Een Zwift-race begint vaak hard: de eerste selectie valt meestal in de eerste één à twee minuten.",
    ],
    limits: [
      "De studies gaan over topraces; bij gewone races op Zwift is minder gemeten.",
      "Ze beschrijven wat winnaars anders doen, geen proef waarin een tactiek is uitgeprobeerd.",
      "Dat de start hard gaat, komt uit de praktijk (Zwift Insider), niet uit deze studies.",
    ],
    sources: [BJAREHED_2023, WESTMATTELMANN_2022, VARESCO_2025, SKIBA_2012],
  },
  {
    slug: "klimmen-in-de-groep",
    category: "koers",
    evidence: "beperkt",
    title: "Klimmen in de groep en over de top",
    summary:
      "Op een klim scheelt het wiel minder, dus daar vallen de gaten. Blijf bij de groep tot je over de top bent: een klein gat bovenaan wordt in de afdaling groot.",
    points: [
      "Bergop is de slipstream kleiner omdat je langzamer gaat. Bij 6 m/s op 7,5 % scheelde het wiel ruim 7 % vermogen, bij 8 m/s meer dan 16 %.",
      "Omdat het wiel minder helpt, telt op een klim vooral je vermogen per kilo. Daarom vallen daar de splitsingen.",
      "In een afdaling scheelt het wiel juist het meest. Wie op de top een paar meter moet laten gaan, zit in de afdaling in de wind terwijl de groep in elkaars wiel zit, en het gat groeit.",
      "Schuif voor een klim naar voren. Dan kun je op de klim wat terugzakken zonder te lossen.",
      "In Zwift: supertuck werkt sinds Pack Dynamics 4 alleen buiten het wiel. Wie alleen in een afdaling zit, kan zo een gat dichten zonder te trappen.",
    ],
    limits: [
      "De getallen bergop komen uit berekeningen die in de windtunnel zijn getoetst, van één onderzoeksgroep.",
      "Dat een gat over de top groeit, volgt uit de natuurkunde en uit de praktijk; het is niet als tactiek onderzocht.",
      ZWIFT_ACHTERGROND,
    ],
    sources: [VAN_DRUENEN_2021, BLOCKEN_2018_PELOTON, PHILLIPS_2020],
  },
  {
    slug: "aanvallen-en-volgen",
    category: "aanval",
    evidence: "beperkt",
    title: "Aanvallen en volgen: kies je moment",
    summary:
      "Elke versnelling kost W′, ook als je alleen volgt. Volg wat gevaarlijk is, laat de rest gaan, en val zelf aan waar het pijn doet: bergop, over de top, of als niemand reageert.",
    points: [
      "Boven je drempel gebruik je W′, en die komt onder je drempel maar langzaam terug. Wie elke aanval volgt, heeft aan het eind niets meer over.",
      "Een aanval in het wiel kost minder dan een aanval in de wind: wie volgt, spaart, wie aanvalt, betaalt.",
      "In de Tour hing het slagen van een ontsnapping samen met het moment van aanvallen.",
      "Bergop opent een aanval het grootste gat, omdat het wiel daar het minst helpt.",
      "In Zwift zien anderen een aanval in de rennerslijst (oranje vanaf 8 W/kg) en aan de staande houding. Een aanval vanuit het wiel, 5 tot 10 fietslengtes achter de kop (de slingshot), valt pas op als je eruit komt.",
      "Na een teruggehaalde aanval zit iedereen even stil. Dat is een goed moment voor een tegenaanval, zeker van een ploeggenoot.",
    ],
    limits: [
      "Het W′-model is getoetst bij inspanningen in het lab, niet in races met veel tempowisselingen; daar loopt het soms uit de pas.",
      "Over aanvallen in Zwift is niets gepubliceerd: de slingshot, het oranje en de tegenaanval komen uit de praktijk.",
      ZWIFT_ACHTERGROND,
    ],
    sources: [SKIBA_2012, SCELLES_2018, VAN_DRUENEN_2021, PHILLIPS_2020],
  },
  {
    slug: "ontsnappen",
    category: "aanval",
    evidence: "beperkt",
    title: "Wanneer een ontsnapping het haalt",
    summary:
      "Een ontsnapping haalt het vaker met een paar sterke renners die samenwerken, op heuvelachtig terrein, en als de groep erachter niet goed jaagt. Alleen tegen een groep is zwaar.",
    points: [
      "Volgens een rekenmodel hangt het af van de afstand tot de streep, het tempo van de kopgroep, hoeveel renners er voor en achter zitten en hoe dicht ze op elkaar rijden, en van helling, wegdek en wind.",
      "Een grotere en sterkere kopgroep slaagde vaker, tot een grens: bij meer dan ongeveer 26 renners werd het weer minder.",
      "In de Tour slaagden ontsnappingen vaker in heuvel- en bergritten dan in vlakke ritten, en vaker met ploeggenoten erbij.",
      "Een groep die achtervolgt, spaart in het wiel en is in theorie sneller. Een ontsnapping blijft vooral weg als de achtervolging niet samenwerkt.",
      "In Zwift bleven ontsnappingen lang zelden weg. Sinds Pack Dynamics 4 (2023) rijdt het peloton iets trager en lukt het vaker.",
    ],
    limits: [
      "Het bewijs komt uit rekenmodellen en uit analyses van profkoersen: verbanden, geen proef.",
      "Of het in Zwift hetzelfde werkt, hangt af van het spel; dat is niet onderzocht.",
      ZWIFT_ACHTERGROND,
    ],
    sources: [OLDS_1998, BROUWER_2019, SCELLES_2018, GAUL_2018],
  },
  {
    slug: "de-sprint",
    category: "koers",
    evidence: "beperkt",
    title: "De sprint: positie, wiel en timing",
    summary:
      "Zit in de laatste halve minuut vooraan, in een wiel, en ga niet als eerste. Wie te vroeg gaat, wint zelden; wie te ver van achteren komt, ook niet.",
    points: [
      "Bij topsprinters hing winnen samen met een plek vooraan en ploeggenoten om je heen in de laatste minuut.",
      "Een sprint op de weg duurt ongeveer 10 tot 20 seconden. Staand trap je meer vermogen; laag gaan scheelt ongeveer een kwart luchtweerstand.",
      "Op de baan voorspelt een statistisch model per moment van de sprint de kans dat de voorste wint, en laat het zien hoe de voorste zijn plek houdt en hoe de achterste het best overneemt.",
      "In Zwift: zet de aerohelm (15 seconden) zo laat aan dat hij op de streep opraakt. Op 600 meter is te vroeg.",
      "Met een draft boost in het wiel van wie als eerste gaat, trap je minder dan hij en kom je er aan het eind overheen.",
    ],
    limits: [
      "Het bewijs is van één of twee topsprinters en van baansprints: verbanden, geen proef.",
      "Dat wie als eerste aanzet zelden wint, komt uit de praktijk (Zwift Insider), niet uit onderzoek.",
      "Hoe ver je in Zwift het beste aanzet, hangt af van je sprint en de finish; daar is niets over gepubliceerd.",
      ZWIFT_ACHTERGROND,
    ],
    sources: [MENASPA_2013, VAN_ERP_2021, MERKES_2020, MOFFATT_2014],
  },
  {
    slug: "ploegentijdrit",
    category: "ploeg",
    evidence: "matig",
    title: "Ploegentijdrit: volgorde en beurten",
    summary:
      "Rijd in één lijn dicht op elkaar; achter de kop spaart iedereen bijna de helft. Verdeel de beurten naar wat ieder kan, en houd in een ZRL-ploegentijdrit je vierde renner bij je.",
    points: [
      "In een ploeg van vier had elke renner achter de kop 42 tot 57 % minder luchtweerstand; de kop zelf 4 à 5 %.",
      "Bij vijf renners of minder spaart de laatste het meest; in langere lijnen is dat niet meer zo.",
      "De volgorde telt: de lengte en houding van wie voor je zit, bepalen hoeveel je spaart. In een proef met acht baanrenners scheelde de beste volgorde tot 1,2 % van wat de ploeg moest trappen.",
      "Een rekenmodel laat zien dat de beste aanpak per ploeg verschilt: hoe lang de beurten zijn, hoe hard ieder op kop rijdt en in welke volgorde.",
      "Bij de ZRL telt de tijd van de vierde renner over de streep. Een renner die niet meer kan trekken, kan beter nog één keer voluit op kop gaan en dan loslaten, dan de vierde laten lossen.",
    ],
    limits: [
      "De metingen komen van de baan (ploegachtervolging), niet van een ploegentijdrit op de weg of in Zwift.",
      "De verdeling van beurten komt uit een rekenmodel, niet uit een proef.",
      "De regel van de vierde renner is een ZRL-regel van WTRL, geen onderzoek.",
      ZWIFT_ACHTERGROND,
    ],
    sources: [BARRY_2015_PURSUIT, FITTON_2017, BLOCKEN_2018_TTT, HEIMANS_2017, BOILLET_2024],
  },
  {
    slug: "zwift-spelregels",
    category: "spel",
    evidence: "beperkt",
    title: "De spelregels van Zwift die je race bepalen",
    summary:
      "Zwift rekent de slipstream na, maar heeft eigen regels: powerups, supertuck alleen buiten het wiel, en sinds 2023 een peloton dat niet meer vanzelf doorschuift. Wie ze kent, kiest betere momenten.",
    points: [
      "Powerups krijg je onder een sprint- of KOM-boog en op de rondestreep, één tegelijk. Gebruik je powerup voor de boog, anders krijg je geen nieuwe.",
      "Veer: 10 % lichter, 30 seconden (klim). Aerohelm: 25 % minder luchtweerstand, 15 seconden (sprint). Draft boost: 50 % meer slipstream, 40 seconden, alleen in het wiel.",
      "Burrito (20 seconden geen slipstream voor wie achter je zit) en spook (15 seconden onzichtbaar, niet in de laatste 400 meter) staan alleen in sommige events aan.",
      "Supertuck: vanaf ongeveer 58 km/u, minstens 3 % dalen, minder dan 11 W trappen, en alleen buiten het wiel.",
      "Sinds Pack Dynamics 4 (2023) schuift het peloton niet meer vanzelf door, rijdt het iets trager en houden ontsnappingen vaker stand. Naar voren gaan kost echt vermogen.",
      "Onverhard rolt een racefiets veel trager: het werkt als een korte klim.",
    ],
    limits: [
      "Dit zijn de regels van het spel, geen onderzoek. Ze komen van Zwift en uit tests van Zwift Insider (gelezen op 19 oktober 2026), en Zwift past ze soms aan.",
      "Het bewijsniveau gaat over de natuurkunde erachter (slipstream, gewicht, rolweerstand), die gemeten is; dat Zwift die precies zo nabootst, is niet onafhankelijk getoetst.",
    ],
    sources: [BEAUMONT_2025, BJAREHED_2023],
  },
];

export function racenArticleBySlug(slug: string): RacenArticle | null {
  return RACEN_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function racenArticlesByCategory(): { category: RacenCategory; articles: RacenArticle[] }[] {
  return RACEN_CATEGORIES.map((category) => ({
    category,
    articles: RACEN_ARTICLES.filter((article) => article.category === category),
  })).filter((group) => group.articles.length > 0);
}
