"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { parseWtrlTeams } from "@/lib/teams/wtrl-roster";
import { saveWtrlTeams, syncTeamMembership } from "@/lib/teams/wtrl-save";
import { adminAreaPermission } from "@/lib/admin-areas";

export type WtrlImportInput = {
  text: string;
  /** TRC-referentie → ZWB-team (of null: niet koppelen). */
  mapping: Record<string, string | null>;
};

/**
 * Slaat de geplakte WTRL-teams op. Per team vervangt dit de renners; de
 * koppeling aan een ZWB-team komt uit het formulier.
 */
export async function importWtrlTeams(input: WtrlImportInput) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has(adminAreaPermission("zrl"))) {
    return { ok: false as const, error: "Geen recht om teams bij te werken." };
  }

  const teams = parseWtrlTeams(input.text);
  if (teams.length === 0) {
    return { ok: false as const, error: "Geen WTRL-teams gevonden in de tekst." };
  }

  const saved = await saveWtrlTeams(createAdminClient(), {
    teams,
    mapping: input.mapping,
    importedBy: access.user.id,
  });
  if (!saved.ok) return { ok: false as const, error: saved.error };

  revalidatePath("/beheer/zrl/teams");
  revalidatePath("/teams", "layout");
  return saved;
}

/**
 * Koppelt een WTRL-renner aan een account met dezelfde naam, na bevestiging door
 * een beheerder: het Zwift-ID komt op het profiel. Migr. 0183 claimt dan de
 * rosternaam met dat Zwift-ID; daarna worden de gekoppelde teams van die renner
 * opnieuw ingedeeld.
 */
export async function linkWtrlRider(zwiftId: string, profileId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has(adminAreaPermission("zrl"))) {
    return { ok: false as const, error: "Geen recht om teams bij te werken." };
  }
  if (!/^\d+$/.test(zwiftId)) return { ok: false as const, error: "Ongeldig Zwift-ID." };

  const admin = createAdminClient();
  const [{ data: profile }, { data: taken }] = await Promise.all([
    admin.from("profiles").select("id, zwift_id").eq("id", profileId).maybeSingle(),
    admin.from("profiles").select("id").eq("zwift_id", zwiftId).limit(1),
  ]);
  if (!profile) return { ok: false as const, error: "Account niet gevonden." };
  if (profile.zwift_id) {
    return { ok: false as const, error: "Dit account heeft al een Zwift-ID." };
  }
  if ((taken ?? []).length > 0) {
    return { ok: false as const, error: "Dit Zwift-ID hoort al bij een ander account." };
  }

  const { error } = await admin.from("profiles").update({ zwift_id: zwiftId }).eq("id", profileId);
  if (error) return { ok: false as const, error: error.message };

  const { data: rows } = await admin
    .from("wtrl_team_riders")
    .select("trc_ref")
    .eq("zwift_id", zwiftId);
  const refs = Array.from(new Set(((rows ?? []) as Array<{ trc_ref: string }>).map((row) => row.trc_ref)));
  const { data: linked } =
    refs.length > 0
      ? await admin.from("wtrl_teams").select("trc_ref, name, team_id").in("trc_ref", refs)
      : { data: [] };
  for (const team of (linked ?? []) as Array<{ trc_ref: string; name: string; team_id: string | null }>) {
    if (!team.team_id) continue;
    const { data: teamRiders } = await admin
      .from("wtrl_team_riders")
      .select("zwift_id, name, category, status, zftp_w, zftp_wkg, zmap_wkg")
      .eq("trc_ref", team.trc_ref);
    const outcome = await syncTeamMembership(
      admin,
      team.team_id,
      team.name,
      ((teamRiders ?? []) as Array<Record<string, unknown>>).map((row) => ({
        zwiftId: row.zwift_id as string,
        name: row.name as string,
        category: (row.category as string | null) ?? null,
        status: row.status === "invited" ? ("invited" as const) : ("member" as const),
        zftpW: row.zftp_w == null ? null : Number(row.zftp_w),
        zftpWkg: row.zftp_wkg == null ? null : Number(row.zftp_wkg),
        zmapWkg: row.zmap_wkg == null ? null : Number(row.zmap_wkg),
      })),
    );
    if (!outcome.ok) return { ok: false as const, error: `${team.name}: ${outcome.error}` };
  }

  revalidatePath("/beheer/zrl/teams");
  revalidatePath("/teams", "layout");
  return { ok: true as const };
}
