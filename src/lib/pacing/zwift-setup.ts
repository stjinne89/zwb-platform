// Hoe een lid een Zwift-event rijdt: format, fiets, slipstream en powerups.
//
// Tot 21 september 2026 rekende het pacingplan elk event als een solo-inspanning
// met buitenfysica (CdA 0,32, Crr 0,005, 9 kg uitrusting). Voor een Zwift-race
// mist dat de kern: in de groep scheelt de slipstream een derde van de
// luchtweerstand, de fiets verschilt minuten op een klim of op gravel, en een
// veer op de laatste klim is een keuze die je vooraf maakt.
//
// Deze module is puur. Ze vertaalt de keuzes van het lid (RideSetup) en de regels
// van het event (EventConstraints) naar één `RidePhysics`, die evaluatePlan per
// segment gebruikt. Een .gpx-route krijgt geen RidePhysics en rekent precies
// zoals voorheen.
//
// IJking. De Zwift-fysica komt uit de testsheet van ZwiftInsider (zie
// docs/zwift-race-opzet-spike.md): de referentiefiets (Zwift Carbon, Zwift 32mm
// Carbon, 183 cm, 75 kg) haalt sinds juni 2026 op Tempus Fugit 24,574 mph bij
// 300 W en 18,964 mph bij 150 W. Met Zwifts rolweerstand op asfalt (0,004)
// leggen die de CdA vast, de Alpe-tijden de massa; los gefit komt de
// rolweerstand er ook op 0,0040 uit. Drie getallen hieronder zijn daarentegen aannames
// zonder meting: de slipstreamfactoren, het effect van de draft boost en het
// gewicht van het aambeeld. Ze staan apart en met die vermelding.

import { crrFor, type RollingClass } from "@/lib/zwift/surfaces/crr";

export type RaceFormat = "race" | "tt" | "ttt";
export type BikeKind = "road" | "tt" | "gravel" | "mtb";
export type RidePosition = "bunch" | "alone";
export type PowerupId = "feather" | "aero" | "draft" | "steamroller" | "anvil";

export const RACE_FORMATS: RaceFormat[] = ["race", "tt", "ttt"];
export const POWERUP_IDS: PowerupId[] = ["feather", "aero", "draft", "steamroller", "anvil"];

export const FORMAT_LABELS: Record<RaceFormat, string> = {
  race: "Wedstrijd",
  tt: "Tijdrit",
  ttt: "Ploegentijdrit",
};

export const POWERUP_LABELS: Record<PowerupId, string> = {
  feather: "Veer",
  aero: "Aerohelm",
  draft: "Draft boost",
  steamroller: "Stoomwals",
  anvil: "Aambeeld",
};

/** De keuzes van het lid; bewaard in `assumptions.setup` van het plan. */
export type RideSetup = {
  format: RaceFormat;
  /** Frame uit `zwift_bike_parts`; null = de referentiefiets (Zwift Carbon). */
  frame: string | null;
  /** Wielen; null = de wielen waarmee het frame getest is. */
  wheels: string | null;
  /** Upgradeniveau van het frame in de garage, 0 t/m 5. */
  stage: number;
  /** Alleen bij een ploegentijdrit: met hoeveel je rijdt. */
  teamSize: number | null;
};

/** Een frame of wielset zoals afgeleid uit de ZwiftInsider-sheet. */
export type BikePart = {
  part: "frame" | "wheel";
  name: string;
  kind: BikeKind;
  /** Bij een wielset: op welk referentieframe hij gemeten is. */
  testFrame: string | null;
  stage: number;
  /** Verschil met de referentiefiets bij 183 cm en 75 kg. */
  cdaDelta: number;
  kgDelta: number;
};

/** Wat het event vastlegt, uit `rulesSet` en `tags` van de Zwift-API. */
export type EventConstraints = {
  suggestedFormat: RaceFormat;
  drafting: boolean;
  doubleDraft: boolean;
  ttBikesAllowed: boolean;
  /** Leeg = geen powerups in dit event. */
  powerups: PowerupId[];
  /** `disable_bike_upgrade_physics`: elk frame rijdt op stage 0. */
  upgradesDisabled: boolean;
  /** Frame dat het event oplegt (`bikeHash`), als naam uit zwift-data. */
  forcedFrame: string | null;
  /** Het event legt wielen op (`fwheel_override`). */
  forcedWheels: boolean;
};

/** Wat evaluatePlan per segment nodig heeft. */
export type RidePhysics = {
  format: RaceFormat;
  /** Luchtweerstand solo, renner plus fiets. */
  cda: number;
  /** Het fietstype waarmee gerekend wordt (na eventregels). */
  kind: BikeKind;
  rolling: RollingClass;
  /** Massa van de fiets bovenop het lid. */
  bikeKg: number;
  /** CdA-vermenigvuldiger in de groep. */
  draftFactor: number;
  /** Ploegentijdrit: welk deel van de tijd je op kop zit. */
  pullShare: number | null;
  powerups: PowerupId[];
};

// --- IJking ---------------------------------------------------------------

/** De renner van de ZwiftInsider-tests. */
export const ZWIFT_REF_HEIGHT_CM = 183;
export const ZWIFT_REF_WEIGHT_KG = 75;
/** Zwifts standaardlengte (5'9"), voor een lid zonder lengte in het profiel. */
export const ZWIFT_DEFAULT_HEIGHT_CM = 175;

/**
 * CdA van de referentiefiets met de referentierenner, en de effectieve massa
 * van die fiets in ons model. Afgeleid uit de basisrij van de sheet (juni 2026)
 * met solveSpeedMs' vergelijking, rendement 0,97; zie bike-sheet.ts.
 *
 * Het fietsgewicht oogt laag. Het is de massa die in ons model de Alpe-tijd van
 * de sheet reproduceert, niet een weegschaalgewicht: Zwift rekent met eigen
 * constanten, en alleen het verschil tussen fietsen moet kloppen.
 */
export const ZWIFT_BASE_CDA = 0.3191;
export const ZWIFT_BASE_BIKE_KG = 2.42;

/**
 * Frontaal oppervlak naar lengte en gewicht (Du Bois-vorm, zoals ZwifterBikes
 * die gebruikt). Alleen de verhouding tot de referentierenner telt.
 */
export function frontalArea(heightCm: number, weightKg: number): number {
  return 0.0276 * (heightCm / 100) ** 0.725 * weightKg ** 0.425 + 0.1647;
}

// --- Aannames (niet gemeten) ---------------------------------------------

/**
 * In de groep: 30 % minder luchtweerstand. Zwift maakt zijn draftmodel niet
 * bekend; metingen van ZwiftInsider in een groot peloton liggen rond 25–35 %.
 * AANNAME.
 */
export const DRAFT_CDA_FACTOR = 0.7;
/** Een tijdritfiets krijgt in Zwift minder slipstream in de groep. AANNAME. */
export const TT_BIKE_DRAFT_CDA_FACTOR = 0.85;
/** Ploegentijdrit zonder opgegeven ploeggrootte. */
export const DEFAULT_TEAM_SIZE = 4;

export type PowerupEffect = {
  durationS: number;
  /** Massa erbij (negatief = eraf), als deel van het gewicht van het lid. */
  riderMassFraction?: number;
  cdaFactor?: number;
  /** Vermenigvuldigt de besparing in de groep (1 − draftFactor). */
  draftSavingFactor?: number;
  /** Rolweerstand ongeacht fiets en wegdek. */
  crr?: number;
  /** Werkt alleen waar het zo steil of steiler daalt. */
  maxGradient?: number;
};

/**
 * Bron: zwiftinsider.com/powerups (21 september 2026). De draft boost (factor
 * 1,5) en het aambeeld (+10 % gewicht) zijn daar niet gekwantificeerd: AANNAME.
 */
export const POWERUP_EFFECTS: Record<PowerupId, PowerupEffect> = {
  feather: { durationS: 30, riderMassFraction: -0.1 },
  aero: { durationS: 15, cdaFactor: 0.75 },
  draft: { durationS: 40, draftSavingFactor: 1.5 },
  steamroller: { durationS: 30, crr: 0.004 },
  anvil: { durationS: 15, riderMassFraction: 0.1, maxGradient: -0.015 },
};

/** Zwifts nummering in `powerup_percent`; burrito, spook en XP werken niet op je tijd. */
const ZWIFT_POWERUP_IDS: Record<number, PowerupId> = {
  0: "feather",
  1: "draft",
  5: "aero",
  7: "steamroller",
  8: "anvil",
};

/** Wat een gewoon event zonder eigen verdeling uitdeelt. */
const STANDARD_POWERUPS: PowerupId[] = ["feather", "draft", "aero"];

// --- Eventregels ----------------------------------------------------------

export type ZwiftEventRules = {
  eventType: string | null;
  rules: string[];
  tags: string[];
  forcedFrame?: string | null;
};

/**
 * Leest de regels van een Zwift-event. Regels staan op het event én per
 * subgroep; de aanroeper voegt die samen. Tags hebben de vorm `naam` of
 * `naam=waarde` (met aanhalingstekens rond de waarde van powerup_percent).
 */
export function constraintsFromZwiftEvent(input: ZwiftEventRules | null): EventConstraints {
  const rules = new Set((input?.rules ?? []).map((rule) => rule.toUpperCase()));
  const tags = input?.tags ?? [];
  const tag = (name: string) => tags.find((item) => item.split("=")[0].trim().toLowerCase() === name);
  const type = (input?.eventType ?? "").toUpperCase();

  const drafting = !rules.has("NO_DRAFTING");
  const suggestedFormat: RaceFormat =
    type === "TEAM_TIME_TRIAL" ? "ttt" : type === "TIME_TRIAL" || !drafting ? "tt" : "race";

  let powerups: PowerupId[] = STANDARD_POWERUPS;
  const percent = tag("powerup_percent");
  if (rules.has("NO_POWERUPS") || tag("disable powerups")) {
    powerups = [];
  } else if (percent) {
    const numbers = (percent.split("=")[1] ?? "")
      .replace(/["']/g, "")
      .split(",")
      .map((value) => Number(value.trim()));
    const ids: PowerupId[] = [];
    for (let i = 0; i + 1 < numbers.length; i += 2) {
      const id = ZWIFT_POWERUP_IDS[numbers[i]];
      if (id && numbers[i + 1] > 0 && !ids.includes(id)) ids.push(id);
    }
    powerups = ids;
  }
  if (!drafting) powerups = powerups.filter((id) => id !== "draft");

  return {
    suggestedFormat,
    drafting,
    doubleDraft: Boolean(tag("doubledraft")) || rules.has("TEST_BIT_10"),
    ttBikesAllowed: !rules.has("NO_TT_BIKES"),
    powerups,
    upgradesDisabled: Boolean(tag("disable_bike_upgrade_physics")),
    forcedFrame: input?.forcedFrame ?? null,
    forcedWheels: Boolean(tag("fwheel_override") || tag("rwheel_override")),
  };
}

/** De keuzes waarmee een nieuw plan begint. */
export function defaultSetup(constraints: EventConstraints): RideSetup {
  return {
    format: constraints.suggestedFormat,
    frame: constraints.forcedFrame,
    wheels: null,
    stage: 0,
    teamSize: constraints.suggestedFormat === "ttt" ? DEFAULT_TEAM_SIZE : null,
  };
}

/** Schoont een opgeslagen of ingestuurde setup op; ongeldig valt terug op de standaard. */
export function normalizeSetup(value: unknown, fallback: RideSetup): RideSetup {
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  const format = RACE_FORMATS.includes(raw.format as RaceFormat)
    ? (raw.format as RaceFormat)
    : fallback.format;
  const text = (input: unknown) =>
    typeof input === "string" && input.trim() ? input.trim().slice(0, 120) : null;
  const stage = Math.round(Number(raw.stage));
  const team = Math.round(Number(raw.teamSize));
  return {
    format,
    frame: text(raw.frame),
    wheels: text(raw.wheels),
    stage: Number.isFinite(stage) ? Math.min(5, Math.max(0, stage)) : 0,
    teamSize:
      format === "ttt"
        ? Number.isFinite(team) && team >= 2 && team <= 8
          ? team
          : DEFAULT_TEAM_SIZE
        : null,
  };
}

// --- Van keuzes naar fysica -----------------------------------------------

function rollingFor(kind: BikeKind): RollingClass {
  if (kind === "gravel") return "gravel";
  if (kind === "mtb") return "mtb";
  return "road";
}

/**
 * Zoekt het frame op het gekozen upgradeniveau, of het hoogste niveau daaronder
 * dat de sheet kent: de tussenliggende stages zijn maar voor de helft gemeten.
 */
export function findFrame(parts: BikePart[], name: string | null, stage: number): BikePart | null {
  if (!name) return null;
  const candidates = parts
    .filter((part) => part.part === "frame" && part.name === name && part.stage <= stage)
    .sort((a, b) => b.stage - a.stage);
  return candidates[0] ?? null;
}

/** Het referentieframe waarop wielen voor dit fietstype gemeten zijn. */
export function wheelTestFrame(kind: BikeKind): string | null {
  if (kind === "tt") return "Zwift TT";
  if (kind === "gravel") return "Zwift Gravel";
  if (kind === "road") return "Zwift Carbon";
  return null;
}

export function findWheels(parts: BikePart[], name: string | null, kind: BikeKind): BikePart | null {
  const testFrame = wheelTestFrame(kind);
  if (!name || !testFrame) return null;
  return (
    parts.find(
      (part) => part.part === "wheel" && part.name === name && part.testFrame === testFrame,
    ) ?? null
  );
}

export function resolveRidePhysics(input: {
  setup: RideSetup;
  constraints: EventConstraints;
  parts: BikePart[];
  weightKg: number;
  /**
   * Lengte uit het receptenboek (nutrition_profiles). Zwift rekent de
   * luchtweerstand ermee; zonder lengte Zwifts standaard van 175 cm.
   */
  heightCm: number | null;
}): RidePhysics {
  const { setup, constraints, parts } = input;
  const stage = constraints.upgradesDisabled ? 0 : setup.stage;
  const chosen = findFrame(parts, setup.frame, stage);
  // Een tijdritfiets waar het event die verbiedt: dan rijd je de referentiefiets.
  const frame = chosen?.kind === "tt" && !constraints.ttBikesAllowed ? null : chosen;
  const kind: BikeKind = frame?.kind ?? "road";
  const wheels = constraints.forcedWheels ? null : findWheels(parts, setup.wheels, kind);

  const refArea = frontalArea(ZWIFT_REF_HEIGHT_CM, ZWIFT_REF_WEIGHT_KG);
  const area = frontalArea(input.heightCm ?? ZWIFT_DEFAULT_HEIGHT_CM, input.weightKg);
  const bikeCda = ZWIFT_BASE_CDA + (frame?.cdaDelta ?? 0) + (wheels?.cdaDelta ?? 0);

  const format = setup.format;
  const baseDraft = kind === "tt" ? TT_BIKE_DRAFT_CDA_FACTOR : DRAFT_CDA_FACTOR;
  const draftFactor = !constraints.drafting
    ? 1
    : constraints.doubleDraft
      ? Math.max(0.3, 1 - 2 * (1 - baseDraft))
      : baseDraft;
  const teamSize = setup.teamSize ?? DEFAULT_TEAM_SIZE;

  return {
    format,
    cda: bikeCda * (area / refArea),
    kind,
    rolling: rollingFor(kind),
    bikeKg: Math.max(0, ZWIFT_BASE_BIKE_KG + (frame?.kgDelta ?? 0) + (wheels?.kgDelta ?? 0)),
    draftFactor,
    pullShare: format === "ttt" ? 1 / Math.max(2, teamSize) : null,
    powerups: constraints.powerups.filter((id) => !(id === "draft" && format === "tt")),
  };
}

/** Waar een stuk zonder eigen keuze rijdt. */
export function defaultPosition(format: RaceFormat): RidePosition {
  return format === "race" ? "bunch" : "alone";
}

/**
 * De CdA-vermenigvuldiger op een stuk. Een ploegentijdrit wisselt kopwerk en
 * rust af; het doel op zo'n stuk is het gemiddelde over de hele rotatie, dus de
 * luchtweerstand ook.
 */
export function positionCdaFactor(physics: RidePhysics, position: RidePosition | undefined): number {
  if (physics.format === "tt") return 1;
  if (physics.format === "ttt") {
    const share = physics.pullShare ?? 1 / DEFAULT_TEAM_SIZE;
    return share + (1 - share) * physics.draftFactor;
  }
  return (position ?? defaultPosition(physics.format)) === "bunch" ? physics.draftFactor : 1;
}

/** Rolweerstand op dit wegdek met deze fiets. */
export function segmentCrr(physics: RidePhysics, surface: Parameters<typeof crrFor>[0] | undefined) {
  return crrFor(surface ?? "tarmac", physics.rolling);
}
