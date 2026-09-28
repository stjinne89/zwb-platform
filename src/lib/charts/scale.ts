export type Scale = {
  /** Waarde -> positie in de SVG. */
  forward: (value: number) => number;
  /** Positie in de SVG -> waarde (voor hover). */
  invert: (position: number) => number;
};

type ScaleInput = {
  domain: [number, number];
  range: [number, number];
};

export function linearScale({ domain, range }: ScaleInput): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  return {
    forward: (value) => (span === 0 ? r0 : r0 + ((value - d0) / span) * (r1 - r0)),
    invert: (position) =>
      r1 === r0 ? d0 : d0 + ((position - r0) / (r1 - r0)) * span,
  };
}

/** Logaritmische schaal; domeinwaarden moeten groter dan 0 zijn. */
export function logScale({ domain, range }: ScaleInput): Scale {
  const d0 = Math.max(domain[0], Number.EPSILON);
  const d1 = Math.max(domain[1], d0 * 1.0001);
  const [r0, r1] = range;
  const logSpan = Math.log(d1) - Math.log(d0);
  return {
    forward: (value) =>
      r0 + ((Math.log(Math.max(value, Number.EPSILON)) - Math.log(d0)) / logSpan) * (r1 - r0),
    invert: (position) =>
      Math.exp(Math.log(d0) + ((position - r0) / (r1 - r0)) * logSpan),
  };
}

/** Hoogste positieve waarde, afgerond naar boven op een veelvoud van step. */
export function positiveMax(values: Array<number | null>, fallback: number, step = 10) {
  const max = Math.max(
    ...values.flatMap((value) => (value != null && value > 0 ? [value] : [])),
    fallback,
  );
  return Math.ceil(max / step) * step;
}

/** Grootste absolute waarde, afgerond naar boven op een veelvoud van step. */
export function absMax(values: Array<number | null>, fallback: number, step = 5) {
  const max = Math.max(
    ...values.flatMap((value) => (value != null ? [Math.abs(value)] : [])),
    fallback,
  );
  return Math.ceil(max / step) * step;
}

const NICE_MULTIPLIERS = [1, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** Kleinste "ronde" stap (1, 2, 2,5, 3, 4, 5, 6, 8 × 10ⁿ) die minstens raw is. */
export function niceStep(raw: number) {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const multiplier = NICE_MULTIPLIERS.find((m) => m * power >= raw - 1e-9) ?? 10;
  return multiplier * power;
}

export type ZeroAlignedAxes = {
  /** Linkeras: ondergrens (0 of negatief), bovengrens en stap. */
  min: number;
  max: number;
  step: number;
  /** Tickwaarden op de linkeras, van min tot max. */
  ticks: number[];
  /** Rechteras: loopt van 0 (op de nullijn links) tot secondaryMax. */
  secondaryMax: number;
  secondaryStep: number;
};

/**
 * Twee assen in één grafiek: links een reeks die onder nul kan (CTL, ATL,
 * Form), rechts een reeks vanaf nul (Load). De nul van de rechteras ligt op
 * de nullijn van de linkeras en elke rechtertick valt op een linkergridlijn,
 * zodat er maar één set hulplijnen is.
 */
export function zeroAlignedAxes({
  primary,
  secondary,
  intervals,
  primaryFloor = 10,
  secondaryFloor = 10,
}: {
  primary: Array<number | null>;
  secondary: Array<number | null>;
  /** Gewenst aantal intervallen op de linkeras. */
  intervals: number;
  primaryFloor?: number;
  secondaryFloor?: number;
}): ZeroAlignedAxes {
  const values = primary.filter((value): value is number => value != null && Number.isFinite(value));
  const rawMax = Math.max(primaryFloor, ...values);
  const rawMin = Math.min(0, ...values);
  const step = niceStep((rawMax - rawMin) / Math.max(1, intervals));
  const stepsUp = Math.max(1, Math.ceil(rawMax / step));
  const stepsDown = rawMin < 0 ? Math.ceil(-rawMin / step) : 0;

  const loads = secondary.filter((value): value is number => value != null && Number.isFinite(value));
  const secondaryStep = niceStep(Math.max(secondaryFloor, ...loads) / stepsUp);

  return {
    min: stepsDown === 0 ? 0 : -stepsDown * step,
    max: stepsUp * step,
    step,
    ticks: Array.from({ length: stepsDown + stepsUp + 1 }, (_, i) => (i - stepsDown) * step || 0),
    secondaryMax: stepsUp * secondaryStep,
    secondaryStep,
  };
}
