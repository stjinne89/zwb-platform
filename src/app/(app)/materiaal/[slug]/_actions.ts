"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { POST_STATUSES, type PostStatus } from "@/lib/categories";

export async function toggleLike(postId: string, slug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: existing } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("profile_id", user.id);
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, profile_id: user.id });
  }

  revalidatePath(`/materiaal/${slug}`);
  return { ok: true as const, liked: !existing };
}

export async function addComment(postId: string, slug: string, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false as const, error: "Bericht is leeg." };
  if (body.length > 2000) return { ok: false as const, error: "Te lang (max 2000)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: user.id, body });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/materiaal/${slug}`);
  return { ok: true as const };
}

export async function deleteComment(commentId: string, slug: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("post_comments")
    .delete()
    .eq("id", commentId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/materiaal/${slug}`);
  return { ok: true as const };
}

export async function deletePost(postId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { ok: false as const, error: error.message };
  redirect("/materiaal");
}

export async function updatePostStatus(
  postId: string,
  slug: string,
  status: PostStatus,
) {
  if (!POST_STATUSES.some((s) => s.value === status)) {
    return { ok: false as const, error: "Ongeldige status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ status })
    .eq("id", postId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/materiaal/${slug}`);
  revalidatePath("/materiaal");
  return { ok: true as const };
}
