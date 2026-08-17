"use client";

// Intervalblokken aanpassen via de gekleurde balk in plaats van via een rij
// invoervelden per blok. Je tikt een blok aan en past het aan; alle blokken die
// er precies hetzelfde uitzien gaan mee. Een 5x4-workout is zo één handeling in
// plaats van vijf, en op een telefoon is een gekleurd vlak veel makkelijker te
// raken dan een rij smalle velden.
//
// De waarden gaan als verborgen velden mee in het formulier eromheen, in exact
// de vorm die blocksFromForm verwacht.

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  INTENSITY_COLORS,
  INTENSITY_LABELS,
  powerRangePercentForBlock,
  WORKOUT_INTENSITIES,
  type WorkoutBlock,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { cn } from "@/lib/utils";

/** Twee blokken zijn "hetzelfde" als elk veld gelijk is. */
function signatureOf(block: WorkoutBlock) {
  return [block.label, block.durationMinutes, block.target, block.notes, block.intensity].join("|");
}

/** De posities van alle blokken die identiek zijn aan die op `index`. */
export function sameBlockIndexes(blocks: WorkoutBlock[], index: number) {
  const signature = signatureOf(blocks[index]);
  return blocks.flatMap((block, i) => (signatureOf(block) === signature ? [i] : []));
}

const FIELD = "mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm";
const MAX_PCT = 160;

export function BlockEditor({
  blocks: initialBlocks,
  fallbackIntensity,
  ftpWatts,
}: {
  blocks: WorkoutBlock[];
  /** Intensiteit van de workout zelf, voor een nieuw blok. */
  fallbackIntensity: string;
  ftpWatts?: number | null;
}) {
  const [blocks, setBlocks] = useState<WorkoutBlock[]>(initialBlocks);
  const [selected, setSelected] = useState<number[]>([]);

  const total = blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  const current = selected.length > 0 ? blocks[selected[0]] : null;

  function patch(change: Partial<WorkoutBlock>) {
    setBlocks((current) =>
      current.map((block, index) => (selected.includes(index) ? { ...block, ...change } : block)),
    );
  }

  function removeSelected() {
    setBlocks((current) => current.filter((_, index) => !selected.includes(index)));
    setSelected([]);
  }

  function addBlock() {
    setBlocks((current) => [
      ...current,
      {
        label: "Blok",
        durationMinutes: 5,
        target: "",
        notes: "",
        intensity: fallbackIntensity as WorkoutIntensity,
      },
    ]);
    setSelected([blocks.length]);
  }

  // Eén regel per groep gelijke blokken; het aantal staat erachter.
  const groups: Array<{ index: number; indexes: number[] }> = [];
  const seen = new Set<string>();
  blocks.forEach((block, index) => {
    const signature = signatureOf(block);
    if (seen.has(signature)) return;
    seen.add(signature);
    groups.push({ index, indexes: sameBlockIndexes(blocks, index) });
  });

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <div key={`hidden-${index}`}>
          <input type="hidden" name="block_label" value={block.label} />
          <input type="hidden" name="block_duration" value={block.durationMinutes} />
          <input type="hidden" name="block_target" value={block.target} />
          <input type="hidden" name="block_notes" value={block.notes} />
          <input type="hidden" name="block_intensity" value={block.intensity} />
        </div>
      ))}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Intervalblokken</p>
        <p className="text-xs text-muted-foreground tabular-nums">Samen {total} min</p>
      </div>

      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog geen blokken.</p>
      ) : (
        <div className="flex h-24 overflow-hidden rounded-md border bg-muted">
          {blocks.map((block, index) => {
            const range = powerRangePercentForBlock(block, ftpWatts ?? null);
            const low = range ? Math.max(0, Math.min(MAX_PCT, range[0])) : 0;
            const high = range ? Math.max(low, Math.min(MAX_PCT, range[1])) : MAX_PCT;
            const bandHeight = range ? Math.max(8, ((high - low) / MAX_PCT) * 100) : 100;
            return (
              <button
                key={`bar-${index}`}
                type="button"
                title={`${block.label} - ${block.durationMinutes} min ${block.target}`}
                aria-label={`${block.label}, ${block.durationMinutes} minuten`}
                aria-pressed={selected.includes(index)}
                onClick={() => setSelected(sameBlockIndexes(blocks, index))}
                className={cn(
                  "relative min-w-[18px] border-r border-background/60 last:border-r-0",
                  selected.includes(index) && "ring-2 ring-inset ring-foreground",
                )}
                style={{
                  width: `${Math.max(4, (block.durationMinutes / (total || 1)) * 100)}%`,
                  backgroundColor: `${INTENSITY_COLORS[block.intensity]}26`,
                }}
              >
                <span
                  className="absolute inset-x-0"
                  style={{
                    bottom: `${(low / MAX_PCT) * 100}%`,
                    height: `${bandHeight}%`,
                    backgroundColor: INTENSITY_COLORS[block.intensity],
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Op een smalle balk is een blok van vier minuten nauwelijks te raken;
          deze knoppen zijn dezelfde keuze, maar dan op duimformaat. */}
      <div className="flex flex-wrap gap-1.5">
        {groups.map((group) => {
          const block = blocks[group.index];
          const active = selected.includes(group.index);
          return (
            <button
              key={`chip-${group.index}`}
              type="button"
              onClick={() => setSelected(group.indexes)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs transition",
                active ? "border-foreground bg-accent" : "hover:bg-accent",
              )}
            >
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: INTENSITY_COLORS[block.intensity] }}
              />
              {block.label || "Blok"} {block.durationMinutes}m {block.target}
              {group.indexes.length > 1 ? (
                <span className="font-medium tabular-nums">×{group.indexes.length}</span>
              ) : null}
            </button>
          );
        })}
        <button
          type="button"
          onClick={addBlock}
          className="inline-flex min-h-9 items-center gap-1 rounded-md border border-dashed px-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Blok
        </button>
      </div>

      {current ? (
        <div className="rounded-md border bg-background p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium">
              {selected.length > 1
                ? `${selected.length} gelijke blokken aanpassen`
                : "Blok aanpassen"}
            </p>
            <button
              type="button"
              onClick={removeSelected}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Trash2 className="size-3.5" />
              {selected.length > 1 ? "Verwijder alle" : "Verwijder"}
            </button>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_90px_1fr_140px]">
            <label className="text-xs text-muted-foreground">
              Naam
              <input
                value={current.label}
                onChange={(event) => patch({ label: event.target.value })}
                className={FIELD}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Minuten
              <input
                type="number"
                min="1"
                max="480"
                value={current.durationMinutes}
                onChange={(event) =>
                  patch({ durationMinutes: Math.max(0, Number(event.target.value) || 0) })
                }
                className={FIELD}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Doel
              <input
                value={current.target}
                onChange={(event) => patch({ target: event.target.value })}
                placeholder="bv. 88-94%"
                className={FIELD}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Intensiteit
              <select
                value={current.intensity}
                onChange={(event) =>
                  patch({ intensity: event.target.value as WorkoutIntensity })
                }
                className={FIELD}
              >
                {WORKOUT_INTENSITIES.map((value) => (
                  <option key={value} value={value}>
                    {INTENSITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
              Notitie
              <input
                value={current.notes}
                onChange={(event) => patch({ notes: event.target.value })}
                className={FIELD}
              />
            </label>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Tik een blok aan om het aan te passen.
        </p>
      )}
    </div>
  );
}
