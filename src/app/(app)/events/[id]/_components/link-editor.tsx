"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  EVENT_LINK_KINDS,
  EVENT_LINK_KIND_LABELS,
  type EventLinkKind,
} from "@/lib/events/race-links";
import { saveEventLinks } from "../_actions";

type Draft = { kind: EventLinkKind; label: string; url: string };

/** Links bij een event (recon, ZwiftInsider, ZWB-site); alleen beheer. */
export function LinkEditor({
  eventId,
  initial,
}: {
  eventId: string;
  initial: Draft[];
}) {
  const [draft, setDraft] = useState<Draft[]>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const update = (i: number, patch: Partial<Draft>) => {
    setMessage(null);
    setDraft((rows) => rows.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };
  const remove = (i: number) => {
    setMessage(null);
    setDraft((rows) => rows.filter((_, idx) => idx !== i));
  };
  const add = () => {
    setMessage(null);
    setDraft((rows) => [...rows, { kind: "recon", label: "", url: "" }]);
  };

  const save = () =>
    startSave(async () => {
      const result = await saveEventLinks(eventId, draft);
      setMessage(result.ok ? "Opgeslagen." : result.error);
    });

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Links
      </h2>

      {draft.length > 0 && (
        <ul className="space-y-2">
          {draft.map((row, i) => (
            <li
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-2"
            >
              <select
                value={row.kind}
                onChange={(e) => update(i, { kind: e.target.value as EventLinkKind })}
                aria-label="Soort"
                className="rounded border bg-card px-2 py-1 text-sm"
              >
                {EVENT_LINK_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {EVENT_LINK_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={row.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Label"
                aria-label="Label"
                className="w-32 min-w-0 rounded border bg-card px-2 py-1 text-sm"
              />
              <input
                type="url"
                value={row.url}
                onChange={(e) => update(i, { url: e.target.value })}
                placeholder="https://…"
                aria-label="URL"
                className="min-w-0 flex-1 basis-48 rounded border bg-card px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                title="Verwijderen"
                className="rounded p-1 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted"
        >
          <Plus className="size-4" />
          Link toevoegen
        </button>
        <div className="ml-auto flex items-center gap-2">
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Bezig…" : "Links opslaan"}
          </button>
        </div>
      </div>
    </section>
  );
}
