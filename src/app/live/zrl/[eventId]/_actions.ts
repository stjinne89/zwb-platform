"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { loadZrlLive } from "@/lib/zrl-live/snapshot";

/** Zet (of wist, bij een leeg veld) het team van één renner voor de hele divisie. */
export async function saveZrlTeamAssignment(formData: FormData) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user || !access.has("teams.manage_results")) return;

  const eventId = String(formData.get("event_id") ?? "");
  const zwiftId = Number(formData.get("zwift_id"));
  const team = String(formData.get("team") ?? "").trim().slice(0, 60);
  if (!Number.isSafeInteger(zwiftId) || zwiftId <= 0) return;

  // Sleutel en renner komen van het event zelf, niet uit het formulier.
  const outcome = await loadZrlLive(eventId);
  if (outcome.status !== "ok") return;
  const { leagueKey } = outcome.view;
  if (!outcome.view.entrants.some((r) => r.athleteId === zwiftId)) return;

  const admin = createAdminClient();
  if (team) {
    await admin.from("zrl_team_assignments").upsert({
      league_key: leagueKey,
      zwift_id: zwiftId,
      team_label: team,
      updated_by: access.user.id,
      updated_at: new Date().toISOString(),
    });
  } else {
    await admin.from("zrl_team_assignments").delete().eq("league_key", leagueKey).eq("zwift_id", zwiftId);
  }
  revalidatePath(`/live/zrl/${eventId}`);
}

/**
 * "Uitslag vastzetten": de race is voorbij, haal de uitslag vers bij Zwift en
 * bevries hem nu in plaats van na 90 minuten. Alleen als alle Zwift-data binnen
 * is; anders komt de reden terug op de pagina. De cron rekent na 90 minuten
 * nog één keer na, dus te vroeg klikken wordt vanzelf rechtgezet.
 */
export async function freezeZrlResultNow(formData: FormData) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user || !access.has("teams.manage_results")) return;

  const eventId = String(formData.get("event_id") ?? "");
  const outcome = await loadZrlLive(eventId, { raceOver: true });
  const status = outcome.status === "ok" ? (outcome.freeze ?? "onbekend") : "Zwift niet bereikbaar";
  revalidatePath(`/live/zrl/${eventId}`);
  redirect(`/live/zrl/${eventId}?vastzetten=${encodeURIComponent(status)}`);
}
