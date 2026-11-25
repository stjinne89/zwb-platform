/** De soorten teams, voor het aanmaak- en het bewerkformulier. */
export const TEAM_TYPES = [
  { value: "zrl", label: "ZRL" },
  { value: "ladder", label: "Ladder" },
  { value: "social", label: "Social" },
  { value: "outdoor", label: "Outdoor" },
] as const;

export function isTeamType(value: string) {
  return TEAM_TYPES.some((type) => type.value === value);
}
