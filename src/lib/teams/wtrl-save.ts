import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { WtrlRider, WtrlTeam } from "@/lib/teams/wtrl-roster";
import {
  planWtrlMembership,
  type MembershipRow,
  type RosterEntryRow,
} from "@/lib/teams/wtrl-membership";

// WTRL-teams opslaan en de gekoppelde ZWB-teams indelen. Gedeeld door de plak in
// /beheer/zrl/teams en de import van het WTRL-script (/api/zrl/wtrl-import).

type Admin = ReturnType<typeof createAdminClient>;

export type WtrlSaveTotals = { teams: number; riders: number; added: number; removed: number; roster: number };

/**
 * Slaat WTRL-teams op en vervangt per team de renners. `mapping` zegt per
 * TRC-referentie welk ZWB-team erbij hoort (null: niet koppelen).
 */
export async function saveWtrlTeams(
  admin: Admin,
  input: { teams: WtrlTeam[]; mapping: Record<string, string | null>; importedBy: string | null },
): Promise<({ ok: true } & WtrlSaveTotals) | { ok: false; error: string }> {
  // Twee keer hetzelfde team: de laatste telt.
  const teams = Array.from(new Map(input.teams.map((team) => [team.trcRef, team])).values());
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
      imported_by: input.importedBy,
    })),
    { onConflict: "trc_ref" },
  );
  if (teamError) return { ok: false, error: teamError.message };

  const refs = teams.map((team) => team.trcRef);
  const { error: deleteError } = await admin.from("wtrl_team_riders").delete().in("trc_ref", refs);
  if (deleteError) return { ok: false, error: deleteError.message };

  const riders = teams.flatMap((team) =>
    Array.from(new Map(team.riders.map((rider) => [rider.zwiftId, rider])).values()).map((rider) => ({
      trc_ref: team.trcRef,
      zwift_id: rider.zwiftId,
      name: rider.name,
      category: rider.category,
      status: rider.status,
      zftp_w: rider.zftpW,
      zftp_wkg: rider.zftpWkg,
      zmap_wkg: rider.zmapWkg,
    })),
  );
  if (riders.length > 0) {
    const { error } = await admin.from("wtrl_team_riders").insert(riders);
    if (error) return { ok: false, error: error.message };
  }

  // Indelen in de gekoppelde ZWB-teams (migr. 0181). Team voor team, met het
  // rooster telkens opnieuw opgehaald: een rosternaam is uniek, en iemand die bij
  // WTRL in twee teams staat mag geen dubbele naam opleveren.
  const totals = { teams: teams.length, riders: riders.length, added: 0, removed: 0, roster: 0 };
  for (const team of teams) {
    const teamId = input.mapping[team.trcRef];
    if (!teamId) continue;
    const outcome = await syncTeamMembership(admin, teamId, team.name, team.riders);
    if (!outcome.ok) return { ok: false, error: `${team.name}: ${outcome.error}` };
    totals.added += outcome.added;
    totals.removed += outcome.removed;
    totals.roster += outcome.roster;
  }
  return { ok: true, ...totals };
}

export async function syncTeamMembership(
  admin: Admin,
  teamId: string,
  teamName: string,
  riders: WtrlRider[],
) {
  const zwiftIds = riders.map((rider) => rider.zwiftId);
  const [profiles, roster, members, overrides] = await Promise.all([
    admin.from("profiles").select("id, zwift_id").in("zwift_id", zwiftIds),
    admin
      .from("roster_entries")
      .select("id, name, zwift_id, claimed_by, team_id, team_assignment_source"),
    admin.from("team_members").select("profile_id, assignment_source").eq("team_id", teamId),
    admin
      .from("team_member_seed_overrides")
      .select("profile_id")
      .eq("team_id", teamId)
      .eq("excluded", true),
  ]);
  const failed = [profiles, roster, members, overrides].find((result) => result.error);
  if (failed?.error) return { ok: false as const, error: failed.error.message };

  const plan = planWtrlMembership({
    teamId,
    riders,
    profileByZwiftId: new Map(
      ((profiles.data ?? []) as Array<{ id: string; zwift_id: string }>).map((row) => [
        row.zwift_id.trim(),
        row.id,
      ]),
    ),
    roster: (roster.data ?? []) as RosterEntryRow[],
    members: (members.data ?? []) as MembershipRow[],
    excluded: new Set(
      ((overrides.data ?? []) as Array<{ profile_id: string }>).map((row) => row.profile_id),
    ),
  });

  if (plan.addMembers.length > 0) {
    const { error } = await admin.from("team_members").upsert(
      plan.addMembers.map((profileId) => ({
        team_id: teamId,
        profile_id: profileId,
        role: "member",
        assignment_source: "wtrl",
      })),
      { onConflict: "team_id,profile_id", ignoreDuplicates: true },
    );
    if (error) return { ok: false as const, error: error.message };
  }
  if (plan.removeMembers.length > 0) {
    const { error } = await admin
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("assignment_source", "wtrl")
      .in("profile_id", plan.removeMembers);
    if (error) return { ok: false as const, error: error.message };
  }
  for (const entry of plan.upsertRoster) {
    const values = {
      zwift_id: entry.zwiftId,
      pace_category: entry.category,
      team_id: teamId,
      team_name: teamName,
      team_assignment_source: "wtrl",
    };
    // Een bestaande naam houdt zijn spelling (uniek, en soms uit de resultatensync).
    const { error } = entry.id
      ? await admin.from("roster_entries").update(values).eq("id", entry.id)
      : await admin.from("roster_entries").insert({ ...values, name: entry.name });
    if (error) return { ok: false as const, error: error.message };
  }
  if (plan.detachRoster.length > 0) {
    const { error } = await admin
      .from("roster_entries")
      .update({ team_id: null, team_name: null, team_assignment_source: "manual" })
      .in("id", plan.detachRoster);
    if (error) return { ok: false as const, error: error.message };
  }

  return {
    ok: true as const,
    added: plan.addMembers.length,
    removed: plan.removeMembers.length,
    roster: plan.upsertRoster.length,
  };
}
