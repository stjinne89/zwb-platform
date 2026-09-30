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

  const result = await syncSrcCalendar(createAdminClient(), { createdBy: access.user.id });
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
