"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";

const ROLES = ["member", "captain", "co-captain"] as const;
type Role = (typeof ROLES)[number];

export async function addMember(
  teamId: string,
  profileId: string,
  role: Role,
) {
  if (!ROLES.includes(role)) return { ok: false as const, error: "Ongeldige rol." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .upsert({ team_id: teamId, profile_id: profileId, role });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/teams/${teamId}`);
  return { ok: true as const };
}

export async function removeMember(teamId: string, profileId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("profile_id", profileId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/teams/${teamId}`);
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
