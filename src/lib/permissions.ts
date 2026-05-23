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
    label: "Posts modereren",
    description: "Kan posts en reacties van anderen verwijderen of afronden.",
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
    description: "Kan communityblokken, aankondigingen en groepen beheren.",
    category: "Community",
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
    id: "live.manage",
    label: "Live sessies beheren",
    description: "Kan live sessies opschonen of beheren.",
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
  ],
  community_manager: [
    "events.create",
    "events.manage_all",
    "content.create_posts",
    "content.moderate_posts",
    "media.manage",
    "community.manage",
    "members.approve",
    "members.manage_roles",
    "achievements.finalize",
    "live.start",
    "live.manage",
    "sponsors.manage",
    "polls.manage",
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
