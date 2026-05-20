"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { CATEGORIES } from "@/lib/categories";

export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const body_md = String(formData.get("body_md") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
  const tagsRaw = String(formData.get("tags") ?? "").trim();

  if (!title) return { ok: false as const, error: "Titel is verplicht." };
  if (!CATEGORIES.some((c) => c.value === category))
    return { ok: false as const, error: "Ongeldige categorie." };
  if (!body_md) return { ok: false as const, error: "Inhoud is verplicht." };

  const tags = tagsRaw
    ? tagsRaw
        .split(/[, ]+/)
        .map((t) => t.replace(/^#/, "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8)
    : [];

  // Make slug unique by appending a short random suffix if needed.
  const base = slugify(title) || "post";
  let slug = base;
  for (let i = 0; i < 4; i++) {
    const { data: existing } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { error } = await supabase.from("posts").insert({
    slug,
    title,
    category,
    body_md,
    excerpt,
    tags,
    author_id: user.id,
  });

  if (error) return { ok: false as const, error: error.message };
  redirect(`/materiaal/${slug}`);
}
