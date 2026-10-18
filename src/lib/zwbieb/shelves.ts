// De leeszaal van ZWBieb: alle artikelen uit de kennisbanken (trainen, voeding,
// kracht en, sinds 2026-10-18, materiaal) op één plek, per onderwerp in plaats van per onderdeel.
//
// De artikelen blijven waar ze staan: protocollen, de coach en het schema linken
// naar hun adres onder ZWBeter Worden. De leeszaal is een catalogus erover.
//
// Elk artikel staat op precies één plank, zoals een boek in een bieb één plek
// heeft; een test houdt dat bij. Een plank kan wijzen naar onderwerpen van
// ZWBieb: zo staan bij een artikel de leden die er ervaring mee hebben, en bij
// een onderwerp de artikelen. Die onderwerpen kunnen leden zelf toevoegen en de
// moderatie kan ze verbergen; daarom staat de indeling hier vast, en wijst een
// plank alleen naar onderwerpen uit de startlijst (de slug verandert nooit).
//
// Gezondheid heeft een eigen plank. ZWBieb heeft bewust geen
// gezondheidsonderwerp (wie zich als kenner meldt, vertelt de club iets over
// zichzelf); een artikel lezen vertelt niemand iets.

import type { ArticleEvidence } from "@/lib/knowledge/evidence";
import { MATERIAAL_ARTICLES } from "@/lib/materiaal/library";
import { NUTRITION_ARTICLES } from "@/lib/nutrition/library";
import type { MethodLabel } from "@/lib/training/method-label";
import { STRENGTH_ARTICLES } from "@/lib/training/strength-library";
import { TRAINING_ARTICLES } from "@/lib/training/training-library";

export type Collection = "trainen" | "voeding" | "kracht" | "materiaal";

export const COLLECTION_LABELS: Record<Collection, string> = {
  trainen: "Trainen",
  voeding: "Voeding",
  kracht: "Core & mobiliteit",
  materiaal: "Materiaal",
};

const COLLECTION_BASE: Record<Collection, string> = {
  trainen: "/zwbeter-worden/kennis",
  voeding: "/zwbeter-worden/voeding/kennis",
  kracht: "/zwbeter-worden/core/kennis",
  materiaal: "/zwbeter-worden/materiaal/kennis",
};

/** Een artikel als "kennisbank/slug". */
type BookRef = `${Collection}/${string}`;

type ShelfDef = {
  slug: string;
  label: string;
  /** Onderwerpen van ZWBieb (startlijst) waarvan de kenners hierbij horen. */
  topics: string[];
  books: BookRef[];
};

export const SHELF_DEFS: ShelfDef[] = [
  {
    slug: "trainen",
    label: "Trainen",
    topics: ["trainen-met-schema"],
    books: [
      "trainen/zones",
      "trainen/rustige-ritten",
      "trainen/lange-ritten",
      "trainen/intensiteitsverdeling",
      "trainen/intervallen",
      "trainen/korte-intervallen",
      "trainen/vo2max-wisselend",
      "trainen/sprints-als-onderhoud",
      "trainen/lage-cadans",
      "trainen/opbouwen",
      "trainen/blokweek",
    ],
  },
  {
    slug: "testen-meten",
    label: "Testen en meten",
    topics: ["vermogensmeters", "data-apps"],
    books: ["trainen/ftp-test", "trainen/herstel-meten"],
  },
  {
    slug: "wedstrijd",
    label: "Naar een wedstrijd",
    topics: ["zwift-racen", "toertochten"],
    books: ["voeding/voor-de-rit", "trainen/warming-up", "trainen/taper"],
  },
  {
    slug: "onderweg",
    label: "Eten en drinken onderweg",
    topics: ["voeding-onderweg"],
    books: [
      "voeding/koolhydraten-tijdens-de-rit",
      "voeding/vocht-en-zout",
      "voeding/darmtraining",
      "voeding/indoor-zwift",
    ],
  },
  {
    slug: "dagelijkse-voeding",
    label: "Dagelijkse voeding",
    topics: [],
    books: ["voeding/gezonde-basis", "voeding/brandstof-volgens-training", "voeding/low-carb-keto"],
  },
  {
    slug: "herstel",
    label: "Herstel",
    topics: [],
    books: ["voeding/herstel", "voeding/eiwit", "trainen/koud-na-training"],
  },
  {
    slug: "supplementen",
    label: "Supplementen",
    topics: [],
    books: [
      "voeding/supplementen",
      "voeding/geen-bewijs",
      "voeding/mondspoelen",
      "voeding/kersensap",
      "voeding/vitamine-d",
      "voeding/omega-3",
      "voeding/collageen",
      "voeding/probiotica",
      "voeding/ketonen",
    ],
  },
  {
    slug: "kracht",
    label: "Kracht",
    topics: ["kracht-core"],
    books: [
      "kracht/zwaar-krachtwerk-en-fietsen",
      "kracht/het-gymprogramma",
      "kracht/kracht-en-fietsen-combineren",
      "kracht/kracht-onderhouden-in-het-seizoen",
      "kracht/thuis-met-lichtere-gewichten",
      "kracht/kracht-op-de-fiets",
    ],
  },
  {
    slug: "core-mobiliteit",
    label: "Core, rug en mobiliteit",
    topics: ["kracht-core", "bikefit"],
    books: [
      "kracht/wat-core-training-doet",
      "kracht/lage-rugpijn-bij-renners",
      "kracht/hamstrings-en-rugpijn",
      "kracht/rekken-voor-de-rit",
    ],
  },
  {
    slug: "bijzondere-vormen",
    label: "Bijzondere trainingsvormen",
    topics: [],
    books: [
      "trainen/hittetraining",
      "trainen/ademspiertraining",
      "trainen/bloedstroombeperking",
      "trainen/brain-endurance-training",
    ],
  },
  // De kennisbank materiaal (2026-10-18).
  {
    slug: "lucht-en-houding",
    label: "Lucht en houding",
    topics: ["bikefit"],
    books: [
      "materiaal/waar-je-watt-heen-gaan",
      "materiaal/houding",
      "materiaal/helm",
      "materiaal/kleding",
      "materiaal/wielen-en-frame",
      "materiaal/sokken-en-overschoenen",
    ],
  },
  {
    slug: "banden-en-ketting",
    label: "Banden en ketting",
    topics: ["banden-tubeless", "sleutelen"],
    books: ["materiaal/banden-en-bandenspanning", "materiaal/ketting-en-smering"],
  },
  {
    slug: "binnen-fietsen",
    label: "Binnen fietsen",
    topics: ["zwift-setup", "vermogensmeters"],
    books: ["materiaal/ventilator", "materiaal/vermogensmeter"],
  },
  {
    slug: "fiets-afstellen",
    label: "Fiets en lichaam",
    topics: ["bikefit"],
    books: ["materiaal/zadelhoogte-en-bikefit", "materiaal/cranklengte", "materiaal/gewicht"],
  },
  {
    slug: "kleine-middelen",
    label: "Kleine middelen",
    topics: [],
    books: ["materiaal/neusstrips", "materiaal/compressiekleding", "materiaal/inlegzolen"],
  },
  {
    slug: "gezondheid",
    label: "Gezondheid",
    topics: [],
    books: [
      "voeding/genoeg-eten-reds",
      "voeding/ijzer",
      "voeding/weerstand",
      "voeding/botgezondheid",
      "kracht/wielrennen-en-botdichtheid",
    ],
  },
  {
    slug: "levensfase",
    label: "Vrouwen en ouder worden",
    topics: [],
    books: ["voeding/vrouwen", "voeding/masters", "kracht/kracht-als-je-ouder-wordt"],
  },
];

export type Book = {
  href: string;
  title: string;
  summary: string;
  collection: Collection;
  evidence: ArticleEvidence;
  /** Veelbelovend of experimenteel (alleen bij trainen); zie method-label.ts. */
  methodLabel: MethodLabel | null;
};

export type Shelf = Omit<ShelfDef, "books"> & { books: Book[] };

function allArticles(): Map<BookRef, Book> {
  const books = new Map<BookRef, Book>();
  const add = (
    collection: Collection,
    list: {
      slug: string;
      title: string;
      summary: string;
      evidence: ArticleEvidence;
      methodLabel?: MethodLabel;
    }[],
  ) => {
    for (const article of list) {
      books.set(`${collection}/${article.slug}`, {
        href: `${COLLECTION_BASE[collection]}/${article.slug}`,
        title: article.title,
        summary: article.summary,
        collection,
        evidence: article.evidence,
        methodLabel: article.methodLabel ?? null,
      });
    }
  };
  add("trainen", TRAINING_ARTICLES);
  add("voeding", NUTRITION_ARTICLES);
  add("kracht", STRENGTH_ARTICLES);
  add("materiaal", MATERIAAL_ARTICLES);
  return books;
}

/** Alle refs uit de kennisbanken, voor de test. */
export function allBookRefs(): string[] {
  return Array.from(allArticles().keys());
}

/** De planken met hun artikelen. Een ref zonder artikel valt weg. */
export function shelves(): Shelf[] {
  const books = allArticles();
  return SHELF_DEFS.map((shelf) => ({
    ...shelf,
    books: shelf.books.flatMap((ref) => {
      const book = books.get(ref);
      return book ? [book] : [];
    }),
  }));
}

/** De plank waar dit artikel op staat. */
export function shelfForArticle(href: string): Shelf | null {
  return shelves().find((shelf) => shelf.books.some((book) => book.href === href)) ?? null;
}

/** De planken die naar dit onderwerp van ZWBieb wijzen. */
export function shelvesForTopic(topicSlug: string): Shelf[] {
  return shelves().filter((shelf) => shelf.topics.includes(topicSlug));
}
