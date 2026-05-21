"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMediaItem, updateMediaItem } from "../_actions";
import { Button } from "@/components/ui/button";
import { MEDIA_KINDS, type MediaKind } from "@/lib/media-kinds";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL =
  "mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

export type MediaInitial = {
  id: string;
  kind: MediaKind;
  title: string;
  body_md: string | null;
  apple_url: string | null;
  spotify_url: string | null;
  rss_url: string | null;
  youtube_url: string | null;
  web_url: string | null;
  cover_url: string | null;
  pinned: boolean;
  published_at: string | null;
};

// Converteer een ISO-datetime naar de "YYYY-MM-DDTHH:MM" vorm die
// een <input type="datetime-local"> verwacht. In local timezone.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MediaForm({ initial }: { initial?: MediaInitial }) {
  const isEdit = !!initial;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<MediaKind>(initial?.kind ?? "mededeling");
  const formRef = useRef<HTMLFormElement>(null);

  function submit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const res = isEdit
        ? await updateMediaItem(initial.id, fd)
        : await addMediaItem(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (isEdit) {
        router.push("/media");
      } else {
        formRef.current?.reset();
        setKind("mededeling");
      }
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
      className={
        isEdit
          ? "space-y-4 rounded-2xl border bg-card p-6"
          : "space-y-4 rounded-2xl border border-dashed border-foreground/20 bg-card/40 p-4"
      }
    >
      <h3 className="text-sm font-medium">
        {isEdit ? "Media-item bewerken" : "Nieuw media-item"}
      </h3>

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
          <input type="checkbox" name="pinned" defaultChecked={initial?.pinned} />{" "}
          Vastpinnen bovenaan
        </label>
      </div>

      <div>
        <label className={LABEL}>Titel</label>
        <input
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          className={FIELD}
        />
      </div>

      <div>
        <label className={LABEL}>
          Publicatiedatum {isEdit ? "" : "(optioneel — leeg = nu)"}
        </label>
        <input
          type="datetime-local"
          name="published_at"
          defaultValue={isoToLocalInput(initial?.published_at ?? null)}
          className={FIELD}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Gebruik de oorspronkelijke datum van de inhoud (bv. de
          creatie-datum van een Drive-document of de uitzenddatum van
          een aflevering).
        </p>
      </div>

      <div>
        <label className={LABEL}>Tekst / beschrijving (markdown, optioneel)</label>
        <textarea
          name="body_md"
          rows={kind === "mededeling" ? 4 : 2}
          defaultValue={initial?.body_md ?? ""}
          className={`${FIELD} font-mono`}
        />
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
                defaultValue={initial?.apple_url ?? ""}
                placeholder="https://podcasts.apple.com/…"
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL}>Spotify</label>
              <input
                name="spotify_url"
                type="url"
                defaultValue={initial?.spotify_url ?? ""}
                placeholder="https://open.spotify.com/…"
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL}>RSS-feed (voor andere podcast-apps)</label>
              <input
                name="rss_url"
                type="url"
                defaultValue={initial?.rss_url ?? ""}
                placeholder="https://feeds.example.com/…"
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL}>Web (Anchor, Buzzsprout, eigen site)</label>
              <input
                name="web_url"
                type="url"
                defaultValue={initial?.web_url ?? ""}
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
            defaultValue={initial?.youtube_url ?? ""}
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
            defaultValue={initial?.web_url ?? ""}
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
            defaultValue={initial?.cover_url ?? ""}
            placeholder="https://…/cover.jpg"
            className={FIELD}
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (isEdit ? "Opslaan…" : "Plaatsen…") : isEdit ? "Opslaan" : "Plaatsen"}
        </Button>
        {isEdit && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => router.push("/media")}
          >
            Annuleer
          </Button>
        )}
      </div>
    </form>
  );
}

// Backwards-compatible export voor /media page.
export function AddMediaForm() {
  return <MediaForm />;
}
