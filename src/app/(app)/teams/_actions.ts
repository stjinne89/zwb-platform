"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncTeamResults } from "@/lib/team-results/sync";

export async function syncResultsNow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: me, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (error) return { ok: false as const, error: error.message };
  if (!me?.is_admin) {
    return { ok: false as const, error: "Alleen admins kunnen resultaten syncen." };
  }

  try {
    const summary = await syncTeamResults(supabase);
    revalidatePath("/teams");
    revalidatePath("/dashboard");
    revalidatePath("/");
    return { ok: true as const, summary };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Onbekende sync-fout.",
    };
  }
}
