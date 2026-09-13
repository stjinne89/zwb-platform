"use client";

// Een mikpunt of een periode toevoegen. Twee formulieren die openklappen, zodat
// de pagina begint met het overzicht en niet met invulvelden.

import { useState } from "react";
import { CalendarRange, Flag } from "lucide-react";
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
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TargetForm todayKey={todayKey} events={events} />
      <PeriodForm todayKey={todayKey} />
    </div>
  );
}

function TargetForm({ todayKey, events }: { todayKey: string; events: SeasonEvent[] }) {
  const [open, setOpen] = useState(false);
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
    form.reset();
    setEventId("");
    setOpen(false);
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Flag className="size-5 text-primary" />
          Mikpunt
        </h2>
        <Button size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
          {open ? "Sluiten" : "Toevoegen"}
        </Button>
      </div>

      {open ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
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
            <Button type="submit" disabled={busy}>
              {busy ? "Opslaan…" : "Opslaan"}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function PeriodForm({ todayKey }: { todayKey: string }) {
  const [open, setOpen] = useState(false);
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
    form.reset();
    setOpen(false);
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarRange className="size-5 text-primary" />
          Periode
        </h2>
        <Button size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
          {open ? "Sluiten" : "Toevoegen"}
        </Button>
      </div>

      {open ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
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
            <Button type="submit" disabled={busy}>
              {busy ? "Opslaan…" : "Opslaan"}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
