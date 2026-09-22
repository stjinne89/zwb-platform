"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { parseWtrlTeams } from "@/lib/teams/wtrl-roster";

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
  if (!access.has("teams.manage_roster")) {
    return { ok: false as const, error: "Geen recht om teams bij te werken." };
  }

  // Twee keer hetzelfde team in één plak: de laatste telt.
  const teams = Array.from(
    new Map(parseWtrlTeams(input.text).map((team) => [team.trcRef, team])).values(),
  );
  if (teams.length === 0) {
    return { ok: false as const, error: "Geen WTRL-teams gevonden in de tekst." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error: teamError } = await admin.from("wtrl_teams").upsert(
    teams.map((team) => ({
      trc_ref: team.trcRef,
      name: team.name,
      season: team.season,
      division: team.division,
      captain: team.captain,
      team_id: input.mapping[team.trcRef] ?? null,
      imported_at: now,
      imported_by: access.user!.id,
    })),
    { onConflict: "trc_ref" },
  );
  if (teamError) return { ok: false as const, error: teamError.message };

  const refs = teams.map((team) => team.trcRef);
  const { error: deleteError } = await admin
    .from("wtrl_team_riders")
    .delete()
    .in("trc_ref", refs);
  if (deleteError) return { ok: false as const, error: deleteError.message };

  const riders = teams.flatMap((team) =>
    Array.from(new Map(team.riders.map((rider) => [rider.zwiftId, rider])).values()).map(
      (rider) => ({
        trc_ref: team.trcRef,
        zwift_id: rider.zwiftId,
        name: rider.name,
        category: rider.category,
        status: rider.status,
        zftp_w: rider.zftpW,
        zftp_wkg: rider.zftpWkg,
        zmap_wkg: rider.zmapWkg,
      }),
    ),
  );
  if (riders.length > 0) {
    const { error } = await admin.from("wtrl_team_riders").insert(riders);
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath("/beheer/wtrl-teams");
  revalidatePath("/teams", "layout");
  return { ok: true as const, teams: teams.length, riders: riders.length };
}
