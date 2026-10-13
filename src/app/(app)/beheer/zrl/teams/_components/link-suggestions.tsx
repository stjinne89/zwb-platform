"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { LinkSuggestion } from "@/lib/teams/wtrl-membership";
import { linkWtrlRider } from "../_actions";

export function LinkSuggestions({ suggestions }: { suggestions: LinkSuggestion[] }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function link(suggestion: LinkSuggestion) {
    setError(null);
    setBusy(suggestion.zwiftId);
    startTransition(async () => {
      const res = await linkWtrlRider(suggestion.zwiftId, suggestion.profileId);
      setBusy(null);
      if (!res.ok) {
        setError(`${suggestion.riderName}: ${res.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-lg border bg-card text-sm">
        {suggestions.map((suggestion) => (
          <li
            key={suggestion.zwiftId}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3"
          >
            <div className="min-w-0 flex-1">
              <p>
                <span className="font-medium">{suggestion.riderName}</span>{" "}
                <span className="text-muted-foreground">#{suggestion.zwiftId}</span>
                {" → "}
                <span className="font-medium">{suggestion.profileName}</span>
              </p>
              <p className="text-muted-foreground">{suggestion.wtrlTeams.join(", ")}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => link(suggestion)}
            >
              {busy === suggestion.zwiftId ? "Koppelen…" : "Koppelen"}
            </Button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
