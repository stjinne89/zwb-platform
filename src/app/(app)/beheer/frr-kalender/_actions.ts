"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { FRR_TAG_PATTERN } from "@/lib/frr/feed";
import { FRR_TOUR_COLUMNS, type FrrTourRow } from "@/lib/frr/import";
import { syncFrrTour } from "@/lib/frr/sync";
import { syncStageResults } from "@/lib/frr/stage-results";
import { adminAreaPermission } from "@/lib/admin-areas";


async function requireManager() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has(adminAreaPermission("frr"))) {
    return { ok: false as const, error: "Geen recht om de FRR-kalender te vullen." };
  }
  return { ok: true as const, userId: access.user.id };
}

function revalidate() {
  revalidatePath("/kalender");
  revalidatePath("/beheer/frr-kalender");
  revalidatePath("/events/[id]", "page");
}

/**
 * Legt een tour vast (of werkt naam en GC-code bij) en zet hem meteen in de
 * kalender. Opnieuw opslaan vult alleen aan.
 */
export async function saveFrrTour(input: { name: string; tag: string; gcCode: string }) {
  const guard = await requireManager();
  if (!guard.ok) return guard;

  const name = input.name.trim();
  const tag = input.tag.trim().toLowerCase().replace(/^#/, "");
  const gcCode = input.gcCode.trim() || null;
  if (!name) return { ok: false as const, error: "Geef de tour een naam." };
  if (!FRR_TAG_PATTERN.test(tag)) {
    return { ok: false as const, error: "De tag begint met frr, bijvoorbeeld frrignite." };
  }
  if (gcCode && !/^[A-Za-z0-9]+(\.[A-Za-z0-9]+)?$/.test(gcCode)) {
    return { ok: false as const, error: "Ongeldige GC-code." };
  }

  const admin = createAdminClient();
  const { data: known } = await admin
    .from("frr_tours")
    .select("id")
    .eq("zwift_tag", tag)
    .maybeSingle();
  const { data, error } = known
    ? await admin
        .from("frr_tours")
        .update({ name, gc_code: gcCode })
        .eq("id", known.id)
        .select(FRR_TOUR_COLUMNS)
        .single()
    : await admin
        .from("frr_tours")
        .insert({ name, zwift_tag: tag, gc_code: gcCode, created_by: guard.userId })
        .select(FRR_TOUR_COLUMNS)
        .single();
  if (error) return { ok: false as const, error: error.message };

  const result = await syncFrrTour(admin, data as FrrTourRow, {
    force: Boolean(gcCode),
    createdBy: guard.userId,
  });
  revalidate();
  if (result.error) return { ok: false as const, error: result.error };
  return { ok: true as const, result };
}

/** De knop "Nu verversen": tijdsloten, inschrijvingen en klassement. */
export async function refreshFrrTour(tourId: string) {
  const guard = await requireManager();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("frr_tours")
    .select(FRR_TOUR_COLUMNS)
    .eq("id", tourId)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Tour niet gevonden." };

  const result = await syncFrrTour(admin, data as FrrTourRow, {
    force: true,
    createdBy: guard.userId,
  });
  revalidate();
  if (result.error) return { ok: false as const, error: result.error };
  return { ok: true as const, result };
}

/** Ruim onder de 60 seconden van de pagina. */
const STAGE_RESULTS_BUDGET_MS = 50_000;

/**
 * De knop "Uitslagen ophalen": alleen de finishtijden per tijdslot (migr. 0215),
 * met het hele tijdbudget. In Nu verversen gaan de inschrijvingen voor; die
 * verbruiken zowel de tijd als de limiet van Zwift.
 */
export async function fetchFrrStageResults(tourId: string) {
  const guard = await requireManager();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  const { data, error } = await admin.from("frr_tours").select("id").eq("id", tourId).maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Tour niet gevonden." };

  try {
    const result = await syncStageResults(admin, tourId, {
      now: new Date(),
      deadline: Date.now() + STAGE_RESULTS_BUDGET_MS,
      all: true,
    });
    revalidatePath("/events/[id]", "page");
    return { ok: true as const, result };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Etappe-uitslagen mislukt.",
    };
  }
}
