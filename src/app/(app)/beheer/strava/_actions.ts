"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { syncStravaActivitiesForUser } from "@/lib/strava/client";
import { syncClimbedColsForUser } from "@/lib/cols/detector";
import { evaluateMilestonesForUser } from "@/lib/achievements/milestone-evaluators";

export type AdminSyncResult =
  | { ok: false; error: string }
  | {
      ok: true;
      upserted: number;
      removed: number;
      totalSeen: number;
      nonCyclingSkipped: number;
      isFirstSync: boolean;
      done: boolean;
      stravaRateLimited: boolean;
      nextPage: number | null;
      afterTs: number;
    };

// Eén chunk van de sync voor een willekeurig lid, getriggerd door een
// beheerder. We houden 'm bewust licht (skipPostProcessing): de zware
// na-stappen (col-detector, segmenttijden, milestone-evaluators) lopen via de
// cron en de "Badges herberekenen"-knop, anders tikt een grote historie tegen
// de Netlify-functietimeout (~10s). Voor de statistieken volstaan de
// geïmporteerde ritten. De client rijgt de chunks aan elkaar.
export async function adminSyncStravaForProfile(options: {
  profileId: string;
  fullBackfill?: boolean;
  startPage?: number;
  afterTs?: number;
  chunkPages?: number;
}): Promise<AdminSyncResult> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false, error: "Niet ingelogd." };
  if (!access.has("community.manage")) {
    return { ok: false, error: "Geen recht om Strava-syncs te starten." };
  }

  const profileId = String(options.profileId ?? "").trim();
  if (!profileId) return { ok: false, error: "Ontbrekend profiel." };

  try {
    const admin = createAdminClient();
    const result = await syncStravaActivitiesForUser(admin, profileId, {
      fullBackfill: options.fullBackfill,
      startPage: options.startPage,
      afterTs: options.afterTs,
      chunkPages: options.chunkPages ?? 5,
      refreshAthleteInfo: options.startPage ? false : true,
      skipPostProcessing: true,
    });

    if (!result.ok) return { ok: false, error: friendlyError(result.error) };

    return {
      ok: true,
      upserted: result.upserted,
      removed: result.removed,
      totalSeen: result.totalSeen,
      nonCyclingSkipped: result.nonCyclingSkipped,
      isFirstSync: result.isFirstSync,
      done: result.done,
      stravaRateLimited: result.stravaRateLimited,
      nextPage: result.nextPage,
      afterTs: result.afterTs,
    };
  } catch (err) {
    return {
      ok: false,
      error: friendlyError(
        err instanceof Error ? err.message : "Strava-sync faalde.",
      ),
    };
  }
}

// Vertaal de ruwe Strava-foutmelding naar iets begrijpelijks. De
// activity:read-401 betekent dat het lid het activiteiten-vinkje niet aanzette;
// dat is alleen op te lossen door opnieuw te koppelen.
function friendlyError(message: string): string {
  if (/activity:read_permission|activity:read/i.test(message)) {
    return "Token mist het activiteiten-recht. Het lid moet Strava opnieuw koppelen en het vinkje voor activiteiten aanzetten.";
  }
  if (/401/.test(message)) {
    return "Strava-token geweigerd (401). Het lid moet Strava opnieuw koppelen.";
  }
  if (/429/.test(message)) {
    return "Strava rate-limit bereikt. Probeer het later opnieuw.";
  }
  return message;
}

export type AdminRecomputeResult =
  | { ok: false; error: string }
  | { ok: true; newCols: number; awarded: number; errors: string[] };

// Beklommen cols opnieuw detecteren + milestone-badges herberekenen voor één
// lid. Beide stappen draaien puur op de al-gesynchroniseerde ritten in de
// database (geen Strava-calls), dus dit is veilig voor iedereen achter elkaar
// te draaien zonder tegen Strava's rate-limit aan te lopen. De client rijgt de
// leden aan elkaar; per call doen we één lid zodat we binnen de Netlify-timeout
// blijven. Segmenttijden (PR's per col) blijven bij de cron en de
// "Badges herberekenen"-knop omdat die wél Strava-detailcalls vereisen.
export async function adminRecomputeBadgesAndCols(
  profileId: string,
): Promise<AdminRecomputeResult> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false, error: "Niet ingelogd." };
  if (!access.has("community.manage")) {
    return { ok: false, error: "Geen recht om badges en cols te herberekenen." };
  }

  const id = String(profileId ?? "").trim();
  if (!id) return { ok: false, error: "Ontbrekend profiel." };

  try {
    const admin = createAdminClient();

    let newCols = 0;
    try {
      const cols = await syncClimbedColsForUser(admin, id);
      newCols = cols.newCols;
    } catch {
      // col-detectie is best-effort; badges draaien sowieso
    }

    const result = await evaluateMilestonesForUser(admin, id);

    return {
      ok: true,
      newCols,
      awarded: result.awarded,
      errors: result.errors,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Badges en cols herberekenen faalde.",
    };
  }
}

// Eén keer aanroepen nadat een bulk-recompute klaar is: ververst de
// afgeleide pagina's zodat de nieuwe badges/cols overal zichtbaar worden.
export async function revalidateAfterRecompute() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.has("community.manage")) return;
  revalidatePath("/achievements");
  revalidatePath("/dashboard");
  revalidatePath("/leden");
  revalidatePath("/stats");
}
