// Frames en wielen uit de testsheet van ZwiftInsider.
//
// `zwift-data` kent alleen de namen van Zwift-fietsen. ZwiftInsider test elk
// frame en elke wielset op dezelfde manier — 183 cm, 75 kg, 150 en 300 W, twee
// ronden Tempus Fugit (vlak) en de Alpe du Zwift (klim) — en zet de gemiddelde
// snelheden in een openbare Google-sheet. Uit die twee snelheden volgen met ons
// eigen snelheidsmodel (solveSpeedMs in ride-estimate.ts) twee getallen per
// onderdeel: luchtweerstand (CdA) uit de vlakke tijd, massa uit de klimtijd.
// Dat is dezelfde aanpak als ZwifterBikes.
//
// Het gaat om verschillen. Elk onderdeel wordt vergeleken met het
// referentieframe van zijn eigen tabblad en testperiode; de absolute waarden van
// de referentiefiets staan in zwift-setup.ts.
//
// Keuze van de eigenaar (21 september 2026): de hele lijst, hoewel ZwiftInsider
// geen licentie of API voor hergebruik aanbiedt. Zie PLAN.md.
//
// Puur: CSV erin, onderdelen eruit. Het ophalen staat in bike-sync.ts.

import { AIR_DENSITY, DRIVETRAIN_EFF, G } from "@/lib/ride-estimate";
import type { BikeKind, BikePart } from "@/lib/pacing/zwift-setup";

export const BIKE_SHEET_ID = "1S0pTN_hBMddX0GhCqSOd6fPlIJeWtw0xr6Y1M6PzNJY";
/** Tabbladen van de sheet (gid), vastgesteld op 21 september 2026. */
export const BIKE_SHEET_TABS = {
  frames: "0",
  wheels: "1966597556",
  baseline: "226321014",
} as const;

export function bikeSheetCsvUrl(gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${BIKE_SHEET_ID}/export?format=csv&gid=${gid}`;
}

/** Alpe du Zwift zoals ZwiftInsider hem rijdt: 12,2 km en 1036 hm. */
const ALPE_GRADIENT = 1036 / 12200;
const MPH = 0.44704;

/** Rolweerstand op asfalt per fietstype; zelfde tabel als surfaces/index.ts. */
const TARMAC_CRR: Record<BikeKind, number> = { road: 0.004, tt: 0.004, gravel: 0.008, mtb: 0.01 };

/** Een CSV-parser die aanhalingstekens en komma's in getallen ("550,000") aankan. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const clean = (value: string | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
const number = (value: string | undefined) => {
  const parsed = Number(clean(value).replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

function kindFromSheet(value: string): BikeKind | null {
  switch (clean(value).toLowerCase()) {
    case "road":
    case "halo":
      return "road";
    case "tt":
      return "tt";
    case "gravel":
      return "gravel";
    case "mtb":
      return "mtb";
    default:
      // Funny, Handcycle, Recumbent: geen fiets waarmee een lid een race rijdt.
      return null;
  }
}

/** Eén meting: snelheden (mph) op vlak en klim bij een vermogen. */
export type SpeedTest = { powerW: number; flatMph: number; climbMph: number };

export type SheetFrame = {
  name: string;
  wheels: string;
  kind: BikeKind;
  stage: number;
  tests: SpeedTest[];
};

export type SheetWheel = { frame: string; name: string; tests: SpeedTest[] };

function addTest<T extends { tests: SpeedTest[] }>(map: Map<string, T>, key: string, make: () => T, test: SpeedTest) {
  const entry = map.get(key) ?? make();
  entry.tests.push(test);
  map.set(key, entry);
}

/**
 * Tabblad frames: kolom 8 + 2·stage is de vlakke snelheid, 20 + 2·stage de
 * klimsnelheid. Stages 1–4 zijn maar voor de helft ingevuld.
 */
export function parseFramesTab(csv: string): SheetFrame[] {
  const rows = parseCsv(csv);
  const header = rows.findIndex((row) => clean(row[0]) === "Bike");
  const map = new Map<string, SheetFrame>();
  for (const row of rows.slice(header + 1)) {
    const name = clean(row[0]);
    const kind = kindFromSheet(row[2]);
    const powerW = number(row[7]);
    if (!name || !kind || !powerW) continue;
    for (let stage = 0; stage <= 5; stage++) {
      const flatMph = number(row[8 + 2 * stage]);
      const climbMph = number(row[20 + 2 * stage]);
      if (!flatMph || !climbMph) continue;
      addTest(
        map,
        `${name}|${stage}`,
        () => ({ name, wheels: clean(row[1]), kind, stage, tests: [] }),
        { powerW, flatMph, climbMph },
      );
    }
  }
  return [...map.values()];
}

/** Tabblad wielen: frame, wielen, …, vermogen (6), vlak (7), klim (9). */
export function parseWheelsTab(csv: string): SheetWheel[] {
  const rows = parseCsv(csv);
  const header = rows.findIndex((row) => clean(row[0]) === "Bike");
  const map = new Map<string, SheetWheel>();
  for (const row of rows.slice(header + 1)) {
    const frame = clean(row[0]);
    const name = clean(row[1]);
    const powerW = number(row[6]);
    const flatMph = number(row[7]);
    const climbMph = number(row[9]);
    if (!frame || !name || !powerW || !flatMph || !climbMph) continue;
    addTest(map, `${frame}|${name}`, () => ({ frame, name, tests: [] }), {
      powerW,
      flatMph,
      climbMph,
    });
  }
  return [...map.values()];
}

/**
 * Tabblad basis: de nieuwste meting van de referentiefiets per vermogen
 * (onderaan = nieuwst). Het tabblad heeft ook de Zwift TT; die telt hier niet.
 */
export function parseBaselineTab(csv: string, frame = "Zwift Carbon"): SpeedTest[] {
  const rows = parseCsv(csv);
  const header = rows.findIndex((row) => clean(row[0]) === "Frame");
  const byPower = new Map<number, SpeedTest>();
  for (const row of rows.slice(header + 1)) {
    if (clean(row[0]) !== frame) continue;
    const powerW = number(row[4]);
    const flatMph = number(row[6]);
    const climbMph = number(row[7]);
    if (!powerW || !flatMph || !climbMph) continue;
    byPower.set(powerW, { powerW, flatMph, climbMph });
  }
  return [...byPower.values()];
}

/**
 * CdA en totale massa die in ons model deze snelheden opleveren. Vlak en klim
 * hangen een beetje van elkaar af (rolweerstand hangt aan de massa, lucht speelt
 * op de klim nog mee), dus een paar rondes heen en weer.
 */
export function solveCdaAndMass(test: SpeedTest, crr: number): { cda: number; massKg: number } {
  const flat = test.flatMph * MPH;
  const climb = test.climbMph * MPH;
  const sin = ALPE_GRADIENT / Math.sqrt(1 + ALPE_GRADIENT ** 2);
  const cos = 1 / Math.sqrt(1 + ALPE_GRADIENT ** 2);
  const power = DRIVETRAIN_EFF * test.powerW;
  let massKg = 77;
  let cda = 0.3;
  for (let i = 0; i < 6; i++) {
    cda = (2 * (power - crr * massKg * G * flat)) / (AIR_DENSITY * flat ** 3);
    const air = 0.5 * AIR_DENSITY * cda * climb ** 3;
    massKg = (power - air) / ((crr * G * cos + G * sin) * climb);
  }
  return { cda, massKg };
}

/** Gemiddelde over de metingen (150 en 300 W). */
export function solveTests(tests: SpeedTest[], crr: number): { cda: number; massKg: number } | null {
  if (tests.length === 0) return null;
  const solved = tests.map((test) => solveCdaAndMass(test, crr));
  return {
    cda: solved.reduce((sum, item) => sum + item.cda, 0) / solved.length,
    massKg: solved.reduce((sum, item) => sum + item.massKg, 0) / solved.length,
  };
}

/** Op welk referentieframe wielen voor een fietstype gemeten zijn. */
const WHEEL_TEST_FRAMES: Record<string, BikeKind> = {
  "Zwift Carbon": "road",
  "Zwift TT": "tt",
  "Zwift Gravel": "gravel",
};

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

export type DerivedCatalog = {
  parts: BikePart[];
  /** De referentiefiets in de nieuwste meting; voor de constanten in zwift-setup.ts. */
  baseline: { cda: number; bikeKg: number } | null;
  skipped: string[];
};

/**
 * Van de drie tabbladen naar onderdelen met hun verschil ten opzichte van de
 * referentie. Een frame vergelijkt met het Zwift Carbon-frame uit hetzelfde
 * tabblad; wielen met hun eigen testframe met de wielen waarmee dat frame in het
 * framestabblad staat. Zo valt een verschil in testperiode tegen elkaar weg.
 */
export function deriveCatalog(input: {
  frames: SheetFrame[];
  wheels: SheetWheel[];
  baseline: SpeedTest[];
}): DerivedCatalog {
  const skipped: string[] = [];
  const reference = (name: string, kind: BikeKind) => {
    const frame = input.frames.find((item) => item.name === name && item.stage === 0);
    return frame ? solveTests(frame.tests, TARMAC_CRR[kind]) : null;
  };

  const roadRef = reference("Zwift Carbon", "road");
  const parts: BikePart[] = [];

  if (roadRef) {
    for (const frame of input.frames) {
      const solved = solveTests(frame.tests, TARMAC_CRR[frame.kind]);
      if (!solved) continue;
      parts.push({
        part: "frame",
        name: frame.name,
        kind: frame.kind,
        testFrame: null,
        stage: frame.stage,
        cdaDelta: round(solved.cda - roadRef.cda, 4),
        kgDelta: round(solved.massKg - roadRef.massKg, 2),
      });
    }
  } else {
    skipped.push("Geen Zwift Carbon op stage 0 in het framestabblad.");
  }

  for (const [testFrame, kind] of Object.entries(WHEEL_TEST_FRAMES)) {
    const ref = reference(testFrame, kind);
    if (!ref) {
      skipped.push(`Geen referentie voor wielen op ${testFrame}.`);
      continue;
    }
    for (const wheel of input.wheels.filter((item) => item.frame === testFrame)) {
      const solved = solveTests(wheel.tests, TARMAC_CRR[kind]);
      if (!solved) continue;
      parts.push({
        part: "wheel",
        name: wheel.name,
        kind,
        testFrame,
        stage: 0,
        cdaDelta: round(solved.cda - ref.cda, 4),
        kgDelta: round(solved.massKg - ref.massKg, 2),
      });
    }
  }

  const base = solveTests(input.baseline, TARMAC_CRR.road);
  return {
    parts,
    baseline: base ? { cda: round(base.cda, 4), bikeKg: round(base.massKg - 75, 2) } : null,
    skipped,
  };
}
