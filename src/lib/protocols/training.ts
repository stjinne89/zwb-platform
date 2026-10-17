// Trainingsprotocollen. De onderbouwing, met wat niet te controleren was, staat
// in docs/protocollen-onderzoek.md. Teksten zijn eigen samenvattingen.

import { doi, type KnowledgeSource } from "@/lib/knowledge/source";
import {
  BARRANCO_GIL_2024_RT,
  PALLARES_2025,
  VALENZUELA_2021_RT,
} from "@/lib/training/strength-library";
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

// Toegevoegd in de wetenschappelijke toets, fase 2 (2026-10-16); via PubMed bevestigd.
export const LUNDBY_2023: KnowledgeSource = {
  citation:
    "Lundby C, Hamarsland H, Hansen J, et al. Hematological, skeletal muscle fiber, and exercise performance adaptations to heat training in elite female and male cyclists. J Appl Physiol 135(1):217-226.",
  year: 2023,
  url: doi("10.1152/japplphysiol.00115.2023"),
  kind: "studie",
};

export const LUNDBY_2021: KnowledgeSource = {
  citation:
    "Lundby C, Svendsen IS, Urianstad T, et al. Training wearing thermal clothing and training in hot ambient conditions are equally effective methods of heat acclimation. J Sci Med Sport 24(8):763-767.",
  year: 2021,
  url: doi("10.1016/j.jsams.2021.06.005"),
  kind: "studie",
};

export const RICHARD_2025: KnowledgeSource = {
  citation:
    "Richard NA, Cheung SS, Koehle MS, et al. Three weeks of heat maintenance potentiates the benefits of heat acclimation in trained females. Physiol Rep 13(22):e70631.",
  year: 2025,
  url: doi("10.14814/phy2.70631"),
  kind: "studie",
};

export const CUBEL_2024: KnowledgeSource = {
  citation:
    "Cubel C, Fischer M, Stampe D, et al. Time-course for onset and decay of physiological adaptations in endurance trained athletes undertaking prolonged heat acclimation training. Temperature 11(4):350-362.",
  year: 2024,
  url: doi("10.1080/23328940.2024.2383505"),
  kind: "studie",
};

export const RONNESTAD_HEAT_2024: KnowledgeSource = {
  citation:
    "Rønnestad BR, Odden I, Urianstad T, et al. Heat suit training preserves the increased hemoglobin mass after altitude camp in elite cyclists. Med Sci Sports Exerc 57(1):81-87.",
  year: 2024,
  url: doi("10.1249/MSS.0000000000003542"),
  kind: "studie",
};

const GOODS_2023: KnowledgeSource = {
  citation:
    "Goods PSR, Maloney P, Miller J, et al. Concurrent validity of the CORE wearable sensor with BodyCap temperature pill to assess core body temperature during an elite women's field hockey heat training camp. Eur J Sport Sci 23(8):1509-1517.",
  year: 2023,
  url: doi("10.1080/17461391.2023.2193953"),
  kind: "studie",
};

const MCLAUGHLIN_2025: KnowledgeSource = {
  citation:
    "McLaughlin BC, Aguilera JT, D'Lugos AC. Validity of the CORE wearable sensor during constant-load cycling exercise in the heat. J Therm Biol 132:104241.",
  year: 2025,
  url: doi("10.1016/j.jtherbio.2025.104241"),
  kind: "studie",
};

const DAANEN_2023: KnowledgeSource = {
  citation:
    "Daanen HAM, Kohlen V, Teunissen LPJ. Heat flux systems for body core temperature assessment during exercise. J Therm Biol 112:103480.",
  year: 2023,
  url: doi("10.1016/j.jtherbio.2023.103480"),
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

export const ROTHSCHILD_2025: KnowledgeSource = {
  citation:
    "Rothschild JA, Gallo G, Hamilton K, et al. Durability of the moderate-to-heavy intensity transition can be predicted using readily available markers of physiological decoupling. Eur J Appl Physiol 125(10):2911-2920.",
  year: 2025,
  url: doi("10.1007/s00421-025-05815-0"),
  kind: "studie",
};

const BARSUMYAN_RESPONSE_2025: KnowledgeSource = {
  citation:
    "Barsumyan A, Shyla R, Saukkonen A, Soost C, Graw JA, Burchard R. Quantifying training response in cycling based on cardiovascular drift using machine learning. Front Artif Intell 8:1623384.",
  year: 2025,
  url: doi("10.3389/frai.2025.1623384"),
  kind: "studie",
};

const BARSUMYAN_CADENCE_2026: KnowledgeSource = {
  citation:
    "Barsumyan A, Soost C, Graw JA, Burchard R. The relationship between cadence decline, cardiovascular drift and aerobic decoupling as a marker of fatigue in well trained cyclists. BMC Sports Sci Med Rehabil 18(1).",
  year: 2026,
  url: doi("10.1186/s13102-026-01678-w"),
  kind: "studie",
};

// Onderzoeksronde 2026-10-16 (docs/trainingsmethodes-onderzoek-2026-10-16.md).
// Gevonden via PubMed en Consensus; alleen de samenvattingen gelezen.
export const RONNESTAD_BLOCK_2025: KnowledgeSource = {
  citation:
    "Rønnestad BR, Odden IU, Solum KS, et al. Block training with moderate- or high-intensity intervals both improve endurance performance in well-trained cyclists. Eur J Sport Sci 25(11):e70067.",
  year: 2025,
  url: doi("10.1002/ejsc.70067"),
  kind: "studie",
};

export const MOLMEN_2025: KnowledgeSource = {
  citation:
    "Mølmen KS, Odden I, Sørensen MD, et al. A moderate-intensity interval training block improves endurance performance in well-trained cyclists. Med Sci Sports Exerc 57(8):1780-1789.",
  year: 2025,
  url: doi("10.1249/MSS.0000000000003706"),
  kind: "studie",
};

export const SOLLI_2024: KnowledgeSource = {
  citation:
    "Solli GS, et al. A microcycle of high-intensity short-interval sessions induces improvements in indicators of endurance performance compared to regular training. Eur J Sport Sci.",
  year: 2024,
  url: doi("10.1002/ejsc.12223"),
  kind: "studie",
};

export const ALMQUIST_BLOCK_2022: KnowledgeSource = {
  citation:
    "Almquist NW, et al. No differences between 12 weeks of block- vs. traditional-periodized training in performance adaptations in trained cyclists. Front Physiol 13:837634.",
  year: 2022,
  url: doi("10.3389/fphys.2022.837634"),
  kind: "studie",
};

export const MOLMEN_2019: KnowledgeSource = {
  citation:
    "Mølmen KS, et al. Block periodization of endurance training – a systematic review and meta-analysis. Open Access J Sports Med.",
  year: 2019,
  url: doi("10.2147/oajsm.s180408"),
  kind: "review",
};

export const STAIANO_2023: KnowledgeSource = {
  citation:
    "Staiano W, Marcora S, Romagnoli M, Kirk U, Ring C. Brain endurance training improves endurance and cognitive performance in road cyclists. J Sci Med Sport 26(7):375-385.",
  year: 2023,
  url: doi("10.1016/j.jsams.2023.05.008"),
  kind: "studie",
};

export const WANG_BET_2026: KnowledgeSource = {
  citation:
    "Wang N, et al. The effects of brain endurance training on physical endurance performance under mental fatigue and non-fatigued conditions: a systematic review and meta-analysis. Front Psychol.",
  year: 2026,
  url: doi("10.3389/fpsyg.2026.1858200"),
  kind: "review",
};

export const DALLAWAY_2025: KnowledgeSource = {
  citation:
    "Dallaway N, et al. Effects of separate cognitive training on endurance exercise performance. J Funct Morphol Kinesiol 10(4):391.",
  year: 2025,
  url: doi("10.3390/jfmk10040391"),
  kind: "studie",
};

const BLOCK_WEEK_NOT_FOR = [
  "Als je in die week minder dan vijf dagen kunt fietsen.",
  "In de drie weken voor een A-wedstrijd of tijdens een taper.",
  "Als je net ziek was of al moe begint.",
];

const BLOCK_WEEK_LIMITS = [
  "Alles komt van één onderzoeksgroep in Lillehammer, bij goed getrainde renners met een VO2max rond 70. Bijna alleen mannen.",
  "Gemeten na zes dagen herstel; hoe lang de winst blijft, is niet onderzocht.",
  "Over twaalf weken gaf blokperiodisering geen beter resultaat dan een goede gewone opbouw met evenveel belasting.",
];

const DURABILITY_TASK = {
  key: "duurtest",
  label: "Duurtest",
  detail:
    "10 minuten inrijden, 60 minuten op 75% FTP in ERG, 5 minuten uitrijden. Elke keer met dezelfde ventilator, hetzelfde eten en drinken en uitgerust.",
  once: true,
};

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
            rideMinutes: 60,
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
            rideMinutes: 30,
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
      "De CORE-sensor schat je kerntemperatuur vanaf de huid. In vier validatiestudies week hij vaak meer dan 0,3 °C af: soms te laag, vooral bij hoge temperaturen, soms te hoog, vooral later in de rit en bij meer onderhuids vet. Zie de waarde als richting.",
      "Op 38,5 °C werkten renners in de hittepakstudies naartoe. Hoeveel minuten daarboven de app als sessie telt, is een eigen keuze van ZWB.",
    ],
    sources: [RACINAIS_2015, ZURAWLEW_2016, MCDONALD_2025, VERDEL_2021, GOODS_2023, MCLAUGHLIN_2025, DAANEN_2023],
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
            rideMinutes: 50,
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
            rideMinutes: 50,
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
      "De hemoglobinemassa steeg in de studies met ongeveer 2 tot 4 procent, bij vrouwen net zo goed als bij mannen. VO2max in koel weer steeg niet in elke studie significant.",
      "Kleine groepen, vooral (top)renners, en het meeste werk komt van één onderzoeksgroep.",
      "De studies gebruikten een hittekamer van 38 tot 40 °C of een hittepak. Thuis met extra kleding fietsen maakte vrouwen in tien dagen beter bestand tegen hitte, maar verhoogde hun hemoglobine niet.",
      "Stop je, dan is de winst binnen twee weken weg. Drie sessies per week hielden de hemoglobine in een proef wel op peil.",
      "De CORE-sensor schat je kerntemperatuur vanaf de huid. In vier validatiestudies week hij vaak meer dan 0,3 °C af: soms te laag, vooral bij hoge temperaturen, soms te hoog, vooral later in de rit en bij meer onderhuids vet. Zie de waarde als richting.",
      "Op 38,5 °C werkten renners in de hittepakstudies naartoe. Hoeveel minuten daarboven de app als sessie telt, is een eigen keuze van ZWB.",
    ],
    sources: [
      OBERHOLZER_2019,
      RONNESTAD_HEAT_2021,
      RONNESTAD_HEAT_2022,
      LUNDBY_2023,
      CUBEL_2024,
      RONNESTAD_HEAT_2024,
      RICHARD_2025,
      MCDONALD_2025,
      VERDEL_2021,
      GOODS_2023,
      MCLAUGHLIN_2025,
      DAANEN_2023,
    ],
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
    evidence: "beperkt",
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
  {
    slug: "duurtest",
    pillar: "trainen",
    group: "Testen",
    title: "Duurtest",
    shortLabel: "Duurtest",
    summary:
      "Vier maanden lang eens per maand een uur op 75% FTP. Je ziet hoeveel je hartslag in dat uur wegloopt van je vermogen, en of dat over de maanden minder wordt.",
    goal: "Volgen of je duurvermogen groeit.",
    evidence: "beperkt",
    anchor: "start",
    phases: [1, 2, 3, 4].map((month) => ({
      key: `maand-${month}`,
      title: `Maand ${month}`,
      fromDay: (month - 1) * 28,
      toDay: month * 28 - 1,
      tasks: [DURABILITY_TASK],
    })),
    cautions: [
      "Rij hem op een rustige dag, niet de dag na een zware training.",
      "Warmte, slaap en eten verschuiven je hartslag. Houd die zo gelijk mogelijk.",
    ],
    notFor: ["Zonder hartslagmeter of vermogensmeter."],
    limits: [
      "Eén Duitse groep gebruikte deze test maandelijks bij 17 tot 20 getrainde renners. Minder ontkoppeling viel samen met betere fitheid, maar een grens voor goed of slecht is er niet. ZWB laat daarom alleen je eigen reeks zien.",
      "ZWB meet alleen het werkblok, zonder de eerste vijf minuten. De meting komt uit intervals.icu; een rit die alleen via Strava binnenkomt, heeft geen gegevens per seconde.",
      "Vier maanden is een keuze van ZWB; in de studies liep het vijf maanden.",
    ],
    sources: [BARSUMYAN_RESPONSE_2025, BARSUMYAN_CADENCE_2026, ROTHSCHILD_2025],
    article: { href: "/zwbeter-worden/kennis/lange-ritten", title: "Lange ritten en duurvermogen" },
    measure: "duurtest",
    aiHint:
      "Duurtest. Plan in elk venster van 28 dagen één training met de titel 'Duurtest': 10 minuten inrijden op 55%, één blok van 60 minuten op 75% FTP, 5 minuten uitrijden op 50%. Zet hem op een rustige dag, nooit de dag na een sleutelsessie of een race, en tel hem als duurrit van de week. Verander de opzet niet.",
  },
  {
    slug: "kracht-op-de-fiets",
    pillar: "trainen",
    group: "Kracht",
    title: "Kracht op de fiets",
    shortLabel: "Kracht fiets",
    summary:
      "Tien weken twee keer per week korte, maximale trappen bergop in een groot verzet: krachttraining zonder sportschool.",
    goal: "Meer kracht en sprintvermogen in je benen, op je eigen fiets.",
    evidence: "beperkt",
    anchor: "start",
    phases: [
      {
        key: "blok",
        title: "Tien weken",
        fromDay: 0,
        toDay: 69,
        tasks: [
          {
            key: "sessie",
            label: "Kracht op de fiets",
            detail:
              "Na een kwartier inrijden: 5 keer 7 trappen voluit vanuit stilstand op een helling van ongeveer 6 %, zittend, in een verzet waarbij je gemiddeld 40 tot 50 toeren haalt. Tussen de sets 4 minuten rustig rijden. Haal je meer dan 50 toeren, schakel dan een tandje zwaarder.",
            perWeek: 2,
          },
        ],
      },
    ],
    cautions: [
      "Laat minstens drie dagen tussen twee sessies, zoals in de studie.",
      "Kies een rustige helling zonder verkeer en zet de pedaal in een stand waarin je goed kunt aanzetten.",
      "Stop bij knie- of rugpijn.",
    ],
    notFor: ["Bij knieklachten."],
    limits: [
      "Eén onderzoeksgroep, alleen goed getrainde mannen, tien weken.",
      "De studie was buiten op een helling van 6 %. Op een smart trainer is het niet getest; een vliegwiel gedraagt zich anders dan een helling.",
      "De zwaarte was in het lab gemeten als 70 % van de maximale trapkracht; de cadans is hier het richtpunt, zoals de onderzoekers op de weg deden.",
    ],
    sources: [BARRANCO_GIL_2024_RT, PALLARES_2025, VALENZUELA_2021_RT],
    article: { href: "/zwbeter-worden/core/kennis/kracht-op-de-fiets", title: "Kracht op de fiets" },
    aiHint:
      "Kracht op de fiets. Plan in dit venster twee keer per week, met minstens drie dagen ertussen en niet op de dag vóór een sleutelsessie of race, een krachtsessie op de fiets: 15 minuten inrijden, dan 5 keer een blok van 7 trappen voluit vanuit stilstand bergop in een groot verzet (cadans 40-50, zittend) met 4 minuten rustig rijden erna, en 10 minuten uitrijden. Geef de krachtblokken de notitie 'Buiten op een helling van ~6%: 7 trappen voluit vanuit stilstand'. Tel de sessie niet als sleutelsessie; het aantal sleutelsessies per week blijft zoals de periodisering vraagt.",
  },
  {
    slug: "blokweek-drempel",
    pillar: "trainen",
    group: "Blokweek",
    title: "Blokweek drempel",
    shortLabel: "Blokweek",
    summary:
      "Zes sweet-spotsessies in zeven dagen, daarna zes dagen rustig. Eén geconcentreerde week voor je drempel.",
    goal: "Meer vermogen bij je drempel en op 15 minuten.",
    evidence: "matig",
    methodLabel: "veelbelovend",
    anchor: "start",
    calendar: true,
    phases: [
      {
        key: "blok",
        title: "Blokweek",
        fromDay: 0,
        toDay: 6,
        tasks: [
          {
            key: "sessie",
            label: "Sweet-spotsessie",
            detail:
              "5 tot 7 blokken van 10 tot 14 minuten op 87-89% FTP (RPE 6), met 3 minuten herstel. Begin met 5x10 en bouw in de week op naar 7x14.",
            perWeek: 6,
          },
        ],
      },
      {
        key: "herstel",
        title: "Herstel",
        fromDay: 7,
        toDay: 12,
        tasks: [
          {
            key: "rustig",
            label: "Rustig rijden",
            detail: "Rustige duur of herstel, hooguit een uur. Geen intervallen.",
            perWeek: 3,
          },
        ],
      },
    ],
    cautions: [
      "Rij de blokken zo hard dat je het zes dagen volhoudt, niet harder.",
      "Slaap je slecht of ben je na drie dagen leeg, sla dan een sessie over.",
    ],
    notFor: BLOCK_WEEK_NOT_FOR,
    limits: [
      ...BLOCK_WEEK_LIMITS,
      "De studie stuurde op RPE 14-15. De 87-89% FTP en de 3 minuten herstel zijn een vertaling en een keuze van ZWB.",
    ],
    sources: [MOLMEN_2025, RONNESTAD_BLOCK_2025, MOLMEN_2019, ALMQUIST_BLOCK_2022],
    article: { href: "/zwbeter-worden/kennis/blokweek", title: "Blokweken" },
    aiHint:
      "Blokweek drempel (methodLabel 'veelbelovend' op elke blokweeksessie). Plan in de fase 'Blokweek' zes sessies in zeven dagen: 15 minuten inrijden, blokken op 87-89% FTP (RPE 6) met 3 minuten herstel op 50-58%, 10 minuten uitrijden. Bouw op: begin met 5x10, dan 6x12, en eindig met 7x14 minuten. Geen andere intensiteit in die week; de zevende dag is rust. Plan in de fase 'Herstel' alleen rustige duur of herstel van hooguit 60 minuten (methodLabel 'geen'). Deze week mag boven de 10%-groei en de grens op sprongen uitkomen; de herstelweek erna hoort erbij. Herstelsignalen gaan wel voor: schrap dan een sessie en zeg dat in cautions. Passen er door de beschikbaarheid minder dan vijf sessies, plan er dan zoveel als passen en zeg dat in cautions.",
  },
  {
    slug: "blokweek-30-15",
    pillar: "trainen",
    group: "Blokweek",
    title: "Blokweek 30/15",
    shortLabel: "Blokweek",
    summary:
      "Vijf sessies 30/15 in zes dagen, daarna zes dagen rustig. Eén geconcentreerde week voor je VO2max-vermogen.",
    goal: "Meer vermogen bij je VO2max en een iets betere sprint.",
    evidence: "matig",
    methodLabel: "veelbelovend",
    anchor: "start",
    calendar: true,
    phases: [
      {
        key: "blok",
        title: "Blokweek",
        fromDay: 0,
        toDay: 5,
        tasks: [
          {
            key: "sessie",
            label: "30/15-sessie",
            detail:
              "5 series van 12 keer 30 seconden hard en 15 seconden rustig, met 3 minuten tussen de series. Rijd alle series even hard.",
            perWeek: 5,
          },
        ],
      },
      {
        key: "herstel",
        title: "Herstel",
        fromDay: 6,
        toDay: 11,
        tasks: [
          {
            key: "rustig",
            label: "Rustig rijden",
            detail: "Rustige duur of herstel, hooguit een uur. Geen intervallen.",
            perWeek: 3,
          },
        ],
      },
    ],
    cautions: [
      "Vijf harde sessies in zes dagen is zwaar. Haal je de wattages van de eerste dag niet meer, rij dan rustig.",
      "Slaap je slecht of ben je na drie dagen leeg, sla dan een sessie over.",
    ],
    notFor: BLOCK_WEEK_NOT_FOR,
    limits: [
      ...BLOCK_WEEK_LIMITS,
      "De studie stuurde op maximale inspanning. De 110-120% FTP voor de harde 30 seconden is een vertaling van ZWB.",
    ],
    sources: [SOLLI_2024, RONNESTAD_BLOCK_2025, MOLMEN_2019, ALMQUIST_BLOCK_2022],
    article: { href: "/zwbeter-worden/kennis/blokweek", title: "Blokweken" },
    aiHint:
      "Blokweek 30/15 (methodLabel 'veelbelovend' op elke blokweeksessie). Plan in de fase 'Blokweek' vijf sessies in zes dagen: 15 minuten inrijden, 5 series van 9 minuten met onSeconds 30, offSeconds 15, target 110-120% en offTarget '50%', 3 minuten herstel op 50-58% tussen de series, 10 minuten uitrijden. Geen andere intensiteit in die week; de zesde dag is rust. Plan in de fase 'Herstel' alleen rustige duur of herstel van hooguit 60 minuten (methodLabel 'geen'). Deze week mag boven de 10%-groei en de grens op sprongen uitkomen; de herstelweek erna hoort erbij. Herstelsignalen gaan wel voor: schrap dan een sessie en zeg dat in cautions. Passen er door de beschikbaarheid minder dan vier sessies, plan er dan zoveel als passen en zeg dat in cautions.",
  },
  {
    slug: "brain-endurance-training",
    pillar: "trainen",
    group: "Naast de fiets",
    title: "Brain endurance training",
    shortLabel: "Concentratie",
    summary:
      "Zes weken na je training twintig minuten een concentratietaak, zodat een moe hoofd je minder vermogen kost.",
    goal: "Langer en harder kunnen als je mentaal moe bent, zoals aan het eind van een lange koers.",
    evidence: "beperkt",
    methodLabel: "experimenteel",
    anchor: "start",
    phases: [
      {
        key: "blok",
        title: "Zes weken",
        fromDay: 0,
        toDay: 41,
        tasks: [
          {
            key: "taak",
            label: "Concentratietaak na de training",
            detail:
              "Direct na je training 20 minuten een taak waarbij je een reflex moet onderdrukken, zoals een Stroop-test: noem de kleur van de letters, niet het woord. Zonder pauze, op je telefoon of computer.",
            perWeek: 3,
          },
        ],
      },
    ],
    cautions: [
      "De taak moet je hoofd vermoeien. Gaat hij makkelijk, kies dan een snellere of moeilijkere versie.",
    ],
    notFor: ["Als je al mentaal overbelast bent of slecht slaapt."],
    limits: [
      "Twee kleine proeven bij wegrenners (26 en 24), zes weken lang vijf keer per week.",
      "Het effect was duidelijk als renners mentaal moe aan de test begonnen; fris was het onzeker.",
      "De meeste studies komen van dezelfde onderzoekers.",
      "Alleen de taak, zonder training ervoor, deed niets.",
      "Drie keer per week is een keuze van ZWB; in de studie was het vijf keer.",
    ],
    sources: [STAIANO_2023, WANG_BET_2026, DALLAWAY_2025],
    article: { href: "/zwbeter-worden/kennis/brain-endurance-training", title: "Brain endurance training" },
  },
];
