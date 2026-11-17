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
// daarom de schatting van de ZRL-indeling (`estimateZ`, 0,971 × beste 5 minuten,
// WTRL als terugval). Binnen de foutmarge van die schatting is het krap.

import { ESTIMATE_MARGIN, type ZValue } from "@/lib/teams/zrl-ranking";

export const ZMAP_MAX_SPREAD = 1.2;
export const ZMAP_CAP_HIGH = 5.8;
export const ZMAP_CAP_LOW = 2.5;

export type ZmapRider = { key: string; name: string; zmap?: ZValue | null };

export type ZmapCheckLevel = "ok" | "warn" | "bad";

export type ZmapTeamCheck = {
  level: ZmapCheckLevel;
  issues: Array<{ level: ZmapCheckLevel; text: string }>;
  /** Hoogste min laagste, na de grenzen van 5,8 en 2,5; null zonder zMAP. */
  spread: number | null;
  /** Mediaan van de zMAP zoals hij is (zonder grenzen); null zonder zMAP. */
  median: number | null;
  /** Tussen deze zMAP-waarden past een renner erbij; null zonder zMAP of als het team al te breed is. */
  room: [number, number] | null;
  /** De laagste en hoogste renner als het team te breed is. */
  outKeys: string[];
  /** Renners zonder zMAP. */
  unknownKeys: string[];
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

export function checkLadderTeamZmap(riders: ZmapRider[]): ZmapTeamCheck {
  const out: ZmapTeamCheck = {
    level: "ok",
    issues: [],
    spread: null,
    median: null,
    room: null,
    outKeys: [],
    unknownKeys: [],
  };
  const add = (level: ZmapCheckLevel, text: string) => {
    out.issues.push({ level, text });
    if (level === "bad" || (level === "warn" && out.level === "ok")) out.level = level;
  };

  if (riders.length === 0) {
    add("warn", "Nog geen renners.");
    return out;
  }

  const known = riders.filter((rider): rider is ZmapRider & { zmap: ZValue } => rider.zmap != null);
  const unknown = riders.filter((rider) => rider.zmap == null);
  if (unknown.length > 0) {
    out.unknownKeys = unknown.map((rider) => rider.key);
    add("warn", `Geen zMAP: ${unknown.map((rider) => rider.name).join(", ")}.`);
  }
  if (known.length === 0) return out;

  out.median = median(known.map((rider) => rider.zmap.value));
  const capped = known.map((rider) => ({ rider, value: cappedZmap(rider.zmap.value) }));
  const low = Math.min(...capped.map((c) => c.value));
  const high = Math.max(...capped.map((c) => c.value));
  // Afronden voor de vergelijking: 4,7 − 3,5 is in floats net boven 1,2.
  out.spread = round2(high - low);

  if (out.spread > ZMAP_MAX_SPREAD) {
    const ends = capped.filter((c) => c.value === low || c.value === high);
    out.outKeys = ends.map((c) => c.rider.key);
    add(
      "bad",
      `Spreiding ${formatWkg(out.spread)}, maximaal ${formatWkg(ZMAP_MAX_SPREAD)}: team gaat van de ladder.`,
    );
    return out;
  }

  out.room = [round2(Math.max(ZMAP_CAP_LOW, high - ZMAP_MAX_SPREAD)), round2(Math.min(ZMAP_CAP_HIGH, low + ZMAP_MAX_SPREAD))];
  if (out.spread > round2(ZMAP_MAX_SPREAD - ESTIMATE_MARGIN)) {
    add("warn", `Spreiding ${formatWkg(out.spread)}: krap, de schatting kan ${formatWkg(ESTIMATE_MARGIN)} ernaast zitten.`);
  }
  return out;
}

/** Hoogste zMAP boven, daarna op naam; zonder zMAP onderaan. */
export function sortByZmap<T extends ZmapRider>(riders: T[]): T[] {
  return [...riders].sort(
    (a, b) => (b.zmap?.value ?? -1) - (a.zmap?.value ?? -1) || a.name.localeCompare(b.name, "nl"),
  );
}
