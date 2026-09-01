"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { routes } from "zwift-data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { accessTokenFor, type StravaConnection } from "@/lib/strava/client";
import {
  checkProfile,
  fetchSegmentStreams,
  profileFromStreams,
  shapeFromStreams,
  type ProfileCheck,
} from "@/lib/events/zwift-route-streams";
import { syncZwiftRoutes } from "@/lib/events/zwift-route-sync";

/**
 * Routes voor de spike: vlak, een HC-klim, lang en gevarieerd, en rollend. Als
 * de streams voor deze vier kloppen, klopt de aanpak.
 */
const SPIKE_SLUGS = [
  "tempus-fugit",
  "road-to-sky",
  "the-mega-pretzel",
  "watopias-waistband",
] as const;

const PAUSE_MS = 300;

async function requireRouteAccess() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return null;
  if (!access.has("events.manage_all")) return null;
  return { userId: access.user.id, admin: createAdminClient() };
}

function report(kind: "spike" | "sync", lines: string[]): never {
  const params = new URLSearchParams();
  params.set(kind, "done");
  params.set("message", lines.join("\n"));
  redirect(`/beheer/zwift-routes?${params.toString()}`);
}

/**
 * De Strava-token van de beheerder die op de knop drukt. Watopia is voor
 * iedereen gelijk, dus welke token het is doet er niet toe — het gaat om
 * segmentdata, niet om persoonlijke ritten.
 */
async function adminStravaToken(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ token: string } | { error: string }> {
  const { data: connection, error } = await admin
    .from("strava_connections")
    .select("profile_id, strava_athlete_id, access_token, refresh_token, expires_at")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) return { error: `Kon de Strava-koppeling niet lezen: ${error.message}` };
  if (!connection) {
    return { error: "Koppel eerst je eigen Strava-account; de routes komen uit de Strava-segment-API." };
  }

  try {
    return { token: await accessTokenFor(admin, connection as StravaConnection) };
  } catch (err) {
    return {
      error: `Strava-token vernieuwen faalde: ${err instanceof Error ? err.message : "onbekend"}`,
    };
  }
}

function checkLine(check: ProfileCheck): string {
  const sign = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  return [
    `${check.verdict === "ok" ? "OK " : "LET OP"} ${check.slug} (segment ${check.segmentId})`,
    `   afstand ${check.streamKm.toFixed(2)} km vs ${check.expectedKm} km (${sign(check.kmDeltaPct)})`,
    `   hoogte  ${Math.round(check.streamElevationM)} m vs ${check.expectedElevationM} m (${sign(check.elevationDeltaPct)})`,
    `   ${check.points} profielpunten, vorm ${check.hasShape ? "aanwezig" : "ONTBREEKT"}`,
  ].join("\n");
}

/**
 * Fase 0-spike: geeft Strava bruikbare altitude- en latlng-streams terug voor
 * virtuele Zwift-segmenten? Read-only; schrijft niets in de bibliotheek. Blijft
 * staan als diagnose wanneer een route later scheef gaat.
 */
export async function runRouteProfileSpike() {
  const access = await requireRouteAccess();
  if (!access) return;

  const token = await adminStravaToken(access.admin, access.userId);
  if ("error" in token) report("spike", [token.error]);

  const lines: string[] = [];
  for (const slug of SPIKE_SLUGS) {
    const route = routes.find((item) => item.slug === slug);
    if (!route?.stravaSegmentId) {
      lines.push(`?  ${slug}: geen route met stravaSegmentId in zwift-data`);
      continue;
    }

    const result = await fetchSegmentStreams(route.stravaSegmentId, token.token);
    if (!result.ok) {
      lines.push(
        result.rateLimited
          ? `!  ${slug}: Strava rate limit — probeer over een kwartier opnieuw`
          : `!  ${slug}: ${result.error}`,
      );
      if (result.rateLimited) break;
      continue;
    }

    const profile = profileFromStreams(result.streams);
    if (!profile) {
      lines.push(`!  ${slug}: streams bevatten geen bruikbaar hoogteprofiel`);
      continue;
    }

    lines.push(
      checkLine(
        checkProfile({
          slug,
          segmentId: route.stravaSegmentId,
          expectedKm: route.distance,
          expectedElevationM: route.elevation,
          profile,
          shape: shapeFromStreams(result.streams),
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  }

  report("spike", lines.length > 0 ? lines : ["Geen routes gecontroleerd."]);
}

/**
 * Vult de routebibliotheek in porties. Eén klik doet er maximaal
 * DEFAULT_MAX_FETCHES; klik opnieuw om verder te gaan.
 */
export async function syncRouteLibrary(formData: FormData) {
  const access = await requireRouteAccess();
  if (!access) return;

  const token = await adminStravaToken(access.admin, access.userId);
  if ("error" in token) report("sync", [token.error]);

  const refreshAll = formData.get("refresh_all") === "1";

  let result;
  try {
    result = await syncZwiftRoutes(access.admin, token.token, { refreshAll });
  } catch (err) {
    report("sync", [
      `Sync mislukt: ${err instanceof Error ? err.message : "onbekende fout"}`,
    ]);
  }

  revalidatePath("/beheer/zwift-routes");

  const lines = [
    `${result.synced} route(s) opgehaald, ${result.failed} mislukt, ${result.remaining} nog te doen.`,
  ];
  if (result.rateLimited) {
    lines.push("Gestopt op de Strava rate limit — klik over een kwartier opnieuw.");
  } else if (result.remaining > 0) {
    lines.push(
      result.budgetSpent
        ? "Gestopt op het tijdbudget. Klik nogmaals om verder te gaan."
        : "Klik nogmaals om verder te gaan.",
    );
  }
  lines.push(...result.notes);

  report("sync", lines);
}
