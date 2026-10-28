"use client";

// Krachttrainingen uit intervals.icu, met per training de spieren die het lid
// heeft aangetikt. Tikken op een training opent de spierkaart.

import { useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MuscleMap } from "@/components/mobility/muscle-map";
import { MuscleMapPicker } from "@/components/mobility/muscle-map-picker";
import type { IntervalsStrengthSession } from "@/lib/training/intervals-strength";
import { MUSCLE_GROUPS, MUSCLE_LABELS, type MuscleGroup } from "@/lib/training/muscles";
import { formatWellnessDate } from "../../_components/format";

type ActionResult = { ok: true } | { ok: false; error: string };

function fullLoad(muscles: MuscleGroup[]) {
  return Object.fromEntries(muscles.map((group) => [group, 1]));
}

function sessionTitle(session: IntervalsStrengthSession) {
  return session.name?.trim() || "Krachttraining";
}

export function IntervalsStrengthList({
  sessions,
  saveAction,
}: {
  sessions: IntervalsStrengthSession[];
  saveAction: (formData: FormData) => Promise<ActionResult>;
}) {
  // Los van `isOpen`, zodat de titel tijdens het sluiten blijft staan.
  const [open, setCurrent] = useState<IntervalsStrengthSession | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Set<MuscleGroup>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const start = (session: IntervalsStrengthSession) => {
    setDraft(new Set(session.muscles));
    setError(null);
    setCurrent(session);
    setIsOpen(true);
  };

  const toggle = (group: MuscleGroup) =>
    setDraft((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  const save = () => {
    if (!open) return;
    const formData = new FormData();
    formData.set("intervals_id", open.intervalsId);
    formData.set("muscles", MUSCLE_GROUPS.filter((group) => draft.has(group)).join(","));
    startTransition(async () => {
      const result = await saveAction(formData);
      if (result.ok) setIsOpen(false);
      else setError(result.error);
    });
  };

  const chosen = MUSCLE_GROUPS.filter((group) => draft.has(group));

  return (
    <>
      <ul className="divide-y rounded-lg border bg-card">
        {sessions.map((session) => (
          <li key={session.intervalsId}>
            <button
              type="button"
              onClick={() => start(session)}
              className="flex min-h-[44px] w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{sessionTitle(session)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatWellnessDate(session.day)}
                  {session.minutes ? ` · ${session.minutes} min` : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {session.muscles.length > 0
                    ? session.muscles.map((group) => MUSCLE_LABELS[group]).join(" · ")
                    : "Spieren aantikken"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <MuscleMap load={fullLoad(session.muscles)} className="w-14" />
                <ChevronRight className="size-5 text-muted-foreground" />
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{open ? sessionTitle(open) : ""}</DialogTitle>
            {open && (
              <p className="text-sm text-muted-foreground">{formatWellnessDate(open.day)}</p>
            )}
          </DialogHeader>
          <MuscleMapPicker selected={draft} onToggle={toggle} className="mx-auto w-full max-w-sm" />
          <p className="mt-3 min-h-5 text-center text-sm">
            {chosen.map((group) => MUSCLE_LABELS[group]).join(" · ")}
          </p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <DialogFooter className="justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={chosen.length === 0}
              onClick={() => setDraft(new Set())}
            >
              Wissen
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
