// Eén register van de beheergebieden en het recht dat elk vraagt (migr. 0206).
//
// Het menu (ADMIN_NAV) en de controle op de pagina's en hun server-actions
// lezen allebei hieruit. Tot 2026-10-01 stonden die los, en liepen ze uiteen:
// de ZRL-kalender liet bijvoorbeeld drie rechten toe terwijl het menu er één
// toonde. Een recht per gebied is in te stellen op /beheer/rechten.

import type { CommunityPermission } from "@/lib/permissions";

export type AdminArea = { href: string; label: string; permission: CommunityPermission };

export const ADMIN_AREAS = {
  rechten: { href: "/beheer/rechten", label: "Rechten", permission: "roles.manage_permissions" },
  achievements: {
    href: "/beheer/achievements",
    label: "Badgebeheer",
    permission: "achievements.finalize",
  },
  citaten: { href: "/beheer/citaten", label: "Tips en citaten", permission: "community.manage" },
  zrl: { href: "/beheer/zrl-kalender", label: "ZRL-kalender", permission: "competitions.manage" },
  frr: { href: "/beheer/frr-kalender", label: "FRR-kalender", permission: "competitions.manage" },
  src: { href: "/beheer/src", label: "SRC-kalender", permission: "src.manage" },
  wtrl: { href: "/beheer/wtrl-teams", label: "WTRL-teams", permission: "competitions.manage" },
  eventScan: { href: "/beheer/event-scan", label: "Eventscan", permission: "calendar.sources" },
  zwiftRoutes: {
    href: "/beheer/zwift-routes",
    label: "Zwift-routes",
    permission: "calendar.sources",
  },
  omnium: { href: "/beheer/omnium", label: "Omnium", permission: "omnium.manage" },
  zwbgame: { href: "/zwbgame/beheer", label: "ZWBgame", permission: "zwbgame.manage" },
  strava: { href: "/beheer/strava", label: "Strava-sync", permission: "integrations.manage" },
  segments: { href: "/beheer/segments", label: "Segmenten", permission: "integrations.manage" },
  notificaties: {
    href: "/beheer/notificaties",
    label: "Notificaties",
    permission: "notifications.broadcast",
  },
} as const satisfies Record<string, AdminArea>;

export type AdminAreaKey = keyof typeof ADMIN_AREAS;

/** Het recht dat een beheergebied vraagt. */
export function adminAreaPermission(key: AdminAreaKey): CommunityPermission {
  return ADMIN_AREAS[key].permission;
}
