// WTRL-regels voor de racebriefing: format, telling en de grenzen van de divisie.
//
// Bron: wtrl.racing/zrl/resources, gelezen op 2026-10-20 (Rules & Scoring en de
// tabellen Standard en Development). De telling zelf rekent
// src/lib/zrl-live/scoring.ts; hier staat alleen wat de briefing erover zegt.
// Puur: geen I/O.

import { FTS_POINTS, PODIUM_POINTS, FULL_TEAM_STARTERS } from "@/lib/zrl-live/scoring";
import { powerupChances, type ZwiftPowerup } from "@/lib/zwift/powerups";

/** Zoals de briefing het format noemt; de Race of Truth is een puntenrace zonder slipstream. */
export type BriefingFormat = "points" | "rot" | "scratch" | "ttt";

/**
 * WTRL zet het format als tag (`pts`, `rot`, `scr`, `ttt`) en tussen haakjes in de
 * beschrijving. Een TTT is ook een Zwift-event van het type TEAM_TIME_TRIAL. Zie
 * zrlFormatOf in src/lib/zrl-live/snapshot.ts, dat de Race of Truth als puntenrace telt.
 */
export function briefingFormatOf(event: unknown): BriefingFormat {
  const { tags, description, eventType } = (event ?? {}) as { tags?: unknown; description?: unknown; eventType?: unknown };
  const tagSet = new Set(Array.isArray(tags) ? tags.map((tag) => String(tag).toLowerCase()) : []);
  const text = typeof description === "string" ? description : "";
  if (tagSet.has("ttt") || tagSet.has("zrl_ttt") || eventType === "TEAM_TIME_TRIAL" || /\((ttt|team time trial)\)/i.test(text)) return "ttt";
  if (tagSet.has("scr") || tagSet.has("zrl_scr") || /\(scratch( race)?\)/i.test(text)) return "scratch";
  if (tagSet.has("rot") || tagSet.has("zrl_rot") || /\(race of truth\)/i.test(text)) return "rot";
  return "points";
}

export const FORMAT_LABELS: Record<BriefingFormat, string> = {
  points: "Puntenrace",
  rot: "Race of Truth",
  scratch: "Scratch",
  ttt: "Ploegentijdrit",
};

/** De regels van het format in een paar regels, zoals op de briefing. */
export function formatRules(format: BriefingFormat): string[] {
  const podium = PODIUM_POINTS.join(", ");
  const fullTeam = `Volle leaguepunten met minstens ${FULL_TEAM_STARTERS} renners over de startstreep; met 3 sta je achter alle ploegen met ${FULL_TEAM_STARTERS}.`;
  switch (format) {
    case "scratch":
      return [
        "Alleen de finish telt: de winnaar krijgt het aantal starters, daarna telkens één minder.",
        `Podium: ${podium} punten extra voor de eerste vijf.`,
        "Geen punten op sprints of klimmen onderweg.",
        fullTeam,
      ];
    case "ttt":
      return [
        "De tijd van de vierde renner over de streep telt.",
        "Met minder dan vier finishers geen tijd en geen leaguepunten.",
        "Niet in het wiel van een andere ploeg: wie lost, rijdt alleen verder.",
      ];
    case "rot":
    case "points":
      return [
        ...(format === "rot" ? ["Geen slipstream: iedereen rijdt zijn eigen tempo."] : []),
        "FAL: per segment krijgt de eerste over de streep het aantal starters, daarna telkens één minder.",
        `FTS: de tien snelste tijden per segment, ${FTS_POINTS.join("-")}.`,
        `Finish: de winnaar krijgt het aantal starters, plus ${podium} podiumpunten voor de eerste vijf.`,
        fullTeam,
      ];
  }
}

export type Division = {
  development: boolean;
  women: boolean;
  category: "A" | "B" | "C" | "D" | null;
  /** "BDEV", "Open B", "Women's C". */
  label: string;
};

/** Uit de Zwift-eventnaam ("… : Open Dev Aqua League Division 3") en de subgroep (A–D). */
export function divisionOf(eventName: string, subgroupLabel: string): Division {
  const development = /\bdev\b|development/i.test(eventName);
  const women = /\bwomen'?s?\b|\bwomens\b/i.test(eventName);
  const letter = subgroupLabel.trim().toUpperCase().charAt(0);
  const category = (["A", "B", "C", "D"] as const).find((c) => c === letter) ?? null;
  const label = category
    ? development
      ? `${category}DEV${women ? " Women's" : ""}`
      : `${women ? "Women's" : "Open"} ${category}`
    : women
      ? "Women's"
      : "Open";
  return { development, women, category, label };
}

export type DivisionLimits = { zftpWkg: number | null; zmapWkg: number | null };

// Bovengrenzen (zFTP < …, zMAP < …). A Standard heeft er geen.
const STANDARD_OPEN: Record<string, DivisionLimits> = {
  A: { zftpWkg: null, zmapWkg: null },
  B: { zftpWkg: 4.2, zmapWkg: 5.1 },
  C: { zftpWkg: 3.36, zmapWkg: 4.1 },
  D: { zftpWkg: 2.63, zmapWkg: 3.2 },
};
const STANDARD_WOMEN: Record<string, DivisionLimits> = {
  A: { zftpWkg: null, zmapWkg: null },
  B: { zftpWkg: 3.88, zmapWkg: 4.8 },
  C: { zftpWkg: 3.36, zmapWkg: 4.1 },
  D: { zftpWkg: 2.63, zmapWkg: 3.2 },
};
const DEV_OPEN: Record<string, DivisionLimits> = {
  A: { zftpWkg: 4.37, zmapWkg: 5.33 },
  B: { zftpWkg: 3.74, zmapWkg: 4.53 },
  C: { zftpWkg: 3.08, zmapWkg: 3.68 },
  D: { zftpWkg: 2.4, zmapWkg: 2.83 },
};
const DEV_WOMEN: Record<string, DivisionLimits> = {
  A: { zftpWkg: 4.36, zmapWkg: 5.29 },
  B: { zftpWkg: 3.74, zmapWkg: 4.53 },
  C: { zftpWkg: 3.08, zmapWkg: 3.68 },
  D: { zftpWkg: 2.4, zmapWkg: 2.83 },
};

export function divisionLimits(division: Division): DivisionLimits | null {
  if (!division.category) return null;
  const table = division.development ? (division.women ? DEV_WOMEN : DEV_OPEN) : division.women ? STANDARD_WOMEN : STANDARD_OPEN;
  const limits = table[division.category];
  return limits.zftpWkg === null && limits.zmapWkg === null ? null : limits;
}

/** Vanaf dit deel van de grens noemt de briefing een renner. */
export const LIMIT_WARN_SHARE = 0.97;

export type LimitCheck = {
  zftpShare: number | null;
  zmapShare: number | null;
  /** "over": op of boven een grens; "near": vanaf LIMIT_WARN_SHARE. */
  status: "ok" | "near" | "over";
};

export function checkLimits(limits: DivisionLimits | null, zftpWkg: number | null, zmapWkg: number | null): LimitCheck {
  const share = (value: number | null, limit: number | null) =>
    value !== null && limit !== null && limit > 0 ? value / limit : null;
  const zftpShare = share(zftpWkg, limits?.zftpWkg ?? null);
  const zmapShare = share(zmapWkg, limits?.zmapWkg ?? null);
  const worst = Math.max(zftpShare ?? 0, zmapShare ?? 0);
  return { zftpShare, zmapShare, status: worst >= 1 ? "over" : worst >= LIMIT_WARN_SHARE ? "near" : "ok" };
}

/** Powerups uit de event-tag `powerup_percent="0,34,1,33,5,33"` (type, kans, type, kans …). */
export type Powerup = "veer" | "draft boost" | "aerohelm" | "spook" | "burrito" | "steamroller" | "anvil";

const BRIEFING_NAMES: Record<ZwiftPowerup, Powerup> = {
  feather: "veer",
  draft: "draft boost",
  burrito: "burrito",
  aero: "aerohelm",
  ghost: "spook",
  steamroller: "steamroller",
  anvil: "anvil",
};

export function powerupsFromTags(tags: unknown): Array<{ powerup: Powerup; percent: number }> {
  return (powerupChances(tags) ?? []).map((item) => ({ powerup: BRIEFING_NAMES[item.powerup], percent: item.percent }));
}
