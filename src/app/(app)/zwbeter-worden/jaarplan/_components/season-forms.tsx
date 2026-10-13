"use client";

// Een mikpunt of een periode toevoegen. Eén knop; het formulier met de keuze
// klapt eronder open, zodat de pagina begint met de weg en niet met invulvelden.

import { useState } from "react";
import { CalendarRange, Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SEASON_PERIOD_LABELS,
  SEASON_PRIORITY_LABELS,
  type SeasonEvent,
} from "@/lib/training/season";
import { createSeasonPeriod, createSeasonTarget } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function SeasonForms({
  todayKey,
  events,
}: {
  todayKey: string;
  /** Clubevents waar het lid ja of misschien op zei en die nog geen mikpunt zijn. */
  events: SeasonEvent[];
}) {
  const [open, setOpen] = useState(false);
  const [soort, setSoort] = useState<"mikpunt" | "periode">("mikpunt");

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="min-h-11 w-full sm:w-auto">
        <Plus className="size-4" />
        Toevoegen
      </Button>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        {/* Dezelfde schakelaar als Lijst/Maand op de schemapagina. */}
        <div className="flex rounded-md border bg-background p-0.5 text-sm">
          {(
            [
              { value: "mikpunt", label: "Mikpunt", icon: Flag },
              { value: "periode", label: "Periode", icon: CalendarRange },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={soort === value}
              onClick={() => setSoort(value)}
              className={`flex min-h-10 items-center gap-1.5 rounded px-3 font-medium ${
                soort === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        <Button variant="ghost" onClick={() => setOpen(false)} className="min-h-10">
          Sluiten
        </Button>
      </div>
      {soort === "mikpunt" ? (
        <TargetForm todayKey={todayKey} events={events} onDone={() => setOpen(false)} />
      ) : (
        <PeriodForm todayKey={todayKey} onDone={() => setOpen(false)} />
      )}
    </section>
  );
}

function TargetForm({
  todayKey,
  events,
  onDone,
}: {
  todayKey: string;
  events: SeasonEvent[];
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  // Met een event gekozen komen titel en datum van het event.
  const [eventId, setEventId] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setFout(null);
    const result = await createSeasonTarget(new FormData(form));
    setBusy(false);
    if (result && !result.ok) {
      setFout(result.error ?? "Opslaan faalde.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
      {events.length > 0 ? (
        <label className="sm:col-span-2 text-sm">
          Event
          <select
            name="event_id"
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            className={`mt-1 ${FIELD}`}
          >
            <option value="">Geen</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} · {event.date}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {eventId ? null : (
        <>
          <label className="sm:col-span-2 text-sm">
            Titel
            <input name="title" required className={`mt-1 ${FIELD}`} />
          </label>
          <label className="text-sm">
            Datum
            <input
              type="date"
              name="target_date"
              required
              defaultValue={todayKey}
              className={`mt-1 ${FIELD}`}
            />
          </label>
        </>
      )}
      <label className="text-sm">
        Prioriteit
        <select name="priority" defaultValue="b" className={`mt-1 ${FIELD}`}>
          {Object.entries(SEASON_PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2 text-sm">
        Notitie
        <input name="note" className={`mt-1 ${FIELD}`} />
      </label>
      {fout ? <p className="sm:col-span-2 text-sm text-destructive">{fout}</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy} className="min-h-11 sm:min-h-0">
          {busy ? "Opslaan…" : "Opslaan"}
        </Button>
      </div>
    </form>
  );
}

function PeriodForm({ todayKey, onDone }: { todayKey: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setFout(null);
    const result = await createSeasonPeriod(new FormData(form));
    setBusy(false);
    if (result && !result.ok) {
      setFout(result.error ?? "Opslaan faalde.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
      <label className="sm:col-span-2 text-sm">
        Titel
        <input name="title" required className={`mt-1 ${FIELD}`} />
      </label>
      <label className="text-sm">
        Van
        <input
          type="date"
          name="start_date"
          required
          defaultValue={todayKey}
          className={`mt-1 ${FIELD}`}
        />
      </label>
      <label className="text-sm">
        Tot en met
        <input
          type="date"
          name="end_date"
          required
          defaultValue={todayKey}
          className={`mt-1 ${FIELD}`}
        />
      </label>
      <label className="text-sm">
        Soort
        <select name="kind" defaultValue="rust" className={`mt-1 ${FIELD}`}>
          {Object.entries(SEASON_PERIOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2 text-sm">
        Notitie
        <input name="note" className={`mt-1 ${FIELD}`} />
      </label>
      {fout ? <p className="sm:col-span-2 text-sm text-destructive">{fout}</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy} className="min-h-11 sm:min-h-0">
          {busy ? "Opslaan…" : "Opslaan"}
        </Button>
      </div>
    </form>
  );
}
