"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EVENT_KINDS, EVENT_TYPES } from "@/lib/event-types";
import {
  countBulkEvents,
  createProgram,
  deleteProgram,
  linkBulkEvents,
  unlinkEvent,
  updateProgram,
  type BulkInput,
} from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

export type ProgramRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  archived: boolean;
  events: Array<{ id: string; title: string; dateLabel: string }>;
};

export function NewProgramForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createProgram({ name, description });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName("");
      setDescription("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <label className={LABEL}>Naam</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Road to WK GF"
          className={FIELD}
        />
      </div>
      <div>
        <label className={LABEL}>Omschrijving (optioneel)</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={FIELD}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" onClick={submit} disabled={pending || !name.trim()}>
        {pending ? "Bezig…" : "Aanmaken"}
      </Button>
    </div>
  );
}

export function ProgramCard({ program }: { program: ProgramRow }) {
  const [name, setName] = useState(program.name);
  const [description, setDescription] = useState(program.description ?? "");
  const [archived, setArchived] = useState(program.archived);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/programmas/${program.slug}`}
          className="font-medium text-primary hover:underline"
        >
          {program.name}
        </Link>
        <span className="text-xs text-muted-foreground">
          {program.events.length} events{program.archived ? " · gearchiveerd" : ""}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Naam</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Omschrijving</label>
          <textarea
            rows={1}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={FIELD}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={archived}
          onChange={(e) => setArchived(e.target.checked)}
          className="size-4 accent-primary"
        />
        Gearchiveerd
      </label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || !name.trim()}
          onClick={() =>
            run(() => updateProgram({ id: program.id, name, description, archived }))
          }
        >
          Opslaan
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto text-destructive"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Programma "${program.name}" verwijderen?`)) {
              run(() => deleteProgram(program.id));
            }
          }}
        >
          Verwijder
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <BulkLinkForm programId={program.id} />

      {program.events.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Gekoppelde events ({program.events.length})
          </summary>
          <ul className="mt-2 divide-y rounded-md border">
            {program.events.map((event) => (
              <li
                key={event.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <Link href={`/events/${event.id}`} className="min-w-0 truncate hover:underline">
                  {event.title}
                  <span className="text-muted-foreground"> · {event.dateLabel}</span>
                </Link>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => unlinkEvent(program.id, event.id))}
                  className="shrink-0 text-xs font-medium text-destructive hover:underline"
                >
                  Ontkoppel
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Alle events van één categorie in een periode in één keer aan het programma hangen. */
function BulkLinkForm({ programId }: { programId: string }) {
  const [type, setType] = useState("");
  const [kind, setKind] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const input: BulkInput = { programId, type, kind, from, to };
  const complete = Boolean(type && from && to);

  function change<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setCount(null);
      setMessage(null);
      setError(null);
    };
  }

  function search() {
    startTransition(async () => {
      const res = await countBulkEvents(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCount(res.count);
    });
  }

  function link() {
    startTransition(async () => {
      const res = await linkBulkEvents(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCount(null);
      setMessage(res.message ?? null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <p className="text-sm font-medium">Events koppelen</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className={LABEL}>Categorie</label>
          <select
            value={type}
            onChange={(e) => change(setType)(e.target.value)}
            className={FIELD}
          >
            <option value="">Kies…</option>
            {EVENT_TYPES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Type</label>
          <select
            value={kind}
            onChange={(e) => change(setKind)(e.target.value)}
            className={FIELD}
          >
            <option value="">Alle</option>
            {EVENT_KINDS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Van</label>
          <input
            type="date"
            value={from}
            onChange={(e) => change(setFrom)(e.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Tot en met</label>
          <input
            type="date"
            value={to}
            onChange={(e) => change(setTo)(e.target.value)}
            className={FIELD}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {count === null ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || !complete}
            onClick={search}
          >
            Zoek events
          </Button>
        ) : (
          <Button type="button" size="sm" disabled={pending || count === 0} onClick={link}>
            {count === 0 ? "Geen events gevonden" : `Koppel ${count} events`}
          </Button>
        )}
        {message && <span className="text-sm text-muted-foreground">{message}</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}
