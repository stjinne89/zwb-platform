"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { zwiftId } from "@/lib/profile/ids";

/**
 * Wordt aangeroepen vanuit de dialoog die bij inloggen verschijnt zolang een
 * lid nog geen Zwift-ID heeft. Bewust een eigen action en niet updateProfile:
 * die verwacht het hele profielformulier en zou de rest leegmaken.
 */
export async function saveZwiftId(raw: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const parsed = zwiftId(raw);
  if (!parsed) {
    return {
      ok: false as const,
      error: "Dat is geen geldig Zwift-ID. Vul het nummer in of plak de link naar je ZwiftPower-profiel.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ zwift_id: parsed, zwift_opt_out: false })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profiel");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/** "Ik zwift niet" — de vraag komt daarna niet meer terug. */
export async function skipZwiftId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("profiles")
    .update({ zwift_opt_out: true })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profiel");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
