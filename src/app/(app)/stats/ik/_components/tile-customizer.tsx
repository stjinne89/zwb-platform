"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { defaultLayout, type TileLayout } from "@/lib/stats/tiles";
import { saveStatsTiles } from "../_actions";

export type CustomizerTile = { id: string; title: string; locked: boolean };

export function TileCustomizer({
  layout,
  tiles,
}: {
  layout: TileLayout;
  /** Titel per tegel, en of hij voor dit lid op slot zit (intervals.icu nodig). */
  tiles: CustomizerTile[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TileLayout>(layout);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const meta = new Map(tiles.map((tile) => [tile.id, tile]));

  function move(index: number, delta: number) {
    setDraft((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveStatsTiles(draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-10"
        onClick={() => {
          setDraft(layout);
          setError(null);
          setOpen(true);
        }}
      >
        <LayoutGrid className="size-4" />
        Tegels aanpassen
      </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tegels</DialogTitle>
        </DialogHeader>
        <ul className="divide-y rounded-md border">
          {draft.map((item, index) => {
            const tile = meta.get(item.id);
            if (!tile) return null;
            return (
              <li key={item.id} className="flex items-center gap-2 px-3 py-1.5">
                <label
                  className={cn(
                    "flex min-h-10 flex-1 items-center gap-3 text-sm",
                    tile.locked ? "text-muted-foreground" : "cursor-pointer",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={item.visible && !tile.locked}
                    disabled={tile.locked}
                    onChange={(event) =>
                      setDraft((current) =>
                        current.map((entry, i) =>
                          i === index ? { ...entry, visible: event.target.checked } : entry,
                        ),
                      )
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{tile.title}</span>
                </label>
                {tile.locked ? (
                  <Link
                    href="/zwbeter-worden/doelen"
                    className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    intervals.icu
                  </Link>
                ) : null}
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    aria-label={`${tile.title} omhoog`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="rounded p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${tile.title} omlaag`}
                    disabled={index === draft.length - 1}
                    onClick={() => move(index, 1)}
                    className="rounded p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <DialogFooter className="justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(defaultLayout())}>
            Standaard
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={save}>
            {pending ? "Opslaan…" : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
