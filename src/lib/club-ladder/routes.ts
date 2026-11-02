import { routes as zwiftRoutes } from "zwift-data";
import { accentsForRoute } from "@/lib/events/zwift-route";
import { LADDER_ROUTE_MAX_KM, LADDER_ROUTE_MIN_KM } from "./rules";

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

/** Doorlopende gewichten, zodat routes binnen één klasse ook verschillen. */
export function durationWeights(metersPerKm: number, longestClimbKm: number, uphillFinish: boolean): DurationWeights {
  const hills = clamp01(metersPerKm / 15);
  const climb = clamp01(longestClimbKm / 4);
  const raw = {
    s15: 0.5 * (1 - hills) * (1 - climb) + 0.02,
    m1: 0.25 - 0.15 * climb + (uphillFinish ? 0.15 : 0),
    m5: 0.15 + 0.35 * hills,
    m20: 0.1 + 0.5 * climb + 0.2 * hills,
  };
  const total = raw.s15 + raw.m1 + raw.m5 + raw.m20;
  return { s15: raw.s15 / total, m1: raw.m1 / total, m5: raw.m5 / total, m20: raw.m20 / total };
}

/**
 * De rondentallen die binnen de regel vallen. Afstand afgerond op 0,1 km zoals
 * Zwift hem toont: twee rondes Loop de Loop zijn 25,03 km en tellen mee.
 */
export function lapsWithinRule(leadInKm: number, lapKm: number, isLap: boolean, lapElevationM = 0, leadInElevationM = 0) {
  const result: LadderRouteLaps[] = [];
  if (!(lapKm > 0)) return result;
  const maxLaps = isLap ? Math.floor(LADDER_ROUTE_MAX_KM / lapKm) + 1 : 1;
  for (let laps = 1; laps <= maxLaps; laps += 1) {
    const km = round1(leadInKm + laps * lapKm);
    if (km >= LADDER_ROUTE_MIN_KM && km <= LADDER_ROUTE_MAX_KM) {
      result.push({ laps, km, elevationM: Math.round(leadInElevationM + laps * lapElevationM) });
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
      const uphillFinish = climbs.some((climb) => climb.endKm >= route.distance - 0.3);
      const shortest = laps[0];
      const metersPerKm = round1(shortest.elevationM / shortest.km);
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
          weights: durationWeights(metersPerKm, longestClimbKm, uphillFinish),
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
