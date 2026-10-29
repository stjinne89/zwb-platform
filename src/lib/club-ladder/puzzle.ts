// Ladderpuzzel: renners over de ladderteams verdelen en per team de klasseregel
// controleren (0290). Alleen klasseproblemen; club, aantal en 60%-regel niet
// (afspraak eigenaar 2026-10-29).
//
// Klasseregel uit het Club Ladder Race Book, zoals de eigenaar hem hanteert: een
// team beslaat hooguit 3 ranks; hoeveel renners er per rank zijn, maakt niet uit.
// Beslaat een team er meer, dan scoren de hoogst gerankte renners 50%.

import type { LadderRider, LadderSex } from "./riders";

export const LADDER_RANK_NAMES: Record<number, string> = {
  1: "Diamond",
  2: "Ruby",
  3: "Emerald",
  4: "Sapphire",
  5: "Amethyst",
  6: "Platinum",
  7: "Gold",
  8: "Silver",
  9: "Bronze",
  10: "Copper",
};

export const LADDER_RANKS = Object.keys(LADDER_RANK_NAMES).map(Number);

/** Zoveel ranks mag een team beslaan. */
export const MAX_TEAM_RANKS = 3;

/** Plaatsen in een ladderroster. */
export const LADDER_ROSTER_SIZE = 15;

export type LadderBand = [number, number];

export type LadderPuzzleTeam = {
  id: string;
  name: string;
  archived: boolean;
  /** Afgesproken band; rank 1 (Diamond) is de hoogste, dus band[0] <= band[1]. */
  band: LadderBand;
};

export type LadderPuzzleRider = {
  /** `p:<profiel-id>` of `r:<rosterregel-id>`. */
  key: string;
  kind: "profile" | "roster";
  id: string;
  name: string;
  sex: LadderSex;
  zwiftId: string | null;
  rank: number | null;
  /** In welk puzzelteam hij ligt; null = losse stukjes. */
  teamId: string | null;
};

export type LadderCheckLevel = "ok" | "warn" | "bad";

export type LadderTeamCheck = {
  level: LadderCheckLevel;
  issues: Array<{ level: LadderCheckLevel; text: string }>;
  /** Ranks die erbij kunnen zonder dat het team breder wordt dan 3. */
  allowed: LadderBand | null;
  /** Scoren 50% of mogen niet op het roster (geen rank). */
  outKeys: string[];
  /** Buiten de afgesproken band. */
  offBandKeys: string[];
};

export function ladderRankName(rank: number | null) {
  return rank != null ? (LADDER_RANK_NAMES[rank] ?? "geen rank") : "geen rank";
}

export function parseLadderRank(value: unknown): number | null {
  const rank = Number(value);
  return Number.isInteger(rank) && rank >= 1 && rank <= LADDER_RANKS.length ? rank : null;
}

export function parseLadderBand(min: unknown, max: unknown): LadderBand | null {
  const from = parseLadderRank(min);
  const to = parseLadderRank(max);
  return from != null && to != null && from <= to ? [from, to] : null;
}

/** Hoogste rank boven, daarna op naam; zonder rank onderaan. */
export function sortPuzzleRiders(riders: LadderPuzzleRider[]) {
  return [...riders].sort(
    (a, b) => (a.rank ?? 99) - (b.rank ?? 99) || a.name.localeCompare(b.name, "nl"),
  );
}

/** Het puzzelteam van een lid: het eerste ladderteam dat in de puzzel staat. */
export function puzzleTeamFor(teamIds: string[], puzzleTeamIds: ReadonlySet<string>) {
  return teamIds.find((id) => puzzleTeamIds.has(id)) ?? null;
}

export type LadderRosterRow = {
  roster_entry_id: string;
  team_id: string | null;
  sex: string | null;
  name: string;
  zwift_id: string | null;
};

/**
 * Leden uit de ladderlijst plus rosternamen zonder account. Een rosternaam met
 * het Zwift-ID van een lid in de lijst valt weg: dat is dezelfde renner.
 */
export function buildPuzzleRiders(
  members: LadderRider[],
  roster: LadderRosterRow[],
  ranks: ReadonlyMap<string, number>,
  puzzleTeamIds: ReadonlySet<string>,
): LadderPuzzleRider[] {
  const memberZwiftIds = new Set(
    members.map((member) => (member.zwiftId == null ? null : String(member.zwiftId))),
  );
  const rankOf = (zwiftId: string | null) => (zwiftId ? (ranks.get(zwiftId) ?? null) : null);

  return [
    ...members.map((member) => {
      const zwiftId = member.zwiftId == null ? null : String(member.zwiftId);
      return {
        key: `p:${member.id}`,
        kind: "profile" as const,
        id: member.id,
        name: member.name,
        sex: member.sex,
        zwiftId,
        rank: rankOf(zwiftId),
        teamId: puzzleTeamFor(member.teamIds, puzzleTeamIds),
      };
    }),
    ...roster
      .map((row) => ({ row, zwiftId: row.zwift_id?.trim() || null }))
      .filter(({ zwiftId }) => !zwiftId || !memberZwiftIds.has(zwiftId))
      .map(({ row, zwiftId }): LadderPuzzleRider => ({
        key: `r:${row.roster_entry_id}`,
        kind: "roster" as const,
        id: row.roster_entry_id,
        name: row.name.trim() || "Onbekend",
        sex: row.sex === "man" || row.sex === "vrouw" ? row.sex : null,
        zwiftId,
        rank: rankOf(zwiftId),
        teamId: row.team_id && puzzleTeamIds.has(row.team_id) ? row.team_id : null,
      })),
  ];
}

export function checkLadderTeam(
  team: LadderPuzzleTeam,
  riders: LadderPuzzleRider[],
): LadderTeamCheck {
  const out: LadderTeamCheck = { level: "ok", issues: [], allowed: null, outKeys: [], offBandKeys: [] };
  const add = (level: LadderCheckLevel, text: string) => {
    out.issues.push({ level, text });
    if (level === "bad" || (level === "warn" && out.level === "ok")) out.level = level;
  };

  if (riders.length === 0) {
    add("warn", "Nog geen renners.");
    return out;
  }

  for (const rider of riders) {
    if (rider.rank == null) {
      add("bad", `${rider.name} heeft geen rank.`);
      out.outKeys.push(rider.key);
    }
  }

  const ranked = riders.filter((rider) => rider.rank != null);
  if (ranked.length > 0) {
    const ranks = ranked.map((rider) => rider.rank!);
    const top = Math.min(...ranks);
    const low = Math.max(...ranks);
    const span = low - top + 1;
    if (span <= MAX_TEAM_RANKS) {
      out.allowed = [
        Math.max(1, low - MAX_TEAM_RANKS + 1),
        Math.min(LADDER_RANKS.length, top + MAX_TEAM_RANKS - 1),
      ];
    } else {
      // De laagste drie ranks tellen; wie daarboven zit, scoort 50%.
      out.allowed = [low - MAX_TEAM_RANKS + 1, low];
      const halves = ranked.filter((rider) => rider.rank! < out.allowed![0]);
      out.outKeys.push(...halves.map((rider) => rider.key));
      add(
        "bad",
        `${span} ranks, maximaal ${MAX_TEAM_RANKS}. Scoort 50%: ${halves.map((rider) => rider.name).join(", ")}.`,
      );
    }
  }

  const offBand = ranked.filter(
    (rider) => rider.rank! < team.band[0] || rider.rank! > team.band[1],
  );
  if (offBand.length > 0) {
    out.offBandKeys = offBand.map((rider) => rider.key);
    add(
      "warn",
      `${offBand.length} buiten ${ladderRankName(team.band[0])}–${ladderRankName(team.band[1])}.`,
    );
  }

  return out;
}
