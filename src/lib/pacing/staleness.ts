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
  | "route"
  | "indeling";

/** Kleiner dan dit is afronding, geen andere klim. */
const LAYOUT_TOLERANCE_KM = 0.05;

type LayoutAccent = { id: string; startKm: number; endKm: number };
type LayoutRange = { startKm: number; endKm: number };
type LayoutSegment = { startKm: number; endKm: number; accentId?: string | null };
export type RouteLayoutSnapshot = {
  totalKm: number;
  accentIds: string[];
  /** Sinds 13 september 2026; oudere plannen hebben alleen de id's. */
  accents?: LayoutAccent[];
  /** Neutralisaties, sinds 14 september 2026. Afwezig: van vóór die tijd. */
  neutral?: LayoutRange[];
};

/**
 * Horen de neutralisaties nog bij dit plan? Een plan van vóór 14 september kent
 * ze niet; op een route mét neutralisatie is dat plan dus verouderd — het rekende
 * dat stuk als gewoon rijden.
 */
function neutralMatches(before: LayoutRange[] | undefined, now: LayoutRange[]): boolean {
  if (!before) return now.length === 0;
  return (
    before.length === now.length &&
    before.every(
      (range, index) =>
        Math.abs(range.startKm - now[index].startKm) <= LAYOUT_TOLERANCE_KM &&
        Math.abs(range.endKm - now[index].endKm) <= LAYOUT_TOLERANCE_KM,
    )
  );
}

/**
 * Hoort de indeling van dit plan nog bij de klimmen van de route?
 *
 * Een plan bewaart zijn stukken met km-grenzen en de route zoals die toen was
 * (route_snapshot). Voegt een beheerder klimmen samen of verlegt hij er een
 * (event_climbs), dan tekent de pagina het profiel met de nieuwe klimmen, maar
 * stonden eronder nog de oude stukken. Bij een GPX-route is er geen
 * routesync-tijd die dat verraadt; vandaar deze vergelijking.
 *
 * Een plan van vóór 13 september kent alleen de accent-id's (klim-1, klim-2, …):
 * samenvoegen verandert hun aantal, en dat is genoeg. Nieuwere plannen bewaren
 * ook de km-grenzen, zodat een verlegde klim met hetzelfde aantal ook opvalt.
 * Namen tellen niet: een hernoemde klim rekent hetzelfde.
 */
export function planLayoutMatchesRoute(
  snapshot: RouteLayoutSnapshot | null | undefined,
  segments: LayoutSegment[],
  route: { totalKm: number; accents: LayoutAccent[]; neutralZones?: LayoutRange[] },
): boolean {
  const currentIds = new Set(route.accents.map((accent) => accent.id));
  // Een stuk dat naar een klim verwijst die er niet meer is.
  if (segments.some((segment) => segment.accentId && !currentIds.has(segment.accentId))) {
    return false;
  }
  if (!snapshot) return true;
  if (Math.abs(snapshot.totalKm - route.totalKm) > 0.1) return false;
  if (!neutralMatches(snapshot.neutral, route.neutralZones ?? [])) return false;
  if (
    snapshot.accentIds.length !== route.accents.length ||
    snapshot.accentIds.some((id, index) => route.accents[index]?.id !== id)
  ) {
    return false;
  }
  if (!snapshot.accents) return true;
  return snapshot.accents.every((before, index) => {
    const now = route.accents[index];
    return (
      now?.id === before.id &&
      Math.abs(now.startKm - before.startKm) <= LAYOUT_TOLERANCE_KM &&
      Math.abs(now.endKm - before.endKm) <= LAYOUT_TOLERANCE_KM
    );
  });
}

/** Voegt "de klimmen zijn veranderd" toe aan een verouderdoordeel. */
export function withLayoutStaleness(staleness: Staleness, layoutMatches: boolean): Staleness {
  if (layoutMatches) return staleness;
  return {
    stale: true,
    reasons: [...staleness.reasons, "indeling"],
    messages: [
      ...staleness.messages,
      "De klimmen of neutralisaties van deze route zijn gewijzigd sinds dit plan is gemaakt.",
    ],
  };
}

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
