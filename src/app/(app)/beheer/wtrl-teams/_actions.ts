"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { parseWtrlTeams, type WtrlRider } from "@/lib/teams/wtrl-roster";
import {
  planWtrlMembership,
  type MembershipRow,
  type RosterEntryRow,
} from "@/lib/teams/wtrl-membership";

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

  // Indelen in de gekoppelde ZWB-teams (migr. 0181). Team voor team, met het
  // rooster telkens opnieuw opgehaald: een rosternaam is uniek, en iemand die bij
  // WTRL in twee teams staat mag geen dubbele naam opleveren.
  const totals = { added: 0, removed: 0, roster: 0 };
  for (const team of teams) {
    const teamId = input.mapping[team.trcRef];
    if (!teamId) continue;
    const outcome = await syncTeamMembership(admin, teamId, team.name, team.riders);
    if (!outcome.ok) return { ok: false as const, error: `${team.name}: ${outcome.error}` };
    totals.added += outcome.added;
    totals.removed += outcome.removed;
    totals.roster += outcome.roster;
  }

  revalidatePath("/beheer/wtrl-teams");
  revalidatePath("/teams", "layout");
  return { ok: true as const, teams: teams.length, riders: riders.length, ...totals };
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
  if (!access.has("teams.manage_roster")) {
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

  revalidatePath("/beheer/wtrl-teams");
  revalidatePath("/teams", "layout");
  return { ok: true as const };
}

type Admin = ReturnType<typeof createAdminClient>;

async function syncTeamMembership(
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
