export const POWER_DURATIONS = [
  { key: "15s", seconds: 15, wattsField: "watts_15s", wkgField: "wkg_15s" },
  { key: "30s", seconds: 30, wattsField: "watts_30s", wkgField: "wkg_30s" },
  { key: "1m", seconds: 60, wattsField: "watts_1m", wkgField: "wkg_1m" },
  { key: "2m", seconds: 120, wattsField: "watts_2m", wkgField: "wkg_2m" },
  { key: "5m", seconds: 300, wattsField: "watts_5m", wkgField: "wkg_5m" },
  { key: "10m", seconds: 600, wattsField: "watts_10m", wkgField: "wkg_10m" },
  { key: "20m", seconds: 1200, wattsField: "watts_20m", wkgField: "wkg_20m" },
] as const;

export type RiderType =
  | "sprinter"
  | "puncher"
  | "tter"
  | "climber"
  | "allrounder"
  | "unknown";

export type PowerValues = {
  ftpWatts?: number | null;
  weightKg?: number | null;
  watts15s?: number | null;
  watts30s?: number | null;
  watts1m?: number | null;
  watts2m?: number | null;
  watts5m?: number | null;
  watts10m?: number | null;
  watts20m?: number | null;
};

function finite(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function wkg(watts: number | null | undefined, weightKg: number | null | undefined) {
  if (!watts || !weightKg) return null;
  return Number((watts / weightKg).toFixed(2));
}

export function classifyRider(values: PowerValues): RiderType {
  const ftp = finite(values.ftpWatts);
  const weight = finite(values.weightKg);
  const p15 = finite(values.watts15s);
  const p30 = finite(values.watts30s);
  const p1 = finite(values.watts1m);
  const p2 = finite(values.watts2m);
  const p5 = finite(values.watts5m);
  const p10 = finite(values.watts10m);
  const p20 = finite(values.watts20m);

  if (!ftp || !p20) return "unknown";

  const sprint = ((p15 ?? p30 ?? 0) / ftp + (p30 ?? p15 ?? 0) / ftp) / 2;
  const punch = ((p1 ?? p2 ?? p5 ?? 0) / ftp + (p2 ?? p1 ?? p5 ?? 0) / ftp + (p5 ?? p2 ?? 0) / ftp) / 3;
  const steady = ((p10 ?? p20) / ftp + p20 / ftp) / 2;
  const climbing = weight
    ? ((wkg(p5, weight) ?? 0) + (wkg(p20, weight) ?? 0) + (wkg(ftp, weight) ?? 0)) / 3
    : 0;

  const scores: Array<[RiderType, number]> = [
    ["sprinter", sprint / 3.2],
    ["puncher", punch / 1.65],
    ["tter", steady / 1.03],
    ["climber", climbing / 4.25],
  ];
  scores.sort((a, b) => b[1] - a[1]);

  const [best, bestScore] = scores[0];
  const second = scores[1]?.[1] ?? 0;
  if (bestScore < 0.75) return "unknown";
  if (bestScore - second < 0.08) return "allrounder";
  return best;
}

export function riderTypeLabel(type: string | null | undefined) {
  switch (type) {
    case "sprinter":
      return "Sprinter";
    case "puncher":
      return "Puncher";
    case "tter":
      return "TTer";
    case "climber":
      return "Klimmer";
    case "allrounder":
      return "Allrounder";
    default:
      return "Onbekend";
  }
}

export function powerProfilePayload(values: PowerValues) {
  const weightKg = finite(values.weightKg);
  const ftpWatts = finite(values.ftpWatts);
  const watts15s = finite(values.watts15s);
  const watts30s = finite(values.watts30s);
  const watts1m = finite(values.watts1m);
  const watts2m = finite(values.watts2m);
  const watts5m = finite(values.watts5m);
  const watts10m = finite(values.watts10m);
  const watts20m = finite(values.watts20m);

  return {
    ftp_watts: ftpWatts,
    weight_kg: weightKg,
    watts_15s: watts15s,
    watts_30s: watts30s,
    watts_1m: watts1m,
    watts_2m: watts2m,
    watts_5m: watts5m,
    watts_10m: watts10m,
    watts_20m: watts20m,
    wkg_15s: wkg(watts15s, weightKg),
    wkg_30s: wkg(watts30s, weightKg),
    wkg_1m: wkg(watts1m, weightKg),
    wkg_2m: wkg(watts2m, weightKg),
    wkg_5m: wkg(watts5m, weightKg),
    wkg_10m: wkg(watts10m, weightKg),
    wkg_20m: wkg(watts20m, weightKg),
    ftp_wkg: wkg(ftpWatts, weightKg),
    rider_type: classifyRider({
      ftpWatts,
      weightKg,
      watts15s,
      watts30s,
      watts1m,
      watts2m,
      watts5m,
      watts10m,
      watts20m,
    }),
  };
}

export function wattsAtDuration(
  points: Array<{ seconds: number; watts: number }>,
  seconds: number,
) {
  let best: { seconds: number; watts: number } | null = null;
  for (const point of points) {
    if (!best || Math.abs(point.seconds - seconds) < Math.abs(best.seconds - seconds)) {
      best = point;
    }
  }
  return best && Math.abs(best.seconds - seconds) <= Math.max(3, seconds * 0.12)
    ? best.watts
    : null;
}
