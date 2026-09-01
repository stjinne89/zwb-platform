// Laadt het parcours van een event serverside, uit welke bron dan ook.
//
// Twee wegen naar dezelfde `PacingRoute`:
//  - Zwift: profiel en vorm uit `zwift_routes`, uitgerold over lead-in en ronden,
//    met de klim- en sprintsegmenten uit `zwift-data` als accenten.
//  - GPX: het bestand uit de `event-gpx`-bucket, geparsed met de server-veilige
//    regex-variant (parseGpx gebruikt DOMParser en draait dus alleen in de
//    browser), daarna door de bestaande klimdetectie en `sampleRoute`.
//
// De handmatige klim-overrides uit `event_climbs` gaan vóór de automatische
// detectie — precies zoals de routesectie op de eventpagina dat al doet. Zonder
// dat zou een beheerder een klim kunnen hernoemen of samenvoegen en die
// correctie in het pacingplan weer kwijt zijn.

import { allTrkptFromGpx } from "@/lib/gpx";
import {
  climbsFromRanges,
  detectClimbs,
  labelClimbsWithCols,
  type ClimbRange,
  type ColLite,
} from "@/lib/gpx-climbs";
import { sampleRoute } from "@/lib/route-sample";
import { accentsForRoute } from "@/lib/events/zwift-route";
import type { RouteProfile, RouteShape } from "@/lib/events/zwift-route-streams";
import {
  pacingRouteFromGpx,
  pacingRouteFromZwift,
  type PacingRoute,
} from "@/lib/pacing/route-profile";

type SupabaseClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
  storage: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (bucket: string) => any;
  };
};

export type PacingEventRow = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  gpx_path: string | null;
  distance_km: number | string | null;
  elevation_m: number | string | null;
  zwift_event_id: number | string | null;
  zwift_route_id: number | string | null;
  laps: number | string | null;
};

export type LoadedRoute = {
  route: PacingRoute;
  /** Alleen bij Zwift: de vorm voor de SVG-plattegrond. */
  shape: RouteShape | null;
  routeName: string | null;
  world: string | null;
  /** Wanneer het routeprofiel voor het laatst is opgehaald; voor verouderdetectie. */
  routeSyncedAt: string | null;
};

export type LoadRouteResult =
  | { ok: true; loaded: LoadedRoute }
  | {
      ok: false;
      reason: "geen-route" | "profiel-ontbreekt" | "profiel-wijkt-af" | "leeg";
      message: string;
    };

/** Zelfde marge als de synccontrole: meer dan 10 % verschil is geen ruis. */
const PROFILE_KM_TOLERANCE = 0.1;

function num(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function loadPacingRoute(
  supabase: SupabaseClient,
  event: PacingEventRow,
): Promise<LoadRouteResult> {
  const zwiftRouteId = num(event.zwift_route_id);
  if (zwiftRouteId) {
    return loadZwiftRoute(supabase, event, zwiftRouteId);
  }
  if (event.gpx_path) {
    return loadGpxRoute(supabase, event);
  }
  return {
    ok: false,
    reason: "geen-route",
    message: "Dit event heeft nog geen route: koppel een Zwift-event of upload een GPX.",
  };
}

async function loadZwiftRoute(
  supabase: SupabaseClient,
  event: PacingEventRow,
  routeId: number,
): Promise<LoadRouteResult> {
  const { data } = await supabase
    .from("zwift_routes")
    .select("route_id, slug, name, world, profile, shape, synced_at")
    .eq("route_id", routeId)
    .maybeSingle();

  const row = data as {
    slug: string;
    name: string;
    world: string | null;
    profile: RouteProfile | null;
    shape: RouteShape | null;
    synced_at: string | null;
  } | null;

  if (!row?.profile?.distanceM?.length) {
    return {
      ok: false,
      reason: "profiel-ontbreekt",
      message: "Het hoogteprofiel van deze route is nog niet opgehaald.",
    };
  }

  // De lead-in en de rondelengte komen uit zwift-data, niet uit onze tabel: die
  // hoort de bron te blijven voor alles wat we niet zelf hebben opgehaald.
  const { routes } = await import("zwift-data");
  const meta = routes.find((item) => item.id === routeId);
  const profileKm = row.profile.distanceM.at(-1)! / 1000;
  const lapKm = meta?.distance ?? profileKm;

  // Dekt het Strava-segment een andere afstand dan de route, dan slaat het
  // profiel op een ander parcours en zou een pacingplan over de verkeerde
  // kilometers gaan. Beter geen plan dan een plan dat nergens op slaat.
  if (meta && Math.abs(profileKm - meta.distance) / meta.distance > PROFILE_KM_TOLERANCE) {
    return {
      ok: false,
      reason: "profiel-wijkt-af",
      message:
        `Het opgehaalde profiel beslaat ${profileKm.toFixed(1)} km terwijl deze route ` +
        `${meta.distance} km is. Het Strava-segment hoort niet bij deze route; ` +
        `upload voor dit event een GPX.`,
    };
  }

  const laps =
    num(event.laps) ??
    lapsFromDistance(num(event.distance_km), meta?.leadInDistance ?? 0, lapKm);

  return {
    ok: true,
    loaded: {
      route: pacingRouteFromZwift({
        profile: row.profile,
        accents: accentsForRoute(row.slug),
        leadInKm: meta?.leadInDistance ?? 0,
        leadInElevationM: meta?.leadInElevation ?? 0,
        lapKm,
        laps,
      }),
      shape: row.shape,
      routeName: row.name,
      world: row.world,
      routeSyncedAt: row.synced_at,
    },
  };
}

function lapsFromDistance(
  eventKm: number | null,
  leadInKm: number,
  lapKm: number,
): number {
  if (!eventKm || lapKm <= 0) return 1;
  return Math.max(1, Math.round((eventKm - leadInKm) / lapKm));
}

async function loadGpxRoute(
  supabase: SupabaseClient,
  event: PacingEventRow,
): Promise<LoadRouteResult> {
  const { data: file, error } = await supabase.storage
    .from("event-gpx")
    .download(event.gpx_path!);

  if (error || !file) {
    return {
      ok: false,
      reason: "profiel-ontbreekt",
      message: "De GPX van dit event kon niet worden gelezen.",
    };
  }

  const points = allTrkptFromGpx(await file.text());
  if (points.length < 2) {
    return { ok: false, reason: "leeg", message: "De GPX bevat geen bruikbare route." };
  }

  const [{ data: overrideRows }, { data: colRows }] = await Promise.all([
    supabase
      .from("event_climbs")
      .select("start_km, end_km, name, category")
      .eq("event_id", event.id)
      .order("position", { ascending: true }),
    supabase
      .from("cols")
      .select("slug, name, summit_lat, summit_lon, detection_radius_m")
      .not("summit_lat", "is", null),
  ]);

  const cols = (colRows ?? []) as ColLite[];
  const overrides = (overrideRows ?? []) as Array<{
    start_km: number | string;
    end_km: number | string;
    name: string | null;
    category: ClimbRange["category"];
  }>;

  // Handmatige bereiken vervangen de detectie volledig, net als in RouteSection.
  const climbs =
    overrides.length > 0
      ? climbsFromRanges(
          points,
          overrides.map((row) => ({
            startKm: Number(row.start_km),
            endKm: Number(row.end_km),
            name: row.name,
            category: row.category,
          })),
          cols,
        )
      : labelClimbsWithCols(detectClimbs(points), points, cols);

  return {
    ok: true,
    loaded: {
      route: pacingRouteFromGpx(sampleRoute(points, climbs), climbs),
      shape: null,
      routeName: null,
      world: null,
      routeSyncedAt: null,
    },
  };
}
