import type { PlaceTone } from "@/components/tegels/link-grid";
import { moduleForPath, type ModuleKey } from "@/lib/modules";

// De hulp is opgedeeld in categorieën, elk een eigen pagina /hulp/<id>. Tot
// 2026-10-18 stond alles op één lange pagina /hulp; links in de app gaan nu
// rechtstreeks naar de juiste categorie, en een oude link /hulp#<anker> stuurt
// de hulppagina door (HelpHashRedirect).
//
// `anchors` zijn de id's die op de categoriepagina staan. Een test houdt ze
// gelijk met de pagina's; `legacy` zijn de groepskoppen van de oude pagina.

export type HelpCategory = {
  id: string;
  label: string;
  text: string;
  tone: PlaceTone;
  anchors: readonly string[];
  legacy?: readonly string[];
  /** Hoort de hele categorie bij één module, dan valt hij weg als die uit staat. */
  module?: ModuleKey;
};

export const HELP_CATEGORIES = [
  {
    id: "beginnen",
    label: "Beginnen",
    text: "Eerste stappen, de app op je telefoon en wat je waar vindt.",
    tone: "club",
    anchors: ["webapp-installeren", "videos"],
    legacy: ["beginnen"],
  },
  {
    id: "koppelen",
    label: "Koppelen",
    text: "Strava, intervals.icu, ritten importeren en je agenda.",
    tone: "meer",
    anchors: [
      "strava-rechten",
      "ritten-via-intervals",
      "strava-import",
      "externe-profielen",
      "zwift-id",
      "strava-id",
      "intervals-id",
      "agenda",
    ],
    legacy: ["koppelen"],
  },
  {
    id: "club",
    label: "Club en profiel",
    text: "Profiel, privacy, rankings, badges, cols, {m:bibliotheek}, {m:blokkenjacht} en je garage.",
    tone: "club",
    anchors: [
      "profiel",
      "privacy",
      "rankings",
      "badges",
      "cols",
      "onderhoud",
      "community",
      "zwbieb",
      "verjaardagsrondje",
      "zwblokken",
      "zwbekers",
      "clubverhaal",
      "mijn-statistieken",
      "mijn-garage",
    ],
    legacy: ["club"],
  },
  {
    id: "wedstrijden",
    label: "Events en wedstrijden",
    text: "Kalender, teams, ZRL, FRR, SRC, {m:live_race}, {m:managerspel} en {m:voorspelspel}.",
    tone: "kalender",
    anchors: ["events", "teams", "zwb-ds", "zwbgame", "voorzpwelbokaal"],
  },
  {
    id: "live-volgen",
    label: "Live volgen",
    text: "Met Garmin of Wahoo op de kaart.",
    tone: "club",
    anchors: ["livetrack", "ritberichten"],
  },
  {
    id: "training",
    module: "training",
    label: "Training",
    text: "Form, herstel, trainer-toegang, vermogen, {m:rennersniveau} en je Strava-samenvatting.",
    tone: "zwbeter",
    anchors: [
      "training",
      "trainingsruimte",
      "intervals-koppelen",
      "vermogen",
      "watt-wkg",
      "zwbriljant",
      "strava-samenvatting",
    ],
    legacy: ["trainen"],
  },
  {
    id: "schema",
    module: "training",
    label: "Schema en jaarplan",
    text: "Doel, jaarplan, FTP-test, je week aanpassen en warming-ups.",
    tone: "zwbeter",
    anchors: [
      "trainingsschema",
      "doeltype",
      "doeltijd",
      "doel-aanpassen",
      "blokken",
      "uitgangspunten",
      "vergelijken",
      "jaarplan",
      "ftp-test",
      "zonekleuren",
      "trainingsvormen",
      "warming-up",
      "rit-koppelen",
      "ritten-samenvoegen",
      "rpe-losse-rit",
      "rit-invoeren",
      "dubbele-rit",
      "naleving",
      "tijd-per-zone",
    ],
  },
  {
    id: "workouts",
    module: "training",
    label: "Workouts en routes",
    text: "Op je fietscomputer, in Zwift en rondjes voor buiten.",
    tone: "zwbeter",
    anchors: ["fit-export", "zwift-workout", "zwift-voorstellen", "routevoorstellen"],
  },
  {
    id: "racen",
    module: "training",
    label: "Racen en pacing",
    text: "Je Zwift-races analyseren en een pacingplan maken.",
    tone: "kalender",
    anchors: [
      "racen",
      "racen-tips",
      "racen-kennis",
      "racen-verwachting",
      "racen-trainer",
      "racen-eigen-rit",
      "racen-begrippen",
      "pacing",
      "pacing-eindtijd",
      "pacing-neutralisatie",
      "pacing-afdalingen",
      "pacing-zwift",
    ],
  },
  {
    id: "kennis",
    module: "training",
    label: "Kennis",
    text: "Protocollen, voeding, materiaal, core en kracht, en het logboek.",
    tone: "meer",
    anchors: ["protocollen", "voeding", "materiaal", "houding", "core-mobiliteit", "spiergroepen", "kracht", "logboek"],
  },
  {
    id: "problemen",
    label: "Problemen",
    text: "Meldingen, snelle checks als iets niet werkt, en Q&A.",
    tone: "meer",
    anchors: ["meldingen", "problemen", "qa"],
    legacy: ["meldingen-problemen"],
  },
  {
    id: "beheer",
    label: "Beheer",
    text: "Naslag voor bestuur, beheerders, trainers en captains.",
    tone: "meer",
    anchors: [
      "beheer",
      "eventbeheer",
      "communitybeheer",
      "mediabeheer",
      "rollenbeheer",
      "badgebeheer",
      "stravabeheer",
      "koppelingenbeheer",
      "ttt-beheer",
      "teambeheer",
    ],
    legacy: ["voor-beheerders"],
  },
] as const satisfies readonly HelpCategory[];

export type HelpCategoryId = (typeof HELP_CATEGORIES)[number]["id"];

const CATEGORIES: readonly HelpCategory[] = HELP_CATEGORIES;

export function helpCategory(id: string): HelpCategory | null {
  return CATEGORIES.find((category) => category.id === id) ?? null;
}

/** De categorie waarin dit anker staat, ook voor een oude groepskop. */
export function helpCategoryForAnchor(anchor: string): HelpCategory | null {
  return (
    CATEGORIES.find(
      (category) => category.anchors.includes(anchor) || Boolean(category.legacy?.includes(anchor)),
    ) ?? null
  );
}

/** "/hulp/<categorie>#<anker>", of "/hulp/<categorie>" voor een oude groepskop. */
export function helpHrefForAnchor(anchor: string): string | null {
  const category = helpCategoryForAnchor(anchor);
  if (!category) return null;
  return category.anchors.includes(anchor) ? `/hulp/${category.id}#${anchor}` : `/hulp/${category.id}`;
}

/**
 * Ankers in een gemengde categorie die bij één module horen (fase 3 van de
 * generieke versie). Staat die module uit, dan verdwijnen de gids en het
 * zoekresultaat.
 */
export const HELP_ANCHOR_MODULES: Readonly<Record<string, ModuleKey>> = {
  teams: "teams",
  "zwb-ds": "live_race",
  zwbgame: "managerspel",
  voorzpwelbokaal: "voorspelspel",
  rankings: "stats",
  badges: "bekers",
  cols: "segmenten",
  onderhoud: "garage",
  zwbieb: "bibliotheek",
  zwbriljant: "rennersniveau",
};

/** De module waar deze link heen gaat: een hulpanker, een hulpcategorie of een pagina. */
export function helpHrefModule(href: string): ModuleKey | null {
  const match = /^\/hulp\/([^#?]+)(?:#(.+))?$/.exec(href);
  if (!match) return moduleForPath(href);
  const [, categoryId, anchor] = match;
  if (anchor && HELP_ANCHOR_MODULES[anchor]) return HELP_ANCHOR_MODULES[anchor];
  return helpCategory(categoryId)?.module ?? null;
}
