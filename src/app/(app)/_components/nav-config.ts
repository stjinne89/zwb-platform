// Gedeelde nav-config tussen desktop (layout.tsx) en mobiel (mobile-menu.tsx).
// Discriminated union zodat we per node-type kunnen renderen.
//
// 'link'  → directe top-level link
// 'group' → dropdown-cluster (desktop) of section-header (mobiel)

import type { CommunityPermission } from "@/lib/permissions";
import { ADMIN_AREAS, type AdminAreaKey } from "@/lib/admin-areas";
import type { PlaceTone } from "@/components/tegels/link-grid";

export type NavLeaf = {
  type: "link";
  href: string;
  label: string;
  external?: boolean;
  /** Alleen tonen als de gebruiker dit recht heeft. Filteren gebeurt in de
   * layout, want de nav-componenten draaien client-side. */
  permission?: CommunityPermission;
  /**
   * Alleen tonen bij dit geslacht uit het profiel. Nu alleen voor het logboek:
   * de inhoud daarvan gaat over klachten rond de cyclus en is niet geschreven
   * voor mannen. Wie niets heeft ingevuld ziet het item dus ook niet.
   */
  onlyForSex?: "vrouw" | "man";
};

export type NavGroup = {
  type: "group";
  label: string;
  items: NavLeaf[];
};

export type NavNode = NavLeaf | NavGroup;

/** De subpagina's van ZWBeter Worden. Eén bron voor het hoofdmenu én de
 * tabbalk binnen de module. */
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

/** De tabs binnen Materiaal (de pijler materiaal, 2026-10-18). De pijler zelf
 * (/zwbeter-worden/materiaal) stuurt door naar de kennisbank. */
export const MATERIAAL_SECTIONS: NavLeaf[] = [
  { type: "link", href: "/zwbeter-worden/materiaal/kennis", label: "Kennisbank" },
  { type: "link", href: "/zwbeter-worden/materiaal/rekenaar", label: "Rekenaar" },
];

export const NAV_GROUPS: NavNode[] = [
  { type: "link", href: "/kalender", label: "Kalender" },
  { type: "link", href: "/samen-fietsen", label: "Samen fietsen" },
  {
    type: "group",
    label: "ZWBeter Worden",
    items: ZWBETER_WORDEN_SECTIONS,
  },
  {
    type: "group",
    label: "Club",
    items: [
      { type: "link", href: "/leden", label: "Leden" },
      { type: "link", href: "/zwbieb", label: "ZWBieb" },
      { type: "link", href: "/teams", label: "Teams" },
      { type: "link", href: "/stats", label: "Stats" },
      { type: "link", href: "/profiel/segments/collecties", label: "ZWB Segments" },
      { type: "link", href: "/zwblokken", label: "ZWBlokken" },
      { type: "link", href: "/zwbgame", label: "ZWBgame" },
      {
        type: "link",
        href: "/omnium",
        label: "ZWB Omnium",
      },
      { type: "link", href: "/src", label: "Sunday Race Club" },
      {
        type: "link",
        href: "https://voorzpwelbokaal.netlify.app/",
        label: "voorZpWelBokaal",
        external: true,
      },
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

// Items voor de avatar-dropdown (en mobiel onderaan).
export const AVATAR_NAV: NavLeaf[] = [
  { type: "link", href: "/profiel", label: "Profiel" },
  { type: "link", href: "/mijn-garage", label: "Mijn garage" },
  { type: "link", href: "/hulp", label: "Hulp" },
];

// Admin-items met bijbehorende permission, uit het register van de
// beheergebieden (lib/admin-areas.ts). Filteren gebeurt in de layout via
// getCurrentUserAccess.
export type AdminNavItem = {
  type: "link";
  href: string;
  label: string;
  permission: CommunityPermission;
};

export const ADMIN_NAV: AdminNavItem[] = Object.values(ADMIN_AREAS).map((area) => ({
  type: "link" as const,
  href: area.href,
  label: area.label,
  permission: area.permission,
}));

function adminLink(key: AdminAreaKey): AdminNavItem {
  const area = ADMIN_AREAS[key];
  return { type: "link", href: area.href, label: area.label, permission: area.permission };
}

export type BeheerCategory = { label: string; tone: PlaceTone; items: AdminNavItem[] };

/**
 * Design "tegels": het beheer als één pagina met tegels per soort, zoals Club,
 * in plaats van een lange lijst in het persoonlijke menu (besluit eigenaar,
 * 2026-10-16). WhatsApp-groepen en Media zijn geen beheergebied maar staan in
 * dit design wel hier (besluit eigenaar, 2026-10-12).
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
      adminLink("achievements"),
      adminLink("zwbgame"),
    ],
  },
  {
    label: "App",
    tone: "meer",
    items: [adminLink("rechten"), adminLink("notificaties"), adminLink("strava")],
  },
];

/** De beheercategorieën met alleen de items waar de gebruiker recht op heeft;
 * een lege categorie valt weg. */
export function beheerCategoriesFor(
  has: (permission: CommunityPermission) => boolean,
): BeheerCategory[] {
  return BEHEER_CATEGORIES.flatMap((category) => {
    const items = category.items.filter((item) => has(item.permission));
    return items.length > 0 ? [{ ...category, items }] : [];
  });
}

/**
 * Laat alleen de items over waar de gebruiker recht op heeft. Groepen zonder
 * overgebleven items vallen weg, zodat er geen lege dropdown blijft staan.
 */
export function filterNavForPermissions(
  nodes: NavNode[],
  has: (permission: CommunityPermission) => boolean,
  /** Geslacht uit het profiel; null als het niet is ingevuld. */
  sex: string | null = null,
): NavNode[] {
  const allowed = (item: NavLeaf) =>
    (!item.permission || has(item.permission)) && (!item.onlyForSex || item.onlyForSex === sex);
  return nodes.flatMap<NavNode>((node) => {
    if (node.type === "link") return allowed(node) ? [node] : [];
    const items = node.items.filter(allowed);
    return items.length > 0 ? [{ ...node, items }] : [];
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

/** Helper: bevat deze groep de actieve link? Voor highlight-state op trigger. */
export function isActiveGroup(activeHref: string | null, group: NavGroup): boolean {
  return activeHref !== null && group.items.some((item) => item.href === activeHref);
}
