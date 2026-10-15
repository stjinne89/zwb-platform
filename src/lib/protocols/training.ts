// Trainingsprotocollen. De onderbouwing, met wat niet te controleren was, staat
// in docs/protocollen-onderzoek.md. Teksten zijn eigen samenvattingen.

import { doi, type KnowledgeSource } from "@/lib/knowledge/source";
import type { Protocol } from "./types";

export const RACINAIS_2015: KnowledgeSource = {
  citation:
    "Racinais S, Alonso JM, Coutts AJ, et al. Consensus recommendations on training and competing in the heat. Br J Sports Med 49(18):1164-1173.",
  year: 2015,
  url: doi("10.1136/bjsports-2015-094915"),
  kind: "consensus",
};

export const ZURAWLEW_2016: KnowledgeSource = {
  citation:
    "Zurawlew MJ, Walsh NP, Fortes MB, Potter C. Post-exercise hot water immersion induces heat acclimation and improves endurance exercise performance in the heat. Scand J Med Sci Sports 26(7):745-754.",
  year: 2016,
  url: doi("10.1111/sms.12638"),
  kind: "studie",
};

export const MCDONALD_2025: KnowledgeSource = {
  citation:
    "McDonald P, Brown HA, Topham TH, Kelly MK, et al. Influence of exercise heat acclimation protocol characteristics on adaptation kinetics: a quantitative review with Bayesian meta-regressions. Compr Physiol 15(3):e70017.",
  year: 2025,
  url: doi("10.1002/cph4.70017"),
  kind: "review",
};

export const OBERHOLZER_2019: KnowledgeSource = {
  citation:
    "Oberholzer L, Siebenmann C, Mikkelsen CJ, et al. Hematological adaptations to prolonged heat acclimation in endurance-trained males. Front Physiol 10:1379.",
  year: 2019,
  url: doi("10.3389/fphys.2019.01379"),
  kind: "studie",
};

export const RONNESTAD_HEAT_2021: KnowledgeSource = {
  citation:
    "Rønnestad BR, Hamarsland H, Hansen J, et al. Five weeks of heat training increases haemoglobin mass in elite cyclists. Exp Physiol 106(1):316-327.",
  year: 2021,
  url: doi("10.1113/EP088544"),
  kind: "studie",
};

export const RONNESTAD_HEAT_2022: KnowledgeSource = {
  citation:
    "Rønnestad BR, Urianstad T, Hamarsland H, et al. Heat training efficiently increases and maintains hemoglobin mass and temperate endurance performance in elite cyclists. Med Sci Sports Exerc 54(9):1515-1526.",
  year: 2022,
  url: doi("10.1249/MSS.0000000000002928"),
  kind: "studie",
};

export const VERDEL_2021: KnowledgeSource = {
  citation:
    "Verdel N, et al. Reliability and validity of the CORE sensor to assess core body temperature during cycling exercise. Sensors 21(17):5932.",
  year: 2021,
  url: doi("10.3390/s21175932"),
  kind: "studie",
};

export const HEBISZ_2024: KnowledgeSource = {
  citation:
    "Hebisz R, Hebisz P. Greater improvement in aerobic capacity after a polarized training program including cycling interval training at low cadence (50-70 RPM) than freely chosen cadence (above 80 RPM). PLoS One 19(11):e0311833.",
  year: 2024,
  url: doi("10.1371/journal.pone.0311833"),
  kind: "studie",
};

export const HANSEN_RONNESTAD_2017: KnowledgeSource = {
  citation:
    "Hansen EA, Rønnestad BR. Effects of cycling training at imposed low cadences: a systematic review. Int J Sports Physiol Perform 12(9):1127-1136.",
  year: 2017,
  url: doi("10.1123/ijspp.2016-0574"),
  kind: "review",
};

export const DE_PABLOS_2025: KnowledgeSource = {
  citation:
    "de Pablos R, García-Pallarés J, Brea-Alejo L, et al. Traditional resistance training versus torque training: a randomized controlled trial. J Sci Cycling 14(2).",
  year: 2025,
  url: "https://www.jsc-journal.com/index.php/JSC/issue/view/56",
  kind: "studie",
};

export const ROMER_2002: KnowledgeSource = {
  citation:
    "Romer LM, McConnell AK, Jones DA. Effects of inspiratory muscle training on time-trial performance in trained cyclists. J Sports Sci 20(7):547-590.",
  year: 2002,
  url: doi("10.1080/026404102760000053"),
  kind: "studie",
};

export const ILLI_2012: KnowledgeSource = {
  citation:
    "Illi SK, Held U, Frank I, Spengler CM. Effect of respiratory muscle training on exercise performance in healthy individuals: a systematic review and meta-analysis. Sports Med 42(8):707-724.",
  year: 2012,
  url: doi("10.1007/BF03262290"),
  kind: "review",
};

export const HAJGHANBARI_2013: KnowledgeSource = {
  citation:
    "HajGhanbari B, Yamabayashi C, Buna TR, et al. Effects of respiratory muscle training on performance in athletes: a systematic review with meta-analyses. J Strength Cond Res 27(6):1643-1663.",
  year: 2013,
  url: doi("10.1519/JSC.0b013e318269f73f"),
  kind: "review",
};

const HEAT_CAUTIONS = [
  "Weeg je voor en na. Elke kilo die je kwijt bent, vul je aan met ongeveer anderhalve liter drinken.",
  "Stop meteen bij duizeligheid, misselijkheid, hoofdpijn, verwardheid of kippenvel in de warmte.",
  "Drink tijdens de sessie; uitdrogen hoort niet bij de prikkel.",
];

const HEAT_NOT_FOR = [
  "Bij koorts, een infectie of de dag na een ziekte.",
  "Bij hart- of vaatproblemen, of met medicijnen die je warmteregeling beïnvloeden, zonder overleg met een arts.",
];

export const TRAINING_PROTOCOLS: Protocol[] = [
  {
    slug: "hitte-kort",
    pillar: "trainen",
    group: "Hitte",
    title: "Hitte-acclimatisatie voor een warme wedstrijd",
    shortLabel: "Hitte",
    summary:
      "Tien dagen elke dag het warm hebben, zodat je lichaam in de wedstrijd minder last heeft van de hitte.",
    goal: "Beter presteren in de warmte: lagere kerntemperatuur en hartslag, meer bloedplasma.",
    evidence: "sterk",
    anchor: "wedstrijd",
    calendar: true,
    phases: [
      {
        key: "opbouw",
        title: "Elke dag warm",
        fromDay: -14,
        toDay: -4,
        tasks: [
          {
            key: "hittesessie",
            label: "Hittesessie",
            detail:
              "Rij 60 minuten rustig zonder ventilator en met een extra laag. Of neem binnen tien minuten na je gewone rit een heet bad van ongeveer 40 °C, tot 40 minuten. Met een CORE-sensor: minstens 30 minuten boven 38,5 °C.",
            coreMinutes: 30,
          },
        ],
      },
      {
        key: "vasthouden",
        title: "Vasthouden",
        fromDay: -3,
        toDay: -1,
        tasks: [
          {
            key: "korte-hittesessie",
            label: "Korte hittesessie",
            detail:
              "30 minuten rustig warm rijden, of een kort heet bad. Niet zwaar: je moet fris aan de start staan. Met een CORE-sensor: 10 minuten boven 38,5 °C is genoeg.",
            perWeek: 2,
            coreMinutes: 10,
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
            key: "koel-starten",
            label: "Koel starten",
            detail: "Begin zo koel mogelijk: in de schaduw inrijden, koude drank of ijsslush vooraf.",
          },
        ],
      },
    ],
    cautions: HEAT_CAUTIONS,
    notFor: HEAT_NOT_FOR,
    limits: [
      "Het grootste deel van de aanpassing komt in de eerste week; na twee weken stoppen is er nog veel over, maar hoe lang precies verschilt per studie.",
      "Het hete bad is getest na hardlopen, bij mannen die niet gewend waren aan de warmte. Bij renners en vrouwen is het minder onderzocht.",
      "Binnen rijden zonder ventilator is niet als zodanig onderzocht. Het werkt via dezelfde prikkel, een hogere kerntemperatuur. Zonder CORE-sensor weet je niet of je warm genoeg was.",
      "De winst geldt voor wedstrijden in de warmte. In koel weer liet de badstudie geen verschil zien.",
      "De CORE-sensor schat je kerntemperatuur vanaf de huid. In een validatiestudie bij fietsers week ongeveer de helft van de metingen meer dan 0,3 °C af van een rectale meting.",
      "Op 38,5 °C werkten renners in de hittepakstudies naartoe. Hoeveel minuten daarboven de app als sessie telt, is een eigen keuze van ZWB.",
    ],
    sources: [RACINAIS_2015, ZURAWLEW_2016, MCDONALD_2025, VERDEL_2021],
    article: { href: "/zwbeter-worden/kennis/hittetraining", title: "Hittetraining" },
    aiHint:
      "Hitte-acclimatisatie richting een warme wedstrijd. Plan op elke dag van de fase 'Elke dag warm' een rustige duurrit van minstens 60 minuten, of houd de geplande rit, en zet in description: 'Warm rijden: geen ventilator, extra laag.' Een drempel-, VO2max- of anaerobe sessie rijdt het lid koel; zet daar in description: 'Koel rijden, daarna een heet bad.' De laatste drie dagen voor de wedstrijd hooguit twee korte warme ritten van 30 minuten.",
  },
  {
    slug: "hitte-lang",
    pillar: "trainen",
    group: "Hitte",
    title: "Hittetraining voor meer hemoglobine",
    shortLabel: "Hitte",
    summary:
      "Vijf weken vijf keer per week warm rijden, daarna drie weken drie keer. Een alternatief voor een hoogtestage.",
    goal: "Meer hemoglobine, en daarmee meer zuurstoftransport, ook in koel weer.",
    evidence: "matig",
    anchor: "start",
    calendar: true,
    phases: [
      {
        key: "opbouw",
        title: "Vijf weken",
        fromDay: 0,
        toDay: 34,
        tasks: [
          {
            key: "hittesessie",
            label: "Hittesessie",
            detail:
              "50 minuten rustige of intensieve duur zonder ventilator, met extra kleding of een regenpak. Je moet het echt warm hebben: met een CORE-sensor minstens 30 minuten boven 38,5 °C.",
            perWeek: 5,
            coreMinutes: 30,
          },
        ],
      },
      {
        key: "onderhoud",
        title: "Onderhoud",
        fromDay: 35,
        toDay: 55,
        tasks: [
          {
            key: "hittesessie",
            label: "Hittesessie",
            detail: "Zelfde sessie, drie keer per week. Zo houd je meer van de winst vast dan als je stopt.",
            perWeek: 3,
            coreMinutes: 30,
          },
        ],
      },
    ],
    cautions: [
      ...HEAT_CAUTIONS,
      "Voor nieuwe hemoglobine heb je ijzer nodig. Twijfel je over je ijzer, laat dan eerst je ferritine meten bij de huisarts.",
    ],
    notFor: HEAT_NOT_FOR,
    limits: [
      "De hemoglobinemassa steeg in de studies met ongeveer 2 tot 4 procent. VO2max in koel weer steeg niet in elke studie significant.",
      "Kleine groepen, vooral (top)renners, en het meeste werk komt van één onderzoeksgroep.",
      "De studies gebruikten een hittekamer van 38 tot 40 °C of een hittepak. Thuis zonder ventilator rijden met extra kleding is daar een afleiding van.",
      "De CORE-sensor schat je kerntemperatuur vanaf de huid. In een validatiestudie bij fietsers week ongeveer de helft van de metingen meer dan 0,3 °C af van een rectale meting.",
      "Op 38,5 °C werkten renners in de hittepakstudies naartoe. Hoeveel minuten daarboven de app als sessie telt, is een eigen keuze van ZWB.",
    ],
    sources: [OBERHOLZER_2019, RONNESTAD_HEAT_2021, RONNESTAD_HEAT_2022, MCDONALD_2025, VERDEL_2021],
    article: { href: "/zwbeter-worden/kennis/hittetraining", title: "Hittetraining" },
    aiHint:
      "Hittetraining voor hemoglobine. Plan in de fase 'Vijf weken' per week vijf ritten van minstens 50 minuten op rustige of intensieve duur, en in 'Onderhoud' drie per week. Zet in description: 'Warm rijden: geen ventilator, extra kleding.' Sleutelsessies mogen doorgaan maar rijdt het lid koel; een hittesessie is geen extra belasting bovenop het weekvolume.",
  },
  {
    slug: "lage-cadans-vo2max",
    pillar: "trainen",
    group: "Intensiteit",
    title: "Lage cadans bij VO2max en sprints",
    shortLabel: "Lage cadans",
    summary:
      "Acht weken de VO2max-blokken en sprints uit je schema op 50 tot 70 toeren. De AI-coach zet de cadans in de blokken.",
    goal: "Een hogere VO2max en meer maximaal aeroob vermogen dan met dezelfde blokken op je eigen cadans.",
    evidence: "matig",
    anchor: "start",
    phases: [
      {
        key: "blok",
        title: "Acht weken",
        fromDay: 0,
        toDay: 55,
        tasks: [
          {
            key: "sessie",
            label: "Sessie op lage cadans",
            detail:
              "Rij de VO2max-blokken op 60 tot 70 toeren en sprints van 30 seconden op 50 tot 60, zittend. Duur, tempo en herstel rij je op je eigen cadans.",
            perWeek: 2,
          },
        ],
      },
    ],
    cautions: [
      "Stop bij kniepijn en rij de blokken dan op je eigen cadans.",
      "In ERG-modus zet je trainer de weerstand zelf; schakel dan naar een zwaarder verzet om de toeren omlaag te krijgen.",
    ],
    notFor: ["Bij knieklachten."],
    limits: [
      "Eén proef liet het effect zien: 24 jonge, goed getrainde vrouwen, acht weken. De VO2max steeg met 8,7 tegen 4,6 procent.",
      "Op matige intensiteit (tempo, drempel) vond geen enkele studie winst. Een torque-programma op 50 toeren bij 70 procent van het VO2max-vermogen deed niets, squats in de gym wel.",
      "Het is geen vervanging voor krachttraining in de gym.",
    ],
    sources: [HEBISZ_2024, HANSEN_RONNESTAD_2017, DE_PABLOS_2025],
    article: { href: "/zwbeter-worden/kennis/lage-cadans", title: "Lage cadans" },
    aiHint:
      "Lage cadans bij hoge intensiteit. Geef in dit venster elk blok op VO2max (105-118% FTP) de bloknotitie 'Cadans 60-70, zittend' en elke sprint of anaeroob blok 'Cadans 50-60, zittend'. Het aantal sleutelsessies en de opbouw blijven zoals de periodisering vraagt. Duur, tempo, sweet spot, drempel en herstel blijven op vrije cadans.",
  },
  {
    slug: "ademspiertraining",
    pillar: "trainen",
    group: "Naast de fiets",
    title: "Ademspiertraining",
    shortLabel: "Ademen",
    summary:
      "Zes weken twee keer per dag dertig keer inademen tegen weerstand, met een ademtrainer.",
    goal: "Minder vermoeide ademspieren en een iets betere tijdrit.",
    evidence: "matig",
    anchor: "start",
    phases: [
      {
        key: "blok",
        title: "Zes weken",
        fromDay: 0,
        toDay: 41,
        tasks: [
          {
            key: "ochtend",
            label: "Ademtrainer ochtend",
            detail: "30 krachtige inademingen tegen weerstand, op ongeveer de helft van je maximale inademingskracht.",
          },
          {
            key: "avond",
            label: "Ademtrainer avond",
            detail: "Zelfde sessie. Verhoog de weerstand zodra 30 keer makkelijk gaat.",
          },
        ],
      },
    ],
    cautions: [
      "Je hebt een ademtrainer met instelbare weerstand nodig.",
      "Licht duizelig in de eerste dagen is gewoon; stop bij hoofdpijn of benauwdheid.",
    ],
    notFor: ["Bij long- of hartklachten zonder overleg met je huisarts."],
    limits: [
      "In de klassieke proef met renners ging de tijdrit 4 tot 5 procent sneller; in meta-analyses is de winst kleiner en groter bij minder getrainde mensen.",
      "De meeste studies zijn klein.",
      "Een ademtrainer is geen fietsblok; de AI-coach plant hem niet in.",
    ],
    sources: [ROMER_2002, ILLI_2012, HAJGHANBARI_2013],
    article: { href: "/zwbeter-worden/kennis/ademspiertraining", title: "Ademspiertraining" },
  },
];
