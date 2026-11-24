// Club Ladder seizoen 8 (vanaf eind december 2026): de teamregel gaat van ranks
// naar zMAP. Uit de aankondiging "Ladder Season 8" (gelezen 2026-11-17):
//
// - Het verschil tussen de hoogste en laagste zMAP (w/kg) op het roster is
//   hooguit 1,2. Het gaat om alle renners op het roster, niet alleen wie rijdt.
// - Voor die spreiding telt 5,8 of hoger als 5,8 en 2,5 of lager als 2,5.
// - Een team dat niet past gaat van de ladder tot het roster klopt (geen 50%
//   meer zoals bij de rankregel).
// - De ladderpositie wordt na de wissel opnieuw gezet op de mediaan-zMAP van het
//   roster.
//
// De ladder rekent met de zMAP van Zwift. Die hebben wij alleen uit de WTRL-plak;
// daarom de schatting van de ZRL-indeling (`estimateZ`, 0,99 × beste 5 minuten,
// WTRL als terugval).
//
// Per renner een kleur (eigenaar, 2026-11-17, in plaats van "Past bijna" per
// team): groen past, geel is een risico (binnen de gemiddelde fout van de
// schatting van de rand), rood valt buiten de grootste groep die binnen 1,2 past.

import type { ZValue } from "@/lib/teams/zrl-ranking";

export const ZMAP_MAX_SPREAD = 1.2;
export const ZMAP_CAP_HIGH = 5.8;
export const ZMAP_CAP_LOW = 2.5;
/**
 * Gemiddelde fout van de geschatte zMAP tegen WTRL (0,09 op 2026-11-24, zie
 * `zrl-ranking.ts`). Zo dicht bij de rand is een renner een risico. Het 90e
 * percentiel (0,22) maakte op 2026-11-17 elk team "krap".
 */
export const ZMAP_RISK_MARGIN = 0.09;

export type ZmapRider = { key: string; name: string; zmap?: ZValue | null };

/** ok = past, risk = binnen de foutmarge van de rand, out = valt buiten, unknown = geen zMAP. */
export type ZmapRiderStatus = "ok" | "risk" | "out" | "unknown";

export type ZmapCheckLevel = "ok" | "warn" | "bad";

export type ZmapTeamCheck = {
  /** Alleen ok of bad: past het team of niet. */
  level: "ok" | "bad";
  issues: Array<{ level: ZmapCheckLevel; text: string }>;
  /** Hoogste min laagste, na de grenzen van 5,8 en 2,5; null zonder zMAP. */
  spread: number | null;
  /** Mediaan van de zMAP zoals hij is (zonder grenzen); null zonder zMAP. */
  median: number | null;
  /** Tussen deze zMAP-waarden past een renner erbij; null zonder zMAP of als het team al te breed is. */
  room: [number, number] | null;
  status: Record<string, ZmapRiderStatus>;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** zMAP zoals de spreidingsregel hem telt. */
export function cappedZmap(value: number) {
  return Math.min(ZMAP_CAP_HIGH, Math.max(ZMAP_CAP_LOW, value));
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return round2(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
}

/** "1,14" */
export function formatWkg(value: number) {
  return value.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Het venster van 1,2 dat de meeste renners bevat; bij gelijkspel het venster
 * met zijn midden het dichtst bij de mediaan. Wie erbuiten valt, moet eruit om
 * het team te laten passen.
 */
function bestWindow(values: number[]): [number, number] {
  const mid = median(values)!;
  let best: [number, number] = [values[0], values[0] + ZMAP_MAX_SPREAD];
  let bestCount = -1;
  let bestDistance = Infinity;
  for (const low of values) {
    const high = low + ZMAP_MAX_SPREAD;
    const count = values.filter((v) => v >= low && round2(v - low) <= ZMAP_MAX_SPREAD).length;
    const distance = Math.abs(low + ZMAP_MAX_SPREAD / 2 - mid);
    if (count > bestCount || (count === bestCount && distance < bestDistance)) {
      best = [low, high];
      bestCount = count;
      bestDistance = distance;
    }
  }
  return best;
}

export function checkLadderTeamZmap(riders: ZmapRider[]): ZmapTeamCheck {
  const out: ZmapTeamCheck = { level: "ok", issues: [], spread: null, median: null, room: null, status: {} };

  if (riders.length === 0) {
    out.issues.push({ level: "warn", text: "Nog geen renners." });
    return out;
  }

  const known = riders
    .filter((rider): rider is ZmapRider & { zmap: ZValue } => rider.zmap != null)
    .map((rider) => ({ rider, value: cappedZmap(rider.zmap.value) }));
  const unknown = riders.filter((rider) => rider.zmap == null);
  for (const rider of unknown) out.status[rider.key] = "unknown";
  if (unknown.length > 0) {
    out.issues.push({ level: "warn", text: `Geen zMAP: ${unknown.map((rider) => rider.name).join(", ")}.` });
  }
  if (known.length === 0) return out;

  out.median = median(known.map((k) => k.rider.zmap.value));
  const values = known.map((k) => k.value);
  // Afronden voor de vergelijking: 4,7 − 3,5 is in floats net boven 1,2.
  out.spread = round2(Math.max(...values) - Math.min(...values));

  const [windowLow] = bestWindow(values);
  const inside = known.filter((k) => k.value >= windowLow && round2(k.value - windowLow) <= ZMAP_MAX_SPREAD);
  for (const k of known) if (!inside.includes(k)) out.status[k.rider.key] = "out";

  const low = Math.min(...inside.map((k) => k.value));
  const high = Math.max(...inside.map((k) => k.value));
  const room: [number, number] = [
    round2(Math.max(ZMAP_CAP_LOW, high - ZMAP_MAX_SPREAD)),
    round2(Math.min(ZMAP_CAP_HIGH, low + ZMAP_MAX_SPREAD)),
  ];
  for (const k of inside) {
    // Tegen de grens van 5,8 of 2,5 schuift een renner niet verder.
    const nearLow = room[0] > ZMAP_CAP_LOW && round2(k.value - room[0]) < ZMAP_RISK_MARGIN;
    const nearHigh = room[1] < ZMAP_CAP_HIGH && round2(room[1] - k.value) < ZMAP_RISK_MARGIN;
    out.status[k.rider.key] = nearLow || nearHigh ? "risk" : "ok";
  }

  if (out.spread > ZMAP_MAX_SPREAD) {
    out.level = "bad";
    out.issues.push({
      level: "bad",
      text: `Spreiding ${formatWkg(out.spread)}, maximaal ${formatWkg(ZMAP_MAX_SPREAD)}: team gaat van de ladder.`,
    });
  } else {
    out.room = room;
  }
  return out;
}

/** Hoogste zMAP boven, daarna op naam; zonder zMAP onderaan. */
export function sortByZmap<T extends ZmapRider>(riders: T[]): T[] {
  return [...riders].sort(
    (a, b) => (b.zmap?.value ?? -1) - (a.zmap?.value ?? -1) || a.name.localeCompare(b.name, "nl"),
  );
}
