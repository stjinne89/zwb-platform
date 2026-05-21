export const COMMUNITY_ROLES = [
  "board",
  "team_captain",
  "event_organizer",
  "community_manager",
  "paying_member",
  "community_member",
] as const;

export type CommunityRole = (typeof COMMUNITY_ROLES)[number];

export type CommunityRoleMeta = {
  label: string;
  shortLabel: string;
  description: string;
  className: string;
};

export const COMMUNITY_ROLE_META: Record<CommunityRole, CommunityRoleMeta> = {
  board: {
    label: "Bestuur",
    shortLabel: "Bestuur",
    description: "Clubbestuur en formele besluitvorming.",
    className: "border-primary/25 bg-primary/10 text-primary",
  },
  team_captain: {
    label: "Team-captain",
    shortLabel: "Captain",
    description: "Aanspreekpunt voor teams, rosters en competitieafspraken.",
    className: "border-zwb-teal/25 bg-zwb-teal/10 text-zwb-teal dark:text-zwb-sage",
  },
  event_organizer: {
    label: "Event-organiser",
    shortLabel: "Events",
    description: "Organiseert ritten, events en communitymomenten.",
    className: "border-zwb-gold/30 bg-zwb-gold/15 text-accent-foreground dark:text-zwb-gold",
  },
  community_manager: {
    label: "Community-beheerder",
    shortLabel: "Beheer",
    description: "Beheert content, leden en community-inrichting.",
    className: "border-secondary/70 bg-secondary text-secondary-foreground",
  },
  paying_member: {
    label: "Betalend lid",
    shortLabel: "Betalend",
    description: "Lid met betaalde ZWB-lidmaatschapsstatus.",
    className: "border-foreground/15 bg-card text-foreground",
  },
  community_member: {
    label: "Communitylid",
    shortLabel: "Community",
    description: "Basisrol voor iedereen in de ZWB-community.",
    className: "border-muted bg-muted text-muted-foreground",
  },
};

export function normalizeCommunityRoles(
  roles: readonly string[] | null | undefined,
): CommunityRole[] {
  const valid = new Set<string>(COMMUNITY_ROLES);
  const normalized = Array.from(new Set(roles ?? [])).filter((role) =>
    valid.has(role),
  ) as CommunityRole[];

  return normalized.length > 0 ? normalized : ["community_member"];
}

export function hasCommunityRole(
  roles: readonly string[] | null | undefined,
  role: CommunityRole,
): boolean {
  return normalizeCommunityRoles(roles).includes(role);
}
