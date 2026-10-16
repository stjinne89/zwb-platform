// De kennisbank trainen.
//
// Zelfde opzet als de kennisbanken voeding en kracht: in code, zodat elke
// bewering en elke bron via een commit gaat, en tests/unit/training-library.test.ts
// bewaakt dat er bij elk artikel een bron en een beperking staat. Deze eerste
// ronde dekt de onderwerpen van de protocollen; de rest van de trainingskennis
// (docs/lange-ritten-variatie.md, warming-up, FTP-test) volgt in een eigen ronde.
//
// De onderbouwing staat uitgebreider in docs/protocollen-onderzoek.md. Teksten
// zijn eigen samenvattingen; we citeren de bronnen niet letterlijk.

import { doi, type KnowledgeSource } from "@/lib/knowledge/source";
import {
  DE_PABLOS_2025,
  HAJGHANBARI_2013,
  HANSEN_RONNESTAD_2017,
  HEBISZ_2024,
  ILLI_2012,
  MCDONALD_2025,
  OBERHOLZER_2019,
  RACINAIS_2015,
  ROMER_2002,
  RONNESTAD_HEAT_2022,
  VERDEL_2021,
  ZURAWLEW_2016,
} from "@/lib/protocols/training";

export const TRAINING_CATEGORIES = [
  "intensiteit",
  "testen",
  "piek",
  "herstel",
  "omstandigheden",
  "naast-de-fiets",
] as const;
export type TrainingCategory = (typeof TRAINING_CATEGORIES)[number];

export const TRAINING_CATEGORY_LABELS: Record<TrainingCategory, string> = {
  intensiteit: "Intensiteit",
  testen: "Testen",
  piek: "Naar een piek",
  herstel: "Herstel",
  omstandigheden: "Hitte",
  "naast-de-fiets": "Naast de fiets",
};

export type TrainingArticle = {
  slug: string;
  category: TrainingCategory;
  title: string;
  summary: string;
  points: string[];
  /** Wat de bronnen níét laten zien, of wat een eigen keuze van ZWB is. */
  limits: string[];
  sources: KnowledgeSource[];
};

const RONNESTAD_2015: KnowledgeSource = {
  citation:
    "Rønnestad BR, Hansen J, Vegge G, Tønnessen E, Slettaløkken G. Short intervals induce superior training adaptations compared with long intervals in cyclists - an effort-matched approach. Scand J Med Sci Sports 25(2):143-151.",
  year: 2015,
  url: doi("10.1111/sms.12165"),
  kind: "studie",
};

const RONNESTAD_2020: KnowledgeSource = {
  citation:
    "Rønnestad BR, Hansen J, Nygaard H, Lundby C. Superior performance improvements in elite cyclists following short-interval vs effort-matched long-interval training. Scand J Med Sci Sports 30(5):849-857.",
  year: 2020,
  url: doi("10.1111/sms.13627"),
  kind: "studie",
};

const OLIVEIRA_2024: KnowledgeSource = {
  citation:
    "Silva Oliveira P, Boppre G, Fonseca H. Comparison of polarized versus other types of endurance training intensity distribution on athletes' endurance performance: a systematic review with meta-analysis. Sports Med 54(8):2071-2095.",
  year: 2024,
  url: doi("10.1007/s40279-024-02034-z"),
  kind: "review",
};

const SEILER_2010: KnowledgeSource = {
  citation:
    "Seiler S. What is best practice for training intensity and duration distribution in endurance athletes? Int J Sports Physiol Perform 5(3):276-291.",
  year: 2010,
  url: doi("10.1123/ijspp.5.3.276"),
  kind: "review",
};

const ESTEVE_LANAO_2007: KnowledgeSource = {
  citation:
    "Esteve-Lanao J, Foster C, Seiler S, Lucia A. Impact of training intensity distribution on performance in endurance athletes. J Strength Cond Res 21(3):943-949.",
  year: 2007,
  url: doi("10.1519/R-19725.1"),
  kind: "studie",
};

const BOSQUET_2007: KnowledgeSource = {
  citation:
    "Bosquet L, Montpetit J, Arvisais D, Mujika I. Effects of tapering on performance: a meta-analysis. Med Sci Sports Exerc 39(8):1358-1365.",
  year: 2007,
  url: doi("10.1249/mss.0b013e31806010e0"),
  kind: "review",
};

const WANG_2023: KnowledgeSource = {
  citation:
    "Wang Z, Wang YT, Gao W, Zhong Y. Effects of tapering on performance in endurance athletes: a systematic review and meta-analysis. PLoS One 18(5):e0282838.",
  year: 2023,
  url: doi("10.1371/journal.pone.0282838"),
  kind: "review",
};

const BROATCH_2018: KnowledgeSource = {
  citation:
    "Broatch JR, Petersen A, Bishop DJ. The influence of post-exercise cold-water immersion on adaptive responses to exercise: a review of the literature. Sports Med 48(6):1369-1387.",
  year: 2018,
  url: doi("10.1007/s40279-018-0910-8"),
  kind: "review",
};

// Herstel meten (wetenschappelijke toets 1C, 2026-10-16). DOI's via PubMed bevestigd.
const PLEWS_2013: KnowledgeSource = {
  citation:
    "Plews DJ, Laursen PB, Stanley J, Kilding AE, Buchheit M. Training adaptation and heart rate variability in elite endurance athletes: opening the door to effective monitoring. Sports Med 43(9):773-781.",
  year: 2013,
  url: doi("10.1007/s40279-013-0071-8"),
  kind: "review",
};

const BUCHHEIT_2014: KnowledgeSource = {
  citation:
    "Buchheit M. Monitoring training status with HR measures: do all roads lead to Rome? Front Physiol 5:73.",
  year: 2014,
  url: doi("10.3389/fphys.2014.00073"),
  kind: "review",
};

const VESTERINEN_2016: KnowledgeSource = {
  citation:
    "Vesterinen V, Nummela A, Heikura I, Laine T, Hynynen E, Botella J, Häkkinen K. Individual endurance training prescription with heart rate variability. Med Sci Sports Exerc 48(7):1347-1354.",
  year: 2016,
  url: doi("10.1249/MSS.0000000000000910"),
  kind: "studie",
};

const JAVALOYES_2019: KnowledgeSource = {
  citation:
    "Javaloyes A, Sarabia JM, Lamberts RP, Moya-Ramon M. Training prescription guided by heart-rate variability in cycling. Int J Sports Physiol Perform 14(1):23-32.",
  year: 2019,
  url: doi("10.1123/ijspp.2018-0122"),
  kind: "studie",
};

const LE_MEUR_2013: KnowledgeSource = {
  citation:
    "Le Meur Y, Pichon A, Schaal K, Schmitt L, Louis J, Gueneron J, Vidal PP, Hausswirth C. Evidence of parasympathetic hyperactivity in functionally overreached athletes. Med Sci Sports Exerc 45(11):2061-2071.",
  year: 2013,
  url: doi("10.1249/MSS.0b013e3182980125"),
  kind: "studie",
};

const MANRESA_ROCAMORA_2021: KnowledgeSource = {
  citation:
    "Manresa-Rocamora A, Flatt AA, Casanova-Lizón A, et al. Heart rate-based indices to detect parasympathetic hyperactivity in functionally overreached athletes. A meta-analysis. Scand J Med Sci Sports 31(6):1164-1182.",
  year: 2021,
  url: doi("10.1111/sms.13932"),
  kind: "review",
};

const ALFONSO_2025: KnowledgeSource = {
  citation:
    "Alfonso C, Clarke DC, Capdevila L. Individual training prescribed by heart rate variability, heart rate and well-being scores in experienced cyclists. Sci Rep 15:34023.",
  year: 2025,
  url: doi("10.1038/s41598-025-13540-z"),
  kind: "studie",
};

const CRAVEN_2022: KnowledgeSource = {
  citation:
    "Craven J, McCartney D, Desbrow B, et al. Effects of acute sleep loss on physical performance: a systematic and meta-analytical review. Sports Med 52(11):2669-2690.",
  year: 2022,
  url: doi("10.1007/s40279-022-01706-y"),
  kind: "review",
};

// FTP-test (wetenschappelijke toets 1B, 2026-10-16). DOI's via PubMed bevestigd.
const BORSZCZ_2018: KnowledgeSource = {
  citation:
    "Borszcz FK, Tramontin AF, Bossi AH, Carminatti LJ, Costa VP. Functional threshold power in cyclists: validity of the concept and physiological responses. Int J Sports Med 39(10):737-742.",
  year: 2018,
  url: doi("10.1055/s-0044-101546"),
  kind: "studie",
};

const BORSZCZ_2019: KnowledgeSource = {
  citation:
    "Borszcz FK, Tramontin AF, Costa VP. Is the functional threshold power interchangeable with the maximal lactate steady state in trained cyclists? Int J Sports Physiol Perform 14(8):1029-1035.",
  year: 2019,
  url: doi("10.1123/ijspp.2018-0572"),
  kind: "studie",
};

const MCGRATH_2019: KnowledgeSource = {
  citation:
    "McGrath E, Mahony N, Fleming N, Donne B. Is the FTP test a reliable, reproducible and functional assessment tool in highly-trained athletes? Int J Exerc Sci 12(4):1334-1345.",
  year: 2019,
  url: doi("10.70252/RQOO7391"),
  kind: "studie",
};

const INGLIS_2020: KnowledgeSource = {
  citation:
    "Inglis EC, Iannetta D, Passfield L, Murias JM. Maximal lactate steady state versus the 20-minute functional threshold power test in well-trained individuals: \"watts\" the big deal? Int J Sports Physiol Perform 15(4):541-547.",
  year: 2020,
  url: doi("10.1123/ijspp.2019-0214"),
  kind: "studie",
};

const VALENZUELA_2018: KnowledgeSource = {
  citation:
    "Valenzuela PL, Morales JS, Foster C, Lucia A, de la Villa P. Is the functional threshold power a valid surrogate of the lactate threshold? Int J Sports Physiol Perform 13(10):1293-1298.",
  year: 2018,
  url: doi("10.1123/ijspp.2018-0008"),
  kind: "studie",
};

const WONG_2023: KnowledgeSource = {
  citation:
    "Wong S, Burnley M, Mauger AR, Fenghua S, Hopker J. Functional threshold power is not a valid marker of the maximal metabolic steady state. J Sports Sci 40(23):2578-2584.",
  year: 2023,
  url: doi("10.1080/02640414.2023.2176045"),
  kind: "studie",
};

const TRAMONTIN_2021: KnowledgeSource = {
  citation:
    "Tramontin AF, Borszcz FK, Costa V. Functional threshold power estimated from a 20-minute time-trial test is warm-up-dependent. Int J Sports Med 43(5):411-417.",
  year: 2021,
  url: doi("10.1055/a-1524-2312"),
  kind: "studie",
};

const AZEVEDO_2023: KnowledgeSource = {
  citation:
    "Azevedo RA, Fleitas-Paniagua PR, Trpcic M, Iannetta D, Millet GY, Murias JM. Different ramp-incremental slopes elicit similar VO2max and fatigability profiles in females and males despite differences in peak power output. J Appl Physiol 135(1):109-120.",
  year: 2023,
  url: doi("10.1152/japplphysiol.00090.2023"),
  kind: "studie",
};

const KARSTEN_2021: KnowledgeSource = {
  citation:
    "Karsten B, Petrigna L, Klose A, Bianco A, Townsend N, Triska C. Relationship between the critical power test and a 20-min functional threshold power test in cycling. Front Physiol 11:613151.",
  year: 2021,
  url: doi("10.3389/fphys.2020.613151"),
  kind: "studie",
};

export const TRAINING_ARTICLES: TrainingArticle[] = [
  {
    slug: "lage-cadans",
    category: "intensiteit",
    title: "Lage cadans",
    summary:
      "Rijden op lage toeren lijkt alleen iets op te leveren bij hoge intensiteit. Op tempo of drempel is er geen winst gevonden.",
    points: [
      "In een proef van acht weken stegen VO2max en maximaal aeroob vermogen meer als de VO2max-blokken en sprints op 50 tot 70 toeren werden gereden dan op eigen cadans (8,7 tegen 4,6 procent).",
      "Een systematische review vond in 2017 geen sterk bewijs voor lage cadans, en raadde het hooguit aan op matige tot maximale intensiteit.",
      "Een torque-programma op 50 toeren bij 70 procent van het VO2max-vermogen deed in tien weken niets; zware squats in de gym verbeterden wel het vermogen.",
      "ZWB zet lage cadans daarom alleen op VO2max-blokken en sprints, als protocol dat de AI-coach in je schema verwerkt.",
    ],
    limits: [
      "De positieve proef had 24 jonge, goed getrainde vrouwen. Of het bij oudere of minder getrainde renners net zo werkt, is niet onderzocht.",
      "De lange duurritten met lage-cadansblokken in de workoutbibliotheek rijden op tempo en drempel, waar dit bewijs niet voor geldt; ze zijn variatie, geen bewezen winst.",
    ],
    sources: [HEBISZ_2024, HANSEN_RONNESTAD_2017, DE_PABLOS_2025],
  },
  {
    slug: "korte-intervallen",
    category: "intensiteit",
    title: "Korte intervallen (30/15)",
    summary:
      "Blokken van 30 seconden hard en 15 seconden rustig gaven in een paar proeven meer winst dan even zware intervallen van vijf minuten.",
    points: [
      "Drie series van 13 keer 30/15 gaven in tien weken meer VO2max dan vier keer vijf minuten bij dezelfde ervaren zwaarte (8,7 tegen 2,6 procent), en ook meer vermogen op 30 seconden, 5 en 40 minuten.",
      "Bij toprenners gaven negen van die sessies in drie weken een betere 20-minutentest (4,7 tegen -1,4 procent); de VO2max veranderde daar niet anders.",
      "Je haalt met korte blokken meer minuten dicht bij je VO2max, omdat je de hartslag hoog houdt zonder volledig te verzuren.",
    ],
    limits: [
      "Het bewijs komt vooral van één onderzoeksgroep, met kleine groepen.",
      "Of 30/15 op lange termijn beter is dan lange intervallen, is niet onderzocht; afwisselen ligt voor de hand.",
    ],
    sources: [RONNESTAD_2015, RONNESTAD_2020],
  },
  {
    slug: "intensiteitsverdeling",
    category: "intensiteit",
    title: "Gepolariseerd of piramidaal",
    summary:
      "Of je je harde werk gepolariseerd of piramidaal verdeelt, maakt voor je prestatie weinig uit. Veel rustig rijden is in beide de basis.",
    points: [
      "Een meta-analyse vond voor gepolariseerd trainen een klein voordeel op VO2max, vooral bij korte programma's en zeer goed getrainde sporters.",
      "Op tijdrit en uithoudingsvermogen was er geen verschil met andere verdelingen.",
      "ZWB schrijft daarom geen verdeling voor; de AI-coach volgt de periodisering en je voorkeuren.",
    ],
    limits: ["De studies zijn kort (vaak minder dan twaalf weken) en verschillen sterk in opzet."],
    sources: [OLIVEIRA_2024],
  },
  {
    slug: "rustige-ritten",
    category: "intensiteit",
    title: "Rustige ritten rustig",
    summary:
      "Goed getrainde duursporters rijden het grootste deel van hun tijd rustig. Een rustige rit die tempo wordt, levert weinig op en kost herstel voor de volgende harde dag.",
    points: [
      "Bij goed getrainde duursporters ligt zo'n 80% van de trainingen onder de eerste drempel; het harde werk zit in een klein deel.",
      "Lopers die bij dezelfde totale belasting meer rustig en minder op tempo trainden, verbeterden meer op hun wedstrijd.",
      "Juist als je je sterk voelt is inhouden het lastigst. Bewaar dat gevoel voor de volgende harde training.",
      "Houd je bij een duurrit onder 75% van je FTP, de bovenkant van zone 2. Op Zwift helpt een workout in ERG-modus; in een groep rijd je achteraan of laat je hem gaan.",
    ],
    limits: [
      "Het onderzoek is klein en vaak bij lopers gedaan.",
      "Dat tempo op een rustige dag de harde dag schaadt, is een vuistregel van coaches; direct gemeten is het nauwelijks.",
    ],
    sources: [SEILER_2010, ESTEVE_LANAO_2007, OLIVEIRA_2024],
  },
  {
    slug: "ftp-test",
    category: "testen",
    title: "Je FTP: wat de test meet",
    summary:
      "Een FTP-test is een goed herhaalbare prestatietest, maar geen exacte meting van je drempel. Per renner zit hij er al gauw een paar procent naast.",
    points: [
      "De 20-minutentest is goed herhaalbaar: twee keer testen scheelt meestal maar een paar procent. Een nieuwe FTP die minder dan 3 % afwijkt van de vorige, toont ZWB daarom als gelijk gebleven.",
      "95 % van je twintig minuten komt op groepsniveau dicht bij de drempel, maar per renner wijkt het al gauw 10 % af. Recreatieve renners komen er vaak iets onder uit.",
      "Op hun FTP hielden renners het gemiddeld 34 tot 51 minuten vol, geen uur. Een lang drempelblok op 100 % is voor veel renners dus zwaarder dan het lijkt.",
      "De warming-up telt mee. Na een lange warming-up met een harde blok van vijf minuten reden renners hun test ongeveer 5 % lager. ZWB gebruikt daarom drie korte versnellingen.",
      "De ramptest neemt 75 % van je hoogste minuut. Dat getal is nooit gepubliceerd getoetst, en de uitkomst hangt af van hoe snel de test oploopt. Wie explosief is, haalt een hoge laatste minuut en komt daardoor vaak te hoog uit; een echte duurrenner eerder te laag.",
      "Wijkt je test meer dan 8 % af van je vermogenscurve (CP en eFTP uit intervals.icu), dan krijgen jij en je trainer een seintje. Dan is opnieuw testen, of de 20-minutentest kiezen, het overwegen waard.",
    ],
    limits: [
      "De meeste studies zijn klein en gedaan bij getrainde mannen.",
      "CP en eFTP zijn zelf ook schattingen. Ze zeggen alleen iets als je de laatste tijd ook echt hard hebt gereden.",
      "Hoe vaak je moet testen is niet onderzocht. Acht weken is een keuze van ZWB.",
      "Dat explosieve renners op de ramptest hoger uitkomen, volgt uit hoe de test werkt (de hoogste minuut leunt op je anaerobe reserve); als zodanig gemeten is het niet.",
    ],
    sources: [
      BORSZCZ_2018,
      BORSZCZ_2019,
      MCGRATH_2019,
      INGLIS_2020,
      VALENZUELA_2018,
      WONG_2023,
      TRAMONTIN_2021,
      AZEVEDO_2023,
      KARSTEN_2021,
    ],
  },
  {
    slug: "taper",
    category: "piek",
    title: "Taper naar een wedstrijd",
    summary:
      "Voor een belangrijke wedstrijd haal je volume weg, maar houd je de intensiteit en het aantal trainingen gelijk.",
    points: [
      "Twee meta-analyses vonden de beste prestatie bij een taper van hooguit drie weken waarin het volume met 41 tot 60 procent zakt.",
      "Intensiteit en het aantal trainingen per week blijven gelijk; die weghalen kost juist vorm.",
      "De AI-coach tapert zo naar een A-mikpunt en naar een eendaags doel.",
    ],
    limits: [
      "De winst ligt rond enkele procenten op tijdrit en uithoudingsvermogen; VO2max verandert niet.",
      "Voor een reeks races, zoals de ZRL, is een lange taper geen goed idee: dan train je niet meer door.",
    ],
    sources: [BOSQUET_2007, WANG_2023],
  },
  {
    slug: "herstel-meten",
    category: "herstel",
    title: "Herstel meten: HRV, rusthartslag en slaap",
    summary:
      "Je horloge meet elke nacht je HRV en rusthartslag. Eén ochtend zegt weinig; een week vergeleken met je eigen normale waarden zegt wel iets.",
    points: [
      "HRV schommelt van dag tot dag flink. Daarom kijkt ZWB naar het gemiddelde van de laatste week, niet naar één nacht.",
      "Dat weekgemiddelde wordt vergeleken met je eigen normale band: wat je de dertig dagen daarvoor gewoon was, met een marge die past bij hoeveel jouw metingen van nature schommelen.",
      "Zakt je HRV onder die band, of stijgt je rusthartslag erboven, dan is dat een teken van vermoeidheid. Het schema wordt dan voorzichtiger.",
      "Een HRV boven je band is niet altijd goed nieuws. Bij sporters die bewust te zwaar trainden, steeg het weekgemiddelde juist. Bij zware belasting telt een hoge HRV daarom niet als geruststelling.",
      "Wielrenners die op HRV, rusthartslag en hun eigen gevoel samen trainden, gingen er meer op vooruit dan op HRV alleen. ZWB weegt daarom ook mee hoe een rit voelde.",
      "Een korte nacht kost prestatie: gemiddeld enkele procenten na een nacht van zes uur of minder, vooral als je daarna lang wakker bent.",
    ],
    limits: [
      "Het onderzoek naar sturen op HRV is klein, en de winst ten opzichte van een vast schema is bescheiden.",
      "Horloges en ringen meten HRV 's nachts, de studies meestal 's ochtends met een borstband. Hoe goed die metingen overeenkomen, verschilt per apparaat.",
      "De marge van de band (een halve standaardafwijking) is de gangbare keuze in onderzoek; de ondergrens van 3 % voor heel stabiele metingen is een eigen keuze van ZWB.",
    ],
    sources: [
      PLEWS_2013,
      BUCHHEIT_2014,
      VESTERINEN_2016,
      JAVALOYES_2019,
      LE_MEUR_2013,
      MANRESA_ROCAMORA_2021,
      ALFONSO_2025,
      CRAVEN_2022,
    ],
  },
  {
    slug: "hittetraining",
    category: "omstandigheden",
    title: "Hittetraining",
    summary:
      "Een week tot twee weken dagelijks het warm hebben maakt je beter bestand tegen de hitte. Vijf weken hittetraining verhoogt ook je hemoglobine.",
    points: [
      "Al na vijf tot veertien dagen daalt je kerntemperatuur en hartslag in de warmte en neemt je bloedplasma toe.",
      "Een heet bad van ongeveer 40 °C direct na een gewone training werkte in een proef net zo: na zes dagen ging een tijdrit in de warmte ongeveer 5 procent sneller.",
      "Elke extra hittesessie geeft meer aanpassing; langere en warmere sessies werken sterker.",
      "Vijf weken vijf keer per week 50 minuten in de hitte verhoogde de hemoglobinemassa bij renners met ongeveer 2 tot 4 procent, vergelijkbaar met een hoogtestage. Drie keer per week daarna hield de hemoglobine hoger dan helemaal stoppen.",
      "In de studies met een hittepak reden renners tot hun kerntemperatuur rond 38,5 °C lag. Met een CORE-sensor zie je of je daar komt; de app leest hem uit intervals.icu bij een hitteprotocol.",
    ],
    limits: [
      "De meeste proeven zijn klein, en het werk aan hemoglobine komt grotendeels van één onderzoeksgroep.",
      "Thuis zonder ventilator rijden met extra kleding is niet als zodanig onderzocht; de studies gebruikten een hittekamer of een hittepak.",
      "Het bad is getest na hardlopen bij mannen die niet aan de warmte gewend waren.",
      "Een CORE-sensor schat de kerntemperatuur vanaf de huid; in een validatiestudie bij fietsers week ongeveer de helft van de metingen meer dan 0,3 °C af van een rectale meting.",
    ],
    sources: [RACINAIS_2015, ZURAWLEW_2016, MCDONALD_2025, OBERHOLZER_2019, RONNESTAD_HEAT_2022, VERDEL_2021],
  },
  {
    slug: "ademspiertraining",
    category: "naast-de-fiets",
    title: "Ademspiertraining",
    summary:
      "Inademen tegen weerstand maakt je ademspieren sterker. Bij renners ging een tijdrit daarna wat sneller.",
    points: [
      "In een dubbelblinde proef reden renners na zes weken twee keer per dag dertig ademhalingen tegen weerstand een tijdrit van 20 en 40 km 4 tot 5 procent sneller.",
      "Meta-analyses vinden een kleinere winst, die groter is bij minder getrainde mensen en bij langere inspanningen.",
      "Je ziet het effect in een tijdrit, niet in een oplopende test.",
    ],
    limits: ["De meeste studies zijn klein, en de opzet verschilt sterk."],
    sources: [ROMER_2002, ILLI_2012, HAJGHANBARI_2013],
  },
  {
    slug: "koud-na-training",
    category: "naast-de-fiets",
    title: "Koud water na de training",
    summary:
      "Een ijsbad na de training remt vooral de winst van krachttraining. Voor duurwerk lijkt het weinig uit te maken.",
    points: [
      "Na krachttraining remt regelmatig koud water de toename van kracht en spiermassa.",
      "Na duurtraining lijkt het op de lange termijn weinig uit te maken.",
      "Bewaar het voor momenten waarop snel herstel telt, zoals een meerdaagse koers.",
    ],
    limits: ["Het onderzoek naar duurtraining is beperkt, vooral op de lange termijn."],
    sources: [BROATCH_2018],
  },
];

export function trainingArticleBySlug(slug: string): TrainingArticle | null {
  return TRAINING_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function trainingArticlesByCategory(): { category: TrainingCategory; articles: TrainingArticle[] }[] {
  return TRAINING_CATEGORIES.map((category) => ({
    category,
    articles: TRAINING_ARTICLES.filter((article) => article.category === category),
  })).filter((group) => group.articles.length > 0);
}
