"use client";

import { Plus, Trash2 } from "lucide-react";
import { ZONE_COLOR, ZONE_LABEL, type EventZone } from "./zone";

const km = (n: number) => n.toLocaleString("nl-NL", { maximumFractionDigits: 1 });

/**
 * Lijst-editor voor geneutraliseerde zones (alleen beheerder/creator). Bewerkt
 * `draft` (bereiken in km); de kaart en het profiel veranderen live mee.
 */
export function ZoneEditor({
  draft,
  totalKm,
  saving,
  message,
  onChange,
  onSave,
  onCancel,
}: {
  draft: EventZone[];
  totalKm: number;
  saving: boolean;
  message: string | null;
  onChange: (next: EventZone[]) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const update = (i: number, patch: Partial<EventZone>) =>
    onChange(draft.map((z, idx) => (idx === i ? { ...z, ...patch } : z)));

  const remove = (i: number) => onChange(draft.filter((_, idx) => idx !== i));

  const add = () =>
    onChange([
      ...draft,
      { startKm: 0, endKm: Math.min(totalKm, 5), label: null },
    ]);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">Neutralisatie bewerken</h3>

      {draft.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Geen geneutraliseerde zones. Voeg er een toe.
        </p>
      ) : (
        <ul className="space-y-2">
          {draft.map((zone, i) => (
            <li key={i} className="rounded-md border bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-block size-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: ZONE_COLOR }}
                />
                <input
                  type="text"
                  value={zone.label ?? ""}
                  onChange={(e) => update(i, { label: e.target.value || null })}
                  placeholder={ZONE_LABEL}
                  className="min-w-0 flex-1 rounded border bg-card px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  title="Verwijderen"
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <label className="inline-flex items-center gap-1">
                  van
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={totalKm}
                    value={zone.startKm}
                    onChange={(e) => update(i, { startKm: Number(e.target.value) })}
                    className="w-16 rounded border bg-card px-1.5 py-0.5 text-right tabular-nums text-foreground"
                  />
                  km
                </label>
                <label className="inline-flex items-center gap-1">
                  tot
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={totalKm}
                    value={zone.endKm}
                    onChange={(e) => update(i, { endKm: Number(e.target.value) })}
                    className="w-16 rounded border bg-card px-1.5 py-0.5 text-right tabular-nums text-foreground"
                  />
                  km
                </label>
                <span className="tabular-nums">
                  · {km(Math.max(0, zone.endKm - zone.startKm))} km
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted"
        >
          <Plus className="size-4" />
          Zone toevoegen
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Bezig…" : "Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}
