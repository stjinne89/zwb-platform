// De request-gebonden laag van het pacingplan: alles wat een ingelogd lid op één
// event mag doen. Hier zitten de permissiechecks en de databaseclients; de
// modules eronder blijven puur of alleen-I/O.
//
// Blauwdruk: src/lib/training/draft.ts, waar `generateAiDraftFromForm` en
// `pollAiDraft` dezelfde rol vervullen voor de trainingsschema's.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { rateLimitHit } from "@/lib/rate-limit";
import {
  buildPacingContext,
  loadRideHistory,
  loadRiderContext,
  totalElevation,
  type RiderContext,
} from "@/lib/pacing/draft";
import { scoreSimilarRides, type ScoredRide } from "@/lib/pacing/similarity";
import {
  loadPacingRoute,
  type LoadedRoute,
  type PacingEventRow,
} from "@/lib/pacing/route-loader";
import {
  ensureBaselinePlan,
  pollGeneration,
  readPlan,
  startGeneration,
  type StoredPlan,
} from "@/lib/pacing/store";
import { checkStaleness, type Staleness } from "@/lib/pacing/staleness";
import { sharedPlanView, type SharedPlanView } from "@/lib/pacing/share";

const EVENT_COLUMNS =
  "id, title, type, start_at, gpx_path, distance_km, elevation_m, zwift_event_id, zwift_route_id, laps";

/** Hoogstens vijf generaties per lid per uur; een AI-call kost geld. */
const GENERATION_LIMIT = 5;
const GENERATION_WINDOW_S = 3600;

type Loaded = {
  userId: string;
  displayName: string;
  admin: ReturnType<typeof createAdminClient>;
  event: PacingEventRow;
  loaded: LoadedRoute;
  rider: RiderContext;
};

async function loadForUser(
  eventId: string,
): Promise<{ ok: true; ctx: Loaded } | { ok: false; error: string }> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false, error: "Niet ingelogd." };

  const admin = createAdminClient();
  const { data: eventRow } = await admin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle();
  if (!eventRow) return { ok: false, error: "Event bestaat niet." };

  const event = eventRow as PacingEventRow;
  const routeResult = await loadPacingRoute(admin, event);
  if (!routeResult.ok) return { ok: false, error: routeResult.message };

  const [rider, profileRow] = await Promise.all([
    loadRiderContext(admin, access.user.id),
    admin.from("profiles").select("display_name").eq("id", access.user.id).maybeSingle(),
  ]);

  return {
    ok: true,
    ctx: {
      userId: access.user.id,
      displayName:
        (profileRow.data as { display_name?: string } | null)?.display_name ?? "Renner",
      admin,
      event,
      loaded: routeResult.loaded,
      rider,
    },
  };
}

export type PacingPageData = {
  event: PacingEventRow;
  loaded: LoadedRoute;
  rider: RiderContext;
  plan: StoredPlan;
  staleness: Staleness;
  sharedPlans: SharedPlanView[];
  similarRides: ScoredRide[];
  userId: string;
};

/**
 * Alles wat de pacingpagina nodig heeft. Bestaat er nog geen plan, dan wordt het
 * deterministische voorstel meteen gemaakt en bewaard — een lid dat de pagina
 * opent hoort een plan te zien, niet een knop om er een te vragen.
 */
export async function loadPacingPage(
  eventId: string,
): Promise<{ ok: true; data: PacingPageData } | { ok: false; error: string }> {
  const result = await loadForUser(eventId);
  if (!result.ok) return result;
  const { ctx } = result;

  // Het eerste wat deze pagina doet is naar de database schrijven. Staat migratie
  // 0146 nog niet uitgerold, dan hoort daar een leesbare melding uit te komen en
  // geen foutpagina — een lid dat op "Pacingplan" klikt moet weten wat er scheelt.
  let plan: StoredPlan;
  try {
    plan = await ensureBaselinePlan(ctx.admin, {
      eventId,
      profileId: ctx.userId,
      route: ctx.loaded.route,
      rider: ctx.rider,
      routeSyncedAt: ctx.loaded.routeSyncedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/event_pacing_plans/.test(message)) {
      return {
        ok: false,
        error: "De pacingtabellen staan nog niet in de database (migratie 0146).",
      };
    }
    return { ok: false, error: message || "Het pacingplan kon niet worden geladen." };
  }

  const staleness = checkStaleness(plan.assumptions, {
    cpWatts: ctx.rider.model.cpWatts,
    wPrimeJoules: ctx.rider.model.wPrimeJoules,
    ftpWatts: ctx.rider.ftpWatts,
    weightKg: ctx.rider.model.weightKg,
    routeSyncedAt: ctx.loaded.routeSyncedAt,
  });

  const [sharedPlans, similarRides] = await Promise.all([
    loadSharedPlans(ctx.admin, eventId, ctx.userId),
    loadSimilarRides(ctx.admin, ctx.userId, ctx.loaded, plan),
  ]);

  return {
    ok: true,
    data: {
      event: ctx.event,
      loaded: ctx.loaded,
      rider: ctx.rider,
      plan,
      staleness,
      sharedPlans,
      similarRides,
      userId: ctx.userId,
    },
  };
}

/**
 * De ritten waar dit parcours op lijkt. De verwachte duur komt uit het
 * opgeslagen plan, zodat "vergelijkbare rijduur" op jóuw plan slaat en niet op
 * een gemiddelde.
 */
async function loadSimilarRides(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  loaded: LoadedRoute,
  plan: StoredPlan,
): Promise<ScoredRide[]> {
  const longestClimbKm = loaded.route.accents
    .filter((accent) => accent.kind === "climb")
    .reduce((longest, accent) => Math.max(longest, accent.endKm - accent.startKm), 0);

  return scoreSimilarRides(
    {
      distanceKm: loaded.route.totalKm,
      elevationM: totalElevation(loaded.route),
      longestClimbKm: longestClimbKm > 0 ? longestClimbKm : null,
      expectedSeconds: plan.summary?.totalSeconds ?? null,
    },
    await loadRideHistory(admin, userId),
  );
}

/**
 * De gedeelde plannen van clubgenoten op dit event. Gaat via de service-role
 * client omdat we er de namen bij ophalen, maar filtert expliciet op `shared` en
 * op "niet van mezelf" — de RLS-regel staat hetzelfde toe, dit is de tweede sleutel.
 */
async function loadSharedPlans(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  userId: string,
): Promise<SharedPlanView[]> {
  const { data } = await admin
    .from("event_pacing_plans")
    .select("*")
    .eq("event_id", eventId)
    .eq("shared", true)
    .neq("profile_id", userId);

  const plans = (data ?? []) as StoredPlan[];
  if (plans.length === 0) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .in(
      "id",
      plans.map((plan) => plan.profile_id),
    );

  const names = new Map(
    ((profiles ?? []) as Array<{ id: string; display_name: string | null }>).map(
      (row) => [row.id, row.display_name ?? "Clubgenoot"],
    ),
  );

  return plans.map((plan) =>
    sharedPlanView(plan, names.get(plan.profile_id) ?? "Clubgenoot"),
  );
}

/** Start een AI-generatie voor dit event. Geeft alleen een id terug; de pagina pollt. */
export async function startPacingDraft(
  eventId: string,
  goal?: string | null,
): Promise<
  { ok: true; generationId: string } | { ok: false; error: string }
> {
  const result = await loadForUser(eventId);
  if (!result.ok) return result;
  const { ctx } = result;

  const limit = await rateLimitHit(
    "pacing_generate",
    ctx.userId,
    GENERATION_LIMIT,
    GENERATION_WINDOW_S,
  );
  if (!limit.allowed) {
    return {
      ok: false,
      error: "Je hebt dit uur al vijf voorstellen laten maken. Probeer het later opnieuw.",
    };
  }

  try {
    const context = await buildPacingContext(ctx.admin, {
      profileId: ctx.userId,
      athleteName: ctx.displayName,
      event: ctx.event,
      route: ctx.loaded.route,
      goal,
    });

    const { generationId } = await startGeneration(ctx.admin, {
      eventId,
      profileId: ctx.userId,
      aiInput: context.input,
    });
    return { ok: true, generationId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Voorstel maken faalde.",
    };
  }
}

export async function pollPacingDraft(
  eventId: string,
  generationId: string,
): Promise<
  | { ok: true; status: "queued" | "in_progress" | "completed" }
  | { ok: false; error: string }
> {
  const result = await loadForUser(eventId);
  if (!result.ok) return result;
  const { ctx } = result;

  try {
    const polled = await pollGeneration(ctx.admin, {
      generationId,
      profileId: ctx.userId,
      eventId,
      route: ctx.loaded.route,
      rider: ctx.rider,
      routeSyncedAt: ctx.loaded.routeSyncedAt,
    });
    if (polled.status === "failed") return { ok: false, error: polled.error };
    return { ok: true, status: polled.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Status ophalen faalde.",
    };
  }
}

/** Het opgeslagen plan van dit lid, of null. Voor het weerblok op de eventpagina. */
export async function readOwnPlan(
  eventId: string,
  userId: string,
): Promise<StoredPlan | null> {
  return readPlan(createAdminClient(), eventId, userId);
}

export { loadForUser };
