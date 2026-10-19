"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, type Category } from "@/lib/bokaal/rules";
import {
  adminCancelRace, adminImportCalendar, adminImportEvent, adminRefreshBoard, adminRefreshRatings, adminSettleRace,
  adminUpdateRace, type AdminReply,
} from "./actions";

const CALENDAR_PARTS = [
  { part: "wereldbeker", label: "Wereldbeker" },
  { part: "superprestige", label: "Superprestige" },
  { part: "hg-cross", label: "HG Cross" },
  { part: "kampioenschappen", label: "Kampioenschappen" },
] as const;

export type AdminRace = {
  id: string;
  category: Category;
  eventName: string;
  raceSlug: string;
  date: string;
  time: string;
  started: boolean;
  status: "concept" | "open" | "afgerekend" | "geannuleerd";
  riders: number;
  bonusKey: string;
  bets: number;
  balls: number;
};

type Ratings = Record<Category, { count: number; fetchedAt?: string }>;

const STATUS: Record<AdminRace["status"], string> = {
  concept: "Concept",
  open: "Op het bord",
  afgerekend: "Afgerekend",
  geannuleerd: "Geannuleerd",
};
const FETCHED = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });

function useRun() {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState<{ key: string; text: string; ok: boolean } | null>(null);
  function run(key: string, action: () => Promise<AdminReply>, after?: () => void) {
    setMessage(null);
    startTransition(async () => {
      const reply = await action();
      setMessage({ key, text: reply.ok ? reply.message : reply.error, ok: reply.ok });
      if (reply.ok) {
        after?.();
        router.refresh();
      }
    });
  }
  const note = (key: string) =>
    message?.key === key ? (
      <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
        {message.text}
      </p>
    ) : null;
  return { busy, run, note };
}

/** Een uitklapbaar plakveld voor als CyclingFlash de server weigert. */
function Paste({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground">Paginabron plakken</summary>
      <textarea
        id={id}
        className="mt-2 h-24 w-full rounded-md border bg-background p-2 font-mono text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Paginabron"
      />
    </details>
  );
}

export function BokaalAdmin({
  season, ratings, races, bonusOptions,
}: {
  season: string;
  ratings: Ratings;
  races: AdminRace[];
  bonusOptions: { key: string; label: string }[];
}) {
  const { busy, run, note } = useRun();
  const [event, setEvent] = useState("");
  const [paste, setPaste] = useState<Record<string, string>>({});
  const html = (key: string) => paste[key] || undefined;
  // Elk deel apart naar de server, zodat geen enkel verzoek te lang duurt.
  async function importAll(): Promise<AdminReply> {
    const lines: string[] = [];
    for (const { part } of CALENDAR_PARTS) {
      const reply = await adminImportCalendar({ part });
      if (!reply.ok) return { ok: false, error: [...lines, reply.error].join(" ") };
      lines.push(reply.message);
    }
    return { ok: true, message: lines.join(" ") };
  }
  const clear = (key: string) => () => setPaste((p) => ({ ...p, [key]: "" }));

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ratings</h2>
        {(["w", "m"] as Category[]).map((c) => (
          <div key={c} className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                {CATEGORY_LABEL[c]}: {ratings[c].count} renners
                {ratings[c].fetchedAt ? `, ${FETCHED.format(new Date(ratings[c].fetchedAt!))}` : ""}
              </span>
              <Button size="sm" disabled={busy} onClick={() => run(`ratings-${c}`, () => adminRefreshRatings({ category: c, html: html(`ratings-${c}`) }), clear(`ratings-${c}`))}>
                Ophalen
              </Button>
            </div>
            <Paste id={`paste-ratings-${c}`} value={paste[`ratings-${c}`] ?? ""} onChange={(v) => setPaste((p) => ({ ...p, [`ratings-${c}`]: v }))} />
            {note(`ratings-${c}`)}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Seizoenskalender</h2>
        <div className="flex flex-wrap gap-2">
          {CALENDAR_PARTS.map(({ part, label }) => (
            <Button key={part} size="sm" variant="outline" disabled={busy} onClick={() => run("calendar", () => adminImportCalendar({ part }))}>
              {label}
            </Button>
          ))}
          <Button size="sm" disabled={busy} onClick={() => run("calendar", () => importAll())}>
            Alles
          </Button>
        </div>
        {note("calendar")}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Koers toevoegen</h2>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run("event", () => adminImportEvent({ event, html: html("event") }), () => { setEvent(""); clear("event")(); });
          }}
        >
          <label className="sr-only" htmlFor="bokaal-event">Eventlink</label>
          <input
            id="bokaal-event"
            className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
            placeholder="https://cyclingflash.com/event/…"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={busy || !event.trim()}>Toevoegen</Button>
        </form>
        <Paste id="paste-event" value={paste.event ?? ""} onChange={(v) => setPaste((p) => ({ ...p, event: v }))} />
        {note("event")}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Koersen {season.replace("-", "–")}</h2>
        {races.length === 0 && <p className="text-sm text-muted-foreground">Nog geen koersen.</p>}
        {races.map((r) => (
          <RaceCard key={r.id} race={r} busy={busy} run={run} note={note} bonusOptions={bonusOptions}
            paste={paste[r.id] ?? ""} setPaste={(v) => setPaste((p) => ({ ...p, [r.id]: v }))} clear={clear(r.id)} />
        ))}
      </section>
    </div>
  );
}

function RaceCard({
  race, busy, run, note, bonusOptions, paste, setPaste, clear,
}: {
  race: AdminRace;
  busy: boolean;
  run: ReturnType<typeof useRun>["run"];
  note: ReturnType<typeof useRun>["note"];
  bonusOptions: { key: string; label: string }[];
  paste: string;
  setPaste: (v: string) => void;
  clear: () => void;
}) {
  const [date, setDate] = useState(race.date);
  const [time, setTime] = useState(race.time);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const closed = race.status === "afgerekend" || race.status === "geannuleerd";
  const key = race.id;
  const html = paste || undefined;
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{race.eventName} · {CATEGORY_LABEL[race.category]}</h3>
        <span className="text-sm text-muted-foreground">
          {STATUS[race.status]} · {race.riders} renners · {race.bets} briefjes ({race.balls} ballen)
        </span>
      </div>
      {!closed && (
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label className="grid gap-1">
            <span className="text-muted-foreground">Datum</span>
            <input type="date" className="h-9 rounded-md border bg-background px-2" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-muted-foreground">Start</span>
            <input type="time" className="h-9 rounded-md border bg-background px-2" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-muted-foreground">Bonusvraag</span>
            <select
              className="h-9 rounded-md border bg-background px-2"
              defaultValue={race.bonusKey}
              disabled={busy}
              onChange={(e) => run(key, () => adminUpdateRace({ raceId: race.id, bonusKey: e.target.value }))}
            >
              <option value="">Geen</option>
              {bonusOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </label>
          <Button size="sm" variant="outline" disabled={busy || (date === race.date && time === race.time)}
            onClick={() => run(key, () => adminUpdateRace({ raceId: race.id, date, time }))}>
            Tijd opslaan
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!closed && !race.started && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(key, () => adminRefreshBoard({ raceId: race.id, html }), clear)}>
            Startlijst ophalen
          </Button>
        )}
        {race.status === "concept" && (
          <Button size="sm" disabled={busy || race.riders === 0} onClick={() => run(key, () => adminUpdateRace({ raceId: race.id, status: "open" }))}>
            Op het bord
          </Button>
        )}
        {race.status === "open" && !race.started && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(key, () => adminUpdateRace({ raceId: race.id, status: "concept" }))}>
            Van het bord
          </Button>
        )}
        {(race.status === "open" || race.status === "afgerekend") && race.started && (
          <Button size="sm" disabled={busy} onClick={() => run(key, () => adminSettleRace({ raceId: race.id, html }), clear)}>
            {race.status === "afgerekend" ? "Opnieuw afrekenen" : "Uitslag ophalen en afrekenen"}
          </Button>
        )}
        {race.status !== "geannuleerd" && (
          confirmCancel ? (
            <>
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => run(key, () => adminCancelRace({ raceId: race.id }))}>
                Annuleren: inzetten terug
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(false)}>Toch niet</Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmCancel(true)}>Annuleren</Button>
          )
        )}
      </div>
      {!closed || race.status === "afgerekend" ? <Paste id={`paste-${race.id}`} value={paste} onChange={setPaste} /> : null}
      {note(key)}
    </div>
  );
}
