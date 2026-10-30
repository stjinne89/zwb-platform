"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { canAssignLadderRiders, canEditLadderPuzzle } from "@/lib/club-ladder/access";
import { parseLadderBand, parseLadderRank } from "@/lib/club-ladder/puzzle";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** `puzzle`: alleen de rol teamcaptain, zie canEditLadderPuzzle. */
async function guardAccess(puzzle = false) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!(await (puzzle ? canEditLadderPuzzle(access) : canAssignLadderRiders(access)))) {
    return {
      ok: false as const,
      error: puzzle ? "Alleen teamcaptains puzzelen mee." : "Geen recht om ladderteams in te delen.",
    };
  }
  return { ok: true as const, userId: access.user.id, admin: createAdminClient() };
}

async function guard(teamId: string, puzzle = false) {
  const check = await guardAccess(puzzle);
  if (!check.ok) return check;
  const { admin } = check;
  const { data: team } = await admin
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("type", "ladder")
    .maybeSingle();
  if (!team) return { ok: false as const, error: "Geen ladderteam." };
  return check;
}

type Admin = ReturnType<typeof createAdminClient>;

function refresh(teamId: string) {
  revalidatePath("/teams/club-ladder");
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
}

const CAPTAIN_ROLES = ["captain", "co-captain"] as const;
type CaptainRole = (typeof CAPTAIN_ROLES)[number];

/** Maakt een lid captain of co-captain van een ladderteam; zet hem zo nodig in het team. */
export async function setLadderCaptain(teamId: string, profileId: string, role: CaptainRole) {
  if (!CAPTAIN_ROLES.includes(role)) return { ok: false as const, error: "Ongeldige rol." };
  const check = await guard(teamId);
  if (!check.ok) return check;

  await clearWithdrawn(check.admin, profileId);
  await check.admin
    .from("team_member_seed_overrides")
    .delete()
    .eq("team_id", teamId)
    .eq("profile_id", profileId);
  const { error } = await check.admin.from("team_members").upsert(
    { team_id: teamId, profile_id: profileId, role, assignment_source: "manual" },
    { onConflict: "team_id,profile_id" },
  );
  if (error) return { ok: false as const, error: error.message };
  refresh(teamId);
  return { ok: true as const };
}

/** Captain af: blijft lid van het team. Uit het team halen gaat via de puzzel of het teamprofiel. */
export async function clearLadderCaptain(teamId: string, profileId: string) {
  const check = await guard(teamId);
  if (!check.ok) return check;

  const { error } = await check.admin
    .from("team_members")
    .update({ role: "member" })
    .eq("team_id", teamId)
    .eq("profile_id", profileId);
  if (error) return { ok: false as const, error: error.message };
  refresh(teamId);
  return { ok: true as const };
}

/** Zet een lid in de ladderlijst zonder team, ook zonder eigen interesse (0285). */
export async function addToLadderPool(profileId: string) {
  const check = await guardAccess();
  if (!check.ok) return check;

  const { data: profile } = await check.admin
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("is_approved", true)
    .maybeSingle();
  if (!profile) return { ok: false as const, error: "Geen goedgekeurd lid." };
  await clearWithdrawn(check.admin, profileId);
  const { error } = await check.admin
    .from("ladder_pool")
    .upsert(
      { profile_id: profileId, added_by: check.userId },
      { onConflict: "profile_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/teams/club-ladder");
  return { ok: true as const };
}

async function puzzleTeamIds(admin: Admin) {
  const { data } = await admin
    .from("teams")
    .select("id")
    .eq("type", "ladder")
    .not("ladder_rank_min", "is", null);
  return (data ?? []).map((row: { id: string }) => row.id);
}

export type PuzzleRiderRef = { kind: "profile" | "roster"; id: string };

/** Haalt een lid uit deze teams, met een seed-override zoals bij Verwijderen. */
async function leavePuzzleTeams(admin: Admin, profileId: string, teamIds: string[], userId: string) {
  const { data: current } = teamIds.length
    ? await admin.from("team_members").select("team_id").eq("profile_id", profileId).in("team_id", teamIds)
    : { data: [] };
  const leaving = (current ?? []).map((row: { team_id: string }) => row.team_id);
  if (leaving.length === 0) return { teamIds: leaving, error: null };

  const now = new Date().toISOString();
  await admin.from("team_member_seed_overrides").upsert(
    leaving.map((id) => ({
      team_id: id,
      profile_id: profileId,
      excluded: true,
      reason: "manual_remove",
      created_by: userId,
      updated_at: now,
    })),
    { onConflict: "team_id,profile_id" },
  );
  const { error } = await admin
    .from("team_members")
    .delete()
    .eq("profile_id", profileId)
    .in("team_id", leaving);
  return { teamIds: leaving, error: error?.message ?? null };
}

/**
 * Haalt een renner uit een ladderteam dat niet in de puzzel staat (ZWBandits
 * e.d.), via het teamprofiel. Een rosternaam gaat naar de losse stukjes. Teams
 * in de puzzel deelt alleen de rol teamcaptain in.
 */
export async function removeFromLadderTeam(teamId: string, rider: PuzzleRiderRef) {
  const check = await guard(teamId);
  if (!check.ok) return check;
  if ((await puzzleTeamIds(check.admin)).includes(teamId)) {
    return { ok: false as const, error: "Dit team staat in de puzzel." };
  }

  if (rider.kind === "roster") {
    const { error } = await check.admin
      .from("ladder_roster_riders")
      .update({ team_id: null })
      .eq("roster_entry_id", rider.id)
      .eq("team_id", teamId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const res = await leavePuzzleTeams(check.admin, rider.id, [teamId], check.userId);
    if (res.error) return { ok: false as const, error: res.error };
  }
  refresh(teamId);
  return { ok: true as const };
}

/** Wie weer wordt ingedeeld of toegevoegd, doet weer mee (0291). */
async function clearWithdrawn(admin: Admin, profileId: string) {
  await admin.from("ladder_withdrawn").delete().eq("profile_id", profileId);
}

/**
 * Haalt een renner uit de puzzel en de ladderlijst, als hij niet meer mee wil
 * doen. Een rosternaam verliest zijn ladderkoppeling; een lid gaat uit de
 * puzzelteams en de ladderpool, en krijgt een markering (0291), zodat ook wie
 * zelf Ladder aanvinkte uit de lijst blijft. Zijn interesse blijft zijn keuze.
 */
export async function withdrawLadderRider(rider: PuzzleRiderRef) {
  const check = await guardAccess(true);
  if (!check.ok) return check;
  const { admin } = check;

  if (rider.kind === "roster") {
    const { error } = await admin.from("ladder_roster_riders").delete().eq("roster_entry_id", rider.id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/teams/club-ladder");
    return { ok: true as const };
  }

  const { error } = await admin
    .from("ladder_withdrawn")
    .upsert(
      { profile_id: rider.id, withdrawn_by: check.userId, created_at: new Date().toISOString() },
      { onConflict: "profile_id" },
    );
  if (error) return { ok: false as const, error: error.message };
  const left = await leavePuzzleTeams(admin, rider.id, await puzzleTeamIds(admin), check.userId);
  if (left.error) return { ok: false as const, error: left.error };
  await admin.from("ladder_pool").delete().eq("profile_id", rider.id);

  for (const id of left.teamIds) refresh(id);
  revalidatePath("/teams/club-ladder");
  return { ok: true as const };
}

/**
 * Legt een renner in een puzzelteam (0290), of bij de losse stukjes (`null`).
 * Een renner rijdt in één ladderteam: uit de andere puzzelteams gaat hij eruit,
 * met een seed-override zoals bij Verwijderen.
 */
export async function moveLadderPuzzleRider(rider: PuzzleRiderRef, teamId: string | null) {
  const check = teamId ? await guard(teamId, true) : await guardAccess(true);
  if (!check.ok) return check;
  const { admin } = check;
  const teamIds = await puzzleTeamIds(admin);
  if (teamId && !teamIds.includes(teamId)) return { ok: false as const, error: "Team staat niet in de puzzel." };

  if (rider.kind === "roster") {
    const { data, error } = await admin
      .from("ladder_roster_riders")
      .update({ team_id: teamId })
      .eq("roster_entry_id", rider.id)
      .select("roster_entry_id");
    if (error) return { ok: false as const, error: error.message };
    if (!data?.length) return { ok: false as const, error: "Renner staat niet in de ladderlijst." };
    revalidatePath("/teams/club-ladder");
    return { ok: true as const };
  }

  const left = await leavePuzzleTeams(
    admin,
    rider.id,
    teamIds.filter((id) => id !== teamId),
    check.userId,
  );
  if (left.error) return { ok: false as const, error: left.error };
  const leaving = left.teamIds;
  await clearWithdrawn(admin, rider.id);

  if (teamId) {
    await admin
      .from("team_member_seed_overrides")
      .delete()
      .eq("team_id", teamId)
      .eq("profile_id", rider.id);
    const { error } = await admin.from("team_members").upsert(
      { team_id: teamId, profile_id: rider.id, role: "member", assignment_source: "manual" },
      { onConflict: "team_id,profile_id", ignoreDuplicates: true },
    );
    if (error) return { ok: false as const, error: error.message };
  } else {
    // Zonder team en zonder eigen interesse zou hij uit de lijst verdwijnen.
    await admin
      .from("ladder_pool")
      .upsert(
        { profile_id: rider.id, added_by: check.userId },
        { onConflict: "profile_id", ignoreDuplicates: true },
      );
  }

  for (const id of [...leaving, teamId].filter((id): id is string => Boolean(id))) refresh(id);
  return { ok: true as const };
}

/** Ladderrank per Zwift-ID, tot de ZwiftRacing-API hem levert; `null` wist hem. */
export async function setLadderRiderRank(zwiftId: string, rank: number | null) {
  const check = await guardAccess(true);
  if (!check.ok) return check;
  const id = zwiftId.trim();
  if (!/^\d+$/.test(id)) return { ok: false as const, error: "Geen geldig Zwift-ID." };
  const parsed = rank == null ? null : parseLadderRank(rank);
  if (rank != null && parsed == null) return { ok: false as const, error: "Ongeldige rank." };

  const { error } =
    parsed == null
      ? await check.admin.from("ladder_ranks").delete().eq("zwift_id", id)
      : await check.admin.from("ladder_ranks").upsert(
          { zwift_id: id, rank: parsed, updated_by: check.userId, updated_at: new Date().toISOString() },
          { onConflict: "zwift_id" },
        );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/teams/club-ladder");
  return { ok: true as const };
}

/** Afgesproken band van een ladderteam; `null` haalt het team uit de puzzel. */
export async function setLadderTeamBand(teamId: string, band: [number, number] | null) {
  const check = await guard(teamId, true);
  if (!check.ok) return check;
  const parsed = band ? parseLadderBand(band[0], band[1]) : null;
  if (band && !parsed) return { ok: false as const, error: "Ongeldige band." };

  const { error } = await check.admin
    .from("teams")
    .update({ ladder_rank_min: parsed?.[0] ?? null, ladder_rank_max: parsed?.[1] ?? null })
    .eq("id", teamId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/teams/club-ladder");
  return { ok: true as const };
}

/**
 * Renner bij de losse stukjes, op Zwift-ID. Met account: in de ladderpool. Zonder
 * account: zijn rosternaam, zoals bij ZRL; bestaat die nog niet, dan komt hij erbij.
 */
export async function addLadderRosterRider(input: {
  name: string;
  zwiftId: string;
  sex: "man" | "vrouw" | null;
  rank: number | null;
}) {
  const check = await guardAccess(true);
  if (!check.ok) return check;
  const { admin } = check;
  const name = input.name.trim();
  const zwiftId = input.zwiftId.trim();
  if (!/^\d+$/.test(zwiftId)) return { ok: false as const, error: "Geen geldig Zwift-ID." };
  const sex = input.sex === "man" || input.sex === "vrouw" ? input.sex : null;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("zwift_id", zwiftId)
    .eq("is_approved", true)
    .limit(1)
    .maybeSingle();
  const { data: entry } = profile
    ? { data: null }
    : await admin
        .from("roster_entries")
        .select("id, claimed_by")
        .eq("zwift_id", zwiftId)
        .limit(1)
        .maybeSingle();
  const profileId = profile?.id ?? entry?.claimed_by ?? null;

  if (profileId) {
    await clearWithdrawn(admin, profileId);
    const { error } = await admin
      .from("ladder_pool")
      .upsert(
        { profile_id: profileId, added_by: check.userId },
        { onConflict: "profile_id", ignoreDuplicates: true },
      );
    if (error) return { ok: false as const, error: error.message };
  } else {
    let entryId = entry?.id ?? null;
    if (!entryId) {
      if (!name) return { ok: false as const, error: "Naam ontbreekt." };
      const { data: created, error } = await admin
        .from("roster_entries")
        .insert({ name, zwift_id: zwiftId, team_assignment_source: "manual" })
        .select("id")
        .single();
      if (error) {
        return {
          ok: false as const,
          error: error.code === "23505" ? `Er is al een rosternaam "${name}".` : error.message,
        };
      }
      entryId = created.id as string;
    }
    const { error } = await admin
      .from("ladder_roster_riders")
      .upsert(
        { roster_entry_id: entryId, sex, added_by: check.userId },
        { onConflict: "roster_entry_id", ignoreDuplicates: true },
      );
    if (error) return { ok: false as const, error: error.message };
  }

  if (input.rank != null) {
    const rank = parseLadderRank(input.rank);
    if (rank != null) {
      await admin.from("ladder_ranks").upsert(
        { zwift_id: zwiftId, rank, updated_by: check.userId, updated_at: new Date().toISOString() },
        { onConflict: "zwift_id" },
      );
    }
  }
  revalidatePath("/teams/club-ladder");
  return { ok: true as const };
}
