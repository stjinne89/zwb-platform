"use client";

// Formulieren van de protocollen: starten (met toestemming), een taak afvinken
// en stoppen.

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProtocolActionResult } from "../../_protocol-actions";

type Action = (formData: FormData) => Promise<ProtocolActionResult>;

function useFormAction(action: Action) {
  return useActionState(
    async (_previous: ProtocolActionResult | null, formData: FormData) => action(formData),
    null,
  );
}

const inputClass = "min-h-[44px] w-full rounded-md border bg-background px-3";

export function ProtocolStartForm({
  action,
  slug,
  anchor,
  today,
  races,
}: {
  action: Action;
  slug: string;
  anchor: "start" | "wedstrijd";
  today: string;
  /** Mikpunten uit de jaarplanning, alleen bij een wedstrijdprotocol. */
  races: { date: string; title: string }[];
}) {
  const [state, submit, pending] = useFormAction(action);
  const [race, setRace] = useState(races[0]?.date ?? "");
  const [date, setDate] = useState(anchor === "start" ? today : (races[0]?.date ?? ""));

  return (
    <form action={submit} className="max-w-2xl space-y-4 rounded-lg border bg-card p-5">
      <input type="hidden" name="slug" value={slug} />
      {anchor === "wedstrijd" && races.length > 0 ? (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Wedstrijd</span>
          <select
            className={inputClass}
            value={race}
            onChange={(event) => {
              setRace(event.target.value);
              if (event.target.value) setDate(event.target.value);
            }}
          >
            {races.map((option) => (
              <option key={`${option.date}-${option.title}`} value={option.date}>
                {option.title} · {option.date}
              </option>
            ))}
            <option value="">Andere datum</option>
          </select>
        </label>
      ) : null}
      {anchor === "start" || race === "" || races.length === 0 ? (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{anchor === "wedstrijd" ? "Wedstrijddag" : "Startdatum"}</span>
          <input
            type="date"
            className={inputClass}
            min={today}
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
      ) : null}
      <input type="hidden" name="date" value={date} />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="consent" value="ja" required className="mt-1 size-4 shrink-0" />
        <span>
          ZWB houdt bij dat ik dit protocol volg en wat ik afvink. Mijn eigen trainer ziet dat ook. Ik kan
          het altijd stoppen.{" "}
          <Link href="/privacy#protocollen" className="text-primary hover:underline">
            Privacyverklaring
          </Link>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="min-h-[44px]" disabled={pending || !date}>
          {pending ? "Bezig…" : "Start protocol"}
        </Button>
        {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}

export function ProtocolTaskToggle({
  action,
  runId,
  taskKey,
  day,
  done,
  label,
  disabled,
}: {
  action: Action;
  runId: string;
  taskKey: string;
  day: string;
  done: boolean;
  label: string;
  /** De trainer kijkt mee maar vinkt niet af. */
  disabled?: boolean;
}) {
  const [state, submit, pending] = useFormAction(action);
  const Icon = done ? Check : Square;
  return (
    <form action={submit} className="shrink-0">
      <input type="hidden" name="run_id" value={runId} />
      <input type="hidden" name="task_key" value={taskKey} />
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="done" value={done ? "ja" : "nee"} />
      <Button
        type="submit"
        variant={done ? "default" : "outline"}
        size="icon"
        className="size-11"
        disabled={pending || disabled}
        aria-label={done ? `${label}: vinkje weghalen` : `${label}: afvinken`}
        aria-pressed={done}
      >
        <Icon className="size-5" />
      </Button>
      {state && !state.ok && <span className="sr-only">{state.error}</span>}
    </form>
  );
}

export function ProtocolStopButton({ action, runId }: { action: Action; runId: string }) {
  const [state, submit, pending] = useFormAction(action);
  return (
    <form
      action={submit}
      onSubmit={(event) => {
        if (!window.confirm("Dit protocol stoppen?")) event.preventDefault();
      }}
      className="flex flex-wrap items-center gap-3"
    >
      <input type="hidden" name="run_id" value={runId} />
      <Button type="submit" variant="outline" className="min-h-[44px]" disabled={pending}>
        {pending ? "Bezig…" : "Stoppen"}
      </Button>
      {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
    </form>
  );
}
