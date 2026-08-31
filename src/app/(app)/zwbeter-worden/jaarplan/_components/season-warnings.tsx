"use client";

// De signaleringen uit seasonWarnings(), elk met de knop die hem oplost.
//
// Bewust geen lijst met adviezen om zelf uit te zoeken: elke regel hier hoort
// één handeling ver van opgelost te zijn.

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SeasonWarning } from "@/lib/training/season";
import {
  createSeasonTarget,
  requestSeasonReplan,
  updateSeasonTarget,
} from "../_actions";

/** Een link die eruitziet als de outline-knop hiernaast; Button kent geen asChild. */
const LINK_BUTTON =
  "inline-flex h-7 shrink-0 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-all hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50";

export function SeasonWarnings({ warnings }: { warnings: SeasonWarning[] }) {
  const [pending, startTransition] = useTransition();
  const [bezig, setBezig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  if (warnings.length === 0) return null;

  function run(id: string, fn: () => Promise<{ ok: boolean; error?: string } | null>) {
    setBezig(id);
    setFout(null);
    startTransition(async () => {
      const result = await fn();
      if (result && !result.ok) setFout(result.error ?? "Er ging iets mis.");
      setBezig(null);
    });
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="font-semibold">Wat opvalt</h2>
      <ul className="mt-3 space-y-3">
        {warnings.map((warning) => (
          <li key={warning.id} className="flex gap-3 rounded-md border bg-background p-3">
            {warning.severity === "let_op" ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            ) : (
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{warning.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{warning.detail}</p>
              {warning.action ? (
                <div className="mt-2">
                  <Action
                    warning={warning}
                    busy={pending && bezig === warning.id}
                    onRun={(fn) => run(warning.id, fn)}
                  />
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {fout ? <p className="mt-3 text-sm text-destructive">{fout}</p> : null}
    </section>
  );
}

function Action({
  warning,
  busy,
  onRun,
}: {
  warning: SeasonWarning;
  busy: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; error?: string } | null>) => void;
}) {
  const action = warning.action;
  if (!action) return null;

  if (action.kind === "open_schema") {
    return (
      <Link href="/zwbeter-worden/schema" className={LINK_BUTTON}>
        {action.label}
      </Link>
    );
  }

  if (action.kind === "open_event") {
    return (
      <Link href={`/events/${action.eventId}`} className={LINK_BUTTON}>
        {action.label}
      </Link>
    );
  }

  if (action.kind === "maak_doel") {
    return (
      <Link href={`/zwbeter-worden/doelen?mikpunt=${action.targetId}`} className={LINK_BUTTON}>
        {action.label}
      </Link>
    );
  }

  if (action.kind === "herzie_schema") {
    return (
      <Button size="sm" variant="outline" disabled={busy} onClick={() => onRun(requestSeasonReplan)}>
        {busy ? "Bezig…" : action.label}
      </Button>
    );
  }

  if (action.kind === "verlaag_prioriteit") {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() =>
          onRun(() => {
            const formData = new FormData();
            formData.set("id", action.targetId);
            formData.set("priority", "b");
            return updateSeasonTarget(formData);
          })
        }
      >
        {busy ? "Bezig…" : action.label}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={() =>
        onRun(() => {
          const formData = new FormData();
          formData.set("title", action.title);
          formData.set("target_date", action.date);
          formData.set("priority", "c");
          formData.set("event_id", action.eventId);
          return createSeasonTarget(formData);
        })
      }
    >
      {busy ? "Bezig…" : action.label}
    </Button>
  );
}
