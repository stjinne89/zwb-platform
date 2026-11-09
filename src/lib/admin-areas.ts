// Eén register van de beheergebieden en het recht dat elk vraagt (migr. 0206).
//
// Het beheer (BEHEER_CATEGORIES) en de controle op de pagina's en hun server-actions
// lezen allebei hieruit. Tot 2026-10-01 stonden die los, en liepen ze uiteen:
// de ZRL-kalender liet bijvoorbeeld drie rechten toe terwijl het menu er één
// toonde. Een recht per gebied is in te stellen op /beheer/rechten.

import type { CommunityPermission } from "@/lib/permissions";
import type { ModuleKey } from "@/lib/modules";

export type AdminArea = {
  href: string;
  label: string;
  permission: CommunityPermission;
  /** Het label is de naam van deze module bij de club (fase 3). */
  module?: ModuleKey;
};

export const ADMIN_AREAS = {
  rechten: { href: "/beheer/rechten", label: "Rechten", permission: "roles.manage_permissions" },
  // Welke modules deze club gebruikt (0313, docs/multi-club-ontwerp.md). Het
  // recht van de eigenaar: een module uit zetten raakt alle leden.
  modules: { href: "/beheer/modules", label: "Modules", permission: "roles.manage_permissions" },
  // De inrichting van de club in stappen (fase 6): naam, huisstijl, modules,
  // namen en herkenning. Zelfde recht als de modules.
  inrichting: { href: "/beheer/inrichting", label: "Inrichting", permission: "roles.manage_permissions" },
  // De vijf kleuren van de club (0314). Zelfde recht als de modules.
  huisstijl: { href: "/beheer/huisstijl", label: "Huisstijl", permission: "roles.manage_permissions" },
  achievements: {
    href: "/beheer/achievements",
    label: "Badgebeheer",
    permission: "achievements.finalize",
  },
  // Voordrachten voor ZWBekers keuren (0286): hetzelfde werk als badges
  // toekennen, dus hetzelfde recht.
  zwbekers: { href: "/beheer/zwbekers", label: "ZWBekers", permission: "achievements.finalize", module: "bekers" },
  citaten: { href: "/beheer/citaten", label: "Tips en citaten", permission: "community.manage" },
  // Verhalen voor de publieke pagina /verhaal plaatsen (0288): communitywerk,
  // net als tips en citaten.
  clubverhaal: { href: "/beheer/clubverhaal", label: "Clubverhaal", permission: "community.manage" },
  zrl: { href: "/beheer/zrl", label: "ZRL-beheer", permission: "competitions.manage" },
  frr: { href: "/beheer/frr-kalender", label: "FRR-kalender", permission: "competitions.manage" },
  src: { href: "/beheer/src", label: "SRC-kalender", permission: "src.manage" },
  programmas: {
    href: "/beheer/programmas",
    label: "Programma's",
    permission: "events.manage_all",
  },
  eventScan: { href: "/beheer/event-scan", label: "Eventscan", permission: "calendar.sources" },
  zwiftRoutes: {
    href: "/beheer/zwift-routes",
    label: "Zwift-routes",
    permission: "calendar.sources",
  },
  omnium: { href: "/beheer/omnium", label: "Omnium", permission: "omnium.manage" },
  zwbgame: { href: "/zwbgame/beheer", label: "ZWBgame", permission: "zwbgame.manage", module: "managerspel" },
  // Zelfde recht als ZWBgame: allebei clubspel; een eigen recht zou de
  // check-constraint van community_role_permissions (0206) vragen.
  bokaal: { href: "/voorzpwelbokaal/beheer", label: "voorZpWelBokaal", permission: "zwbgame.manage", module: "voorspelspel" },
  strava: { href: "/beheer/strava", label: "Strava-sync", permission: "integrations.manage" },
  // Per lid wat er gekoppeld is en of het loopt, om leden met vragen te helpen
  // (2026-11-04). Zelfde recht als de Strava-sync: dezelfde mensen beheren de
  // koppelingen, en die zien de Strava- en intervals-status daar al.
  koppelingen: {
    href: "/beheer/koppelingen",
    label: "Koppelingen",
    permission: "integrations.manage",
  },
  notificaties: {
    href: "/beheer/notificaties",
    label: "Notificaties",
    permission: "notifications.broadcast",
  },
  // De wekelijkse app-updates (0293): een bericht aan alle leden, net als een
  // pushbericht.
  appUpdates: {
    href: "/beheer/app-updates",
    label: "App-updates",
    permission: "notifications.broadcast",
  },
  // Meetproef voor houding en bikefit uit live video (2026-11-08). Het recht van
  // de eigenaar: het is een proef, nog geen functie voor leden.
  houdingMeetproef: {
    href: "/beheer/houding-meetproef",
    label: "Houding-meetproef",
    permission: "roles.manage_permissions",
  },
  // Wat de AI kost, per lid en per soort (0316, fase 0 van ZWBrandstof). Geld en
  // verbruik per lid: het recht van de eigenaar, net als de meetproef.
  aiVerbruik: {
    href: "/beheer/ai-verbruik",
    label: "AI-verbruik",
    permission: "roles.manage_permissions",
  },
} as const satisfies Record<string, AdminArea>;

export type AdminAreaKey = keyof typeof ADMIN_AREAS;

/** Het recht dat een beheergebied vraagt. */
export function adminAreaPermission(key: AdminAreaKey): CommunityPermission {
  return ADMIN_AREAS[key].permission;
}
