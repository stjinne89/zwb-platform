"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = [
  "algemeen",
  "bestuur",
  "zrl",
  "ladder",
  "outdoor",
  "klassiekers",
  "social",
  "training",
  "overig",
];

export async function addGroup(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const category = CATEGORIES.includes(categoryRaw) ? categoryRaw : null;
  const invite_url = String(formData.get("invite_url") ?? "").trim();
  const display_order_raw = String(formData.get("display_order") ?? "").trim();
  const display_order = display_order_raw ? Number(display_order_raw) : 0;

  if (!name) return { ok: false as const, error: "Naam is verplicht." };
  if (!/^https:\/\/chat\.whatsapp\.com\//i.test(invite_url)) {
    return {
      ok: false as const,
      error: "Invite-URL moet beginnen met https://chat.whatsapp.com/",
    };
  }

  const { error } = await supabase.from("whatsapp_groups").insert({
    name,
    description,
    category,
    invite_url,
    display_order: Number.isFinite(display_order) ? display_order : 0,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/community");
  return { ok: true as const };
}

export async function deleteGroup(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("whatsapp_groups").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/community");
  return { ok: true as const };
}

export async function addAnnouncement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const title = String(formData.get("title") ?? "").trim();
  const body_md = String(formData.get("body_md") ?? "").trim();
  const pinned = formData.get("pinned") === "on";

  if (!title) return { ok: false as const, error: "Titel is verplicht." };
  if (!body_md) return { ok: false as const, error: "Bericht is verplicht." };

  const { error } = await supabase.from("announcements").insert({
    title,
    body_md,
    pinned,
    author_id: user.id,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/community");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function togglePin(id: string, pinned: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({ pinned })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/community");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/community");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
