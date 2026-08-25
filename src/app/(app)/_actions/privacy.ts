"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Legt alsnog de toestemming vast van een lid dat er nooit om gevraagd is.
 *
 * Acht leden gebruiken de app zonder vastgelegde toestemming: zes van vóór het
 * vinkje bestond (`0063`, 31 mei 2026) en twee die via een magic link
 * binnenkwamen, waar geen privacyverklaring bij hoort. Bij de backfill in `0138`
 * zijn die bewust leeg gelaten — een datum invullen voor iemand die nooit iets
 * is voorgelegd, is de administratie vervalsen. Dit is de enige nette manier om
 * dat gat te dichten: het gewoon vragen.
 *
 * `now()` is hier wél de juiste datum, anders dan bij de backfill: het lid geeft
 * de toestemming op dit moment.
 *
 * De `is null`-voorwaarde maakt dit onschadelijk bij dubbel klikken en zorgt dat
 * een bestaande toestemmingsdatum nooit wordt overschreven.
 */
export async function acceptPrivacyStatement() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("profiles")
    .update({ privacy_accepted_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("privacy_accepted_at", null);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true as const };
}
