"use client";

// Een rit die het lid zelf vastlegt: de clubrit van zaterdag, een buitenrit, een
// wedstrijd. Geen blokkenstructuur — het is een afspraak, geen voorgeschreven
// training. Het schema plant er daarna omheen.

import { useCallback, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { planOwnRide } from "../_actions";
import { useAiDraftPoll } from "./use-ai-draft-poll";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

const KINDS = [
  { value: "buitenrit", label: "Buitenrit" },
  { value: "clubrit", label: "Clubrit" },
  { value: "wedstrijd", label: "Wedstrijd" },
  { value: "eigen", label: "Eigen training" },
] as const;

const EFFORTS = [
  { value: "rustig", label: "Rustig" },
  { value: "duur", label: "Duur" },
  { value: "tempo", label: "Tempo" },
  { value: "zwaar", label: "Zwaar" },
] as const;

const MIN_MINUTES = 15;
const MAX_MINUTES = 480;

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} uur`;
  return `${hours}u ${rest}`;
}

export function PlanRideForm({ todayKey }: { todayKey: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>("buitenrit");
  const [effort, setEffort] = useState<string>("duur");
  const [duration, setDuration] = useState(90);
  const [date, setDate] = useState(todayKey);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onCompleted = useCallback(() => {
    setResult("Ingepland. Je schema is eromheen bijgewerkt.");
  }, []);
  const poll = useAiDraftPoll({
    onCompleted,
    failureMessage: "Bijwerken van je schema is mislukt.",
  });

  const busy = saving || poll.pending;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    poll.setError(null);
    setResult(null);

    const formData = new FormData(event.currentTarget);
    formData.set("kind", kind);
    formData.set("effort", effort);
    formData.set("duration_minutes", String(duration));

    setSaving(true);
    try {
      const outcome = await planOwnRide(formData);
      if (!outcome.ok) {
        poll.setError(outcome.error);
        return;
      }
      setOpen(false);
      if (outcome.generationId) {
        setResult("Ingepland. Je schema wordt eromheen bijgewerkt…");
        poll.watch(outcome.generationId);
      } else {
        setResult("Ingepland.");
      }
    } catch {
      poll.setError("Rit inplannen is mislukt.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarPlus className="size-5 text-primary" />
          Rit inplannen
        </h2>
        <Button type="button" size="sm" onClick={() => setOpen(true)} disabled={busy}>
          {busy ? "Bezig…" : "Inplannen"}
        </Button>
        {poll.error && <p className="w-full text-sm text-destructive">{poll.error}</p>}
        {result && <p className="w-full text-sm text-primary">{result}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <CalendarPlus className="size-5 text-primary" />
        Rit inplannen
      </h2>

      <div>
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Soort
        </span>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              className={`rounded-md border px-3 py-1.5 text-sm transition ${
                kind === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:border-primary/40"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Datum
          </span>
          <input
            name="date"
            type="date"
            required
            value={date}
            min={todayKey}
            onChange={(event) => setDate(event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Starttijd
          </span>
          <input name="time" type="time" defaultValue="09:00" className={FIELD} />
        </label>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Duur
          </span>
          <span className="text-sm tabular-nums">{minutesLabel(duration)}</span>
        </div>
        <input
          type="range"
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          step={15}
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        />
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Zwaarte
        </span>
        <div className="flex flex-wrap gap-1.5">
          {EFFORTS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setEffort(option.value)}
              className={`rounded-md border px-3 py-1.5 text-sm transition ${
                effort === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:border-primary/40"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Notitie (optioneel)
        </span>
        <input name="note" placeholder="bv. clubrit vanaf de kerk" className={FIELD} />
      </label>

      {poll.error && <p className="text-sm text-destructive">{poll.error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Bezig…" : "Zet in mijn schema"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            poll.setError(null);
          }}
          disabled={busy}
        >
          Annuleer
        </Button>
      </div>
    </form>
  );
}
