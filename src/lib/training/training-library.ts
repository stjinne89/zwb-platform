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

export const TRAINING_CATEGORIES = ["intensiteit", "piek", "omstandigheden", "naast-de-fiets"] as const;
export type TrainingCategory = (typeof TRAINING_CATEGORIES)[number];

export const TRAINING_CATEGORY_LABELS: Record<TrainingCategory, string> = {
  intensiteit: "Intensiteit",
  piek: "Naar een piek",
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
