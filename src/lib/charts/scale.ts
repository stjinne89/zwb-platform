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
