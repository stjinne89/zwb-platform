"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HelpLink } from "@/components/app-ui";
import { componentLabel } from "@/lib/maintenance/component-types";
import { deleteMyQuote, updateMyQuote } from "../_actions/quotes";

export type MyQuote = {
  id: string;
  component_type: string;
  body: string;
};

export function MyQuotes({ quotes }: { quotes: MyQuote[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (quotes.length === 0) return null;

  function save(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await updateMyQuote(id, draft);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Dit citaat verwijderen? Het verdwijnt meteen uit de app.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMyQuote(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Mijn citaten
        </h2>
        <HelpLink href="/voorwaarden" />
      </div>

      <ul className="mt-3 space-y-3">
        {quotes.map((quote) => (
          <li key={quote.id} className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              {componentLabel(quote.component_type)}
            </p>

            {editing === quote.id ? (
              <>
                <textarea
                  autoFocus
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" disabled={pending} onClick={() => save(quote.id)}>
                    {pending ? "Opslaan…" : "Opslaan"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setEditing(null)}
                  >
                    Annuleren
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm">{quote.body}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      setDraft(quote.body);
                      setEditing(quote.id);
                    }}
                  >
                    Aanpassen
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => remove(quote.id)}
                  >
                    Verwijderen
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}
