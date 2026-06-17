export const MILESTONE_TIERS = ["bronze", "silver", "gold", "platinum"] as const;

export type MilestoneTier = (typeof MILESTONE_TIERS)[number];

export const TIER_LABELS: Record<MilestoneTier, string> = {
  bronze: "Brons",
  silver: "Zilver",
  gold: "Goud",
  platinum: "Platinum",
};

export const CUSTOM_BADGE_PREFIX = "custom_";

export const ACHIEVEMENT_ICON_OPTIONS = [
  { value: "award", label: "Award" },
  { value: "bike", label: "Fiets" },
  { value: "calendar", label: "Kalender" },
  { value: "crown", label: "Kroon" },
  { value: "flame", label: "Vlam" },
  { value: "heart", label: "Hart" },
  { value: "map", label: "Kaart" },
  { value: "medal", label: "Medaille" },
  { value: "mountain", label: "Berg" },
  { value: "route", label: "Route" },
  { value: "trophy", label: "Trofee" },
  { value: "users", label: "Team" },
  { value: "zap", label: "Power" },
] as const;

export type AchievementIconOption = (typeof ACHIEVEMENT_ICON_OPTIONS)[number]["value"];

export type BadgeVisibilityInput = {
  id: string;
  trigger_source: "auto" | "manual" | "future";
};

export function isBoardManagedBadgeId(id: string) {
  return id.startsWith(CUSTOM_BADGE_PREFIX);
}

export function isBadgeDefinitionVisible(badge: BadgeVisibilityInput) {
  return badge.trigger_source === "auto" || isBoardManagedBadgeId(badge.id);
}

export function isBadgeVisibleInVault(
  badge: BadgeVisibilityInput,
  earned = false,
) {
  return isBadgeDefinitionVisible(badge) || earned;
}

export function isAchievementIconOption(value: string): value is AchievementIconOption {
  return ACHIEVEMENT_ICON_OPTIONS.some((option) => option.value === value);
}
