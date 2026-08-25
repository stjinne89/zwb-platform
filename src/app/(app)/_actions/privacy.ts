"use server";

import { revalidatePath } from "next/cache";
import { PRIVACY_STATEMENT_VERSION } from "@/lib/privacy";
import { createClient } from "@/lib/supabase/server";

/**
 * Legt de toestemming vast op de versie die het lid zojuist voorgelegd kreeg.
 *
 * Twee groepen komen hier langs. Leden die nooit iets is voorgelegd — zes van
 * vóór het vinkje bestond (`0063`) en twee die via een magic link binnenkwamen —
 * en leden die tekenden op een verklaring die daarna inhoudelijk is gewijzigd.
 * Bij de backfill in `0138` bleef de eerste groep bewust leeg, want een datum
 * invullen voor iemand die nooit iets is voorgelegd, is de administratie
 * vervalsen. Dit is de nette manier om dat te dichten: het gewoon vragen.
 *
 * `now()` is hier wél de juiste datum, anders dan bij de backfill: het lid geeft
 * de toestemming op dit moment, op de versie van dit moment.
 *
 * Anders dan bij `0138` schrijven we hier zonder `is null`-voorwaarde: een lid
 * dat opnieuw tekent op een nieuwere versie moet de oude waarde juist wél
 * overschrijven. Wat er stond, staat in de audit-log van het profiel.
 */
export async function acceptPrivacyStatement() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("profiles")
    .update({
      privacy_accepted_at: new Date().toISOString(),
      privacy_accepted_version: PRIVACY_STATEMENT_VERSION,
    })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true as const };
}
