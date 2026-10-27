"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TIP_MAX, TIP_MIN } from "@/lib/zwbieb/limits";
import { cn } from "@/lib/utils";
import { addMyTip } from "@/app/(app)/zwbieb/_actions";

export type RaceTipKind = { slug: string; label: string };

/** Een racetip plaatsen: kies Zwift of buiten, schrijf de tip. */
export function RaceTipForm({ kinds, initial }: { kinds: RaceTipKind[]; initial: string }) {
  const [topic, setTopic] = useState(initial);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const length = body.trim().length;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await addMyTip({ topic, body });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div role="radiogroup" aria-label="Soort race" className="flex flex-wrap gap-2">
        {kinds.map((kind) => (
          <button
            key={kind.slug}
            type="button"
            role="radio"
            aria-checked={topic === kind.slug}
            onClick={() => setTopic(kind.slug)}
            className={cn(
              "min-h-11 rounded-full border px-4 text-sm",
              topic === kind.slug
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted",
            )}
          >
            {kind.label}
          </button>
        ))}
      </div>
      <label className="block text-sm font-medium">
        Jouw tip
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={length > TIP_MAX ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {length}/{TIP_MAX}
        </p>
        <Button className="min-h-11" disabled={pending || !topic || length < TIP_MIN || length > TIP_MAX} onClick={save}>
          {pending ? "Plaatsen…" : "Plaatsen"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
