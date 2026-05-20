"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncResultsNow } from "../_actions";

type SyncState =
  | { kind: "idle" }
  | { kind: "success"; message: string; details?: string[] }
  | { kind: "notice"; message: string; details?: string[] }
  | { kind: "error"; message: string; details?: string[] };

export function SyncResultsButton() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<SyncState>({ kind: "idle" });

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setState({ kind: "idle" });
          startTransition(async () => {
            const res = await syncResultsNow();
            if (!res.ok) {
              setState({ kind: "error", message: res.error });
              return;
            }

            const failed = res.summary.sources.filter((source) => source.error).length;
            const skipped = res.summary.sources.filter((source) => source.skipped).length;
            const firstProblem = res.summary.sources.find(
              (source) => source.error || source.skipped,
            );
            const details = res.summary.sources
              .filter((source) => source.error || source.skipped)
              .slice(0, 6)
              .map(
                (source) =>
                  `${source.provider === "wtrl" ? "WTRL" : "Ladder"} ${source.matchName}: ${
                    source.error ?? source.skipped
                  }`,
              );
            const rosterSynced = res.summary.sources.reduce(
              (total, source) => total + source.rosterSynced,
              0,
            );
            const setupText =
              res.summary.teamsCreated || res.summary.sourcesCreated
                ? `${res.summary.teamsCreated} teams aangemaakt, ${res.summary.sourcesCreated} bronnen gekoppeld, `
                : "";
            const resultText = `${setupText}${res.summary.insertedOrUpdated} resultaatupdates, ${rosterSynced} rosterleden`;
            setState({
              kind: failed > 0 ? "error" : skipped > 0 ? "notice" : "success",
              details,
              message:
                failed > 0
                  ? `${resultText}, ${failed} bronnen met fout: ${firstProblem?.error ?? "onbekend"}.`
                  : skipped > 0
                    ? `${resultText}, ${skipped} bronnen overgeslagen: ${firstProblem?.skipped ?? "geen stand gevonden"}.`
                  : `${resultText} verwerkt.`,
            });
          });
        }}
      >
        <RefreshCw
          data-icon="inline-start"
          className={pending ? "animate-spin" : undefined}
        />
        Teams en resultaten syncen
      </Button>
      {state.kind !== "idle" && (
        <p
          className={
            state.kind === "success"
              ? "text-xs text-muted-foreground"
              : state.kind === "notice"
                ? "text-xs text-muted-foreground"
              : "text-xs text-destructive"
          }
        >
          {state.message}
        </p>
      )}
      {state.kind !== "idle" && state.details && state.details.length > 0 && (
        <ul className="max-w-md space-y-1 text-left text-xs text-muted-foreground">
          {state.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
