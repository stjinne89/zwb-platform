"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TOPIC_LABEL_MAX } from "@/lib/zwbieb/topics";
import { deleteTopic, renameTopic, setTopicStatus } from "../_actions";

export function TopicAdminRow({
  slug,
  label,
  status,
  uses,
  maker,
}: {
  slug: string;
  label: string;
  status: "active" | "hidden";
  uses: number;
  maker: string | null;
}) {
  const [draft, setDraft] = useState(label);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "Mislukt.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className={status === "hidden" ? "py-3 opacity-60" : "py-3"}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={draft}
          maxLength={TOPIC_LABEL_MAX}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Naam"
          className="min-h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {draft.trim() !== label && (
          <Button size="sm" disabled={pending} onClick={() => run(() => renameTopic(slug, draft))}>
            Opslaan
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setTopicStatus(slug, status === "hidden" ? "active" : "hidden"))}
        >
          {status === "hidden" ? "Tonen" : "Verbergen"}
        </Button>
        {uses === 0 && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (confirm(`"${label}" verwijderen?`)) run(() => deleteTopic(slug));
            }}
          >
            Verwijderen
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {uses} keer gebruikt{maker ? ` · toegevoegd door ${maker}` : ""}
        {status === "hidden" ? " · verborgen" : ""}
      </p>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </li>
  );
}
