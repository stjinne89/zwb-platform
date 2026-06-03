"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";

const ROLES = ["member", "captain", "co-captain"] as const;
type Role = (typeof ROLES)[number];

async function canManageTeamRoster(teamId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (access.has("teams.manage_roster")) {
    return { ok: true as const, userId: access.user.id };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_members")
    .select("team_id")
    .eq("team_id", teamId)
    .eq("profile_id", access.user.id)
    .in("role", ["captain", "co-captain"])
    .limit(1);
  if (error) return { ok: false as const, error: error.message };
  if ((data ?? []).length === 0) {
    return { ok: false as const, error: "Geen recht om dit team te beheren." };
  }
  return { ok: true as const, userId: access.user.id };
}

export async function addMember(
  teamId: string,
  profileId: string,
  role: Role,
) {
  if (!ROLES.includes(role)) return { ok: false as const, error: "Ongeldige rol." };
  const guard = await canManageTeamRoster(teamId);
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  await admin
    .from("team_member_seed_overrides")
    .delete()
    .eq("team_id", teamId)
    .eq("profile_id", profileId);
  const { error } = await admin
    .from("team_members")
    .upsert({
      team_id: teamId,
      profile_id: profileId,
      role,
      assignment_source: "manual",
    });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  return { ok: true as const };
}

export async function removeMember(teamId: string, profileId: string) {
  const guard = await canManageTeamRoster(teamId);
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  await admin.from("team_member_seed_overrides").upsert(
    {
      team_id: teamId,
      profile_id: profileId,
      excluded: true,
      reason: "manual_remove",
      created_by: guard.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "team_id,profile_id" },
  );
  const { error } = await admin
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("profile_id", profileId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  return { ok: true as const };
}

export async function addResult(teamId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const competition = String(formData.get("competition") ?? "").trim();
  if (!competition) return { ok: false as const, error: "Competitie is verplicht." };

  const round_label = String(formData.get("round_label") ?? "").trim() || null;
  const round_at_raw = String(formData.get("round_at") ?? "").trim();
  const round_at = round_at_raw ? new Date(round_at_raw).toISOString() : null;

  const position = formData.get("position");
  const points = formData.get("points");
  const total_teams = formData.get("total_teams");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await supabase.from("team_results").insert({
    team_id: teamId,
    competition,
    round_label,
    round_at,
    position: position ? Number(position) : null,
    points: points ? Number(points) : null,
    total_teams: total_teams ? Number(total_teams) : null,
    notes,
    created_by: user.id,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/teams/${teamId}`);
  return { ok: true as const };
}

export async function deleteResult(teamId: string, resultId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_results")
    .delete()
    .eq("id", resultId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/teams/${teamId}`);
  return { ok: true as const };
}

export async function toggleGraveyard(teamId: string, isGraveyard: boolean) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("teams.manage_roster")) {
    return { ok: false as const, error: "Geen recht om teams te beheren." };
  }

  const { error } = await supabase
    .from("teams")
    .update({ is_graveyard: isGraveyard })
    .eq("id", teamId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function setTeamAvailability(
  teamId: string,
  eventId: string,
  status: "available" | "maybe" | "unavailable",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase.from("team_event_availability").upsert({
    team_id: teamId,
    event_id: eventId,
    profile_id: user.id,
    status,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/teams/${teamId}`);
  return { ok: true as const };
}

async function canManageTeamSelection(
  teamId: string,
  candidateTeamId?: string,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd.", userId: null };
  if (access.has("teams.manage_roster")) {
    return { ok: true as const, userId: access.user.id };
  }

  const teamIds = candidateTeamId ? [teamId, candidateTeamId] : [teamId];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_members")
    .select("team_id")
    .in("team_id", teamIds)
    .eq("profile_id", access.user.id)
    .in("role", ["captain", "co-captain"]);
  if (error) return { ok: false as const, error: error.message, userId: access.user.id };
  if ((data ?? []).length === 0) {
    return { ok: false as const, error: "Geen recht om deze lineup te beheren.", userId: access.user.id };
  }
  return { ok: true as const, userId: access.user.id };
}

export async function setTeamLineup(
  parentTeamId: string,
  eventId: string,
  targetTeamId: string,
  profileId: string,
) {
  const guard = await canManageTeamSelection(parentTeamId, targetTeamId);
  if (!guard.ok) return { ok: false as const, error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin.from("team_event_lineups").upsert(
    {
      parent_team_id: parentTeamId,
      event_id: eventId,
      team_id: targetTeamId,
      profile_id: profileId,
      selected_by: guard.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_id,parent_team_id,profile_id" },
  );
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/teams/${parentTeamId}`);
  revalidatePath(`/teams/${targetTeamId}`);
  return { ok: true as const };
}

export async function removeTeamLineup(parentTeamId: string, lineupId: string) {
  const guard = await canManageTeamSelection(parentTeamId);
  if (!guard.ok) return { ok: false as const, error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("team_event_lineups")
    .delete()
    .eq("id", lineupId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/teams/${parentTeamId}`);
  return { ok: true as const };
}
