// Voedingsprotocollen: supplementen en koolhydraatstrategieën die je uitvoert.
// De onderbouwing staat in docs/protocollen-onderzoek.md. ZWB noemt geen merken.
//
// Doses staan per kg; de app rekent ze om met het gewicht van het lid. Dat is
// een omkering van het besluit uit de voedingsmodule (PLAN.md, "geen
// supplementadvies per lid"), op 2026-10-14 door de eigenaar genomen.

import { doi, type KnowledgeSource } from "@/lib/knowledge/source";
import {
  BELL_2014,
  BISCHOF_2024,
  BURKE_2011,
  GR_VITAMINE_D,
  HILL_2021,
  HOWATSON_2010,
  KERKSICK_2017,
  MCHUGH_2022,
  OWENS_2018,
  PAULSEN_2014,
  RUSTAD_2016,
  SHAW_2017,
  SNIJDERS_2019,
  UCI_BONE,
  UCI_POSITION,
  UCI_SUPPLEMENTS,
  VAN_ROSENDAL_2010,
} from "@/lib/nutrition/library";
import type { Protocol, ProtocolTask } from "./types";

const MAUGHAN_2018: KnowledgeSource = {
  citation:
    "Maughan RJ, Burke LM, Dvorak J, et al. IOC consensus statement: dietary supplements and the high-performance athlete. Br J Sports Med 52(7):439-455.",
  year: 2018,
  url: doi("10.1136/bjsports-2018-099027"),
  kind: "consensus",
};

const GUEST_2021: KnowledgeSource = {
  citation:
    "Guest NS, VanDusseldorp TA, Nelson MT, et al. International society of sports nutrition position stand: caffeine and exercise performance. J Int Soc Sports Nutr 18:1.",
  year: 2021,
  url: doi("10.1186/s12970-020-00383-4"),
  kind: "consensus",
};

const GRGIC_2021: KnowledgeSource = {
  citation:
    "Grgic J, Pedisic Z, Saunders B, et al. International Society of Sports Nutrition position stand: sodium bicarbonate and exercise performance. J Int Soc Sports Nutr 18:61.",
  year: 2021,
  url: doi("10.1186/s12970-021-00458-w"),
  kind: "consensus",
};

const JONES_2018: KnowledgeSource = {
  citation:
    "Jones AM, Thompson C, Wylie LJ, Vanhatalo A. Dietary nitrate and physical performance. Annu Rev Nutr 38:303-328.",
  year: 2018,
  url: doi("10.1146/annurev-nutr-082117-051622"),
  kind: "review",
};

const BONGERS_2015: KnowledgeSource = {
  citation:
    "Bongers CCWG, Thijssen DHJ, Veltmeijer MTW, Hopman MTE, Eijsvogels TMH. Precooling and percooling (cooling during exercise) both improve performance in the heat: a meta-analytical review. Br J Sports Med 49(6):377-384.",
  year: 2015,
  url: doi("10.1136/bjsports-2013-092928"),
  kind: "review",
};

const CHOO_2018: KnowledgeSource = {
  citation:
    "Choo HC, Nosaka K, Peiffer JJ, Ihsan M, Abbiss CR. Ergogenic effects of precooling with cold water immersion and ice ingestion: a meta-analysis. Eur J Sport Sci 18(2):170-181.",
  year: 2018,
  url: doi("10.1080/17461391.2017.1405077"),
  kind: "review",
};

const TREXLER_2015: KnowledgeSource = {
  citation:
    "Trexler ET, Smith-Ryan AE, Stout JR, et al. International society of sports nutrition position stand: beta-alanine. J Int Soc Sports Nutr 12:30.",
  year: 2015,
  url: doi("10.1186/s12970-015-0090-y"),
  kind: "consensus",
};

const SAUNDERS_2017: KnowledgeSource = {
  citation:
    "Saunders B, Elliott-Sale K, Artioli GG, et al. β-alanine supplementation to improve exercise capacity and performance: a systematic review and meta-analysis. Br J Sports Med 51(8):658-669.",
  year: 2017,
  url: doi("10.1136/bjsports-2016-096396"),
  kind: "review",
};

const KREIDER_2017: KnowledgeSource = {
  citation:
    "Kreider RB, Kalman DS, Antonio J, et al. International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine. J Int Soc Sports Nutr 14:18.",
  year: 2017,
  url: doi("10.1186/s12970-017-0173-z"),
  kind: "consensus",
};

const JEUKENDRUP_2017: KnowledgeSource = {
  citation: "Jeukendrup AE. Training the gut for athletes. Sports Med 47(Suppl 1):101-110.",
  year: 2017,
  url: doi("10.1007/s40279-017-0690-6"),
  kind: "review",
};

const PODLOGAR_2022: KnowledgeSource = {
  citation:
    "Podlogar T, Bokal Š, Cirnski S, Wallis GA. Increased exogenous but unaltered endogenous carbohydrate oxidation with combined fructose-maltodextrin ingested at 120 g h-1 versus 90 g h-1 at different ratios. Eur J Appl Physiol 122(11):2393-2401.",
  year: 2022,
  url: doi("10.1007/s00421-022-05019-w"),
  kind: "studie",
};

const SUPPLEMENT_CAUTIONS = [
  "Kies een batch met een NZVT-keurmerk: supplementen kunnen verontreinigd zijn met verboden stoffen.",
  "Probeer het eerst op een training, nooit voor het eerst op een wedstrijd.",
];

/** Eén keer uitproberen op een harde training, in de twee weken voor de wedstrijd. */
function trial(detail: string): ProtocolTask {
  return { key: "proef", label: "Uitproberen op een training", detail, once: true };
}

const SUPPLEMENT_MIN_AGE = 18;

export const NUTRITION_PROTOCOLS: Protocol[] = [
  {
    slug: "cafeine",
    pillar: "voeden",
    group: "Op de wedstrijddag",
    title: "Cafeïne voor een wedstrijd",
    shortLabel: "Cafeïne",
    summary: "Eén dosis cafeïne ongeveer een uur voor de start.",
    goal: "Meer vermogen en minder ervaren inspanning, bij korte en lange wedstrijden.",
    evidence: "sterk",
    anchor: "wedstrijd",
    calendar: true,
    minAge: SUPPLEMENT_MIN_AGE,
    phases: [
      {
        key: "proef",
        title: "Uitproberen",
        fromDay: -14,
        toDay: -2,
        tasks: [trial("Neem dezelfde dosis een uur voor een harde training en let op maag, hartslag en slaap.")],
      },
      {
        key: "wedstrijd",
        title: "Wedstrijddag",
        fromDay: 0,
        toDay: 0,
        tasks: [
          {
            key: "dosis",
            label: "Cafeïne",
            detail:
              "Ongeveer 60 minuten voor de start, als capsule, gum of sterke koffie. In een rit van meer dan twee uur kan een deel ook later.",
            dose: { perKg: { min: 3, max: 6 }, unit: "mg", step: 10, max: 400 },
          },
        ],
      },
    ],
    cautions: [
      ...SUPPLEMENT_CAUTIONS,
      "Bij een avondrace kost cafeïne vaak nachtrust. Een lage dosis werkt ook.",
      "Hogere doses geven vaker hartkloppingen, trillen en maagklachten, zonder meer winst.",
    ],
    notFor: [
      "Onder de 18.",
      "Bij hartritmestoornissen, hoge bloeddruk of zwangerschap zonder overleg met een arts.",
    ],
    limits: [
      "Hoe sterk het werkt verschilt per persoon. Gewenning aan dagelijkse koffie lijkt het effect nauwelijks kleiner te maken.",
    ],
    sources: [GUEST_2021, MAUGHAN_2018],
    article: { href: "/zwbeter-worden/voeding/kennis/supplementen", title: "Supplementen en sportvoeding" },
  },
  {
    slug: "bicarbonaat",
    pillar: "voeden",
    group: "Op de wedstrijddag",
    title: "Natriumbicarbonaat voor een wedstrijd",
    shortLabel: "Bicarbonaat",
    summary: "Een buffer tegen verzuring, voor wedstrijden met harde stukken van één tot tien minuten.",
    goal: "Meer vermogen bij herhaalde, korte en harde inspanningen.",
    evidence: "sterk",
    anchor: "wedstrijd",
    calendar: true,
    minAge: SUPPLEMENT_MIN_AGE,
    phases: [
      {
        key: "proef",
        title: "Uitproberen",
        fromDay: -14,
        toDay: -2,
        tasks: [trial("Neem de volledige dosis voor een harde training. Gaat het mis met je maag, probeer dan de lage kant of een kleinere dosis.")],
      },
      {
        key: "wedstrijd",
        title: "Wedstrijddag",
        fromDay: 0,
        toDay: 0,
        tasks: [
          {
            key: "dosis",
            label: "Natriumbicarbonaat",
            detail:
              "90 tot 180 minuten voor de start, verspreid over een half uur, samen met een koolhydraatrijke maaltijd en ruim water. Capsules geven minder maagklachten dan poeder.",
            dose: { perKg: { min: 0.2, max: 0.3 }, unit: "g", step: 1, max: 30 },
          },
        ],
      },
    ],
    cautions: [
      ...SUPPLEMENT_CAUTIONS,
      "Diarree, misselijkheid en buikkrampen komen vaak voor. Juist daarom eerst uitproberen.",
    ],
    notFor: [
      "Onder de 18.",
      "Bij hoge bloeddruk of nierproblemen zonder overleg met een arts: het is veel natrium.",
    ],
    limits: [
      "Het werkt het best bij inspanningen van één tot tien minuten. Bij een lange vlakke tijdrit is het effect klein.",
      "Een verdeelde inname over de drie dagen ervoor kan ook, maar staat hier niet als stap.",
    ],
    sources: [GRGIC_2021, MAUGHAN_2018],
    article: { href: "/zwbeter-worden/voeding/kennis/supplementen", title: "Supplementen en sportvoeding" },
  },
  {
    slug: "nitraat",
    pillar: "voeden",
    group: "Op de wedstrijddag",
    title: "Nitraat (bietensap) voor een wedstrijd",
    shortLabel: "Nitraat",
    summary: "Een week bietensap laden en een shot op de wedstrijddag.",
    goal: "Zuiniger rijden: hetzelfde vermogen kost minder zuurstof.",
    evidence: "matig",
    anchor: "wedstrijd",
    calendar: true,
    minAge: SUPPLEMENT_MIN_AGE,
    phases: [
      {
        key: "laden",
        title: "Laden",
        fromDay: -6,
        toDay: -1,
        tasks: [
          {
            key: "shot",
            label: "Bietensap",
            detail: "Eén shot geconcentreerd bietensap met ongeveer 6 tot 8 mmol nitraat (zo'n 400 tot 500 mg).",
          },
        ],
      },
      {
        key: "wedstrijd",
        title: "Wedstrijddag",
        fromDay: 0,
        toDay: 0,
        tasks: [
          {
            key: "shot-wedstrijd",
            label: "Bietensap",
            detail: "Eén shot van 6 tot 8 mmol nitraat, twee tot drie uur voor de start.",
          },
        ],
      },
    ],
    cautions: [
      ...SUPPLEMENT_CAUTIONS,
      "Gebruik deze week geen antibacteriële mondspoeling: die doodt de bacteriën in je mond die nitraat omzetten.",
      "Rode of roze urine is onschuldig.",
    ],
    notFor: ["Onder de 18."],
    limits: [
      "Bij goed getrainde renners is het effect kleiner of afwezig. Wie al veel groente eet, haalt er minder uit.",
    ],
    sources: [JONES_2018, MAUGHAN_2018],
    article: { href: "/zwbeter-worden/voeding/kennis/supplementen", title: "Supplementen en sportvoeding" },
  },
  {
    slug: "ijsslush",
    pillar: "voeden",
    group: "Op de wedstrijddag",
    title: "IJsslush voor een warme wedstrijd",
    shortLabel: "IJsslush",
    summary: "Fijngemalen ijs met sportdrank drinken in het halfuur voor de start.",
    goal: "Koeler beginnen in de hitte, zodat je later pas tegen je temperatuurgrens aanloopt.",
    evidence: "matig",
    anchor: "wedstrijd",
    calendar: true,
    phases: [
      {
        key: "proef",
        title: "Uitproberen",
        fromDay: -14,
        toDay: -2,
        tasks: [trial("Drink de slush een keer voor een training in de warmte. Kou in de maag moet wennen.")],
      },
      {
        key: "wedstrijd",
        title: "Wedstrijddag",
        fromDay: 0,
        toDay: 0,
        tasks: [
          {
            key: "slush",
            label: "IJsslush",
            detail: "In porties opdrinken in de 30 minuten voor de start. Maak hem met sportdrank, dan tankt hij ook.",
            dose: { perKg: { min: 7.5, max: 7.5 }, unit: "g", step: 50, max: 750 },
          },
        ],
      },
    ],
    cautions: ["Alleen bij een wedstrijd in de warmte; in koel weer heeft het geen zin."],
    notFor: [],
    limits: [
      "Voorkoelen helpt in de hitte volgens een meta-analyse, maar voor ijs drinken alleen is het effect onzeker; koud water om het lichaam werkte beter.",
      "Het effect van voorkoelen neemt na zo'n 20 tot 25 minuten rijden af.",
    ],
    sources: [BONGERS_2015, CHOO_2018],
    article: { href: "/zwbeter-worden/kennis/hittetraining", title: "Hittetraining" },
  },
  {
    slug: "glycerol",
    pillar: "voeden",
    group: "Op de wedstrijddag",
    title: "Glycerol voor een warme wedstrijd",
    shortLabel: "Glycerol",
    summary: "Vooraf extra vocht vasthouden met glycerol en veel water, voor een lange wedstrijd in de hitte.",
    goal: "Met een vochtvoorraad starten, zodat je in de hitte later uitdroogt.",
    evidence: "matig",
    anchor: "wedstrijd",
    calendar: true,
    minAge: SUPPLEMENT_MIN_AGE,
    phases: [
      {
        key: "proef",
        title: "Uitproberen",
        fromDay: -14,
        toDay: -2,
        tasks: [trial("Doe het hele schema een keer voor een lange training in de warmte. Let op hoofdpijn, misselijkheid en een opgeblazen gevoel.")],
      },
      {
        key: "wedstrijd",
        title: "Wedstrijddag",
        fromDay: 0,
        toDay: 0,
        tasks: [
          {
            key: "glycerol",
            label: "Glycerol",
            detail: "Opgelost in het water hieronder, verdeeld over een uur. Klaar ongeveer 30 minuten voor de start.",
            dose: { perKg: { min: 1.2, max: 1.2 }, unit: "g", step: 5, max: 120 },
          },
          {
            key: "water",
            label: "Water",
            detail: "In hetzelfde uur, in porties.",
            dose: { perKg: { min: 26, max: 26 }, unit: "ml", step: 50, max: 2500 },
          },
        ],
      },
    ],
    cautions: [
      ...SUPPLEMENT_CAUTIONS,
      "Je bent aan de start zwaarder door het vocht dat je vasthoudt. Op een klimwedstrijd telt dat.",
      "Hoofdpijn, misselijkheid en een opgeblazen gevoel komen voor.",
      "Glycerol staat sinds 2018 niet meer op de dopinglijst.",
    ],
    notFor: [
      "Onder de 18.",
      "Bij hoge bloeddruk, hart- of nierproblemen zonder overleg met een arts: het is veel vocht in korte tijd.",
    ],
    limits: [
      "Alleen zinvol bij een lange inspanning in de hitte met veel zweetverlies; in koel weer of bij een korte race niet.",
      "Het voordeel boven alleen veel water drinken is klein, en de studies spreken elkaar deels tegen.",
      "1,2 gram per kg in 26 ml per kg is een richtlijn afgeleid uit eerdere studies, geen afzonderlijk getest protocol.",
    ],
    sources: [VAN_ROSENDAL_2010, UCI_SUPPLEMENTS, MAUGHAN_2018],
    article: { href: "/zwbeter-worden/voeding/kennis/supplementen", title: "Supplementen en sportvoeding" },
  },
  {
    slug: "koolhydraten-laden",
    pillar: "voeden",
    group: "Op de wedstrijddag",
    title: "Koolhydraten laden voor een lange wedstrijd",
    shortLabel: "Laden",
    summary: "Twee dagen veel koolhydraten en een ontbijt dat tankt, voor een race van meer dan anderhalf uur.",
    goal: "Volle glycogeenvoorraden aan de start.",
    evidence: "matig",
    anchor: "wedstrijd",
    calendar: true,
    phases: [
      {
        key: "laden",
        title: "Laden",
        fromDay: -2,
        toDay: -1,
        tasks: [
          {
            key: "laden",
            label: "Koolhydraten over de dag",
            detail:
              "Verdeeld over de hele dag, vooral makkelijk verteerbaar: rijst, pasta, brood, sap. Minder vezels en vet. Train deze dagen licht.",
            dose: { perKg: { min: 10, max: 12 }, unit: "g", step: 10, max: 1200 },
          },
        ],
      },
      {
        key: "wedstrijd",
        title: "Wedstrijddag",
        fromDay: 0,
        toDay: 0,
        tasks: [
          {
            key: "ontbijt",
            label: "Koolhydraten in het ontbijt",
            detail: "Twee tot vier uur voor de start, iets wat je kent en goed verdraagt.",
            dose: { perKg: { min: 1, max: 4 }, unit: "g", step: 10, max: 400 },
          },
        ],
      },
    ],
    cautions: ["Je wordt er een kilo of zo zwaarder van: glycogeen houdt water vast. Dat is de bedoeling."],
    notFor: ["Bij een wedstrijd korter dan ongeveer 90 minuten: dan is gewoon goed eten genoeg."],
    limits: [
      "De winst geldt voor inspanningen langer dan ongeveer 90 minuten.",
      "Het UCI-standpunt legt de nadruk op eten naar de belasting van elke dag; maximaal laden is daar één toepassing van, geen vaste regel.",
    ],
    sources: [BURKE_2011, UCI_POSITION],
    article: { href: "/zwbeter-worden/voeding/kennis/voor-de-rit", title: "Voor de rit" },
  },
  {
    slug: "beta-alanine",
    pillar: "voeden",
    group: "Opbouw",
    title: "Bèta-alanine",
    shortLabel: "Bèta-alanine",
    summary: "Elke dag een paar kleine giften, minstens vier weken, om de buffer in je spieren te vullen.",
    goal: "Langer volhouden bij harde inspanningen van één tot vier minuten.",
    evidence: "sterk",
    anchor: "start",
    minAge: SUPPLEMENT_MIN_AGE,
    phases: [
      {
        key: "laden",
        title: "Acht weken",
        fromDay: 0,
        toDay: 55,
        tasks: [
          {
            key: "dagdosis",
            label: "Bèta-alanine",
            detail:
              "3,2 tot 6,4 gram per dag, verdeeld over giften van hoogstens 1,6 gram bij de maaltijden. De dosis hangt niet af van je gewicht.",
          },
        ],
      },
    ],
    cautions: [
      ...SUPPLEMENT_CAUTIONS,
      "Tintelingen in huid en gezicht zijn onschuldig; kleinere giften of een vorm met vertraagde afgifte helpen.",
    ],
    notFor: ["Onder de 18."],
    limits: [
      "Het effect is klein en vooral te zien bij inspanningen van één tot vier minuten, minder bij lange duur.",
      "Na stoppen zakt de buffer in enkele maanden langzaam terug.",
    ],
    sources: [TREXLER_2015, SAUNDERS_2017, MAUGHAN_2018],
    article: { href: "/zwbeter-worden/voeding/kennis/supplementen", title: "Supplementen en sportvoeding" },
  },
  {
    slug: "creatine",
    pillar: "voeden",
    group: "Opbouw",
    title: "Creatine",
    shortLabel: "Creatine",
    summary: "Een week laden en daarna een vaste dagdosis.",
    goal: "Sterkere sprints en meer uit krachttraining.",
    evidence: "sterk",
    anchor: "start",
    minAge: SUPPLEMENT_MIN_AGE,
    phases: [
      {
        key: "laden",
        title: "Laden",
        fromDay: 0,
        toDay: 4,
        tasks: [
          {
            key: "laden",
            label: "Creatine laden",
            detail: "Per dag, verdeeld over vier giften. Wil je geen gewichtssprong, sla deze fase dan over: met de dagdosis ben je na een maand ook vol.",
            dose: { perKg: { min: 0.3, max: 0.3 }, unit: "g", step: 1, max: 25 },
          },
        ],
      },
      {
        key: "onderhoud",
        title: "Onderhoud",
        fromDay: 5,
        toDay: 55,
        tasks: [
          { key: "dagdosis", label: "Creatine", detail: "3 tot 5 gram per dag, bij een maaltijd." },
        ],
      },
    ],
    cautions: [
      ...SUPPLEMENT_CAUTIONS,
      "Je wordt één tot twee kilo zwaarder door vocht in de spieren. Voor een klimmer telt dat.",
    ],
    notFor: ["Onder de 18.", "Bij nierproblemen zonder overleg met een arts."],
    limits: [
      "Voor lange duurprestaties is er geen duidelijke winst; het werkt bij sprints en kracht.",
    ],
    sources: [KREIDER_2017, MAUGHAN_2018],
    article: { href: "/zwbeter-worden/voeding/kennis/supplementen", title: "Supplementen en sportvoeding" },
  },
  {
    slug: "darmtraining",
    pillar: "voeden",
    group: "Opbouw",
    title: "Darmtraining naar 90 tot 120 gram per uur",
    shortLabel: "Darmtraining",
    summary: "Zes weken twee lange ritten per week met elke week iets meer koolhydraten per uur.",
    goal: "Meer koolhydraten opnemen zonder maagklachten.",
    evidence: "matig",
    anchor: "start",
    phases: [60, 70, 80, 90, 100, 110].map((grams, week) => ({
      key: `week-${week + 1}`,
      title: `Week ${week + 1}`,
      fromDay: week * 7,
      toDay: week * 7 + 6,
      tasks: [
        {
          key: "lange-rit",
          label: `Rit met ${grams}${week === 5 ? "-120" : ""} g per uur`,
          detail:
            "Een rit van minstens anderhalf uur. Eet en drink vanaf het eerste kwartier in vaste porties, met een mix van glucose (of maltodextrine) en fructose van ongeveer 1 op 0,8.",
          perWeek: 2,
        },
      ],
    })),
    cautions: [
      "Krijg je krampen, misselijkheid of diarree, ga dan een week terug naar de vorige stap.",
      "Train met wat je op de wedstrijddag wilt gebruiken.",
    ],
    notFor: ["Bij darmziekten of aanhoudende buikklachten zonder overleg met een arts of sportdiëtist."],
    limits: [
      "Boven ongeveer 90 gram per uur neem je meer op, maar een betere prestatie is niet aangetoond.",
      "Er is geen vast onderzocht schema; de stappen van 10 gram per week zijn een afleiding uit de reviews.",
    ],
    sources: [JEUKENDRUP_2017, PODLOGAR_2022, UCI_POSITION],
    article: { href: "/zwbeter-worden/voeding/kennis/darmtraining", title: "Darmtraining en maagklachten" },
  },
  {
    slug: "herstel-na-wedstrijd",
    pillar: "voeden",
    group: "Herstel",
    title: "Herstellen na een zware wedstrijd",
    shortLabel: "Herstel",
    summary: "Eiwit en koolhydraten in het eerste uur, drinken naar wat je verloor en eiwit voor het slapen.",
    goal: "Sneller aanvullen en spierherstel, vooral als je de dag erna weer moet rijden.",
    evidence: "matig",
    anchor: "wedstrijd",
    calendar: true,
    phases: [
      {
        key: "wedstrijd",
        title: "Na de finish",
        fromDay: 0,
        toDay: 0,
        tasks: [
          {
            key: "eiwit",
            label: "Eiwit binnen het uur",
            detail: "Bijvoorbeeld chocolademelk, kwark of een eiwitshake. Een shake is handig, niet beter dan gewoon eten.",
            dose: { perKg: { min: 0.3, max: 0.3 }, unit: "g", step: 5, max: 40 },
          },
          {
            key: "koolhydraten",
            label: "Koolhydraten erbij",
            detail:
              "In het eerste uur. Moet je binnen een dag weer koersen, herhaal dit dan elk uur tot de volgende maaltijd; anders volstaan gewone maaltijden.",
            dose: { perKg: { min: 1, max: 1.2 }, unit: "g", step: 10, max: 120 },
          },
          {
            key: "drinken",
            label: "Drinken",
            detail: "Weeg je voor en na. Drink in de vier tot zes uur erna 125 tot 150 procent van wat je verloor, met wat zout erbij.",
          },
          {
            key: "eiwit-nacht",
            label: "Eiwit voor het slapen",
            detail: "Ongeveer 40 gram, bijvoorbeeld een grote bak kwark.",
          },
        ],
      },
    ],
    cautions: [
      "Kies bij eiwitpoeder ook een batch met een NZVT-keurmerk.",
      "Herstel draait vooral om wat je die dag in totaal eet; dit zijn de eerste stappen.",
    ],
    notFor: [],
    limits: [
      "Dat eiwit erbij de prestatie de dag erna verbetert, komt uit kleine studies; in één studie met acht duursporters hielden ze het langer vol dan met alleen koolhydraten.",
      "Haast is alleen nodig als de volgende zware inspanning binnen ongeveer een dag komt.",
      "Eiwit voor het slapen verhoogt de eiwitaanmaak 's nachts; of dat je op termijn sneller maakt, is niet aangetoond.",
    ],
    sources: [BURKE_2011, KERKSICK_2017, RUSTAD_2016, SNIJDERS_2019, UCI_POSITION],
    article: { href: "/zwbeter-worden/voeding/kennis/herstel", title: "Herstel tussen sessies" },
  },
  {
    slug: "kersensap",
    pillar: "voeden",
    group: "Herstel",
    title: "Kersensap rond een zware wedstrijd",
    shortLabel: "Kersensap",
    summary: "Vanaf vier dagen voor tot twee dagen na een zware wedstrijd of etappekoers twee keer per dag zuur kersensap.",
    goal: "Sneller terug op kracht in de dagen na een zware inspanning.",
    evidence: "matig",
    anchor: "wedstrijd",
    calendar: true,
    minAge: SUPPLEMENT_MIN_AGE,
    phases: [
      {
        key: "rond-de-wedstrijd",
        title: "Zeven dagen",
        fromDay: -4,
        toDay: 2,
        tasks: [
          {
            key: "sap",
            label: "Kersensap, twee keer",
            detail:
              "'s Ochtends en 's avonds 30 ml concentraat van zure kersen, aangelengd met water, of een glas sap. Bij een etappekoers neem je de eerste etappe als wedstrijddag.",
          },
        ],
      },
    ],
    cautions: [
      ...SUPPLEMENT_CAUTIONS,
      "Begin op tijd: alleen na de wedstrijd drinken is niet onderbouwd.",
      "Concentraat bevat suiker; tel het mee als koolhydraten.",
      "Niet het hele jaar elke dag: hoge doses antioxidanten kunnen de aanpassing aan training afremmen. Voor kersensap is dat niet onderzocht.",
    ],
    notFor: ["Onder de 18."],
    limits: [
      "Het effect zit vooral in sneller herstel van kracht; minder spierpijn en lagere ontstekingswaarden zijn minder consistent gevonden.",
      "Bij wielrenners met drie dagen zware ritten daalden de ontstekingswaarden, maar de tijdrit werd niet beter.",
      "Kleine studies, een deel betaald door de kersenindustrie. Kersenpoeder werkte niet.",
    ],
    sources: [HILL_2021, MCHUGH_2022, BELL_2014, HOWATSON_2010, PAULSEN_2014],
    article: { href: "/zwbeter-worden/voeding/kennis/kersensap", title: "Kersensap en andere polyfenolen" },
  },
  {
    slug: "vitamine-d",
    pillar: "voeden",
    group: "Gezondheid",
    title: "Vitamine D in de winter",
    shortLabel: "Vitamine D",
    summary: "Het winterhalfjaar elke dag 10 microgram, als je dan vooral binnen traint of weinig buiten komt.",
    goal: "Een tekort voorkomen in de maanden met weinig zon.",
    evidence: "matig",
    anchor: "start",
    phases: [
      {
        key: "winter",
        title: "Winterhalfjaar",
        fromDay: 0,
        toDay: 181,
        tasks: [
          {
            key: "dagdosis",
            label: "Vitamine D",
            detail: "10 microgram (400 IE) per dag, bij een maaltijd. Vanaf 70 jaar 20 microgram.",
          },
        ],
      },
    ],
    cautions: [
      SUPPLEMENT_CAUTIONS[0],
      "Meer slikken helpt niet en zeer hoge doses kunnen schaden. Laat bij klachten eerst je bloedwaarde meten.",
    ],
    notFor: ["Als je arts je al vitamine D voorschrijft: volg dan die dosis."],
    limits: [
      "Bij een goede vitamine D-waarde maakt extra vitamine D je niet sneller of sterker.",
      "Het advies van de Gezondheidsraad gaat over wie weinig buiten komt. Dat dit geldt voor wie in de winter vooral binnen traint, is een afleiding van ZWB.",
    ],
    sources: [GR_VITAMINE_D, OWENS_2018, UCI_BONE],
    article: { href: "/zwbeter-worden/voeding/kennis/vitamine-d", title: "Vitamine D" },
  },
  {
    slug: "collageen",
    pillar: "voeden",
    group: "Gezondheid",
    title: "Collageen bij revalidatie van een pees of band",
    shortLabel: "Collageen",
    summary: "Gelatine of collageen met vitamine C, een uur voor je revalidatieoefeningen, acht weken lang.",
    goal: "Meer collageenaanmaak in pezen en banden tijdens het revalideren.",
    evidence: "beperkt",
    anchor: "start",
    minAge: SUPPLEMENT_MIN_AGE,
    phases: [
      {
        key: "revalidatie",
        title: "Acht weken",
        fromDay: 0,
        toDay: 55,
        tasks: [
          {
            key: "voor-oefenen",
            label: "Collageen met vitamine C",
            detail:
              "15 gram gelatine of collageen met ongeveer 50 mg vitamine C (of een glas sinaasappelsap), een uur voor je oefeningen. De dosis hangt niet af van je gewicht.",
          },
        ],
      },
    ],
    cautions: [
      SUPPLEMENT_CAUTIONS[0],
      "Het hoort bij de oefeningen van je fysiotherapeut en vervangt ze niet.",
    ],
    notFor: ["Onder de 18."],
    limits: [
      "De onderliggende studie had acht proefpersonen en mat een bloedwaarde, niet de pees zelf.",
      "Langdurig collageen naast krachttraining gaf in een meta-analyse kleine winst in kracht en een dikkere pees, maar niet bij wielrenners.",
      "Dat een blessure er sneller door geneest, is niet aangetoond.",
    ],
    sources: [SHAW_2017, BISCHOF_2024],
    article: { href: "/zwbeter-worden/voeding/kennis/collageen", title: "Collageen en gelatine" },
  },
];
