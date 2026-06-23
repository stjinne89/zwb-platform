"use client";

import { Plus, Trash2, ChevronsDownUp } from "lucide-react";
import {
  CLIMB_CATEGORY_COLORS,
  type Climb,
  type ClimbCategory,
  type ClimbRange,
} from "@/lib/gpx-climbs";

const CATEGORIES: ClimbCategory[] = ["4e", "3e", "2e", "1e", "HC"];

const km = (n: number) => n.toLocaleString("nl-NL", { maximumFractionDigits: 1 });

/**
 * Lijst-editor voor de klim-overrides van een event. Bewerkt `draft` (bereiken);
 * `preview` is hetzelfde setje doorgerekend op de GPX, zodat we per rij de
 * actuele lengte/%/hm tonen terwijl het profiel/de kaart live meeveranderen.
 */
export function ClimbEditor({
  draft,
  preview,
  totalKm,
  saving,
  message,
  onChange,
  onResetAuto,
  onSave,
  onClear,
  onCancel,
}: {
  draft: ClimbRange[];
  preview: Climb[];
  totalKm: number;
  saving: boolean;
  message: string | null;
  onChange: (next: ClimbRange[]) => void;
  onResetAuto: () => void;
  onSave: () => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  const update = (i: number, patch: Partial<ClimbRange>) =>
    onChange(draft.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const remove = (i: number) => onChange(draft.filter((_, idx) => idx !== i));

  const mergeNext = (i: number) => {
    if (i >= draft.length - 1) return;
    const a = draft[i];
    const b = draft[i + 1];
    const merged: ClimbRange = {
      startKm: Math.min(a.startKm, b.startKm),
      endKm: Math.max(a.endKm, b.endKm),
      name: a.name ?? b.name ?? null,
      category: a.category ?? null,
    };
    onChange(draft.flatMap((r, idx) => (idx === i ? [merged] : idx === i + 1 ? [] : [r])));
  };

  const add = () =>
    onChange([
      ...draft,
      { startKm: 0, endKm: Math.min(totalKm, 2), name: null, category: null },
    ]);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Klimmen bewerken</h3>
        <button
          type="button"
          onClick={onResetAuto}
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Herstel naar automatisch
        </button>
      </div>

      {draft.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Geen klimmen. Voeg er een toe of herstel naar automatisch.
        </p>
      ) : (
        <ul className="space-y-2">
          {draft.map((range, i) => {
            const p = preview[i];
            return (
              <li key={i} className="rounded-md border bg-background p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-block size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: p ? CLIMB_CATEGORY_COLORS[p.category] : "transparent" }}
                  />
                  <input
                    type="text"
                    value={range.name ?? ""}
                    onChange={(e) => update(i, { name: e.target.value || null })}
                    placeholder={p?.name ?? "Naamloze klim"}
                    className="min-w-0 flex-1 rounded border bg-card px-2 py-1 text-sm"
                  />
                  <select
                    value={range.category ?? ""}
                    onChange={(e) =>
                      update(i, { category: (e.target.value || null) as ClimbCategory | null })
                    }
                    className="rounded border bg-card px-2 py-1 text-sm"
                    aria-label="Categorie"
                  >
                    <option value="">Auto{p ? ` (${p.category})` : ""}</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <label className="inline-flex items-center gap-1">
                    van
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={totalKm}
                      value={range.startKm}
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
                      value={range.endKm}
                      onChange={(e) => update(i, { endKm: Number(e.target.value) })}
                      className="w-16 rounded border bg-card px-1.5 py-0.5 text-right tabular-nums text-foreground"
                    />
                    km
                  </label>
                  {p && (
                    <span className="tabular-nums">
                      · {km(p.lengthM / 1000)} km · {Math.round(p.gainM)} hm ·{" "}
                      {km(p.avgGradient)}%
                    </span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1">
                    {i < draft.length - 1 && (
                      <button
                        type="button"
                        onClick={() => mergeNext(i)}
                        title="Samenvoegen met volgende"
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
                      >
                        <ChevronsDownUp className="size-3.5" />
                        samenvoegen
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      title="Verwijderen"
                      className="rounded p-1 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted"
        >
          <Plus className="size-4" />
          Klim toevoegen
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
          <button
            type="button"
            onClick={onClear}
            disabled={saving}
            className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Aanpassingen wissen
          </button>
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
