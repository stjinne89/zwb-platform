// De ZWBeter-berg: van ruwe waarden naar meters per richting, je hoogte, je keten
// en de drie kaders (wereld, club, jij).
//
// Puur en zonder database: de pagina en de wekelijkse job leveren de waarden aan.
// Een richting zonder gegevens is null en telt nergens mee; er wordt nooit een
// waarde verzonnen.

import {
  CTL_ANCHORS,
  DURABILITY_ANCHORS,
  DURABILITY_MIN_KJ_PER_KG,
  RANGES,
  ZRS_ANCHORS,
  powerAnchors,
  type Anchors,
  type MountainRange,
  type Sex,
} from "./norms";

export const RIDGES = ["explosief", "duurvermogen", "durability", "fitheid", "racen"] as const;
export type Ridge = (typeof RIDGES)[number];

export const RIDGE_LABELS: Record<Ridge, string> = {
  explosief: "Explosief",
  duurvermogen: "Duurvermogen",
  durability: "Durability",
  fitheid: "Fitheid",
  racen: "Racen",
};

// ── Meterschaal ─────────────────────────────────────────────────────────────

/**
 * Meters bij een waarde: lineair tussen de ijkwaarden, en boven de top van de
 * Himalaya lineair door met de helling van het laatste stuk. Daardoor heeft de
 * schaal geen plafond. Onder de nulwaarde is het 0 m.
 */
export function metersFor(anchors: Anchors, value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = anchors.lowerIsBetter ? -1 : 1;
  const points: Array<[number, number]> = [
    [sign * anchors.zero, 0],
    ...anchors.peaks.map((peak, index): [number, number] => [sign * peak, RANGES[index].meters]),
  ];
  const x = sign * value;
  if (x <= points[0][0]) return 0;
  for (let index = 1; index < points.length; index++) {
    const [x1, y1] = points[index];
    if (x <= x1) {
      const [x0, y0] = points[index - 1];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  const [xa, ya] = points[points.length - 2];
  const [xb, yb] = points[points.length - 1];
  return yb + (x - xb) * ((yb - ya) / (xb - xa));
}

// ── Ketens ──────────────────────────────────────────────────────────────────

export type RangePosition = {
  /** De keten waarin je staat. */
  range: MountainRange;
  /** De keten erna; null boven de Everest. */
  next: MountainRange | null;
  /** Meters tot de top van je keten, waarna je in de volgende staat; boven de Everest: 0. */
  toNext: number;
  /** Meters boven de Everest; 0 als je eronder zit. */
  aboveEverest: number;
};

/**
 * Wie onder de top van een keten zit, staat in die keten; wie hem passeert, in
 * de volgende. Boven de Everest blijft het de Himalaya.
 */
export function rangeFor(meters: number): RangePosition {
  const height = Math.max(0, meters);
  const index = RANGES.findIndex((range) => height < range.meters);
  if (index === -1) {
    const top = RANGES[RANGES.length - 1];
    return { range: top, next: null, toNext: 0, aboveEverest: height - top.meters };
  }
  return {
    range: RANGES[index],
    next: RANGES[index + 1] ?? null,
    toNext: RANGES[index].meters - height,
    aboveEverest: 0,
  };
}

// ── Richtingen ──────────────────────────────────────────────────────────────

/** W/kg per duur, uit `rider_power_profiles`. */
export type PowerInput = { s15: number | null; m1: number | null; m5: number | null; m20: number | null };

/** Een vermoeide curve: de beste watts na zoveel voorafgaand werk. */
export type FatigueInput = {
  afterKj: number;
  /** Beste vermogen vers en na het werk, op dezelfde duur (20 of 5 minuten). */
  freshWatts: number;
  fatiguedWatts: number;
};

export type BergInput = {
  sex: Sex | null;
  weightKg: number | null;
  power: PowerInput | null;
  fatigue: FatigueInput[];
  ctl: number | null;
  zrs: number | null;
};

function positive(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Het gemiddelde van de meters van de duren die er zijn. */
function powerMeters(power: PowerInput | null, durations: Array<keyof PowerInput>, sex: Sex | null) {
  if (!power) return null;
  const meters = durations
    .map((duration) => {
      const value = positive(power[duration]);
      return value == null ? null : metersFor(powerAnchors(duration, sex), value);
    })
    .filter((value): value is number => value != null);
  return mean(meters);
}

/**
 * Verval in procenten per 10 kJ/kg, gemiddeld over de curves na genoeg werk.
 * Meer vermogen na het werk dan vers (een vers record later in de rit) telt als
 * geen verval.
 */
export function durabilityDecline(fatigue: FatigueInput[], weightKg: number | null): number | null {
  const weight = positive(weightKg);
  if (!weight) return null;
  const declines = fatigue
    .map((curve) => {
      const kjPerKg = curve.afterKj / weight;
      const fresh = positive(curve.freshWatts);
      const fatigued = positive(curve.fatiguedWatts);
      if (!fresh || !fatigued || kjPerKg < DURABILITY_MIN_KJ_PER_KG) return null;
      const lossPct = Math.max(0, (1 - fatigued / fresh) * 100);
      return lossPct / (kjPerKg / 10);
    })
    .filter((value): value is number => value != null);
  return mean(declines);
}

/** Meters per richting tegen de wereld; null waar de gegevens ontbreken. */
export function ridgeMeters(input: BergInput): Record<Ridge, number | null> {
  const decline = durabilityDecline(input.fatigue, input.weightKg);
  const ctl = input.ctl != null && Number.isFinite(input.ctl) && input.ctl >= 0 ? input.ctl : null;
  const zrs = positive(input.zrs);
  return {
    explosief: powerMeters(input.power, ["s15", "m1"], input.sex),
    duurvermogen: powerMeters(input.power, ["m5", "m20"], input.sex),
    durability: decline == null ? null : metersFor(DURABILITY_ANCHORS, decline),
    fitheid: ctl == null ? null : metersFor(CTL_ANCHORS, ctl),
    racen: zrs == null ? null : metersFor(ZRS_ANCHORS, zrs),
  };
}

/** Zo weinig richtingen zijn te weinig om een hoogte op te baseren. */
export const MIN_RIDGES_FOR_HEIGHT = 2;

/** Je hoogte: het gemiddelde van de richtingen die er zijn, of null bij te weinig. */
export function heightFor(ridges: Record<Ridge, number | null>): number | null {
  const present = RIDGES.map((ridge) => ridges[ridge]).filter((value): value is number => value != null);
  if (present.length < MIN_RIDGES_FOR_HEIGHT) return null;
  return Math.round(mean(present)!);
}

// ── Consistentie ────────────────────────────────────────────────────────────

/** Een week telt als actief vanaf twee ritten of anderhalf uur. */
export const ACTIVE_WEEK = { rides: 2, minutes: 90 } as const;
export const CONSISTENCY_WEEKS = 12;
/** Langer dan dit zonder rit is uitval. */
export const GAP_DAYS = 14;

export type RideDay = { day: string; minutes: number };

function dayNumber(dayKey: string) {
  return Math.floor(Date.parse(`${dayKey}T12:00:00Z`) / 86_400_000);
}

/**
 * Consistentie over de laatste twaalf weken tot en met `today`: het aandeel
 * actieve weken, met een aftrek van een vijfde bij uitval van meer dan twee
 * weken. 0 tot 1; geeft geen hoogte maar de breedte van de voet van de berg.
 */
export function consistency(rides: RideDay[], today: string): number {
  const end = dayNumber(today);
  const start = end - CONSISTENCY_WEEKS * 7 + 1;
  const weeks = Array.from({ length: CONSISTENCY_WEEKS }, () => ({ rides: 0, minutes: 0 }));
  const days = new Set<number>();
  for (const ride of rides) {
    const day = dayNumber(ride.day);
    if (day < start || day > end) continue;
    const week = weeks[Math.floor((day - start) / 7)];
    week.rides += 1;
    week.minutes += Math.max(0, ride.minutes);
    days.add(day);
  }
  const active = weeks.filter((week) => week.rides >= ACTIVE_WEEK.rides || week.minutes >= ACTIVE_WEEK.minutes).length;

  const sorted = [...days].sort((a, b) => a - b);
  let longestGap = sorted.length === 0 ? CONSISTENCY_WEEKS * 7 : sorted[0] - start;
  for (let index = 1; index < sorted.length; index++) longestGap = Math.max(longestGap, sorted[index] - sorted[index - 1] - 1);
  if (sorted.length > 0) longestGap = Math.max(longestGap, end - sorted[sorted.length - 1]);

  const share = active / CONSISTENCY_WEEKS;
  return Math.round((longestGap > GAP_DAYS ? share * 0.8 : share) * 100) / 100;
}

// ── Kaders ──────────────────────────────────────────────────────────────────

/**
 * Percentiel binnen de club: het aandeel deelnemers dat lager zit, met de helft
 * van wie gelijk zit. `others` zijn de andere deelnemers, niet het lid zelf.
 */
export function clubPercentile(value: number | null, others: Array<number | null>): number | null {
  if (value == null) return null;
  const field = others.filter((other): other is number => other != null);
  if (field.length === 0) return null;
  const below = field.filter((other) => other < value).length;
  const equal = field.filter((other) => other === value).length;
  return Math.round(((below + equal / 2) / field.length) * 100);
}

export type HistoryPoint = { week: string; meters: number | null };

/**
 * Jij tegen jezelf: verschil met vier weken geleden en met het beste van het
 * afgelopen jaar. `history` is per week, oud naar nieuw, met de huidige week als
 * laatste.
 */
export function selfFrame(history: HistoryPoint[]): { delta4w: number | null; best: number | null; ofBest: number | null } {
  const known = history.filter((point): point is { week: string; meters: number } => point.meters != null);
  const now = known.at(-1);
  if (!now) return { delta4w: null, best: null, ofBest: null };
  const lastYear = known.slice(-52);
  const best = Math.max(...lastYear.map((point) => point.meters));
  const before = history.length >= 5 ? history[history.length - 5].meters : null;
  return {
    delta4w: before == null ? null : Math.round(now.meters - before),
    best: Math.round(best),
    ofBest: best > 0 ? Math.round((now.meters / best) * 100) : null,
  };
}
