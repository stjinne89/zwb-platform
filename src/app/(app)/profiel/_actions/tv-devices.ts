"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Een gekoppelde tv (0374) ontkoppelen: de tv toont dan weer een code. */
export async function unpairTv(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase.from("tv_devices").delete().eq("id", id).eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profiel");
  return { ok: true as const };
}
