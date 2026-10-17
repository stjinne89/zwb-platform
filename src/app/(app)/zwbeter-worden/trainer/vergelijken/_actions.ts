"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { canCoach } from "@/lib/training/coach-access";
import { engineSide, parseChoice, REASON_MAX, winnerOf } from "@/lib/training/engine-comparison";

/**
 * Slaat het oordeel van een trainer op. De kant van de motor rekent de server
 * zelf uit het generatie-id; uit het formulier komt alleen "a", "b" of "gelijk".
 * Eén oordeel per generatie: een tweede poging na het ontblinden wordt geweigerd.
 */
export async function saveEngineComparison(formData: FormData) {
  try {
    const supabase = await createClient();
    const access = await getCurrentUserAccess(supabase);
    if (!access.user) throw new Error("Niet ingelogd.");
    if (!access.has("training.view_assigned")) throw new Error("Geen trainer-rechten.");

    const generationId = String(formData.get("generation_id") ?? "");
    const choice = parseChoice(formData.get("choice"));
    if (!generationId || !choice) throw new Error("Kies A, B of gelijk.");
    const reason = String(formData.get("reason") ?? "").trim().slice(0, REASON_MAX) || null;

    const admin = createAdminClient();
    const { data: generation } = await admin
      .from("training_ai_generations")
      .select("id, profile_id")
      .eq("id", generationId)
      .maybeSingle();
    if (!generation) throw new Error("Generatie niet gevonden.");
    if (!(await canCoach(admin, access.user.id, generation.profile_id))) {
      throw new Error("Geen trainer-toegang voor dit lid.");
    }

    const side = engineSide(generationId);
    // Via de client van de trainer, zodat de RLS van 0247 ook meetelt.
    const { error } = await supabase.from("training_engine_comparisons").insert({
      generation_id: generationId,
      profile_id: generation.profile_id,
      trainer_id: access.user.id,
      winner: winnerOf(choice, side),
      engine_side: side,
      reason,
    });
    if (error) {
      throw new Error(error.code === "23505" ? "Al beoordeeld." : "Opslaan mislukt.");
    }

    revalidatePath("/zwbeter-worden/trainer/vergelijken");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Opslaan mislukt." };
  }
}
