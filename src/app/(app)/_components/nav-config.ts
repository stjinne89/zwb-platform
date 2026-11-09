// Gedeelde nav-config: de links per plek, de tabbalken binnen modules, het
// persoonlijke menu en het beheer. Discriminated union zodat we per node-type
// kunnen renderen.
//
// 'link'  → losse link
// 'group' → cluster links onder een kopje (bijvoorbeeld Club op /club)

import type { CommunityPermission } from "@/lib/permissions";
import { ADMIN_AREAS, type AdminArea, type AdminAreaKey } from "@/lib/admin-areas";
import type { PlaceTone } from "@/components/tegels/link-grid";
import type { ModuleKey } from "@/lib/modules";

/** De naam van elke module bij deze club (getClub().texts.modules). */
export type ModuleNames = Readonly<Record<ModuleKey, string>>;

export type NavLeaf = {
  type: "link";
  href: string;
  label: string;
  external?: boolean;
  /** Alleen tonen als de gebruiker dit recht heeft. Filteren gebeurt op de
   * server, vóór de links naar de client gaan. */
  permission?: CommunityPermission;
  /**
   * Alleen tonen bij dit geslacht uit het profiel. Nu alleen voor het logboek:
   * de inhoud daarvan gaat over klachten rond de cyclus en is niet geschreven
   * voor mannen. Wie niets heeft ingevuld ziet het item dus ook niet.
   */
  onlyForSex?: "vrouw" | "man";
  /** Het label is de naam van deze module bij de club (fase 3). */
  module?: ModuleKey;
};

export type NavGroup = {
  type: "group";
  label: string;
  items: NavLeaf[];
  module?: ModuleKey;
};

export type NavNode = NavLeaf | NavGroup;

/** De subpagina's van ZWBeter Worden: de tabbalk binnen de module. */
export const ZWBETER_WORDEN_SECTIONS: NavLeaf[] = [
  { type: "link", href: "/zwbeter-worden", label: "Vandaag" },
  { type: "link", href: "/zwbeter-worden/schema", label: "Schema" },
  { type: "link", href: "/zwbeter-worden/jaarplan", label: "Jaarplan" },
  { type: "link", href: "/zwbeter-worden/belasting", label: "Belasting" },
  { type: "link", href: "/zwbeter-worden/logboek", label: "Logboek", onlyForSex: "vrouw" },
  { type: "link", href: "/zwbeter-worden/vermogen", label: "Vermogen" },
  { type: "link", href: "/zwbeter-worden/racen", label: "Racen" },
  { type: "link", href: "/zwbeter-worden/core", label: "Core & mobiliteit" },
  { type: "link", href: "/zwbeter-worden/voeding", label: "Voeding" },
  { type: "link", href: "/zwbeter-worden/materiaal", label: "Materiaal" },
  { type: "link", href: "/zwbeter-worden/doelen", label: "Doelen" },
  { type: "link", href: "/zwbeter-worden/uitgangspunten", label: "Uitgangspunten" },
  { type: "link", href: "/zwbeter-worden/protocollen", label: "Protocollen" },
  { type: "link", href: "/zwbeter-worden/kennis", label: "Kennisbank" },
  { type: "link", href: "/zwbeter-worden/coach", label: "Coach" },
  {
    type: "link",
    href: "/zwbeter-worden/trainer",
    label: "Trainer",
    permission: "training.view_assigned",
  },
];

/** De tabs binnen de trainerspagina. Die staan bewust niet in het hoofdmenu:
 * daar blijft ZWBeter Worden één "Trainer"-item. */
export const TRAINER_SECTIONS: NavLeaf[] = [
  { type: "link", href: "/zwbeter-worden/trainer", label: "Overzicht" },
  { type: "link", href: "/zwbeter-worden/trainer/beoordelen", label: "Beoordelen" },
  { type: "link", href: "/zwbeter-worden/trainer/schema", label: "Schema" },
  { type: "link", href: "/zwbeter-worden/trainer/jaarplan", label: "Jaarplan" },
  { type: "link", href: "/zwbeter-worden/trainer/vermogen", label: "Vermogen" },
  { type: "link", href: "/zwbeter-worden/trainer/racen", label: "Races" },
  { type: "link", href: "/zwbeter-worden/trainer/doelen", label: "Doelen" },
  { type: "link", href: "/zwbeter-worden/trainer/uitgangspunten", label: "Uitgangspunten" },
  { type: "link", href: "/zwbeter-worden/trainer/voeding", label: "Voeding" },
  { type: "link", href: "/zwbeter-worden/trainer/coach", label: "Coachchat" },
  { type: "link", href: "/zwbeter-worden/trainer/vergelijken", label: "Vergelijken" },
];

/** De tabs binnen Voeding. Net als bij de trainer niet in het hoofdmenu: daar
 * blijft het één "Voeding"-item. */
export const VOEDING_SECTIONS: NavLeaf[] = [
  { type: "link", href: "/zwbeter-worden/voeding", label: "Dagmenu" },
  { type: "link", href: "/zwbeter-worden/voeding/boodschappen", label: "Boodschappen" },
  { type: "link", href: "/zwbeter-worden/voeding/naleving", label: "Naleving" },
  { type: "link", href: "/zwbeter-worden/voeding/recepten", label: "Receptenboek" },
  { type: "link", href: "/zwbeter-worden/voeding/protocollen", label: "Protocollen" },
  { type: "link", href: "/zwbeter-worden/voeding/kennis", label: "Kennisbank" },
];

/** De tabs binnen Core & mobiliteit (de pijler kracht). Niet in het hoofdmenu:
 * daar blijft het één item. Een losse serie valt onder Series, een artikel
 * onder Kennisbank. */
export const KRACHT_SECTIONS: NavLeaf[] = [
  { type: "link", href: "/zwbeter-worden/core", label: "Vandaag" },
  { type: "link", href: "/zwbeter-worden/core/series", label: "Series" },
  { type: "link", href: "/zwbeter-worden/core/oefeningen", label: "Oefeningen" },
  { type: "link", href: "/zwbeter-worden/core/kennis", label: "Kennisbank" },
];

/** De tabs binnen Racen: je races en, sinds 2026-10-19, de kennisbank racen. Een
 * race (/racen/<id>) valt onder Jouw races, een artikel onder Kennisbank.
 * Racetips (2026-10-27) zijn tips van leden, uit ZWBieb (0282). */
export const RACEN_SECTIONS: NavLeaf[] = [
  { type: "link", href: "/zwbeter-worden/racen", label: "Jouw races" },
  { type: "link", href: "/zwbeter-worden/racen/tips", label: "Racetips" },
  { type: "link", href: "/zwbeter-worden/racen/kennis", label: "Kennisbank" },
];

/** De tabs binnen Materiaal (de pijler materiaal, 2026-10-18). De pijler zelf
 * (/zwbeter-worden/materiaal) stuurt door naar de kennisbank. */
export const MATERIAAL_SECTIONS: NavLeaf[] = [
  { type: "link", href: "/zwbeter-worden/materiaal/kennis", label: "Kennisbank" },
  { type: "link", href: "/zwbeter-worden/materiaal/rekenaar", label: "Rekenaar" },
  { type: "link", href: "/zwbeter-worden/materiaal/houding", label: "Houding" },
];

export const NAV_GROUPS: NavNode[] = [
  { type: "link", href: "/kalender", label: "Kalender" },
  { type: "link", href: "/samen-fietsen", label: "Samen fietsen" },
  {
    type: "group",
    label: "ZWBeter Worden",
    module: "training",
    items: ZWBETER_WORDEN_SECTIONS,
  },
  {
    type: "group",
    label: "Club",
    items: [
      { type: "link", href: "/leden", label: "Leden" },
      { type: "link", href: "/zwbieb", label: "ZWBieb", module: "bibliotheek" },
      { type: "link", href: "/teams", label: "Teams" },
      { type: "link", href: "/stats", label: "Stats" },
      // De prijzenkast (0286, 2026-10-28).
      { type: "link", href: "/zwbekers", label: "ZWBekers", module: "bekers" },
      // Verhalen insturen voor /verhaal (0288).
      { type: "link", href: "/clubverhaal", label: "Clubverhaal" },
      { type: "link", href: "/profiel/segments/collecties", label: "ZWB Segments", module: "segmenten" },
      { type: "link", href: "/zwblokken", label: "ZWBlokken", module: "blokkenjacht" },
      { type: "link", href: "/zwbgame", label: "ZWBgame", module: "managerspel" },
      { type: "link", href: "/omnium", label: "ZWB Omnium", module: "omnium" },
      { type: "link", href: "/src", label: "Sunday Race Club", module: "src" },
      { type: "link", href: "/voorzpwelbokaal", label: "voorZpWelBokaal", module: "voorspelspel" },
    ],
  },
  {
    type: "group",
    label: "Community",
    items: [
      { type: "link", href: "/community", label: "WhatsApp-groepen" },
      { type: "link", href: "/polls", label: "Polls" },
      { type: "link", href: "/media", label: "Media" },
      { type: "link", href: "/ritverslagen", label: "Ritverslagen" },
    ],
  },
  { type: "link", href: "/sponsors", label: "Sponsors" },
];

// Items voor het persoonlijke menu achter de profielfoto.
export const AVATAR_NAV: NavLeaf[] = [
  { type: "link", href: "/profiel", label: "Profiel" },
  { type: "link", href: "/mijn-garage", label: "Mijn garage" },
  { type: "link", href: "/hulp", label: "Hulp" },
  // Vragen over de app (0254): hoort bij de hulp, niet bij een plek.
  { type: "link", href: "/qa", label: "Q&A" },
  // Wat er elke week veranderd is (0293).
  { type: "link", href: "/updates", label: "App-updates" },
];

// Beheeritems met bijbehorende permission, uit het register van de
// beheergebieden (lib/admin-areas.ts).
export type AdminNavItem = {
  type: "link";
  href: string;
  label: string;
  permission: CommunityPermission;
  module?: ModuleKey;
};

function adminLink(key: AdminAreaKey): AdminNavItem {
  const area: AdminArea = ADMIN_AREAS[key];
  return {
    type: "link",
    href: area.href,
    label: area.label,
    permission: area.permission,
    ...(area.module ? { module: area.module } : {}),
  };
}

/** Het label met de naam van de module bij deze club, als het een modulenaam is. */
function named<T extends { label: string; module?: ModuleKey }>(item: T, names?: ModuleNames): T {
  return item.module && names ? { ...item, label: names[item.module] } : item;
}

export type BeheerCategory = { label: string; tone: PlaceTone; items: AdminNavItem[] };

/**
 * Het beheer als één pagina met tegels per soort, zoals Club, in plaats van een
 * lange lijst in het persoonlijke menu (besluit eigenaar, 2026-10-16).
 * WhatsApp-groepen en Media zijn geen beheergebied maar staan wel hier
 * (besluit eigenaar, 2026-10-12).
 */
export const BEHEER_CATEGORIES: BeheerCategory[] = [
  {
    label: "Online racen",
    tone: "kalender",
    items: [adminLink("zrl"), adminLink("frr"), adminLink("src"), adminLink("omnium")],
  },
  {
    label: "Kalender",
    tone: "kalender",
    items: [adminLink("programmas"), adminLink("eventScan"), adminLink("zwiftRoutes")],
  },
  {
    label: "Community",
    tone: "club",
    items: [
      { type: "link", href: "/community", label: "WhatsApp-groepen", permission: "community.manage" },
      { type: "link", href: "/media", label: "Media", permission: "media.manage" },
      adminLink("citaten"),
      adminLink("clubverhaal"),
      adminLink("achievements"),
      adminLink("zwbekers"),
      adminLink("zwbgame"),
      adminLink("bokaal"),
    ],
  },
  {
    label: "App",
    tone: "meer",
    items: [
      adminLink("rechten"),
      adminLink("modules"),
      adminLink("huisstijl"),
      adminLink("notificaties"),
      adminLink("appUpdates"),
      adminLink("koppelingen"),
      adminLink("strava"),
      adminLink("houdingMeetproef"),
    ],
  },
];

/** De beheercategorieën met alleen de items waar de gebruiker recht op heeft
 * en waarvan de module bij deze club aan staat; een lege categorie valt weg. */
export function beheerCategoriesFor(
  has: (permission: CommunityPermission) => boolean,
  /** Staat de module van dit pad aan (getClub().allowsPath)? */
  allowsPath: (href: string) => boolean = () => true,
  /** De modulenamen van de club; zonder: de labels hierboven. */
  names?: ModuleNames,
): BeheerCategory[] {
  return BEHEER_CATEGORIES.flatMap((category) => {
    const items = category.items
      .filter((item) => has(item.permission) && allowsPath(item.href))
      .map((item) => named(item, names));
    return items.length > 0 ? [{ ...category, items }] : [];
  });
}

/**
 * Laat alleen de items over waar de gebruiker recht op heeft en waarvan de
 * module bij deze club aan staat. Groepen zonder overgebleven items vallen weg,
 * zodat er geen lege dropdown blijft staan.
 */
export function filterNavForPermissions(
  nodes: NavNode[],
  has: (permission: CommunityPermission) => boolean,
  /** Geslacht uit het profiel; null als het niet is ingevuld. */
  sex: string | null = null,
  /** Staat de module van dit pad aan (getClub().allowsPath)? */
  allowsPath: (href: string) => boolean = () => true,
  /** De modulenamen van de club; zonder: de labels hierboven. */
  names?: ModuleNames,
): NavNode[] {
  const allowed = (item: NavLeaf) =>
    (!item.permission || has(item.permission)) &&
    (!item.onlyForSex || item.onlyForSex === sex) &&
    (item.external || allowsPath(item.href));
  return nodes.flatMap<NavNode>((node) => {
    if (node.type === "link") return allowed(node) ? [named(node, names)] : [];
    const items = node.items.filter(allowed).map((item) => named(item, names));
    return items.length > 0 ? [{ ...named(node, names), items }] : [];
  });
}

/**
 * Helper: valt pathname onder deze href? Exact of een subroute. Let op: op
 * /zwbeter-worden/schema geldt dat voor zowel "/zwbeter-worden" als
 * "/zwbeter-worden/schema". Markeer een link in een lijst daarom met
 * activeHrefIn, niet hiermee.
 */
export function isActiveHref(pathname: string, href: string): boolean {
  if (href.startsWith("http")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * De ene link die in een lijst actief is: de meest specifieke href waaronder
 * pathname valt. Zo is op /profiel/segments/collecties alleen "ZWB Segments" actief en
 * niet ook "Profiel". Null als geen enkele link past.
 */
export function activeHrefIn(pathname: string, hrefs: readonly string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (!isActiveHref(pathname, href)) continue;
    if (best === null || href.length > best.length) best = href;
  }
  return best;
}

/** Alle interne hrefs uit nav-nodes, groepen uitgevouwen. */
export function navHrefs(nodes: readonly NavNode[]): string[] {
  return nodes.flatMap((node) =>
    node.type === "link" ? [node.href] : node.items.map((item) => item.href),
  );
}

