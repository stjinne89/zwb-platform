import { routes as zwiftRoutes } from "zwift-data";
import { accentsForRoute } from "@/lib/events/zwift-route";
import { zwiftRaceModelMinutes } from "@/lib/training/race-model";
import { LADDER_ROUTE_MAX_KM, LADDER_ROUTE_MAX_MINUTES, LADDER_ROUTE_MIN_KM } from "./rules";

export type LadderRouteClass = "vlak" | "punch" | "heuvel" | "klim";
export type PowerDuration = "s15" | "m1" | "m5" | "m20";
export type DurationWeights = Record<PowerDuration, number>;

export const ROUTE_CLASS_LABELS: Record<LadderRouteClass, string> = {
  vlak: "Vlak",
  punch: "Punch",
  heuvel: "Heuvels",
  klim: "Klim",
};

export type LadderRouteLaps = { laps: number; km: number; elevationM: number };

export type LadderRouteOption = {
  slug: string;
  name: string;
  world: string;
  eventOnly: boolean;
  zwiftInsiderUrl: string | null;
  /** De rondentallen die binnen 15–25 km vallen, oplopend. */
  laps: LadderRouteLaps[];
  routeClass: LadderRouteClass;
  /** Hoogtemeters per km over het kortste toegestane rondental. */
  metersPerKm: number;
  longestClimbKm: number;
  uphillFinish: boolean;
  /** Wat het parcours vraagt, verdeeld over 15 s, 1, 5 en 20 minuten (som 1). */
  weights: DurationWeights;
  /** Op welke hellingen elke duur telt, voor het lichaamsgewicht. */
  terrain: DurationTerrain;
};

const WORLD_LABELS: Record<string, string> = {
  watopia: "Watopia",
  richmond: "Richmond",
  london: "London",
  "new-york": "New York",
  innsbruck: "Innsbruck",
  bologna: "Bologna",
  yorkshire: "Yorkshire",
  "crit-city": "Crit City",
  "makuri-islands": "Makuri Islands",
  france: "France",
  paris: "Paris",
  "gravel-mountain": "Gravel Mountain",
  scotland: "Scotland",
};

export function worldLabel(world: string) {
  return WORLD_LABELS[world] ?? world.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Klasse als eigen vuistregel: een klim van 3 km of 18 m/km is een klimmersrit,
 * 1,5 km of 10 m/km heuvelachtig, 6 m/km, een steile korte klim of een
 * bergop finish een punchersrit; de rest vlak.
 */
export function routeClassFor(metersPerKm: number, longestClimbKm: number, steepestPct: number, uphillFinish: boolean): LadderRouteClass {
  if (longestClimbKm >= 3 || metersPerKm >= 18) return "klim";
  if (longestClimbKm >= 1.5 || metersPerKm >= 10) return "heuvel";
  if (metersPerKm >= 6 || uphillFinish || steepestPct >= 5) return "punch";
  return "vlak";
}

export type LadderClimb = { km: number; pct: number };

/** Klimmen zonder helling in zwift-data rekenen we als 4%. */
const DEFAULT_CLIMB_PCT = 4;

/**
 * Geschatte klimtijd in seconden: 4 W/kg voor een renner van 75 kg op een fiets
 * van 8 kg, CdA 0,3, Crr 0,004 (eigen aanname, alleen om klimmen te ordenen).
 */
export function climbSeconds(km: number, pct: number) {
  const power = 4 * 75;
  const theta = Math.atan(pct / 100);
  const resist = 83 * 9.81 * (Math.sin(theta) + 0.004 * Math.cos(theta));
  let low = 0.5;
  let high = 25;
  for (let i = 0; i < 40; i += 1) {
    const v = (low + high) / 2;
    if (resist * v + 0.5 * 1.2 * 0.3 * v ** 3 > power) high = v;
    else low = v;
  }
  return (km * 1000) / low;
}

const DURATIONS_ORDER: PowerDuration[] = ["s15", "m1", "m5", "m20"];

const ANCHORS: Array<[PowerDuration, number]> = [
  ["s15", 15],
  ["m1", 60],
  ["m5", 300],
  ["m20", 1200],
];

/** Een inspanning van zoveel seconden, verdeeld over de twee duren eromheen (logaritmisch). */
export function effortMix(seconds: number): DurationWeights {
  const mix: DurationWeights = { s15: 0, m1: 0, m5: 0, m20: 0 };
  if (seconds <= ANCHORS[0][1]) mix.s15 = 1;
  else if (seconds >= ANCHORS[3][1]) mix.m20 = 1;
  else {
    const i = ANCHORS.findIndex(([, s]) => s >= seconds) - 1;
    const [lowKey, lowS] = ANCHORS[i];
    const [highKey, highS] = ANCHORS[i + 1];
    const share = Math.log(seconds / lowS) / Math.log(highS / lowS);
    mix[lowKey] = 1 - share;
    mix[highKey] = share;
  }
  return mix;
}

/** Een deel van wat een duur op een parcours vraagt: de helling in procenten en het aandeel daarin. */
export type TerrainPart = { pct: number; share: number };
/** Per duur de hellingen waarop hij telt, met aandelen die per duur optellen tot 1. */
export type DurationTerrain = Record<PowerDuration, TerrainPart[]>;

/**
 * Wat een parcours vraagt, als eigen vuistregel. Elke klim weegt bij de duur
 * die hij kost: een steil muurtje van een minuut bij 1 min, een klim van een
 * kwartier bij 20 min. Hoe meer hoogtemeters, hoe zwaarder; onder 5% minder,
 * omdat het wiel dan nog scheelt, en 1% of minder telt niet. Hoogtemeters
 * buiten de bekende klimmen tellen als glooiend (5 min), en zonder bergop
 * finish telt de sprint (15 s). Klimmen per ronde tellen met de wortel van het
 * aantal rondes: elke volgende doortocht beslist minder.
 *
 * Naast het gewicht per duur ook op welke hellingen dat gewicht ligt, voor het
 * omrekenen van W/kg naar lichaamsgewicht (`rider-weight.ts`): een klim op zijn
 * eigen helling, het glooiende deel van 5 min op het dubbele van de gemiddelde
 * helling (de helft van de route gaat omhoog, hooguit 8%), de rest vlak.
 */
export function durationDemand(
  metersPerKm: number,
  climbs: LadderClimb[],
  finishClimb: LadderClimb | null,
  laps = 1,
): { weights: DurationWeights; terrain: DurationTerrain } {
  const hills = clamp01(metersPerKm / 15);
  const rollingPct = Math.min(8, metersPerKm / 5);
  const parts: Record<PowerDuration, TerrainPart[]> = {
    s15: [{ pct: 0, share: 0.35 * (1 - hills) + (finishClimb ? 0 : 0.15) }],
    m1: [{ pct: 0, share: 0.2 }],
    m5: [
      { pct: 0, share: 0.1 },
      { pct: rollingPct, share: 0.2 * hills },
    ],
    m20: [{ pct: 0, share: 0.1 }],
  };
  const add = (climb: LadderClimb, factor: number) => {
    const seconds = climbSeconds(climb.km, climb.pct);
    const gainM = climb.km * 10 * climb.pct;
    const importance = (0.15 + 0.45 * Math.sqrt(clamp01(gainM / 300))) * clamp01((climb.pct - 1) / 4) * factor;
    const mix = effortMix(seconds);
    for (const [d] of ANCHORS) if (importance * mix[d] > 0) parts[d].push({ pct: climb.pct, share: importance * mix[d] });
  };
  for (const climb of climbs) add(climb, Math.sqrt(laps));
  if (finishClimb) add(finishClimb, 1);
  const raw = Object.fromEntries(DURATIONS_ORDER.map((d) => [d, parts[d].reduce((sum, part) => sum + part.share, 0)])) as DurationWeights;
  const total = raw.s15 + raw.m1 + raw.m5 + raw.m20;
  const weights: DurationWeights = { s15: raw.s15 / total, m1: raw.m1 / total, m5: raw.m5 / total, m20: raw.m20 / total };
  const terrain = Object.fromEntries(
    DURATIONS_ORDER.map((d) => [
      d,
      parts[d].filter((part) => part.share > 0).map((part) => ({ pct: Math.round(part.pct * 10) / 10, share: part.share / raw[d] })),
    ]),
  ) as DurationTerrain;
  return { weights, terrain };
}

/** Alleen het gewicht per duur; zie `durationDemand`. */
export function durationWeights(metersPerKm: number, climbs: LadderClimb[], finishClimb: LadderClimb | null, laps = 1): DurationWeights {
  return durationDemand(metersPerKm, climbs, finishClimb, laps).weights;
}

/**
 * De rondentallen die binnen de regel vallen. Afstand afgerond op 0,1 km zoals
 * Zwift hem toont: twee rondes Loop de Loop zijn 25,03 km en tellen mee. Een
 * rondental dat volgens het clubmodel langer duurt dan 45 minuten valt af.
 */
export function lapsWithinRule(leadInKm: number, lapKm: number, isLap: boolean, lapElevationM = 0, leadInElevationM = 0) {
  const result: LadderRouteLaps[] = [];
  if (!(lapKm > 0)) return result;
  const maxLaps = isLap ? Math.floor(LADDER_ROUTE_MAX_KM / lapKm) + 1 : 1;
  for (let laps = 1; laps <= maxLaps; laps += 1) {
    const km = round1(leadInKm + laps * lapKm);
    const elevationM = Math.round(leadInElevationM + laps * lapElevationM);
    if (
      km >= LADDER_ROUTE_MIN_KM &&
      km <= LADDER_ROUTE_MAX_KM &&
      zwiftRaceModelMinutes(km, elevationM, "race") <= LADDER_ROUTE_MAX_MINUTES
    ) {
      result.push({ laps, km, elevationM });
    }
  }
  return result;
}

let cached: LadderRouteOption[] | null = null;

/** Alle fietsroutes van Zwift die met één of meer rondes een ladderparcours zijn. */
export function ladderRouteOptions(): LadderRouteOption[] {
  if (cached) return cached;
  cached = zwiftRoutes
    .filter((route) => route.sports.includes("cycling"))
    .flatMap((route) => {
      const leadInKm = route.leadInDistance ?? 0;
      const laps = lapsWithinRule(leadInKm, route.distance, route.lap, route.elevation, route.leadInElevation ?? 0);
      if (laps.length === 0) return [];
      const climbs = accentsForRoute(route.slug).filter((accent) => accent.kind === "climb");
      const longestClimbKm = round1(Math.max(0, ...climbs.map((climb) => climb.endKm - climb.startKm)));
      const steepestPct = Math.max(0, ...climbs.map((climb) => climb.avgInclinePct ?? 0));
      const finish = climbs.find((climb) => climb.endKm >= route.distance - 0.3) ?? null;
      const uphillFinish = finish !== null;
      const shortest = laps[0];
      const metersPerKm = round1(shortest.elevationM / shortest.km);
      const effort = (climb: (typeof climbs)[number]): LadderClimb => ({
        km: climb.endKm - climb.startKm,
        pct: climb.avgInclinePct ?? DEFAULT_CLIMB_PCT,
      });
      return [
        {
          slug: route.slug,
          name: route.name,
          world: route.world,
          eventOnly: Boolean(route.eventOnly),
          zwiftInsiderUrl: route.zwiftInsiderUrl ?? null,
          laps,
          routeClass: routeClassFor(metersPerKm, longestClimbKm, steepestPct, uphillFinish),
          metersPerKm,
          longestClimbKm,
          uphillFinish,
          ...durationDemand(metersPerKm, climbs.map(effort), finish ? effort(finish) : null, shortest.laps),
        } satisfies LadderRouteOption,
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
  return cached;
}

function normalizeRouteName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Route uit een uitslag: op Zwift-routeId, anders op naam. */
export function findLadderRouteSlug(name: string | null, zwiftRouteId?: number | null): string | null {
  if (zwiftRouteId) {
    const byId = zwiftRoutes.find((route) => route.id === zwiftRouteId);
    if (byId) return byId.slug;
  }
  if (!name) return null;
  const key = normalizeRouteName(name);
  const match = zwiftRoutes.find((route) => route.sports.includes("cycling") && normalizeRouteName(route.name) === key);
  return match?.slug ?? null;
}

export function ladderRouteBySlug(slug: string) {
  return ladderRouteOptions().find((option) => option.slug === slug) ?? null;
}

/** Klasse van een gereden route, ook als hij buiten de regel valt. */
export function routeClassOfSlug(slug: string | null): LadderRouteClass | null {
  if (!slug) return null;
  const option = ladderRouteBySlug(slug);
  if (option) return option.routeClass;
  const route = zwiftRoutes.find((item) => item.slug === slug);
  if (!route || !(route.distance > 0)) return null;
  const climbs = accentsForRoute(slug).filter((accent) => accent.kind === "climb");
  const longest = Math.max(0, ...climbs.map((climb) => climb.endKm - climb.startKm));
  const steepest = Math.max(0, ...climbs.map((climb) => climb.avgInclinePct ?? 0));
  const uphill = climbs.some((climb) => climb.endKm >= route.distance - 0.3);
  return routeClassFor(route.elevation / route.distance, longest, steepest, uphill);
}
