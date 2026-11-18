"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Radio } from "lucide-react";
import { prepareStream } from "@/app/(app)/_actions/livestream";
import { Button } from "@/components/ui/button";

export function PrepareStreamButton({ eventId }: { eventId: string }) {
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
