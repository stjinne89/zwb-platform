import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { HelpLink } from "@/components/app-ui";
import { MediaForm, type MediaInitial } from "../../_components/add-form";
import type { MediaKind } from "@/lib/media-kinds";

export default async function EditMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await getCurrentUserAccess(supabase);
  if (!access.has("media.manage")) {
    return (
      <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Je hebt geen recht om media-items te bewerken.
      </div>
    );
  }

  const { data: item } = await supabase
    .from("media_items")
    .select(
      "id, kind, title, body_md, apple_url, spotify_url, rss_url, youtube_url, web_url, cover_url, pinned, published_at",
    )
    .eq("id", id)
    .single();

  if (!item) notFound();

  const initial: MediaInitial = {
    id: item.id,
    kind: item.kind as MediaKind,
    title: item.title,
    body_md: item.body_md,
    apple_url: item.apple_url,
    spotify_url: item.spotify_url,
    rss_url: item.rss_url,
    youtube_url: item.youtube_url,
    web_url: item.web_url,
    cover_url: item.cover_url,
    pinned: item.pinned,
    published_at: item.published_at,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/media"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Media
      </Link>
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Media-item bewerken
        </h1>
        <HelpLink href="/hulp#mediabeheer" />
      </header>
      <MediaForm initial={initial} />
    </div>
  );
}
