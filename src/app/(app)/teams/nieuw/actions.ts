"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";

const TYPES = ["zrl", "ladder", "social", "outdoor"];

export async function createTeam(formData: FormData) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("teams.create")) {
    return { ok: false as const, error: "Geen recht om teams aan te maken." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const division = String(formData.get("division") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const parentTeamId = String(formData.get("parent_team_id") ?? "").trim() || null;

  if (!name) return { ok: false as const, error: "Naam is verplicht." };
  if (!TYPES.includes(type)) return { ok: false as const, error: "Ongeldig type." };

  const { data, error } = await supabase
    .from("teams")
    .insert({ name, type, division, description, parent_team_id: parentTeamId })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };
  redirect(`/teams/${data.id}`);
}
