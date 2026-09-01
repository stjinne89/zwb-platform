// Van een Zwift-eventlink naar een route.
//
// De publieke Zwift-event-API is zonder login bereikbaar en geeft per event een
// `routeId`, het aantal ronden en de afstand. Dat `routeId` komt één-op-één voor
// in de `zwift-data`-package, die de naam, wereld, lead-in en — belangrijk voor
// het pacingplan — de klim- en sprintsegmenten mét kilometrering levert. Voor
// een Zwift-route is dus geen klimdetectie nodig.
//
// `scanZwiftEvents` in external-scan.ts praat al met dezelfde host voor de
// kalenderscan; het rij-type wordt daar hergebruikt.

import { routes, segments } from "zwift-data";
import { safeFetch } from "@/lib/net/safe-fetch";
import { zwiftEventUrl, type ZwiftEventApiRow } from "@/lib/events/external-scan";

export const ZWIFT_PUBLIC_EVENT_BASE =
  "https://us-or-rly101.zwift.com/api/public/events";

export type ZwiftRouteInfo = {
  routeId: number;
  slug: string;
  name: string;
  world: string;
  /** Eén ronde, zonder lead-in (km). */
  distanceKm: number;
  elevationM: number;
  leadInKm: number;
  leadInElevationM: number;
  isLap: boolean;
  stravaSegmentId: number | null;
  accents: RouteAccent[];
};

/** Een genoemd stuk route waar een pacingplan een accent op kan leggen. */
export type RouteAccent = {
  slug: string;
  name: string;
  kind: "climb" | "sprint";
  /** Km binnen één ronde. */
  startKm: number;
  endKm: number;
  avgInclinePct: number | null;
};

export type ZwiftEventInfo = {
  eventId: number;
  title: string;
  startAt: string | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  laps: number | null;
  externalUrl: string;
  routeId: number | null;
  route: ZwiftRouteInfo | null;
};

// --- Pure logica ---------------------------------------------------------

/**
 * Haalt het event-id uit wat een beheerder plakt: een volledige zwift.com-URL,
 * een URL met querystring of anker, of gewoon het nummer.
 */
export function parseZwiftEventUrl(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const bare = /^\d+$/.exec(trimmed);
  if (bare) return toEventId(trimmed);

  const match = /zwift\.com\/(?:[a-z-]+\/)?events\/view\/(\d+)/i.exec(trimmed);
  if (match) return toEventId(match[1]);

  // De publieke API-vorm, voor het geval iemand die plakt.
  const api = /zwift\.com\/api\/public\/events\/(\d+)/i.exec(trimmed);
  if (api) return toEventId(api[1]);

  return null;
}

function toEventId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** De klimmen en sprints op een route, met hun kilometrering binnen één ronde. */
export function accentsForRoute(routeSlug: string): RouteAccent[] {
  const route = routes.find((item) => item.slug === routeSlug);
  if (!route) return [];

  return route.segmentsOnRoute
    .flatMap((onRoute) => {
      const segment = segments.find((item) => item.slug === onRoute.segment);
      if (!segment) return [];
      if (segment.type !== "climb" && segment.type !== "sprint") return [];
      return [
        {
          slug: segment.slug,
          name: segment.name,
          kind: segment.type,
          startKm: onRoute.from,
          endKm: onRoute.to,
          avgInclinePct: segment.avgIncline ?? null,
        } satisfies RouteAccent,
      ];
    })
    .sort((a, b) => a.startKm - b.startKm);
}

/** Vertaalt een `routeId` uit de Zwift-API naar wat wij van die route weten. */
export function routeFromZwiftId(routeId: number): ZwiftRouteInfo | null {
  const route = routes.find((item) => item.id === routeId);
  if (!route) return null;

  return {
    routeId,
    slug: route.slug,
    name: route.name,
    world: route.world,
    distanceKm: route.distance,
    elevationM: route.elevation,
    leadInKm: route.leadInDistance ?? 0,
    leadInElevationM: route.leadInElevation ?? 0,
    isLap: route.lap,
    stravaSegmentId: route.stravaSegmentId ?? null,
    accents: accentsForRoute(route.slug),
  };
}

/**
 * Zet een event-API-rij om in wat het eventformulier nodig heeft. Puur, zodat
 * het op een vastgelegde JSON getest kan worden.
 *
 * De afstand van het event gaat vóór die van de route: een event rijdt vaak
 * meerdere ronden of stopt eerder.
 */
export function mapZwiftEvent(row: ZwiftEventApiRow): ZwiftEventInfo | null {
  const eventId = row.id == null ? null : toEventId(String(row.id));
  if (!eventId) return null;

  const routeId =
    row.routeId == null ? null : toEventId(String(row.routeId)) ?? null;
  const distanceMeters = Number(row.distanceInMeters);
  const durationSeconds = Number(row.durationInSeconds);
  const laps = Number(row.laps);

  return {
    eventId,
    title: (row.name ?? "").trim(),
    startAt: row.eventStart ?? null,
    distanceKm:
      Number.isFinite(distanceMeters) && distanceMeters > 0
        ? distanceMeters / 1000
        : null,
    durationMinutes:
      Number.isFinite(durationSeconds) && durationSeconds > 0
        ? Math.round(durationSeconds / 60)
        : null,
    laps: Number.isFinite(laps) && laps > 0 ? laps : null,
    externalUrl: zwiftEventUrl(eventId),
    routeId,
    route: routeId === null ? null : routeFromZwiftId(routeId),
  };
}

/**
 * Totale afstand en hoogtemeters van het event: lead-in plus zoveel ronden als
 * er gereden worden. Zonder `laps` leiden we het rondental af uit de afstand die
 * het event zelf opgeeft, want een event zonder rondental heeft wél een afstand.
 */
export function eventRouteTotals(info: ZwiftEventInfo): {
  distanceKm: number;
  elevationM: number;
  laps: number;
} | null {
  const route = info.route;
  if (!route) return null;

  const lapKm = route.distanceKm;
  if (lapKm <= 0) return null;

  const laps =
    info.laps ??
    (info.distanceKm
      ? Math.max(1, Math.round((info.distanceKm - route.leadInKm) / lapKm))
      : 1);

  return {
    distanceKm: route.leadInKm + laps * lapKm,
    elevationM: Math.round(route.leadInElevationM + laps * route.elevationM),
    laps,
  };
}

// --- Netwerk -------------------------------------------------------------

export type ZwiftEventResult =
  | { ok: true; event: ZwiftEventInfo }
  | { ok: false; error: string };

/**
 * Haalt één publiek Zwift-event op. Geen auth nodig; `accept: application/json`
 * is wel verplicht, anders geeft Zwift protobuf terug (zie
 * docs/omnium-zwift-api-spike.md).
 */
export async function fetchZwiftPublicEvent(
  eventId: number,
): Promise<ZwiftEventResult> {
  try {
    const response = await safeFetch(`${ZWIFT_PUBLIC_EVENT_BASE}/${eventId}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 404) {
      return { ok: false, error: "Zwift kent dit event niet (meer)." };
    }
    if (!response.ok) {
      return { ok: false, error: `Zwift gaf status ${response.status}.` };
    }

    const event = mapZwiftEvent((await response.json()) as ZwiftEventApiRow);
    if (!event) return { ok: false, error: "Zwift gaf geen bruikbaar event terug." };
    return { ok: true, event };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Zwift-event ophalen faalde.",
    };
  }
}
