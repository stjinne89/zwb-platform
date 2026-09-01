// Gedeelde nav-config tussen desktop (layout.tsx) en mobiel (mobile-menu.tsx).
// Discriminated union zodat we per node-type kunnen renderen.
//
// 'link'  → directe top-level link
// 'group' → dropdown-cluster (desktop) of section-header (mobiel)

import type { CommunityPermission } from "@/lib/permissions";

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
  { type: "link", href: "/zwbeter-worden/core", label: "Core & mobiliteit" },
  { type: "link", href: "/zwbeter-worden/doelen", label: "Doelen" },
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
  { type: "link", href: "/zwbeter-worden/trainer/doelen", label: "Doelen" },
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
      { type: "link", href: "/teams", label: "Teams" },
      { type: "link", href: "/achievements", label: "Achievements" },
      { type: "link", href: "/stats", label: "Stats" },
      { type: "link", href: "/zwblokken", label: "ZWBlokken" },
      {
        type: "link",
        href: "https://zwbomnium.netlify.app/",
        label: "ZWB Omnium",
        external: true,
      },
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
      { type: "link", href: "/materiaal", label: "Vraag en Aanbod" },
      { type: "link", href: "/media", label: "Media" },
      { type: "link", href: "/ritverslagen", label: "Ritverslagen" },
    ],
  },
  { type: "link", href: "/sponsors", label: "Sponsors" },
];

// Items voor de avatar-dropdown (en mobiel onderaan).
export const AVATAR_NAV: NavLeaf[] = [
  { type: "link", href: "/profiel", label: "Profiel" },
  { type: "link", href: "/profiel/segments", label: "ZWB Segments" },
  { type: "link", href: "/mijn-garage", label: "Mijn garage" },
  { type: "link", href: "/hulp", label: "Hulp" },
];

// Admin-items met bijbehorende permission. Filteren gebeurt in de
// layout via getCurrentUserAccess.
export type AdminNavItem = {
  type: "link";
  href: string;
  label: string;
  permission: CommunityPermission;
};

export const ADMIN_NAV: AdminNavItem[] = [
  {
    type: "link",
    href: "/beheer/rechten",
    label: "Rechten",
    permission: "roles.manage_permissions",
  },
  {
    type: "link",
    href: "/beheer/achievements",
    label: "Badgebeheer",
    permission: "achievements.finalize",
  },
  {
    type: "link",
    href: "/beheer/citaten",
    label: "Tips en citaten",
    permission: "community.manage",
  },
  {
    type: "link",
    href: "/beheer/zrl-kalender",
    label: "ZRL-kalender",
    permission: "teams.manage_roster",
  },
  {
    type: "link",
    href: "/beheer/event-scan",
    label: "Eventscan",
    permission: "events.manage_all",
  },
  {
    type: "link",
    href: "/beheer/zwift-routes",
    label: "Zwift-routes",
    permission: "events.manage_all",
  },
  {
    type: "link",
    href: "/beheer/strava",
    label: "Strava-sync",
    permission: "community.manage",
  },
  {
    type: "link",
    href: "/beheer/notificaties",
    label: "Notificaties",
    permission: "community.manage",
  },
];

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

/** Helper: is een href de active route? Werkt voor zowel exact als nested. */
export function isActiveHref(pathname: string, href: string): boolean {
  if (href.startsWith("http")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Helper: heeft deze groep een actief child? Voor highlight-state op trigger. */
export function isActiveGroup(pathname: string, group: NavGroup): boolean {
  return group.items.some((item) => isActiveHref(pathname, item.href));
}
