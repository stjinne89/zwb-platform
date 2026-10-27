"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { canAssignLadderRiders } from "@/lib/club-ladder/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function guard(teamId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!(await canAssignLadderRiders(access))) {
    return { ok: false as const, error: "Geen recht om ladderteams in te delen." };
  }

  const admin = createAdminClient();
  const { data: team } = await admin
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("type", "ladder")
    .maybeSingle();
  if (!team) return { ok: false as const, error: "Geen ladderteam." };
  return { ok: true as const, userId: access.user.id, admin };
}

function refresh(teamId: string) {
  revalidatePath("/teams/club-ladder");
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
}

/** Zet een renner in een ladderteam; een bestaande rol (captain) blijft staan. */
export async function assignLadderRider(teamId: string, profileId: string) {
  const check = await guard(teamId);
  if (!check.ok) return check;

  await check.admin
    .from("team_member_seed_overrides")
    .delete()
    .eq("team_id", teamId)
    .eq("profile_id", profileId);
  const { error } = await check.admin.from("team_members").upsert(
    { team_id: teamId, profile_id: profileId, role: "member", assignment_source: "manual" },
    { onConflict: "team_id,profile_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false as const, error: error.message };
  refresh(teamId);
  return { ok: true as const };
}

/** Haalt een renner uit een ladderteam, zoals Verwijderen op de teampagina. */
export async function unassignLadderRider(teamId: string, profileId: string) {
  const check = await guard(teamId);
  if (!check.ok) return check;

  await check.admin.from("team_member_seed_overrides").upsert(
    {
      team_id: teamId,
      profile_id: profileId,
      excluded: true,
      reason: "manual_remove",
      created_by: check.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "team_id,profile_id" },
  );
  const { error } = await check.admin
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("profile_id", profileId);
  if (error) return { ok: false as const, error: error.message };
  refresh(teamId);
  return { ok: true as const };
}

const CAPTAIN_ROLES = ["captain", "co-captain"] as const;
type CaptainRole = (typeof CAPTAIN_ROLES)[number];

/** Maakt een lid captain of co-captain van een ladderteam; zet hem zo nodig in het team. */
export async function setLadderCaptain(teamId: string, profileId: string, role: CaptainRole) {
  if (!CAPTAIN_ROLES.includes(role)) return { ok: false as const, error: "Ongeldige rol." };
  const check = await guard(teamId);
  if (!check.ok) return check;

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

/** Captain af: blijft lid van het team. Uit het team halen gaat via de selectie. */
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
