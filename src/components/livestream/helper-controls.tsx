"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Square } from "lucide-react";
import { streamHelperCommand } from "@/app/(app)/_actions/livestream";
import { Button } from "@/components/ui/button";

export type HelperState = {
  online: boolean;
  obsState: "streaming" | "idle" | "obs-offline" | null;
};

export function helperStateLabel(state: HelperState): string {
  if (!state.online) return "Hulp-app staat niet aan";
  if (state.obsState === "streaming") return "OBS streamt";
  if (state.obsState === "obs-offline") return "OBS niet bereikbaar";
  return "OBS klaar";
}

/** OBS starten en stoppen via de stream-hulp op de eigen pc of Mac (fase 3). */
export function HelperControls({ state }: { state: HelperState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function send(action: "start" | "stop") {
    setError(null);
    startTransition(async () => {
      const res = await streamHelperCommand(action);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // De hulp meldt de nieuwe stand binnen een paar seconden terug.
      setTimeout(() => router.refresh(), 4000);
    });
  }

  const streaming = state.online && state.obsState === "streaming";
  return (
    <div className="flex flex-wrap items-center gap-3">
      {streaming ? (
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => send("stop")}>
          <Square className="size-3.5" />
          OBS stoppen
        </Button>
      ) : (
        <Button type="button" size="sm" disabled={pending} onClick={() => send("start")}>
          <Play className="size-3.5" />
          OBS starten
        </Button>
      )}
      <span className="text-sm text-muted-foreground">{helperStateLabel(state)}</span>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
