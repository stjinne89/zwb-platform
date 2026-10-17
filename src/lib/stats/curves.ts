// Vermogen per periode uit intervals.icu-powercurves, voor /stats/ik.
//
// intervals.icu rekent voor elk datumbereik de beste curve uit over alle ritten
// in dat bereik, ook ritten die via Strava binnenkwamen (aanvaard risico, zie
// PLAN.md, ZWBgame 2026-09-17). Daarmee zien ook leden zonder eigen
// Garmin-koppeling hun piekvermogen en hun CP en W′ door de jaren.
//
// Puur: de aanroeper haalt de curves op.

import { fitCpWPrime } from "@/lib/pacing/cp";
import { bucketEnd, bucketStart, type Granularity } from "@/lib/stats/personal";

export type CompactPoint = { seconds: number; watts: number; wattsPerKg: number | null };

/**
 * Een curve van een paar honderd punten terug naar deze duren: genoeg voor de
 * pieken, de CP-fit (2 tot 20 min) en een grafiek op een log-as, en klein genoeg
 * om te cachen.
 */
export const CURVE_SECONDS = [
  1, 2, 3, 5, 10, 15, 20, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 420, 480, 600, 720, 900,
  1200, 1500, 1800, 2400, 3600, 5400, 7200, 10800, 14400, 18000,
];

export function compactCurve(
  points: Array<{ seconds: number; watts: number; wattsPerKg?: number | null }>,
): CompactPoint[] {
  return CURVE_SECONDS.flatMap((seconds) => {
    // Het dichtstbijzijnde punt binnen 10%: korte duren moeten exact zijn (een 5 s
    // is geen 2 s), lange curves zijn dunner bemonsterd.
    let match: (typeof points)[number] | null = null;
    for (const point of points) {
      const gap = Math.abs(point.seconds - seconds);
      if (gap > seconds * 0.1) continue;
      if (!match || gap < Math.abs(match.seconds - seconds)) match = point;
    }
    if (!match) return [];
    const wkg = Number(match.wattsPerKg);
    return [
      {
        seconds,
        watts: Math.round(match.watts),
        wattsPerKg: Number.isFinite(wkg) && wkg > 0 ? Math.round(wkg * 100) / 100 : null,
      },
    ];
  });
}

/**
 * Curves per week zijn te veel vragen en zeggen per week weinig (één harde rit
 * of niet); die tegels tellen dan per maand.
 */
export function curveGranularity(per: Granularity): Granularity {
  return per === "week" ? "maand" : per;
}

/** Het intervals-bereik van een periode, afgekapt op vandaag. */
export function curveRange(key: string, per: Granularity, today: string) {
  const end = bucketEnd(key, per);
  return `r.${bucketStart(key, per)}.${end > today ? today : end}`;
}

export const PEAK_DURATIONS = [
  { seconds: 5, label: "5 s" },
  { seconds: 60, label: "1 min" },
  { seconds: 300, label: "5 min" },
  { seconds: 1200, label: "20 min" },
] as const;

export type PeakPoint = {
  key: string;
  /** Per duur uit PEAK_DURATIONS, in dezelfde volgorde. */
  watts: Array<number | null>;
  wattsPerKg: Array<number | null>;
};

export function peakSeries(keys: string[], curves: Record<string, CompactPoint[] | undefined>): PeakPoint[] {
  return keys.map((key) => {
    const points = curves[key] ?? [];
    const at = PEAK_DURATIONS.map(({ seconds }) => points.find((point) => point.seconds === seconds) ?? null);
    return {
      key,
      watts: at.map((point) => point?.watts ?? null),
      wattsPerKg: at.map((point) => point?.wattsPerKg ?? null),
    };
  });
}

export type CpPoint = { key: string; cpWatts: number | null; wPrimeKj: number | null };

/**
 * CP en W′ per periode, gefit op de curve van die periode (2 tot 20 minuten).
 * Een periode zonder echte inspanningen op die duren geeft een fit die buiten de
 * grenzen valt; die blijft leeg in plaats van een verzonnen dip.
 */
export function cpSeries(keys: string[], curves: Record<string, CompactPoint[] | undefined>): CpPoint[] {
  return keys.map((key) => {
    const fit = fitCpWPrime(curves[key] ?? []);
    return {
      key,
      cpWatts: fit?.cpWatts ?? null,
      wPrimeKj: fit ? Math.round(fit.wPrimeJoules / 100) / 10 : null,
    };
  });
}

export type WellnessRow = { id: string; eftp?: number | null; weight?: number | null };

export type EftpPoint = { key: string; eftp: number | null; weightKg: number | null; wkg: number | null };

/**
 * eFTP en gewicht per periode: de laatste eFTP in de periode (een schatting die
 * intervals dagelijks bijwerkt) en het gemiddelde gewicht van de dagen waarop het
 * gewogen is.
 */
export function eftpSeries(
  keys: string[],
  wellness: WellnessRow[],
  keyOf: (day: string) => string,
): EftpPoint[] {
  const byKey = new Map<string, { eftp: number | null; eftpDay: string; weight: number; weighed: number }>();
  for (const row of wellness) {
    const key = keyOf(row.id);
    const entry = byKey.get(key) ?? { eftp: null, eftpDay: "", weight: 0, weighed: 0 };
    const eftp = Number(row.eftp);
    if (Number.isFinite(eftp) && eftp > 0 && row.id >= entry.eftpDay) {
      entry.eftp = eftp;
      entry.eftpDay = row.id;
    }
    const weight = Number(row.weight);
    if (Number.isFinite(weight) && weight >= 30 && weight <= 250) {
      entry.weight += weight;
      entry.weighed += 1;
    }
    byKey.set(key, entry);
  }
  return keys.map((key) => {
    const entry = byKey.get(key);
    const eftp = entry?.eftp != null ? Math.round(entry.eftp) : null;
    const weightKg = entry?.weighed ? Math.round((entry.weight / entry.weighed) * 10) / 10 : null;
    return {
      key,
      eftp,
      weightKg,
      wkg: eftp != null && weightKg ? Math.round((eftp / weightKg) * 100) / 100 : null,
    };
  });
}
