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
};

export type NavGroup = {
  type: "group";
  label: string;
  items: NavLeaf[];
};

export type NavNode = NavLeaf | NavGroup;

export const NAV_GROUPS: NavNode[] = [
  { type: "link", href: "/kalender", label: "Kalender" },
  { type: "link", href: "/samen-fietsen", label: "Samen fietsen" },
  {
    type: "group",
    label: "Club",
    items: [
      { type: "link", href: "/leden", label: "Leden" },
      { type: "link", href: "/teams", label: "Teams" },
      { type: "link", href: "/achievements", label: "Achievements" },
      { type: "link", href: "/stats", label: "Stats" },
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
  { type: "link", href: "/training", label: "Training" },
  { type: "link", href: "/onderhoud", label: "Onderhoud" },
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
    href: "/beheer/event-scan",
    label: "Eventscan",
    permission: "events.manage_all",
  },
  {
    type: "link",
    href: "/beheer/notificaties",
    label: "Notificaties",
    permission: "community.manage",
  },
];

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
