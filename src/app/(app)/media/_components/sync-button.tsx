"use client";

import { useState, useTransition } from "react";
import { syncPodcastRss, syncYouTubeChannel } from "../_actions";
import { Button } from "@/components/ui/button";

type SyncStatus =
  | { kind: "idle" }
  | { kind: "ok"; msg: string }
  | { kind: "error"; msg: string };

export function SyncYouTubeButton() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<SyncStatus>({ kind: "idle" });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setStatus({ kind: "idle" });
          startTransition(async () => {
            const res = await syncYouTubeChannel();
            if (!res.ok) {
              setStatus({ kind: "error", msg: res.error });
            } else {
              setStatus({
                kind: "ok",
                msg: `${res.inserted} nieuw, ${res.updated} bijgewerkt (totaal ${res.total}).`,
              });
            }
          });
        }}
      >
        {pending ? "Bezig met syncen…" : "📺 Sync YouTube"}
      </Button>
      {status.kind === "ok" && (
        <span className="text-sm text-muted-foreground">{status.msg}</span>
      )}
      {status.kind === "error" && (
        <span className="text-sm text-destructive">{status.msg}</span>
      )}
    </div>
  );
}

export function SyncPodcastButton({ defaultRssUrl }: { defaultRssUrl: string }) {
  const [pending, startTransition] = useTransition();
  const [rssUrl, setRssUrl] = useState(defaultRssUrl);
  const [status, setStatus] = useState<SyncStatus>({ kind: "idle" });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="url"
          value={rssUrl}
          onChange={(e) => setRssUrl(e.target.value)}
          placeholder="https://anchor.fm/s/.../podcast/rss"
          className="min-w-[260px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || !rssUrl.trim()}
          onClick={() => {
            setStatus({ kind: "idle" });
            startTransition(async () => {
              const res = await syncPodcastRss(rssUrl);
              if (!res.ok) {
                setStatus({ kind: "error", msg: res.error });
              } else {
                setStatus({
                  kind: "ok",
                  msg: `${res.feedTitle}: ${res.inserted} nieuw, ${res.updated} bijgewerkt (totaal ${res.total}).`,
                });
              }
            });
          }}
        >
          {pending ? "Bezig met syncen…" : "🎙️ Sync podcast RSS"}
        </Button>
      </div>
      {status.kind === "ok" && (
        <p className="text-sm text-muted-foreground">{status.msg}</p>
      )}
      {status.kind === "error" && (
        <p className="text-sm text-destructive">{status.msg}</p>
      )}
    </div>
  );
}
