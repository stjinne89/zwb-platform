"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { syncSrcCalendar } from "@/lib/src/sync";

const MANAGERS = ["events.manage_all", "community.manage"] as const;

/** De knop "Nu verversen": haalt de SRC-agenda op en zet nieuwe zondagen erin. */
export async function refreshSrcCalendar() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.hasAny(MANAGERS)) {
    return { ok: false as const, error: "Geen recht om de SRC-kalender te vullen." };
  }

  const result = await syncSrcCalendar(createAdminClient(), {
    createdBy: access.user.id,
    forceResults: true,
  });
  revalidatePath("/kalender");
  revalidatePath("/beheer/src");
  revalidatePath("/events/[id]", "page");
  if (result.error) return { ok: false as const, error: result.error };
  return { ok: true as const, result };
}

/**
 * Een SRC-team aanmaken of hernoemen (migr. 0201). De MyWhoosh-teamnaam is de
 * naam waaronder de renners zich inschrijven; die koppelt later de uitslag.
 */
export async function saveSrcTeam(input: { id?: string; name: string; mywhooshTeamName: string }) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.hasAny(["teams.manage_roster", ...MANAGERS])) {
    return { ok: false as const, error: "Geen recht om SRC-teams te beheren." };
  }

  const name = input.name.trim();
  const teamName = input.mywhooshTeamName.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false as const, error: "Geef het team een naam." };
  if (!teamName) return { ok: false as const, error: "Vul de teamnaam bij MyWhoosh in." };

  const admin = createAdminClient();
  const { error } = input.id
    ? await admin
        .from("teams")
        .update({ name, mywhoosh_team_name: teamName })
        .eq("id", input.id)
        .eq("type", "src")
    : await admin.from("teams").insert({ name, type: "src", mywhoosh_team_name: teamName });
  if (error) {
    return {
      ok: false as const,
      error: error.code === "23505" ? "Die MyWhoosh-teamnaam bestaat al." : error.message,
    };
  }
  revalidatePath("/beheer/src");
  revalidatePath("/src");
  revalidatePath("/teams");
  return { ok: true as const };
}

/**
 * Koppelt een renner uit de SRC-uitslag aan een lid (migr. 0202): zijn
 * MyWhoosh-id gaat in het profiel, en de uitslagen matchen daarna alleen nog
 * daarop.
 */
export async function linkSrcRider(mywhooshUserId: string, profileId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.hasAny(["teams.manage_roster", ...MANAGERS])) {
    return { ok: false as const, error: "Geen recht om renners te koppelen." };
  }
  const userId = mywhooshUserId.trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/.test(userId)) return { ok: false as const, error: "Ongeldig MyWhoosh-id." };

  const admin = createAdminClient();
  const { data: taken } = await admin
    .from("profiles")
    .select("id, display_name")
    .ilike("mywhoosh_id", userId)
    .neq("id", profileId)
    .maybeSingle();
  if (taken) {
    return { ok: false as const, error: `Al gekoppeld aan ${taken.display_name}.` };
  }

  const { error } = await admin.from("profiles").update({ mywhoosh_id: userId }).eq("id", profileId);
  if (error) return { ok: false as const, error: error.message };
  await admin
    .from("src_results")
    .update({ profile_id: profileId, suggested_profile_id: null })
    .eq("mywhoosh_user_id", userId);
  // Een ander voorstel voor hetzelfde lid klopt nu niet meer.
  await admin
    .from("src_results")
    .update({ suggested_profile_id: null })
    .eq("suggested_profile_id", profileId)
    .neq("mywhoosh_user_id", userId);

  revalidatePath("/beheer/src");
  revalidatePath("/src");
  revalidatePath("/events/[id]", "page");
  return { ok: true as const };
}
