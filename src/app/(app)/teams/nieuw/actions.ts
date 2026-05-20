"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const TYPES = ["zrl", "ladder", "social", "outdoor"];

export async function createTeam(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) return { ok: false as const, error: "Alleen admins kunnen teams aanmaken." };

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const division = String(formData.get("division") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) return { ok: false as const, error: "Naam is verplicht." };
  if (!TYPES.includes(type)) return { ok: false as const, error: "Ongeldig type." };

  const { data, error } = await supabase
    .from("teams")
    .insert({ name, type, division, description })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };
  redirect(`/teams/${data.id}`);
}
