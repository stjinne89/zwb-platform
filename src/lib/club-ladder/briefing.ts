// Het racebriefje van een ladderrace: verwachte uitslag, telling en wie je volgt.
// Puur: geen I/O; event-briefing.ts laadt.
//
// Club Ladder volgens het race book (gelezen 28 september 2026): 5 tegen 5, alleen
// de finish telt, punten 10‥1 over de tien renners, en bij gelijke stand verliest
// de uitdager. Eén tegenstander inhalen is dus altijd 2 punten verschil (wij +1,
// zij −1), waar in de uitslag ook.

import type { CheatRule, Powerup } from "@/lib/race-briefing/rules";
import type { WatchLine } from "@/lib/race-briefing/sheet";
import { cleanRiderName, type OwnRole } from "@/lib/race-briefing/field";
import { DURATION_LABELS } from "./advice";
import type { LadderMatchup, MatchupRider } from "./matchup";
import type { DurationWeights, PowerDuration } from "./routes";
import { DURATIONS, type PowerWkg } from "./team-power";

export const LADDER_POINTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const LADDER_TEAM_SIZE = 5;

const LADDER_POWERUPS: Record<string, Powerup> = {
  feather: "veer",
  draft: "draft boost",
  aero: "aerohelm",
  burrito: "burrito",
  ghost: "spook",
  steamroller: "steamroller",
  anvil: "anvil",
};

/** Powerups van de wedstrijd, uit de omschrijving die de sync maakt ("Powerups: Feather, Draft"); zonder kans. */
export function ladderPowerups(description: string | null): Array<{ powerup: Powerup; percent: number }> {
  const list = description?.match(/^Powerups:\s*(.+)$/m)?.[1] ?? "";
  const found = list
    .split(",")
    .map((name) => LADDER_POWERUPS[name.trim().toLowerCase()])
    .filter((p): p is Powerup => Boolean(p));
  return [...new Set(found)].map((powerup) => ({ powerup, percent: 0 }));
}

export type LadderBriefingRider = {
  zwiftId: number;
  name: string;
  own: boolean;
  /** Sterkte op dit parcours tegenover het gemiddelde van de tien; null zonder vermogen. */
  rating: number | null;
  wkg: PowerWkg | null;
  source: MatchupRider["source"];
  racingScore: number | null;
};

export type LadderPlace = LadderBriefingRider & { place: number; points: number };

export type LadderProjection = {
  /** Verwachte volgorde over de streep; renners zonder vermogen achteraan, zonder punten. */
  order: LadderPlace[];
  ours: number;
  theirs: number;
  /** Winnen we met deze verwachting, met de regel dat de uitdager gelijk verliest. */
  win: boolean;
  /** Zoveel tegenstanders moeten we inhalen om te winnen; 0 als we al winnen. */
  overtakesNeeded: number;
  /** Zoveel plekken mogen we kwijtraken en nog winnen; 0 als we verliezen. */
  spare: number;
};

/** Zonder parcours telt elke duur even zwaar. */
const EQUAL_WEIGHTS: DurationWeights = { s15: 0.25, m1: 0.25, m5: 0.25, m20: 0.25 };

/** De duur die op dit parcours het zwaarst telt. */
export function keyDuration(weights: DurationWeights | null): PowerDuration {
  const w = weights ?? EQUAL_WEIGHTS;
  return DURATIONS.reduce((best, d) => (w[d] > w[best] ? d : best), "m5" as PowerDuration);
}

/**
 * Sterkte per renner op dit parcours: per duur zijn W/kg tegenover het
 * meetkundig gemiddelde van de renners die die duur hebben, gewogen naar het
 * parcours. Zo telt een ontbrekende duur niet als zwak en weegt 15 s (±10 W/kg)
 * niet zwaarder dan 20 min (±4 W/kg). 1 is gemiddeld voor deze tien.
 */
export function routeRatings(riders: Array<{ zwiftId: number; wkg: PowerWkg | null }>, weights: DurationWeights | null): Map<number, number | null> {
  const w = weights ?? EQUAL_WEIGHTS;
  const reference = new Map<PowerDuration, number>();
  for (const d of DURATIONS) {
    const logs = riders.map((r) => r.wkg?.[d]).filter((v): v is number => v != null && v > 0).map(Math.log);
    if (logs.length > 0) reference.set(d, logs.reduce((a, b) => a + b, 0) / logs.length);
  }
  const out = new Map<number, number | null>();
  for (const rider of riders) {
    let sum = 0;
    let weightSum = 0;
    for (const d of DURATIONS) {
      const value = rider.wkg?.[d];
      const ref = reference.get(d);
      if (value == null || value <= 0 || ref === undefined || !w[d]) continue;
      sum += w[d] * (Math.log(value) - ref);
      weightSum += w[d];
    }
    out.set(rider.zwiftId, weightSum > 0 ? Math.exp(sum / weightSum) : null);
  }
  return out;
}

/** Beide kanten uit de matchup, met een sterkte op dit parcours. */
export function ladderRiders(matchup: LadderMatchup, weights: DurationWeights | null): LadderBriefingRider[] {
  const rows = [
    ...matchup.ours.riders.map((rider) => ({ rider, own: true })),
    ...matchup.theirs.riders.map((rider) => ({ rider, own: false })),
  ];
  const ratings = routeRatings(rows.map(({ rider }) => rider), weights);
  return rows.map(({ rider, own }) => ({
    zwiftId: rider.zwiftId,
    name: cleanRiderName(rider.name),
    own,
    rating: ratings.get(rider.zwiftId) ?? null,
    wkg: rider.wkg,
    source: rider.source,
    racingScore: rider.racingScore,
  }));
}

function score(order: Array<{ own: boolean; points: number }>) {
  let ours = 0;
  let theirs = 0;
  for (const row of order) {
    if (row.own) ours += row.points;
    else theirs += row.points;
  }
  return { ours, theirs };
}

const wins = (ours: number, theirs: number, challenger: boolean) => ours > theirs || (ours === theirs && !challenger);

/**
 * Verwachte uitslag: op sterkte, punten 10‥1. Een verwachting, geen
 * voorspelling: tactiek, dagvorm en wie er echt start, ontbreken.
 */
export function projectLadder(riders: LadderBriefingRider[], challenger: boolean): LadderProjection {
  const sorted = [...riders].sort((a, b) => {
    if (a.rating === null && b.rating === null) return a.name.localeCompare(b.name, "nl");
    if (a.rating === null) return 1;
    if (b.rating === null) return -1;
    return b.rating - a.rating;
  });
  const order = sorted.map((rider, index) => ({ ...rider, place: index + 1, points: rider.rating === null ? 0 : (LADDER_POINTS[index] ?? 0) }));
  const { ours, theirs } = score(order);
  const win = wins(ours, theirs, challenger);
  // Elke tegenstander die we inhalen (of die ons inhaalt) verschuift 2 punten.
  let overtakesNeeded = 0;
  while (!wins(ours + 2 * overtakesNeeded, theirs - 2 * overtakesNeeded, challenger) && overtakesNeeded < LADDER_POINTS.length) overtakesNeeded += 1;
  let spare = 0;
  while (win && wins(ours - 2 * (spare + 1), theirs + 2 * (spare + 1), challenger) && spare < LADDER_POINTS.length) spare += 1;
  return { order, ours, theirs, win, overtakesNeeded, spare };
}

export type LadderRole = {
  role: Extract<OwnRole, "voorin" | "brug" | "aanhaken">;
  /** De tegenstander die vlak voor je verwacht wordt: inhalen is 2 punten. */
  ahead: string | null;
  /** De tegenstander vlak achter je: die moet erachter blijven. */
  behind: string | null;
};

const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

/**
 * Rollen op de ladder: geen kopman, want elke plek telt even zwaar voor de
 * ploeg. Wie in de voorste helft verwacht wordt, rijdt voorin en sprint om elke
 * plek; wie in de achterste helft verwacht wordt, haakt aan en zit vóór een klim
 * vooraan. Met drie of meer van ons en iemand achterin rijdt de sterkste van ons
 * gaten dicht: een ploeggenoot die bij de groep blijft, wint meer plekken dan
 * de sterkste er zelf verliest. Per renner de tegenstander vlak voor en vlak
 * achter hem in de verwachting, want daar zitten de 2 punten.
 */
export function ladderRoles(projection: LadderProjection): Map<number, LadderRole> {
  const rated = projection.order.filter((row) => row.rating !== null);
  const half = Math.ceil(rated.length / 2);
  const ownRated = rated.filter((row) => row.own);
  const anyBehind = ownRated.some((row) => row.place > half);
  const bridge = ownRated.length >= 3 && anyBehind ? ownRated[0].zwiftId : null;
  const out = new Map<number, LadderRole>();
  for (const row of projection.order.filter((r) => r.own)) {
    if (row.rating === null) {
      out.set(row.zwiftId, { role: "aanhaken", ahead: null, behind: null });
      continue;
    }
    const ahead = rated.filter((r) => !r.own && r.place < row.place).at(-1);
    const behind = rated.find((r) => !r.own && r.place > row.place);
    out.set(row.zwiftId, {
      role: row.zwiftId === bridge ? "brug" : row.place <= half ? "voorin" : "aanhaken",
      ahead: ahead ? firstName(ahead.name) : null,
      behind: behind ? firstName(behind.name) : null,
    });
  }
  return out;
}

const plural = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;

/** "Onthouden" op het racebriefje van een ladderrace. */
export function ladderCheatRules(input: { challenger: boolean | null; opponent: string; projection: LadderProjection | null }): CheatRule[] {
  const { challenger, opponent, projection } = input;
  const rules: CheatRule[] = [
    { value: "1 plek inhalen", text: "2 punten verschil, waar je ook rijdt", key: true },
    { value: "10 · 9 … 1", text: "alleen de streep telt, 5 tegen 5" },
  ];
  if (challenger === true) rules.push({ value: "gelijk = verlies", text: `wij dagen ${opponent} uit: winnen moet` });
  if (challenger === false) rules.push({ value: "gelijk = winst", text: `${opponent} daagt ons uit: gelijk is genoeg` });
  // Een stand met een halve opstelling zegt niets: pas met vijf tegen vijf.
  const counted = projection?.order.filter((row) => row.rating !== null) ?? [];
  const full = (own: boolean) => counted.filter((row) => row.own === own).length >= LADDER_TEAM_SIZE;
  if (projection && full(true) && full(false)) {
    rules.push({
      value: `verwacht ${projection.ours}–${projection.theirs}`,
      text: projection.win
        ? projection.spare > 0
          ? `${plural(projection.spare, "plek", "plekken")} speling`
          : "geen plek speling"
        : `${plural(projection.overtakesNeeded, "tegenstander", "tegenstanders")} inhalen`,
    });
  }
  return rules;
}

const nl1 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** De sterkste tegenstanders, met hun W/kg op de duur die hier het zwaarst telt. */
export function ladderWatch(projection: LadderProjection, weights: DurationWeights | null, max = 3): WatchLine[] {
  const key = keyDuration(weights);
  return projection.order
    .filter((row) => !row.own && row.rating !== null)
    .slice(0, max)
    .map((row) => {
      const value = row.wkg?.[key];
      return { name: row.name, note: [`verwacht ${row.place}e`, value != null ? `${DURATION_LABELS[key]} ${nl1.format(value)} w/kg` : null].filter(Boolean).join(" · ") };
    });
}
