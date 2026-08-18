"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteTip } from "../_actions";

export type TipRow = {
  id: string;
  component_type: string;
  body: string;
  source_type: "pro" | "lid" | "algemeen";
  source_name: string | null;
  source_url: string | null;
};

const SOURCE_LABEL: Record<TipRow["source_type"], string> = {
  pro: "Pro",
  lid: "Lid",
  algemeen: "Algemeen",
};

export function TipList({ tips }: { tips: (TipRow & { componentLabel: string })[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove(id: string) {
    if (!confirm("Deze tip verwijderen? Hij verdwijnt meteen uit Mijn garage.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteTip(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <ul className="space-y-2">
        {tips.map((tip) => (
          <li
            key={tip.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-3"
          >
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {tip.componentLabel} · {SOURCE_LABEL[tip.source_type]}
                {tip.source_name ? ` · ${tip.source_name}` : ""}
              </p>
              <p className="mt-1 text-sm">{tip.body}</p>
              {tip.source_url && (
                <a
                  href={tip.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs underline underline-offset-2"
                >
                  bron
                </a>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => remove(tip.id)}
            >
              Verwijderen
            </Button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </>
  );
}
