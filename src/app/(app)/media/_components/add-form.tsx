"use client";

import { useRef, useState, useTransition } from "react";
import { addMediaItem } from "../_actions";
import { Button } from "@/components/ui/button";
import { MEDIA_KINDS, type MediaKind } from "@/lib/media-kinds";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL =
  "mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

export function AddMediaForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<MediaKind>("mededeling");
  const formRef = useRef<HTMLFormElement>(null);

  function submit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addMediaItem(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      formRef.current?.reset();
      setKind("mededeling");
    });
  }

  const showPodcastFields = kind === "podcast";
  const showVideoFields = kind === "video";
  const showWebField = kind === "nieuwsbrief" || kind === "artikel" || kind === "video";
  const showCoverField = kind === "podcast" || kind === "video" || kind === "nieuwsbrief";

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-4 rounded-2xl border border-dashed border-foreground/20 bg-card/40 p-4"
    >
      <h3 className="text-sm font-medium">Nieuw media-item</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Soort</label>
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as MediaKind)}
            className={FIELD}
          >
            {MEDIA_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.icon} {k.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-end gap-2 text-sm">
          <input type="checkbox" name="pinned" /> Vastpinnen bovenaan
        </label>
      </div>

      <div>
        <label className={LABEL}>Titel</label>
        <input name="title" required className={FIELD} />
      </div>

      <div>
        <label className={LABEL}>Tekst / beschrijving (markdown, optioneel)</label>
        <textarea name="body_md" rows={kind === "mededeling" ? 4 : 2} className={`${FIELD} font-mono`} />
      </div>

      {showPodcastFields && (
        <div className="space-y-3 rounded-md border bg-card/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Podcast-links (vul in waar je een link voor hebt; leden zien een knop
            per platform)
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Apple Podcasts</label>
              <input
                name="apple_url"
                type="url"
                placeholder="https://podcasts.apple.com/…"
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL}>Spotify</label>
              <input
                name="spotify_url"
                type="url"
                placeholder="https://open.spotify.com/…"
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL}>RSS-feed (voor andere podcast-apps)</label>
              <input
                name="rss_url"
                type="url"
                placeholder="https://feeds.example.com/…"
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL}>Web (Anchor, Buzzsprout, eigen site)</label>
              <input
                name="web_url"
                type="url"
                placeholder="https://…"
                className={FIELD}
              />
            </div>
          </div>
        </div>
      )}

      {showVideoFields && (
        <div>
          <label className={LABEL}>YouTube-URL</label>
          <input
            name="youtube_url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=…"
            className={FIELD}
          />
        </div>
      )}

      {showWebField && !showPodcastFields && (
        <div>
          <label className={LABEL}>Link</label>
          <input
            name="web_url"
            type="url"
            placeholder="https://…"
            className={FIELD}
          />
        </div>
      )}

      {showCoverField && (
        <div>
          <label className={LABEL}>Cover-afbeelding URL (optioneel)</label>
          <input
            name="cover_url"
            type="url"
            placeholder="https://…/cover.jpg"
            className={FIELD}
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Plaatsen…" : "Plaatsen"}
      </Button>
    </form>
  );
}
