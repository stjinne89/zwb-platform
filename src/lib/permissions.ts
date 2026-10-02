import type { CommunityRole } from "@/lib/community-roles";

export const COMMUNITY_PERMISSIONS = [
  {
    id: "events.create",
    label: "Events aanmaken",
    description: "Kan nieuwe kalenderitems en ritten aanmaken.",
    category: "Kalender",
  },
  {
    id: "events.manage_all",
    label: "Alle events beheren",
    description: "Kan events van andere leden bewerken of verwijderen.",
    category: "Kalender",
  },
  {
    id: "calendar.sources",
    label: "Kalenderbronnen beheren",
    description: "Kan de eventscan en de Zwift-routebibliotheek beheren.",
    category: "Kalender",
  },
  {
    id: "competitions.manage",
    label: "Competities beheren",
    description: "Kan de ZRL-kalender, WTRL-teams en FRR-tours beheren.",
    category: "Teams",
  },
  {
    id: "teams.create",
    label: "Teams aanmaken",
    description: "Kan formele teams aanmaken.",
    category: "Teams",
  },
  {
    id: "teams.manage_roster",
    label: "Teamleden beheren",
    description: "Kan leden aan teams koppelen en teamrollen wijzigen.",
    category: "Teams",
  },
  {
    id: "teams.manage_results",
    label: "Teamresultaten beheren",
    description: "Kan resultaten en standen corrigeren.",
    category: "Teams",
  },
  {
    id: "teams.sync_sources",
    label: "Teambronnen syncen",
    description: "Kan WTRL/Ladder-bronnen en teamdata synchroniseren.",
    category: "Teams",
  },
  {
    id: "content.create_posts",
    label: "Posts plaatsen",
    description: "Kan Vraag en Aanbod-posts, vragen en tips plaatsen.",
    category: "Content",
  },
  {
    id: "content.moderate_posts",
    label: "Content modereren",
    description:
      "Kan posts, reacties, eventchat, ritverslagen, foto's en verjaardagsberichten van anderen verwijderen.",
    category: "Content",
  },
  {
    id: "media.manage",
    label: "Media beheren",
    description: "Kan podcasts, videos en externe media-items beheren.",
    category: "Content",
  },
  {
    id: "community.manage",
    label: "Community beheren",
    description: "Kan aankondigingen, WhatsApp-groepen en tips en citaten beheren.",
    category: "Community",
  },
  {
    id: "notifications.broadcast",
    label: "Pushberichten aan alle leden",
    description: "Kan een pushbericht naar alle leden sturen.",
    category: "Community",
  },
  {
    id: "integrations.manage",
    label: "Koppelingen beheren",
    description: "Kan de Strava-sync en segmenten beheren en krijgt storingsmeldingen.",
    category: "Koppelingen",
  },
  {
    id: "members.approve",
    label: "Leden goedkeuren",
    description: "Kan nieuwe registraties goedkeuren.",
    category: "Leden",
  },
  {
    id: "members.manage_roles",
    label: "Ledenrollen beheren",
    description: "Kan rollen op individuele leden wijzigen.",
    category: "Leden",
  },
  {
    id: "roles.manage_permissions",
    label: "Rechten beheren",
    description: "Kan rechten per ledengroep aanpassen.",
    category: "Leden",
  },
  {
    id: "achievements.finalize",
    label: "Badges vastleggen",
    description: "Kan weekbadges en achievements definitief toekennen.",
    category: "Achievements",
  },
  {
    id: "live.start",
    label: "Samen fietsen starten",
    description: "Kan zichzelf zichtbaar maken in Samen fietsen.",
    category: "Samen fietsen",
  },
  {
    id: "sponsors.manage",
    label: "Sponsors & ledenvoordeel beheren",
    description:
      "Kan sponsors toevoegen of bewerken en kortingscodes / ledenvoordeel beheren.",
    category: "Sponsors",
  },
  {
    id: "polls.manage",
    label: "Polls aanmaken & sluiten",
    description: "Kan polls aanmaken, sluiten en verwijderen.",
    category: "Community",
  },
  {
    id: "training.view_assigned",
    label: "Toegewezen trainingsdata bekijken",
    description: "Kan trainingsdata zien van leden die trainer-toegang gaven.",
    category: "Training",
  },
  {
    id: "training.manage_assignments",
    label: "Trainerkoppelingen beheren",
    description: "Kan trainer-toegang beheren en intrekken.",
    category: "Training",
  },
  {
    id: "training.create_plans",
    label: "Trainingsschema's maken",
    description: "Kan schema's en workouts maken voor toegewezen leden.",
    category: "Training",
  },
  {
    id: "training.publish_plans",
    label: "Trainingsschema's publiceren",
    description: "Kan goedgekeurde schema's naar ZWB en intervals.icu publiceren.",
    category: "Training",
  },
  {
    id: "training.ai_generate",
    label: "AI trainingsconcepten maken",
    description: "Kan AI gebruiken voor concept-trainingsschema's.",
    category: "Training",
  },
  {
    id: "omnium.manage",
    label: "Omnium beheren",
    description:
      "Kan Omnium-edities aanmaken en publiceren, uitslagen invoeren en prijzen toekennen.",
    category: "Omnium",
  },
  {
    id: "src.manage",
    label: "Sunday Race Club beheren",
    description:
      "Kan de SRC-kalender verversen, SRC-teams beheren, renners koppelen en leden in een maand zetten.",
    category: "Sunday Race Club",
  },
  {
    id: "zwbgame.manage",
    label: "ZWBgame beheren",
    description: "Kan renners uit het ZWBgame-peloton halen.",
    category: "ZWBgame",
  },
] as const;

export type CommunityPermission = (typeof COMMUNITY_PERMISSIONS)[number]["id"];
export type CommunityPermissionMeta = (typeof COMMUNITY_PERMISSIONS)[number];

export const COMMUNITY_PERMISSION_IDS = COMMUNITY_PERMISSIONS.map(
  (permission) => permission.id,
) as CommunityPermission[];

export const DEFAULT_ROLE_PERMISSIONS: Record<
  CommunityRole,
  CommunityPermission[]
> = {
  board: [...COMMUNITY_PERMISSION_IDS],
  team_captain: [
    "events.create",
    "competitions.manage",
    "teams.manage_roster",
    "teams.manage_results",
    "content.create_posts",
    "live.start",
    "polls.manage",
  ],
  event_organizer: [
    "events.create",
    "content.create_posts",
    "live.start",
    "polls.manage",
    "src.manage",
  ],
  community_manager: [
    "events.create",
    "events.manage_all",
    "calendar.sources",
    "competitions.manage",
    "notifications.broadcast",
    "integrations.manage",
    "content.create_posts",
    "content.moderate_posts",
    "media.manage",
    "community.manage",
    "members.approve",
    "members.manage_roles",
    "achievements.finalize",
    "live.start",
    "sponsors.manage",
    "polls.manage",
    "training.view_assigned",
    "training.manage_assignments",
    "training.create_plans",
    "training.publish_plans",
    "training.ai_generate",
    "omnium.manage",
    "src.manage",
  ],
  trainer: [
    "training.view_assigned",
    "training.create_plans",
    "training.publish_plans",
    "training.ai_generate",
    "content.create_posts",
  ],
  paying_member: ["events.create", "content.create_posts", "live.start"],
  community_member: ["content.create_posts", "live.start"],
};

export function normalizePermissions(
  permissions: readonly string[] | null | undefined,
): CommunityPermission[] {
  const valid = new Set<string>(COMMUNITY_PERMISSION_IDS);
  return Array.from(new Set(permissions ?? [])).filter((permission) =>
    valid.has(permission),
  ) as CommunityPermission[];
}

export function permissionsByCategory() {
  const grouped = new Map<string, CommunityPermissionMeta[]>();
  for (const permission of COMMUNITY_PERMISSIONS) {
    grouped.set(permission.category, [
      ...(grouped.get(permission.category) ?? []),
      permission,
    ]);
  }
  return Array.from(grouped.entries()).map(([category, permissions]) => ({
    category,
    permissions,
  }));
}
