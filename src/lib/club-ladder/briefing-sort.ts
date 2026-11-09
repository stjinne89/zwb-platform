// Sorteren van de verwachte uitslag op het racebriefje van een ladderrace,
// per kolom, in watt of W/kg (2026-11-09). Licht gehouden: dit gaat mee naar de browser.

import type { LadderPlace } from "./briefing";
import { riderWatts, type MatchupUnit } from "./matchup-sort";
import type { PowerDuration } from "./routes";

export type LadderSortKey = "place" | "name" | "points" | PowerDuration | "zrs";
export type LadderSort = { key: LadderSortKey; direction: "asc" | "desc" };

/** W/kg of watt per duur van één renner; watt alleen met gewicht. */
export function ladderPower(row: Pick<LadderPlace, "wkg" | "weightKg">, unit: MatchupUnit) {
  return unit === "w" ? riderWatts(row.wkg, row.weightKg ?? null) : row.wkg;
}

function sortValue(row: LadderPlace, key: LadderSortKey, unit: MatchupUnit): string | number | null {
  if (key === "place") return row.place;
  if (key === "name") return row.name;
  if (key === "points") return row.rating === null ? null : row.points;
  if (key === "zrs") return row.racingScore;
  return ladderPower(row, unit)?.[key] ?? null;
}

/** Zonder sortering de verwachte volgorde; zonder waarde altijd onderaan. */
export function sortLadderPlaces(rows: LadderPlace[], sort: LadderSort | null, unit: MatchupUnit = "wkg"): LadderPlace[] {
  if (!sort) return rows;
  const dir = sort.direction === "asc" ? 1 : -1;
  const byPlace = (a: LadderPlace, b: LadderPlace) => a.place - b.place;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key, unit);
    const bv = sortValue(b, sort.key, unit);
    if (av == null || bv == null) return av == null && bv == null ? byPlace(a, b) : av == null ? 1 : -1;
    if (typeof av === "number" && typeof bv === "number") return av === bv ? byPlace(a, b) : (av - bv) * dir;
    return String(av).localeCompare(String(bv), "nl") * dir;
  });
}

/** Eerste klik: plek en naam oplopend, getallen hoogste eerst; nog een klik draait om. */
export function nextLadderSort(current: LadderSort | null, key: LadderSortKey): LadderSort {
  if (current?.key === key) return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  return { key, direction: key === "place" || key === "name" ? "asc" : "desc" };
}

/** Laagste en hoogste waarde per duur over alle renners, in de gekozen eenheid. */
export function ladderPowerRange(rows: LadderPlace[], d: PowerDuration, unit: MatchupUnit): { min: number; max: number } | null {
  const values = rows.map((row) => ladderPower(row, unit)?.[d]).filter((v): v is number => v != null);
  return values.length < 2 ? null : { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * Kleur als op de Club Ladder: de hoogste waarde rood (0), de laagste groen
 * (120), daartussen via oranje en geel. Null zonder waarde of zonder verschil.
 */
export function heatHue(value: number | null | undefined, range: { min: number; max: number } | null): number | null {
  if (value == null || !range || range.max === range.min) return null;
  return Math.round(120 * ((range.max - value) / (range.max - range.min)));
}
