// Rondjes maken bij een geplande training, en ze bewaren.
//
// Volgorde: doel bepalen (hoe lang en hoe zwaar) -> wind ophalen -> per
// windvariant keerpunten zetten en een route laten plannen -> scoren -> de beste
// bewaren. Alles wat een oordeel is zit in outdoor-target.ts en roundtrip.ts en
// is daar getest; hier staat alleen de volgorde en het opslaan.
//
// Budget: dit draait in een server action, en die heeft op Netlify ~10 s. Drie
// routeplanner-calls passen daar niet gegarandeerd in, dus we stoppen bij een
// wandklokbudget en bewaren wat er wél klaar was -- zelfde aanpak als
// syncZwiftRoutes en followZwbMembers. Eén bruikbaar rondje is beter dan een
// time-out.

import type { createAdminClient } from "@/lib/supabase/admin";
import type { GpxPoint } from "@/lib/gpx";
import { routeAlong } from "@/lib/outdoor/router";
import { roundTripWaypoints, routeVariants } from "@/lib/outdoor/roundtrip";
import {
  OUTDOOR_FLOOR_PCT,
  routeTargetForSession,
  scoreOutdoorRoute,
  type OutdoorAthlete,
} from "@/lib/training/outdoor-target";
import type { WorkoutIntensity } from "@/lib/training/workouts";
import { fetchWindForecast } from "@/lib/weather";

type Admin = ReturnType<typeof createAdminClient>;

/** Laat ruimte voor de database-schrijfronde binnen de functietimeout. */
export const GENERATE_BUDGET_MS = 7000;

export type StartPoint = { id: string; label: string; lat: number; lon: number };

export type GenerateInput = {
  workoutId: string;
  profileId: string;
  startPoint: StartPoint;
  session: { scheduledAt: string; durationMinutes: number; intensity: WorkoutIntensity };
  athlete: OutdoorAthlete;
};

export type GenerateResult =
  | { ok: true; saved: number; notes: string[] }
  | { ok: false; error: string };

type Candidate = {
  variant: string;
  headingDeg: number;
  rationale: string;
  points: GpxPoint[];
  scorePct: number;
  estimatedMinutes: number;
  distanceKm: number;
  elevationM: number;
  summary: string;
  windNote: string | null;
};

export async function generateOutdoorRoutes(
  admin: Admin,
  input: GenerateInput,
  options: { budgetMs?: number; now?: Date } = {},
): Promise<GenerateResult> {
  const deadline = Date.now() + Math.max(2000, options.budgetMs ?? GENERATE_BUDGET_MS);

  const target = routeTargetForSession(input.session, input.athlete);
  if (!target) {
    return {
      ok: false,
      error: "Vul je FTP en gewicht in op je profiel, anders is elke afstand een gok.",
    };
  }

  // Eén windvoorspelling voor het vertrekpunt op het tijdstip van de training.
  // Mislukt dat, dan gaan we door zonder wind: de varianten worden dan gewoon
  // drie verschillende kanten op, en de windscore telt niet mee.
  const wind = await fetchWindForecast(
    input.startPoint.lat,
    input.startPoint.lon,
    new Date(input.session.scheduledAt),
  ).catch(() => null);

  const variants = routeVariants({
    directionFromDeg: wind?.windDirectionFrom ?? null,
    speedKmh: wind?.windSpeedKmh ?? null,
  });

  const candidates: Candidate[] = [];
  const notes: string[] = [];

  for (const variant of variants) {
    if (Date.now() >= deadline) {
      notes.push("Tijd op — niet alle varianten zijn geprobeerd.");
      break;
    }

    const waypoints = roundTripWaypoints(input.startPoint, target.distanceKm, variant.headingDeg);
    const route = await routeAlong(waypoints, {
      // Wat er van het budget over is, met een bovengrens zodat één trage call
      // niet alles opslokt.
      timeoutMs: Math.min(6000, Math.max(1500, deadline - Date.now())),
    });
    if (!route.ok) {
      notes.push(`${variant.rationale || "Variant"}: ${route.error}`);
      continue;
    }

    const judged = scoreOutdoorRoute(route.points, target, input.athlete, {
      directionFromDeg: wind?.windDirectionFrom ?? null,
      speedKmh: wind?.windSpeedKmh ?? null,
    });
    if (!judged) continue;

    candidates.push({
      variant: variant.key,
      headingDeg: Math.round(variant.headingDeg),
      rationale: variant.rationale,
      points: route.points,
      scorePct: judged.scorePct,
      estimatedMinutes: judged.estimatedMinutes,
      distanceKm: judged.summary.distanceKm,
      elevationM: judged.summary.elevationM,
      // Bewust de terreinregel en niet het sterkste punt: de kop van de kaart
      // toont al afstand, hoogtemeters en tijd, dus "60 km, ongeveer 118 min"
      // eronder zetten herhaalt alleen zichzelf. Hoe heuvelachtig het rondje is
      // tegenover wat de training vroeg staat er nergens anders.
      summary: judged.scores.find((score) => score.dimension === "terrein")?.note ?? "",
      windNote:
        judged.scores.find((score) => score.dimension === "wind")?.note ??
        (variant.rationale || null),
    });
  }

  const keepers = candidates
    .filter((candidate) => candidate.scorePct >= OUTDOOR_FLOOR_PCT)
    .sort((a, b) => b.scorePct - a.scorePct);

  if (keepers.length === 0) {
    return {
      ok: false,
      error:
        candidates.length > 0
          ? "Geen rondje gevonden dat goed genoeg bij deze training past."
          : notes[0] ?? "De routeplanner gaf geen bruikbare route terug.",
    };
  }

  // Vervangen, niet stapelen: een tweede keer vragen hoort een nieuw antwoord te
  // geven en niet een langere lijst.
  const { error: deleteError } = await admin
    .from("outdoor_route_suggestions")
    .delete()
    .eq("workout_id", input.workoutId);
  if (deleteError) return { ok: false, error: deleteError.message };

  const { error } = await admin.from("outdoor_route_suggestions").insert(
    keepers.map((candidate) => ({
      workout_id: input.workoutId,
      profile_id: input.profileId,
      start_point_id: input.startPoint.id,
      variant: candidate.variant,
      heading_deg: candidate.headingDeg,
      distance_km: Number(candidate.distanceKm.toFixed(1)),
      elevation_m: candidate.elevationM,
      estimated_minutes: candidate.estimatedMinutes,
      score_pct: candidate.scorePct,
      summary: candidate.summary,
      wind_note: candidate.windNote,
      geometry: {
        lat: candidate.points.map((point) => Number(point.lat.toFixed(5))),
        lon: candidate.points.map((point) => Number(point.lon.toFixed(5))),
        ele: candidate.points.map((point) =>
          point.ele === undefined ? null : Math.round(point.ele),
        ),
      },
      generated_at: (options.now ?? new Date()).toISOString(),
    })),
  );
  if (error) return { ok: false, error: error.message };

  return { ok: true, saved: keepers.length, notes };
}

// --- Lezen ----------------------------------------------------------------

export type OutdoorRouteRow = {
  id: string;
  workout_id: string;
  variant: string;
  distance_km: number | string;
  elevation_m: number;
  estimated_minutes: number;
  score_pct: number;
  summary: string | null;
  wind_note: string | null;
  chosen_at: string | null;
  start_point_id: string | null;
};

export async function loadOutdoorSuggestions(
  admin: Admin,
  profileId: string,
  workoutIds: string[],
): Promise<Map<string, OutdoorRouteRow[]>> {
  const byWorkout = new Map<string, OutdoorRouteRow[]>();
  if (workoutIds.length === 0) return byWorkout;

  const { data, error } = await admin
    .from("outdoor_route_suggestions")
    .select(
      "id, workout_id, variant, distance_km, elevation_m, estimated_minutes, score_pct, summary, wind_note, chosen_at, start_point_id",
    )
    .eq("profile_id", profileId)
    .in("workout_id", workoutIds)
    .order("score_pct", { ascending: false });

  if (error) {
    console.error("[outdoor-suggestions] laden mislukt", error.message);
    return byWorkout;
  }

  for (const row of (data ?? []) as OutdoorRouteRow[]) {
    byWorkout.set(row.workout_id, [...(byWorkout.get(row.workout_id) ?? []), row]);
  }
  return byWorkout;
}

export async function loadStartPoints(admin: Admin, profileId: string): Promise<StartPoint[]> {
  const { data, error } = await admin
    .from("profile_start_points")
    .select("id, label, lat, lon")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[outdoor-suggestions] vertrekpunten laden mislukt", error.message);
    return [];
  }
  return ((data ?? []) as Array<{ id: string; label: string; lat: number | string; lon: number | string }>).map(
    (row) => ({ id: row.id, label: row.label, lat: Number(row.lat), lon: Number(row.lon) }),
  );
}

/** De opgeslagen lijn als GPX, zodat het lid hem op zijn fietscomputer krijgt. */
export function routeToGpx(
  name: string,
  geometry: { lat: number[]; lon: number[]; ele: Array<number | null> },
): string {
  const escaped = name.replace(/[<>&]/g, (char) =>
    char === "<" ? "&lt;" : char === ">" ? "&gt;" : "&amp;",
  );
  const points = geometry.lat
    .map((lat, index) => {
      const lon = geometry.lon[index];
      if (lat === undefined || lon === undefined) return "";
      const ele = geometry.ele?.[index];
      return `      <trkpt lat="${lat}" lon="${lon}">${
        ele === null || ele === undefined ? "" : `<ele>${ele}</ele>`
      }</trkpt>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ZWB Cycling" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escaped}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}
