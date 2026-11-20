"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ImageUp, Radio } from "lucide-react";
import { prepareStream, refreshStreamThumbnail, setOverlayStand } from "@/app/(app)/_actions/livestream";
import { Button } from "@/components/ui/button";

// Na het klaarzetten verdwijnt PrepareStreamButton en verschijnt ThumbnailButton;
// een geweigerde thumbnail gaat via deze map mee, per race.
const thumbnailErrors = new Map<string, string>();

export function PrepareStreamButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await prepareStream(eventId);
            if (!res.ok) setError(res.error);
            else if (res.thumbnailError) {
              thumbnailErrors.set(eventId, res.thumbnailError);
              router.refresh();
            }
          });
        }}
      >
        <Radio className="size-3.5" />
        {pending ? "Bezig…" : "Stream klaarzetten"}
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

/** De live stand in de OBS-overlay aan of uit (0341); de overlay volgt bij zijn volgende verversing. */
export function OverlayStandToggle({ streamId, initial }: { streamId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={on}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.checked;
            setOn(next);
            setError(null);
            startTransition(async () => {
              const res = await setOverlayStand(streamId, next);
              if (!res.ok) {
                setOn(!next);
                setError(res.error);
              }
            });
          }}
          className="size-4 accent-primary"
        />
        <span className="text-sm">Live stand in de overlay</span>
      </label>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

/** Kopieert de link naar de overlay, voor een browserbron in OBS (fase 2). */
export function OverlayLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${path}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.open(path, "_blank", "noopener,noreferrer");
        }
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Gekopieerd" : "Overlay-link voor OBS"}
    </Button>
  );
}

/** Maakt de thumbnail van de eigen stream opnieuw en zet hem op YouTube. */
export function ThumbnailButton({ streamId, eventId }: { streamId: string; eventId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const fromPrepare = thumbnailErrors.get(eventId) ?? null;
    thumbnailErrors.delete(eventId);
    return fromPrepare;
  });
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setError(null);
          setDone(false);
          startTransition(async () => {
            const res = await refreshStreamThumbnail(streamId);
            if (res.ok) setDone(true);
            else setError(res.error);
          });
        }}
      >
        {done ? <Check className="size-3.5" /> : <ImageUp className="size-3.5" />}
        {pending ? "Bezig…" : done ? "Thumbnail staat erop" : "Thumbnail vernieuwen"}
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </>
  );
}
