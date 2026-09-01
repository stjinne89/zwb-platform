// Verouderdetectie: klopt dit plan nog met wie je nu bent?
//
// Een pacingplan bewaart de aannames waarop het is gemaakt. Verandert je CP,
// je gewicht, of wordt het routeprofiel opnieuw opgehaald, dan klopt de
// doorrekening niet meer — de watt-doelen zijn dan gebaseerd op een renner die
// je niet meer bent.
//
// Bewust géén automatische herberekening op de achtergrond: dan verandert een
// plan onder het lid vandaan, mogelijk vlak voor een event. Het plan meldt dat
// het verouderd is en het lid drukt zelf op de knop.

export type PlanAssumptions = {
  cpWatts: number;
  wPrimeJoules: number;
  ftpWatts: number | null;
  weightKg: number;
  cpSource: string;
  /** ISO-tijd van de routesync waarop dit plan is gebaseerd. */
  routeSyncedAt: string | null;
  computedAt: string;
};

export type StaleReason =
  | "cp"
  | "wprime"
  | "gewicht"
  | "ftp"
  | "route";

export type Staleness = {
  stale: boolean;
  reasons: StaleReason[];
  /** Leesbare regels voor het scherm. */
  messages: string[];
};

/**
 * Drempels. Een gram gewichtsverschil of een watt CP is ruis; pas een
 * betekenisvolle verandering maakt een plan verouderd, anders staat er na elke
 * intervals-sync "verouderd" op het scherm.
 */
const CP_TOLERANCE_W = 5;
const W_PRIME_TOLERANCE_J = 1000;
const WEIGHT_TOLERANCE_KG = 1;
const FTP_TOLERANCE_W = 5;

export function checkStaleness(
  assumptions: PlanAssumptions | null | undefined,
  current: {
    cpWatts: number;
    wPrimeJoules: number;
    ftpWatts: number | null;
    weightKg: number;
    routeSyncedAt: string | null;
  },
): Staleness {
  if (!assumptions) {
    return { stale: false, reasons: [], messages: [] };
  }

  const reasons: StaleReason[] = [];
  const messages: string[] = [];

  if (Math.abs(current.cpWatts - assumptions.cpWatts) > CP_TOLERANCE_W) {
    reasons.push("cp");
    messages.push(
      `Je CP staat nu op ${current.cpWatts} W, het plan rekende met ${assumptions.cpWatts} W.`,
    );
  }

  if (
    Math.abs(current.wPrimeJoules - assumptions.wPrimeJoules) > W_PRIME_TOLERANCE_J
  ) {
    reasons.push("wprime");
    messages.push(
      `Je anaerobe reserve staat nu op ${Math.round(current.wPrimeJoules / 100) / 10} kJ, het plan rekende met ${Math.round(assumptions.wPrimeJoules / 100) / 10} kJ.`,
    );
  }

  if (Math.abs(current.weightKg - assumptions.weightKg) > WEIGHT_TOLERANCE_KG) {
    reasons.push("gewicht");
    messages.push(
      `Je gewicht staat nu op ${current.weightKg} kg, het plan rekende met ${assumptions.weightKg} kg.`,
    );
  }

  // FTP verandert de watt-doelen niet rechtstreeks (die hangen aan CP), maar wel
  // het plafond per duur als CP uit FTP is afgeleid.
  if (
    assumptions.cpSource === "ftp" &&
    current.ftpWatts != null &&
    assumptions.ftpWatts != null &&
    Math.abs(current.ftpWatts - assumptions.ftpWatts) > FTP_TOLERANCE_W
  ) {
    reasons.push("ftp");
    messages.push(
      `Je FTP staat nu op ${current.ftpWatts} W, het plan rekende met ${assumptions.ftpWatts} W.`,
    );
  }

  if (
    current.routeSyncedAt &&
    assumptions.routeSyncedAt &&
    current.routeSyncedAt !== assumptions.routeSyncedAt
  ) {
    reasons.push("route");
    messages.push("Het routeprofiel is opnieuw opgehaald sinds dit plan is gemaakt.");
  }

  return { stale: reasons.length > 0, reasons, messages };
}

export function buildAssumptions(current: {
  cpWatts: number;
  wPrimeJoules: number;
  ftpWatts: number | null;
  weightKg: number;
  cpSource: string;
  routeSyncedAt: string | null;
}): PlanAssumptions {
  return { ...current, computedAt: new Date().toISOString() };
}
