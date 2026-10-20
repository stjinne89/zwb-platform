// Het veld in de racebriefing: verwachte volgorde, ploegpunten, wie te volgen
// en voorstellen voor rollen in de eigen ploeg. Puur: geen I/O.
//
// De volgorde komt uit één getal per renner: de vELO van ZwiftRacing als die er
// voor het grootste deel van het veld is, anders de Zwift Racing Score. Dat is een
// verwachting, geen voorspelling: tactiek, dagvorm en wie er echt start, ontbreken.

import { FULL_TEAM_STARTERS, PODIUM_POINTS } from "@/lib/zrl-live/scoring";
import type { BriefingFormat } from "./rules";

/** Beste W/kg van de laatste 90 dagen (ZwiftRacing); ontbreekt zonder koppeling. */
export type PowerProfile = { s15: number | null; m1: number | null; m2: number | null; m5: number | null; m20: number | null };

export type FieldRider = {
  zwiftId: number;
  name: string;
  /** Teamsleutel zoals de live stand die gebruikt (eigen team, bijstelling of tag). */
  team: string | null;
  own: boolean;
  racingScore: number | null;
  velo: number | null;
  power: PowerProfile | null;
  /** Plek per eerdere race van deze ronde, in volgorde; null = niet in de uitslag. */
  history: Array<number | null>;
};

export type ProjectionBasis = "velo" | "zrs";

/**
 * Naam zonder teamtag en rangnummers, zoals een renner hem in Zwift typt:
 * "1  Harmen 1 Reinders (ZWB)" → "Harmen Reinders", "Brett Mulqueen-Ducker | RCC"
 * → "Brett Mulqueen-Ducker", "Daniel [#_lonecyclist] Bojdo" → "Daniel Bojdo".
 */
export function cleanRiderName(name: string): string {
  const cleaned = name
    .replace(/[([{（［【<][^)\]}）］】>]*[)\]}）］】>]/g, " ")
    .split(/\s+[|–-]\s+/)[0]
    .split(/\s+/)
    .filter((part) => /\p{L}/u.test(part))
    .join(" ")
    .trim();
  return cleaned || name.trim();
}

/** Zo'n deel van het veld moet een waarde hebben om erop te sorteren. */
const MIN_COVERAGE = 0.7;

export function projectionBasis(riders: FieldRider[]): ProjectionBasis | null {
  if (riders.length === 0) return null;
  const share = (pick: (r: FieldRider) => number | null) => riders.filter((r) => pick(r) !== null).length / riders.length;
  if (share((r) => r.velo) >= MIN_COVERAGE) return "velo";
  if (share((r) => r.racingScore) >= MIN_COVERAGE) return "zrs";
  return null;
}

export function ratingOf(rider: FieldRider, basis: ProjectionBasis | null): number | null {
  if (basis === "velo") return rider.velo;
  if (basis === "zrs") return rider.racingScore;
  return null;
}

export type ProjectedTeam = {
  team: string;
  own: boolean;
  starters: number;
  /** Verwachte punten uit de finish (FIN en podium); null bij een ploegentijdrit. */
  points: number | null;
  riders: Array<{ zwiftId: number; name: string; place: number }>;
};

export type Projection = {
  basis: ProjectionBasis | null;
  /** Verwachte volgorde over de streep; renners zonder waarde achteraan. */
  order: FieldRider[];
  teams: ProjectedTeam[];
};

export function projectField(riders: FieldRider[], format: BriefingFormat): Projection {
  const basis = projectionBasis(riders);
  const order = [...riders].sort((a, b) => {
    const ra = ratingOf(a, basis);
    const rb = ratingOf(b, basis);
    if (ra === null && rb === null) return a.name.localeCompare(b.name);
    if (ra === null) return 1;
    if (rb === null) return -1;
    return rb - ra;
  });
  const n = order.length;
  const byTeam = new Map<string, ProjectedTeam>();
  order.forEach((rider, index) => {
    if (!rider.team) return;
    const team = byTeam.get(rider.team) ?? { team: rider.team, own: false, starters: 0, points: format === "ttt" ? null : 0, riders: [] };
    team.own ||= rider.own;
    team.starters += 1;
    team.riders.push({ zwiftId: rider.zwiftId, name: rider.name, place: index + 1 });
    if (team.points !== null && basis !== null) team.points += n - index + (PODIUM_POINTS[index] ?? 0);
    byTeam.set(rider.team, team);
  });
  // WTRL: eerst ploegen met vier of meer starters, dan met drie; daarbinnen punten.
  const tier = (t: ProjectedTeam) => (t.starters >= FULL_TEAM_STARTERS ? 0 : t.starters === FULL_TEAM_STARTERS - 1 ? 1 : 2);
  const teams = [...byTeam.values()]
    .filter((t) => t.starters >= 2 || t.own)
    .sort((a, b) => tier(a) - tier(b) || (b.points ?? 0) - (a.points ?? 0) || a.riders[0].place - b.riders[0].place);
  if (basis === null) for (const team of teams) team.points = null;
  return { basis, order, teams };
}

export type WatchReason = "sterk" | "won" | "podium";

/** Tegenstanders om te volgen: de sterksten in de verwachting en wie eerder deze ronde won of op het podium stond. */
export function watchList(projection: Projection, max = 5): Array<{ rider: FieldRider; place: number; reason: WatchReason }> {
  const out: Array<{ rider: FieldRider; place: number; reason: WatchReason }> = [];
  const seen = new Set<number>();
  const add = (rider: FieldRider, reason: WatchReason) => {
    if (rider.own || seen.has(rider.zwiftId) || out.length >= max) return;
    seen.add(rider.zwiftId);
    out.push({ rider, place: projection.order.indexOf(rider) + 1, reason });
  };
  for (const rider of projection.order) if (rider.history.includes(1)) add(rider, "won");
  if (projection.basis !== null) for (const rider of projection.order.slice(0, 12)) add(rider, "sterk");
  for (const rider of projection.order) if (rider.history.some((p) => p !== null && p <= 3)) add(rider, "podium");
  return out;
}

export type OwnRole = "kopman" | "tempo" | "positie" | "steun";

export const ROLE_LABELS: Record<OwnRole, string> = {
  kopman: "Kopman",
  tempo: "Tempo en volgen",
  positie: "Positie op de klim",
  steun: "Steun",
};

/**
 * Rolvoorstel voor de eigen renners. Kopman: de twee hoogste in de verwachting.
 * Tempo: de twee met de beste 5 minuten (zMAP of ZwiftRacing) die geen kopman zijn.
 * Positie: wie op 5 minuten 3 % of meer onder de mediaan van de ploeg zit; die moet
 * vóór een klim vooraan zitten (kennisbank racen, klimmen in de groep).
 */
export function suggestRoles(
  own: Array<{ zwiftId: number; rating: number | null; fiveMinWkg: number | null }>,
): Map<number, OwnRole> {
  const roles = new Map<number, OwnRole>();
  const byRating = [...own].filter((r) => r.rating !== null).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  for (const r of byRating.slice(0, 2)) roles.set(r.zwiftId, "kopman");
  const fives = own.map((r) => r.fiveMinWkg).filter((v): v is number => v !== null).sort((a, b) => a - b);
  const median = fives.length ? fives[Math.floor((fives.length - 1) / 2)] : null;
  const byFive = [...own].filter((r) => r.fiveMinWkg !== null).sort((a, b) => (b.fiveMinWkg ?? 0) - (a.fiveMinWkg ?? 0));
  let tempo = 0;
  for (const r of byFive) {
    if (tempo >= 2) break;
    if (roles.has(r.zwiftId)) continue;
    roles.set(r.zwiftId, "tempo");
    tempo += 1;
  }
  for (const r of own) {
    if (roles.get(r.zwiftId) === "tempo") continue;
    if (median !== null && r.fiveMinWkg !== null && r.fiveMinWkg <= median * 0.97) roles.set(r.zwiftId, roles.get(r.zwiftId) === "kopman" ? "kopman" : "positie");
    if (!roles.has(r.zwiftId)) roles.set(r.zwiftId, "steun");
  }
  return roles;
}
