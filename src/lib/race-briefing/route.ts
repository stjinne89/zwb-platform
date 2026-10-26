// De beslissende stukken van een route voor de racebriefing.
//
// Uit het profiel van het pacingplan (segmenten van 100 m met een gradiënt) en de
// genoemde Zwift-segmenten. Puur: geen I/O.
//
// Wat we zoeken (kennisbank racen, "Klimmen in de groep en over de top"):
// - klimmen: daar vallen de gaten;
// - een afdaling die direct overgaat in een klim: in de afdaling gaat het veld op
//   een lint, en op de klim breekt het;
// - de finale: een klim kort voor de streep, of een vlakke aankomst;
// - de laatste boog: daar krijg je de laatste powerup;
// - de sprints en KOM's: in een puntenrace leveren die FAL- en FTS-punten op.

import type { PacingAccent, PacingSegment } from "@/lib/pacing/route-profile";

/** Kleinere schommelingen dan dit tellen niet als een nieuwe klim of afdaling. */
const HYSTERESIS_M = 4;
const MIN_CLIMB_GAIN_M = 15;
const MIN_CLIMB_GRADIENT = 0.02;
const MIN_DESCENT_DROP_M = 10;
/** Tussen het eind van de afdaling en het begin van de klim. */
const MAX_DESCENT_GAP_KM = 0.3;
/** Een klim waarvan de top zo dicht bij de streep ligt, is de finale. */
const FINALE_WINDOW_KM = 3;
/** Vlakke stukken aan het begin en eind van een klim: minder steil dan dit. */
const FLAT_EDGE_GRADIENT = 0.01;
/** Een vlak stuk binnen een klim van minstens deze lengte splitst hem in tweeën. */
const SPLIT_FLAT_KM = 0.5;
const MIN_DESCENT_GRADIENT = 0.015;
/**
 * Tunnels (de subways van New York) staan in het profiel als een sprong van een
 * tot drie stappen tussen twee vlakke stukken: de hoogte uit de Strava-stream
 * springt bij de in- en uitgang. Zo'n sprong telt niet als klim of afdaling.
 * Een echte klim na een tunneluitgang (Flatbush, Green to Screen) loopt na de
 * sprong door en blijft dus staan.
 */
const TUNNEL_STEP_GRADIENT = 0.06;
const TUNNEL_RUN_GRADIENT = 0.015;
const TUNNEL_MAX_STEPS = 3;
const TUNNEL_SIDE_STEPS = 3;
const TUNNEL_SIDE_GRADIENT = 0.01;

export type BriefingClimb = {
  startKm: number;
  endKm: number;
  gainM: number;
  avgGradient: number;
  /** Steilste 300 m (of de hele klim als die korter is). */
  maxGradient: number;
  /** Naam van een Zwift-segment dat de klim overlapt, anders null. */
  name: string | null;
};

export type BriefingDescent = { startKm: number; endKm: number; dropM: number };

/** Een Zwift-sprint of -KOM; ligt hij meer dan eens op de route, dan per passage. */
export type BriefingSegment = {
  kind: "sprint" | "kom";
  startKm: number;
  endKm: number;
  name: string;
  /** 1 bij de eerste passage, 2 bij de tweede; alleen te tonen als `passes` > 1. */
  pass: number;
  passes: number;
};

export type DescentIntoClimb = { descent: BriefingDescent; climb: BriefingClimb };

export type BriefingFinale =
  | { kind: "climb"; climb: BriefingClimb; runInKm: number }
  | { kind: "flat"; flatKm: number };

export type RouteKeyPoints = {
  totalKm: number;
  climbs: BriefingClimb[];
  descentsIntoClimbs: DescentIntoClimb[];
  /** De klim met de meeste hoogtemeters; bij gelijke stand de steilste. */
  hardestClimb: BriefingClimb | null;
  /** De eerste klim in de eerste 8 km: daar valt vaak de eerste selectie. */
  earlyClimb: BriefingClimb | null;
  finale: BriefingFinale;
  /** De sprints en KOM's van de route: in een puntenrace leveren ze FAL- en FTS-punten op. */
  segments: BriefingSegment[];
  /** Km van de laatste boog vóór de streep (eind van een segment of een rondestreep). */
  lastArchKm: number | null;
};

export type Point = { km: number; m: number };

/** Gradiënten zonder tunnelsprongen (zie TUNNEL_STEP_GRADIENT). */
export function withoutTunnelSteps(gradients: number[]): number[] {
  const out = [...gradients];
  const sideFlat = (from: number, to: number) => {
    const slice = gradients.slice(Math.max(0, from), Math.max(0, Math.min(gradients.length, to)));
    if (slice.length === 0) return true;
    return Math.abs(slice.reduce((sum, g) => sum + g, 0) / slice.length) <= TUNNEL_SIDE_GRADIENT;
  };
  let i = 0;
  while (i < gradients.length) {
    const sign = Math.sign(gradients[i]);
    if (Math.abs(gradients[i]) < TUNNEL_RUN_GRADIENT) {
      i += 1;
      continue;
    }
    let end = i;
    while (end + 1 < gradients.length && Math.sign(gradients[end + 1]) === sign && Math.abs(gradients[end + 1]) >= TUNNEL_RUN_GRADIENT) end += 1;
    const steps = end - i + 1;
    const hasJump = gradients.slice(i, end + 1).some((g) => Math.abs(g) >= TUNNEL_STEP_GRADIENT);
    if (steps <= TUNNEL_MAX_STEPS && hasJump && sideFlat(i - TUNNEL_SIDE_STEPS, i) && sideFlat(end + 1, end + 1 + TUNNEL_SIDE_STEPS)) {
      for (let j = i; j <= end; j += 1) out[j] = 0;
    }
    i = end + 1;
  }
  return out;
}

/** Het profiel als punten (km, m) zonder tunnelsprongen; ook voor de getekende schets. */
export function profilePoints(segments: PacingSegment[]): Point[] {
  const gradients = withoutTunnelSteps(segments.map((s) => s.gradient));
  const points: Point[] = [{ km: 0, m: 0 }];
  let km = 0;
  let m = 0;
  segments.forEach((segment, i) => {
    km += segment.distanceM / 1000;
    m += gradients[i] * segment.distanceM;
    points.push({ km, m });
  });
  return points;
}

/** Splitst een stijging (dir 1) of daling (dir -1) op vlakke stukken van SPLIT_FLAT_KM of langer. */
function splitOnFlats(points: Point[], from: number, to: number, dir: 1 | -1): Array<[number, number]> {
  const parts: Array<[number, number]> = [];
  let partStart = from;
  let i = from;
  while (i < to) {
    let j = i;
    while (j < to && dir * gradientBetween(points, j, j + 1) < FLAT_EDGE_GRADIENT) j += 1;
    if (j > i && points[j].km - points[i].km >= SPLIT_FLAT_KM) {
      if (i > partStart) parts.push([partStart, i]);
      partStart = j;
      i = j;
    } else {
      i = Math.max(j, i + 1);
    }
  }
  if (to > partStart) parts.push([partStart, to]);
  return parts;
}

/** Afwisselend dal en top, met een drempel tegen ruis. */
function turningPoints(points: Point[]): number[] {
  const last = points.length - 1;
  if (last < 1) return [0];
  const turns = [0];
  let direction: 1 | -1 | 0 = 0;
  let extreme = 0;
  for (let i = 1; i <= last; i += 1) {
    const m = points[i].m;
    if (direction === 0) {
      if (m - points[0].m >= HYSTERESIS_M) direction = 1;
      else if (points[0].m - m >= HYSTERESIS_M) direction = -1;
      if (direction !== 0) extreme = i;
    } else if (direction === 1) {
      if (m >= points[extreme].m) extreme = i;
      else if (points[extreme].m - m >= HYSTERESIS_M) {
        turns.push(extreme);
        direction = -1;
        extreme = i;
      }
    } else if (m <= points[extreme].m) {
      extreme = i;
    } else if (m - points[extreme].m >= HYSTERESIS_M) {
      turns.push(extreme);
      direction = 1;
      extreme = i;
    }
  }
  if (extreme !== turns.at(-1)) turns.push(extreme);
  if (turns.at(-1) !== last) turns.push(last);
  return turns;
}

function gradientBetween(points: Point[], from: number, to: number): number {
  const run = (points[to].km - points[from].km) * 1000;
  return run > 0 ? (points[to].m - points[from].m) / run : 0;
}

/** Vlakke aanloop en uitloop eraf, zodat lengte en gradiënt kloppen. */
function trimFlatEdges(points: Point[], from: number, to: number, dir: 1 | -1): [number, number] {
  let start = from;
  let end = to;
  while (end - start > 2 && dir * gradientBetween(points, start, start + 1) < FLAT_EDGE_GRADIENT) start += 1;
  while (end - start > 2 && dir * gradientBetween(points, end - 1, end) < FLAT_EDGE_GRADIENT) end -= 1;
  return [start, end];
}

/**
 * Is een stijging gemiddeld te flauw, haal dan stap voor stap de flauwste rand
 * eraf tot de steile kern overblijft (The Hill: een flauwe aanloop van 500 m).
 */
function tightenClimb(points: Point[], from: number, to: number): [number, number] {
  let start = from;
  let end = to;
  while (end - start > 2 && gradientBetween(points, start, end) < MIN_CLIMB_GRADIENT && points[end].m - points[start].m >= MIN_CLIMB_GAIN_M) {
    if (gradientBetween(points, start, start + 1) <= gradientBetween(points, end - 1, end)) start += 1;
    else end -= 1;
  }
  return [start, end];
}

function steepest(points: Point[], from: number, to: number): number {
  let best = gradientBetween(points, from, to);
  for (let i = from; i < to; i += 1) {
    let j = i;
    while (j < to && points[j].km - points[i].km < 0.3) j += 1;
    if (points[j].km - points[i].km >= 0.3) best = Math.max(best, gradientBetween(points, i, j));
  }
  return best;
}

function nameFor(accents: PacingAccent[], startKm: number, endKm: number): string | null {
  let best: { name: string; overlap: number } | null = null;
  for (const accent of accents) {
    const overlap = Math.min(endKm, accent.endKm) - Math.max(startKm, accent.startKm);
    if (overlap > 0 && (!best || overlap > best.overlap)) best = { name: accent.name, overlap };
  }
  return best?.name ?? null;
}

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

export function routeKeyPoints(input: {
  segments: PacingSegment[];
  accents: PacingAccent[];
  totalKm: number;
  /** Ronden: elke rondestreep is ook een boog met powerups. */
  laps?: number | null;
}): RouteKeyPoints {
  const points = profilePoints(input.segments);
  // Het pacingplan zet er eigen klimmen bij ("Klim km 26.6", id klim-…); die
  // hebben geen boog en geen echte naam.
  const zwiftAccents = input.accents.filter((a) => !a.id.startsWith("klim-"));
  const totalKm = points.at(-1)?.km ?? input.totalKm;
  const turns = turningPoints(points);

  const climbs: BriefingClimb[] = [];
  const descents: BriefingDescent[] = [];
  for (let t = 0; t + 1 < turns.length; t += 1) {
    const from = turns[t];
    const to = turns[t + 1];
    const change = points[to].m - points[from].m;
    if (change >= MIN_CLIMB_GAIN_M) {
      for (const [partFrom, partTo] of splitOnFlats(points, from, to, 1)) {
        const [start, end] = tightenClimb(points, ...trimFlatEdges(points, partFrom, partTo, 1));
        const gainM = points[end].m - points[start].m;
        const avgGradient = gradientBetween(points, start, end);
        if (gainM < MIN_CLIMB_GAIN_M || avgGradient < MIN_CLIMB_GRADIENT) continue;
        climbs.push({
          startKm: round(points[start].km),
          endKm: round(points[end].km),
          gainM: Math.round(gainM),
          avgGradient: round(avgGradient, 3),
          maxGradient: round(steepest(points, start, end), 3),
          name: nameFor(zwiftAccents.filter((a) => a.kind === "climb"), points[start].km, points[end].km),
        });
      }
    } else if (-change >= MIN_DESCENT_DROP_M) {
      for (const [partFrom, partTo] of splitOnFlats(points, from, to, -1)) {
        const [start, end] = trimFlatEdges(points, partFrom, partTo, -1);
        const dropM = points[start].m - points[end].m;
        if (dropM < MIN_DESCENT_DROP_M || -gradientBetween(points, start, end) < MIN_DESCENT_GRADIENT) continue;
        descents.push({ startKm: round(points[start].km), endKm: round(points[end].km), dropM: Math.round(dropM) });
      }
    }
  }

  const descentsIntoClimbs: DescentIntoClimb[] = [];
  for (const climb of climbs) {
    const descent = descents.find(
      (d) => d.endKm <= climb.startKm + 0.05 && climb.startKm - d.endKm <= MAX_DESCENT_GAP_KM,
    );
    if (descent) descentsIntoClimbs.push({ descent, climb });
  }

  const hardestClimb =
    [...climbs].sort((a, b) => b.gainM - a.gainM || b.avgGradient - a.avgGradient)[0] ?? null;
  const earlyClimb = climbs.find((c) => c.startKm <= 8) ?? null;

  const lastClimb = climbs.at(-1);
  const finale: BriefingFinale =
    lastClimb && totalKm - lastClimb.endKm <= FINALE_WINDOW_KM
      ? { kind: "climb", climb: lastClimb, runInKm: round(totalKm - lastClimb.endKm) }
      : { kind: "flat", flatKm: round(totalKm - (lastClimb?.endKm ?? 0)) };

  const sorted = [...zwiftAccents].sort((a, b) => a.startKm - b.startKm);
  const segments: BriefingSegment[] = sorted.map((a) => {
    const same = sorted.filter((b) => b.name === a.name);
    const kind = a.kind === "sprint" ? "sprint" : "kom";
    return { kind, startKm: round(a.startKm), endKm: round(a.endKm), name: a.name, pass: same.indexOf(a) + 1, passes: same.length };
  });

  const laps = Math.max(1, Math.round(input.laps ?? 1));
  const archKms = zwiftAccents.map((a) => a.endKm).filter((km) => km < totalKm - 0.05);
  if (laps > 1) {
    const lapKm = totalKm / laps;
    for (let lap = 1; lap < laps; lap += 1) archKms.push(lap * lapKm);
  }
  const lastArchKm = archKms.length ? round(Math.max(...archKms)) : null;

  return { totalKm: round(totalKm), climbs, descentsIntoClimbs, hardestClimb, earlyClimb, finale, segments, lastArchKm };
}

/**
 * "Manhattan Sprint" → "sprint Manhattan", "Jarvis KOM" → "KOM Jarvis"; met de
 * passage erbij als hij vaker op de route ligt en `withPass` niet uit staat.
 */
export function segmentLabel(segment: BriefingSegment, withPass = true): string {
  const short = segment.name.replace(/\s*\b(sprint|kom|qom)\b\s*/gi, " ").replace(/^the\s+/i, "").trim() || segment.name;
  const pass = withPass && segment.passes > 1 ? ` (${segment.pass}e)` : "";
  return `${segment.kind === "sprint" ? "sprint" : "KOM"} ${short}${pass}`;
}

/** Overlapt een Zwift-segment deze klim? */
export function overlaps(segment: BriefingSegment, climb: BriefingClimb): boolean {
  return Math.min(segment.endKm, climb.endKm) - Math.max(segment.startKm, climb.startKm) > 0;
}

/**
 * Hoe lang de kop van het veld over een klim doet, voor de orde van grootte.
 * Vermogen per categorie zoals een kopgroep een korte klim rijdt (eigen keuze,
 * geen meting): A 5, B 4,5, C 3,8, D 3 W/kg; renner plus fiets 80 kg, CdA 0,3.
 */
export function climbSeconds(climb: BriefingClimb, category: string | null): number {
  const wkg = { A: 5, B: 4.5, C: 3.8, D: 3 }[category?.toUpperCase().charAt(0) ?? "B"] ?? 4.5;
  const mass = 80;
  const power = wkg * 72;
  const grade = climb.avgGradient;
  // P = m g v (grade + crr) + ½ ρ CdA v³, opgelost met bisectie.
  let lo = 0.5;
  let hi = 25;
  for (let i = 0; i < 40; i += 1) {
    const v = (lo + hi) / 2;
    const p = mass * 9.81 * v * (grade + 0.004) + 0.5 * 1.2 * 0.3 * v ** 3;
    if (p > power) hi = v;
    else lo = v;
  }
  return Math.round(((climb.endKm - climb.startKm) * 1000) / lo);
}
