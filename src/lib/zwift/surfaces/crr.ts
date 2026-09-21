// Wegdektypen en de rolweerstand die Zwift erop hanteert, los van de vlakken in
// polygons.ts: dit deel draait ook in de browser (de pacingeditor rekent
// clientside), en daar hoort de 33 kB aan coördinaten niet mee.

export type Surface =
  | "tarmac"
  | "brick"
  | "wood"
  | "cobbles"
  | "snow"
  | "dirt"
  | "grass"
  | "sand"
  | "gravel";

export type SurfacePolygon = {
  type: Surface;
  /** [lat, lon]-punten; het eerste en laatste punt zijn gelijk. */
  polygon: Array<[number, number]>;
};

/** Welke rolweerstandskolom een fiets gebruikt. Een tijdritfiets rolt als een racefiets. */
export type RollingClass = "road" | "gravel" | "mtb";

/**
 * Rolweerstand per wegdek en fietstype, zoals Zwift die hanteert. Bron:
 * zwiftinsider.com/crr, via ZwiftMap (constants/crr.ts). `null` betekent dat
 * Zwift dat fietstype daar niet toelaat; zie crrFor.
 */
export const ZWIFT_CRR: Record<Surface, Record<RollingClass, number | null>> = {
  tarmac: { road: 0.004, mtb: 0.01, gravel: 0.008 },
  brick: { road: 0.0055, mtb: 0.01, gravel: 0.008 },
  wood: { road: 0.0065, mtb: 0.01, gravel: 0.008 },
  cobbles: { road: 0.0065, mtb: 0.01, gravel: 0.008 },
  snow: { road: 0.0075, mtb: 0.014, gravel: 0.018 },
  dirt: { road: 0.025, mtb: 0.014, gravel: 0.018 },
  grass: { road: null, mtb: 0.042, gravel: null },
  sand: { road: 0.004, mtb: 0.014, gravel: 0.008 },
  gravel: { road: 0.012, mtb: 0.009, gravel: 0.009 },
};

export const SURFACE_LABELS: Record<Surface, string> = {
  tarmac: "Asfalt",
  brick: "Klinkers",
  wood: "Hout",
  cobbles: "Kasseien",
  snow: "Sneeuw",
  dirt: "Onverhard",
  grass: "Gras",
  sand: "Zand",
  gravel: "Gravel",
};

/**
 * Rolweerstand voor dit wegdek en deze fiets. Waar Zwift een fietstype niet
 * toelaat (gras voor een racefiets) rekenen we met de mountainbikewaarde: de
 * route zelf dwingt dan in het spel al een andere fiets af, en een gat in de
 * doorrekening zou erger zijn dan die benadering.
 */
export function crrFor(surface: Surface, rolling: RollingClass): number {
  const row = ZWIFT_CRR[surface] ?? ZWIFT_CRR.tarmac;
  return row[rolling] ?? row.mtb ?? ZWIFT_CRR.tarmac[rolling]!;
}
