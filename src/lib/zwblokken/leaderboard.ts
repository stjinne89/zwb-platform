// De ranglijst "Meeste blokken" onder de kaart: buiten de blokken op zoom 14,
// op het Zwift-tabblad alle Zwift-werelden samen. Tot 2026-11-10 stond ook op
// het Zwift-tabblad de buitenlijst, en leken Zwift-rijders te laag te staan.

export type LeaderboardMember = { id: string; name: string; blocks: number; zwiftBlocks: number };

/** Leden met blokken in deze stand, de meeste eerst. Puur, voor de test. */
export function leaderboardRows<T extends LeaderboardMember>(
  members: T[],
  mode: "buiten" | "zwift",
): Array<T & { count: number }> {
  return members
    .map((member) => ({ ...member, count: mode === "zwift" ? member.zwiftBlocks : member.blocks }))
    .filter((member) => member.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "nl"));
}
