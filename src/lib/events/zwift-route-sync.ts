// Vult de routebibliotheek: per Zwift-fietsroute het hoogteprofiel en de vorm
// uit de streams van het bijbehorende Strava-segment.
//
// Gedraagt zich als calibrateWatopiaCols: een pauze tussen de calls, stoppen bij
// een 429 en rapporteren hoeveel er nog te doen is, zodat een volgende klik
// verdergaat waar deze ophield. Zo blijft één ronde ruim binnen de Netlify-
// functietimeout en binnen de Strava-limieten. Watopia is voor iedereen gelijk,
// dus één sync bedient de hele club en daarna is er geen API-verkeer per lid.

import { routes } from "zwift-data";
import {
  checkProfile,
  elevationGainM,
  fetchSegmentStreams,
  profileFromStreams,
  shapeFromStreams,
} from "@/lib/events/zwift-route-streams";

type SupabaseClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export type RouteSyncOptions = {
  /** Bovengrens op het aantal routes deze ronde. */
  maxFetches?: number;
  /** Wandklokbudget in ms; de lus stopt zodra dit op is. */
  budgetMs?: number;
  /** Ook routes die al een profiel hebben opnieuw ophalen. */
  refreshAll?: boolean;
};

export type RouteSyncResult = {
  /** Routes die deze ronde een profiel kregen. */
  synced: number;
  /** Routes die het niet haalden (opgeslagen met sync_error). */
  failed: number;
  /** Routes die na deze ronde nog zonder profiel staan. */
  remaining: number;
  rateLimited: boolean;
  /** Gestopt omdat het tijdbudget op was, niet omdat het werk klaar is. */
  budgetSpent: boolean;
  notes: string[];
};

const PAUSE_MS = 200;
export const DEFAULT_MAX_FETCHES = 25;
/**
 * Een server action draait op Netlify in een functie van ~10 s. Een route kost
 * ophaal plus pauze, dus een aantal vooraf kiezen is gokken; een wandklokbudget
 * niet. Zelfde aanpak als followZwbMembers in zwift-club.ts.
 */
export const DEFAULT_BUDGET_MS = 7000;

type StoredRow = {
  route_id: number;
  synced_at: string | null;
};

/** Routes waar een pacingplan iets aan heeft: fietsen, met een Strava-segment. */
export function syncableRoutes() {
  return routes.filter(
    (route) => route.sports.includes("cycling") && route.stravaSegmentId,
  );
}

export async function syncZwiftRoutes(
  supabase: SupabaseClient,
  accessToken: string,
  options: RouteSyncOptions = {},
): Promise<RouteSyncResult> {
  const maxFetches = Math.max(1, options.maxFetches ?? DEFAULT_MAX_FETCHES);
  const budgetMs = Math.max(1000, options.budgetMs ?? DEFAULT_BUDGET_MS);
  const deadline = Date.now() + budgetMs;
  const candidates = syncableRoutes();

  const { data, error } = await supabase
    .from("zwift_routes")
    .select("route_id, synced_at");
  if (error) throw new Error(error.message);

  const syncedIds = new Set(
    ((data ?? []) as StoredRow[])
      .filter((row) => row.synced_at)
      .map((row) => Number(row.route_id)),
  );

  const todo = options.refreshAll
    ? candidates
    : candidates.filter((route) => !syncedIds.has(route.id!));

  const result: RouteSyncResult = {
    synced: 0,
    failed: 0,
    remaining: todo.length,
    rateLimited: false,
    budgetSpent: false,
    notes: [],
  };

  for (const route of todo.slice(0, maxFetches)) {
    if (Date.now() >= deadline) {
      result.budgetSpent = true;
      break;
    }
    const segmentId = route.stravaSegmentId!;
    const streams = await fetchSegmentStreams(segmentId, accessToken);

    if (!streams.ok && streams.rateLimited) {
      result.rateLimited = true;
      result.notes.push("Strava rate limit — de volgende ronde gaat verder.");
      break;
    }

    if (!streams.ok) {
      await writeRow(supabase, route, null, null, null, streams.error);
      result.failed += 1;
      result.remaining -= 1;
      continue;
    }

    const profile = profileFromStreams(streams.streams);
    if (!profile) {
      await writeRow(
        supabase,
        route,
        null,
        null,
        null,
        "Streams bevatten geen bruikbaar hoogteprofiel.",
      );
      result.failed += 1;
      result.remaining -= 1;
      continue;
    }

    const shape = shapeFromStreams(streams.streams);
    const check = checkProfile({
      slug: route.slug,
      segmentId,
      expectedKm: route.distance,
      expectedElevationM: route.elevation,
      profile,
      shape,
    });
    // Een afwijkend profiel wordt wél bewaard, maar met de reden erbij: in
    // beheer is dan zichtbaar waar het scheef zit, in plaats van dat het stil
    // in iemands pacingplan verdwijnt.
    if (check.verdict === "afwijkend") {
      result.notes.push(
        `${route.slug}: ${check.streamKm.toFixed(1)} km / ${Math.round(check.streamElevationM)} hm ` +
          `tegen ${route.distance} km / ${route.elevation} hm in zwift-data`,
      );
    }

    await writeRow(
      supabase,
      route,
      profile,
      shape,
      check.verdict,
      check.verdict === "afwijkend" ? "Wijkt af van zwift-data." : null,
    );
    result.synced += 1;
    result.remaining -= 1;

    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  }

  return result;
}

async function writeRow(
  supabase: SupabaseClient,
  route: (typeof routes)[number],
  profile: { distanceM: number[]; altitudeM: number[] } | null,
  shape: { lat: number[]; lon: number[] } | null,
  verdict: "ok" | "afwijkend" | null,
  syncError: string | null,
) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("zwift_routes").upsert(
    {
      route_id: route.id,
      slug: route.slug,
      name: route.name,
      world: route.world,
      strava_segment_id: route.stravaSegmentId ?? null,
      profile,
      shape,
      profile_source: profile ? "strava_segment" : null,
      profile_distance_m: profile ? (profile.distanceM.at(-1) ?? null) : null,
      profile_elevation_m: profile
        ? Number(elevationGainM(profile.altitudeM).toFixed(1))
        : null,
      // Alleen een geslaagde ophaal telt als gesynchroniseerd; anders zou een
      // mislukte route de volgende ronde overgeslagen worden.
      synced_at: verdict ? now : null,
      sync_error: syncError,
      updated_at: now,
    },
    { onConflict: "route_id" },
  );
  if (error) throw new Error(error.message);
}
