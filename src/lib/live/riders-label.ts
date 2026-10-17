/**
 * Wie er nu live rijdt, als korte zin voor de tegel op Vandaag: "Jij en Anna",
 * "Anna, Bert en Carla" of "Anna, Bert, Carla en 2 anderen". De kijker zelf
 * staat voorop als "Jij".
 */
export function liveRidersLabel(
  riders: Array<{ profileId: string; name: string }>,
  viewerId: string | null,
  maxNames = 3,
): string {
  const ordered = [
    ...riders.filter((rider) => rider.profileId === viewerId).map(() => "Jij"),
    ...riders.filter((rider) => rider.profileId !== viewerId).map((rider) => rider.name),
  ];
  if (ordered.length === 0) return "";
  if (ordered.length === 1) return ordered[0];
  if (ordered.length <= maxNames) {
    return `${ordered.slice(0, -1).join(", ")} en ${ordered[ordered.length - 1]}`;
  }
  const rest = ordered.length - maxNames;
  return `${ordered.slice(0, maxNames).join(", ")} en ${rest} ${rest === 1 ? "ander" : "anderen"}`;
}
