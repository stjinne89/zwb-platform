export type IntervalsPowerCurvePoint = {
  seconds: number;
  watts: number;
  wattsPerKg?: number | null;
  activityId?: string | null;
  activityDate?: string | null;
  weightKg?: number | null;
  wkgActivityId?: string | null;
  wkgActivityDate?: string | null;
  wkgWeightKg?: number | null;
};

function optionalPositiveNumber(value: unknown, max: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= max ? number : null;
}

export function normalizePowerCurvePoints(
  points: IntervalsPowerCurvePoint[],
): IntervalsPowerCurvePoint[] {
  let normalized = Array.from(
    points
      .filter(
        (point) =>
          Number.isFinite(point.seconds) &&
          point.seconds >= 1 &&
          point.seconds <= 86_400 &&
          Number.isFinite(point.watts) &&
          point.watts >= 1 &&
          point.watts <= 2_500,
      )
      .reduce((map, point) => {
        const clean = {
          ...point,
          seconds: Math.round(point.seconds),
          watts: Math.round(point.watts),
          wattsPerKg: optionalPositiveNumber(point.wattsPerKg, 35),
          weightKg: optionalPositiveNumber(point.weightKg, 250),
          wkgWeightKg: optionalPositiveNumber(point.wkgWeightKg, 250),
        };
        const current = map.get(clean.seconds);
        if (!current || clean.watts > current.watts) map.set(clean.seconds, clean);
        return map;
      }, new Map<number, IntervalsPowerCurvePoint>())
      .values(),
  ).sort((a, b) => a.seconds - b.seconds);

  // Een maximale power-duration curve kan bij een langere duur niet hoger
  // worden. Verwijder eerst losse dips/pieken uit metadata die per ongeluk als
  // curvepunt zijn aangeleverd, en maak kleine afrondingssprongen daarna vlak.
  for (let pass = 0; pass < 4 && normalized.length >= 3; pass += 1) {
    let removed = false;
    normalized = normalized.filter((point, index, rows) => {
      if (index === 0 || index === rows.length - 1) return true;
      const previous = rows[index - 1];
      const next = rows[index + 1];
      const sharpDip =
        next.watts > point.watts &&
        next.watts - point.watts > Math.max(5, point.watts * 0.03);
      const sharpSpike =
        point.watts > previous.watts &&
        point.watts - previous.watts > Math.max(5, previous.watts * 0.03);
      if (sharpDip || sharpSpike) {
        removed = true;
        return false;
      }
      return true;
    });
    if (!removed) break;
  }

  while (
    normalized.length >= 2 &&
    normalized[1].watts - normalized[0].watts >
      Math.max(5, normalized[0].watts * 0.03)
  ) {
    normalized.shift();
  }
  while (
    normalized.length >= 2 &&
    normalized[normalized.length - 1].watts -
      normalized[normalized.length - 2].watts >
      Math.max(5, normalized[normalized.length - 2].watts * 0.03)
  ) {
    normalized.pop();
  }

  let ceiling = Number.POSITIVE_INFINITY;
  let wkgCeiling = Number.POSITIVE_INFINITY;
  return normalized.map((point) => {
    ceiling = Math.min(ceiling, point.watts);
    const wattsPerKg = optionalPositiveNumber(point.wattsPerKg, 35);
    const nextWkg =
      wattsPerKg == null ? null : Math.min(wkgCeiling, wattsPerKg);
    if (nextWkg != null) wkgCeiling = nextWkg;
    return { ...point, watts: ceiling, wattsPerKg: nextWkg };
  });
}
