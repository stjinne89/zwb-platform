import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Markdown } from "@/components/markdown";
import { MEDIA_KINDS, MEDIA_KIND_LABELS } from "@/lib/media-kinds";
import { detectGoogleDrive, detectSpotify, detectYouTube } from "@/lib/embed";
import { AddMediaForm } from "./_components/add-form";
import { MediaItemActions } from "./_components/item-actions";
import { SyncPodcastButton, SyncYouTubeButton } from "./_components/sync-button";

type SearchParams = Promise<{ kind?: string }>;

const PLATFORM_BUTTONS: Array<{
  key: "apple_url" | "spotify_url" | "rss_url" | "youtube_url" | "web_url";
  label: string;
  emoji: string;
}> = [
  { key: "apple_url", label: "Apple Podcasts", emoji: "🍎" },
  { key: "spotify_url", label: "Spotify", emoji: "🟢" },
  { key: "youtube_url", label: "YouTube", emoji: "📺" },
  { key: "rss_url", label: "RSS-feed", emoji: "📡" },
  { key: "web_url", label: "Web", emoji: "🌐" },
];

type MediaItem = {
  id: string;
  kind: string;
  title: string;
  body_md: string | null;
  apple_url: string | null;
  spotify_url: string | null;
  rss_url: string | null;
  youtube_url: string | null;
  web_url: string | null;
  cover_url: string | null;
  pinned: boolean;
  published_at: string;
  profiles: { display_name: string } | { display_name: string }[] | null;
};

export default async function MediaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { kind } = await searchParams;
  const activeKind =
    kind && MEDIA_KINDS.some((k) => k.value === kind) ? kind : null;

  const defaultRssUrl = process.env.PODCAST_RSS_URL ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rawItems }, { data: me }] = await Promise.all([
    (async () => {
      let q = supabase
        .from("media_items")
        .select(
          "id, kind, title, body_md, apple_url, spotify_url, rss_url, youtube_url, web_url, cover_url, pinned, published_at, profiles(display_name)",
        )
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false });
      if (activeKind) q = q.eq("kind", activeKind);
      return q;
    })(),
    supabase.from("profiles").select("is_admin").eq("id", user.id).single(),
  ]);

  const items = (rawItems ?? []) as unknown as MediaItem[];
  const isAdmin = me?.is_admin ?? false;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Media</h1>
        <p className="mt-1 text-muted-foreground">
          Mededelingen, nieuwsbrieven, podcasts en video&apos;s van ZWB.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        <Link
          href="/media"
          className={`rounded-full border px-3 py-1 text-xs ${
            activeKind === null ? "bg-foreground text-background" : "hover:bg-secondary"
          }`}
        >
          Alles
        </Link>
        {MEDIA_KINDS.map((k) => (
          <Link
            key={k.value}
            href={`/media?kind=${k.value}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              activeKind === k.value
                ? "bg-foreground text-background"
                : "hover:bg-secondary"
            }`}
          >
            {k.icon} {k.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          {activeKind
            ? `Nog geen items in ${MEDIA_KIND_LABELS[activeKind]}.`
            : "Nog niks geplaatst."}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const author = Array.isArray(item.profiles)
              ? item.profiles[0]?.display_name
              : item.profiles?.display_name;
            return (
              <li
                key={item.id}
                className={`rounded-lg border bg-card p-4 ${
                  item.pinned ? "border-foreground/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {item.pinned && <span className="text-foreground/60">📌</span>}
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                        {MEDIA_KIND_LABELS[item.kind] ?? item.kind}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {author ?? "Bestuur"} ·{" "}
                        {new Date(item.published_at).toLocaleDateString("nl-NL", {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight">
                      {item.title}
                    </h2>

                    {(() => {
                      const spotify = item.spotify_url ? detectSpotify(item.spotify_url) : null;
                      const youtube = item.youtube_url ? detectYouTube(item.youtube_url) : null;
                      const drive = item.web_url ? detectGoogleDrive(item.web_url) : null;
                      const hasEmbed = spotify || youtube || drive;

                      return (
                        <>
                          {/* Spotify embed (podcast/show/episode) */}
                          {spotify && (
                            <div
                              className={`mt-3 overflow-hidden rounded-xl border ${
                                spotify.type === "show"
                                  ? "h-[232px] sm:h-[352px]"
                                  : "h-[200px] sm:h-[232px]"
                              }`}
                            >
                              <iframe
                                src={spotify.embedUrl}
                                loading="lazy"
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                title={`Spotify ${spotify.type}: ${item.title}`}
                                className="block h-full w-full"
                              />
                            </div>
                          )}

                          {/* YouTube embed — aspect-video schaalt mee */}
                          {youtube && (
                            <div className="mt-3 aspect-video overflow-hidden rounded-xl border">
                              <iframe
                                src={youtube.embedUrl}
                                loading="lazy"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                title={`YouTube: ${item.title}`}
                                className="block h-full w-full"
                              />
                            </div>
                          )}

                          {/* Google Drive / Docs / Sheets / Slides embed — responsive heights */}
                          {drive && (
                            <div
                              className={`mt-3 overflow-hidden rounded-xl border ${
                                drive.type === "slide"
                                  ? "aspect-video"
                                  : drive.type === "doc"
                                    ? "h-[420px] sm:h-[560px] md:h-[720px]"
                                    : drive.type === "sheet"
                                      ? "h-[340px] sm:h-[440px] md:h-[520px]"
                                      : "h-[380px] sm:h-[520px] md:h-[640px]"
                              }`}
                            >
                              <iframe
                                src={drive.embedUrl}
                                loading="lazy"
                                allow="autoplay"
                                title={`Drive: ${item.title}`}
                                className="block h-full w-full"
                              />
                            </div>
                          )}

                          {/* Cover alleen tonen als er geen embed is */}
                          {!hasEmbed && item.cover_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.cover_url}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="mt-3 max-h-48 w-auto rounded-md border object-cover"
                            />
                          )}
                        </>
                      );
                    })()}

                    {item.body_md && (
                      <div className="mt-3">
                        <Markdown source={item.body_md} />
                      </div>
                    )}

                    {/* Platform buttons — voor links naar andere apps */}
                    {PLATFORM_BUTTONS.some((b) => item[b.key]) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {PLATFORM_BUTTONS.map((b) => {
                          const url = item[b.key];
                          if (!url) return null;
                          return (
                            <a
                              key={b.key}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-background px-3 py-1 text-xs font-medium transition hover:border-foreground/50 hover:bg-secondary"
                            >
                              <span aria-hidden>{b.emoji}</span>
                              {b.label}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <MediaItemActions id={item.id} pinned={item.pinned} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isAdmin && (
        <div className="space-y-4 border-t pt-6">
          <div className="space-y-4 rounded-2xl border border-dashed border-foreground/20 bg-card/40 p-4">
            <div>
              <h3 className="text-sm font-medium">Automatische import</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Re-syncs zijn idempotent — bestaande items worden alleen
                bijgewerkt.
              </p>
            </div>
            <SyncYouTubeButton />
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Podcast (RSS-feed)
              </p>
              <SyncPodcastButton defaultRssUrl={defaultRssUrl} />
            </div>
          </div>
          <AddMediaForm />
        </div>
      )}
    </div>
  );
}
