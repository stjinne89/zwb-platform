"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Een lid beheert zijn eigen citaten. Geen tussenkomst van beheer nodig — dat
 * is de afspraak in /voorwaarden en de reden dat citaten hun profile_id houden.
 * De RLS staat dit alleen toe op eigen rijen; de eq() hieronder is de tweede
 * grendel.
 */
export async function updateMyQuote(id: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const trimmed = body.trim();
  if (trimmed.length < 3) {
    return { ok: false as const, error: "Een citaat van niets kunnen we niet tonen." };
  }
  if (trimmed.length > 600) {
    return { ok: false as const, error: "Maximaal 600 tekens." };
  }

  const { error } = await supabase
    .from("maintenance_tips")
    .update({ body: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profiel");
  revalidatePath("/mijn-garage");
  return { ok: true as const };
}

export async function deleteMyQuote(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("maintenance_tips")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profiel");
  revalidatePath("/mijn-garage");
  return { ok: true as const };
}
