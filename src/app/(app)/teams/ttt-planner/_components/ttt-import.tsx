"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { Copy, ExternalLink, FileUp, Import } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ZWIFTGOPHER_TTT_URL, zwiftIdExport } from "@/lib/ttt/zwiftgopher";
import { cn } from "@/lib/utils";
import { importTttPlan, type TttImportResult } from "../_actions";

export type ImportTeam = { id: string; label: string };

export type ImportEvent = {
  id: string;
  title: string;
  startAt: string;
  teamId: string | null;
  parentEventId: string | null;
};

export type ImportRider = {
  /** Profiel-id, of `roster:<id>` bij een renner zonder account. */
  id: string;
  name: string;
  zwiftId: string | null;
  teamIds: string[];
  /** `eventId:teamId` van elke opstelling waarin de renner staat. */
  lineupKeys: string[];
};

export type SavedTttPlan = {
  id: string;
  name: string;
  published: boolean;
  eventTitle: string | null;
  teamName: string | null;
};

/** Opnieuw importeren in een bestaand plan, of een nieuw plan vanaf een event. */
export type ImportStart = {
  planId: string | null;
  name: string;
  eventId: string | null;
  teamId: string;
};

export function TttImport({
  teams,
  events,
  riders,
  savedPlans,
  start,
}: {
  teams: ImportTeam[];
  events: ImportEvent[];
  riders: ImportRider[];
  savedPlans: SavedTttPlan[];
  start: ImportStart | null;
}) {
  const [planId, setPlanId] = useState(start?.planId ?? null);
  const [eventId, setEventId] = useState(start?.eventId ?? null);
  const [teamId, setTeamId] = useState(
    start && teams.some((team) => team.id === start.teamId) ? start.teamId : (teams[0]?.id ?? ""),
  );
  const [name, setName] = useState(start?.name ?? "");
  const [source, setSource] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [result, setResult] = useState<TttImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // De opstelling van het event als die er is, anders het hele team.
  const lineup = useMemo(() => {
    const event = events.find((row) => row.id === eventId);
    const keys = new Set(
      [event?.id, event?.parentEventId].filter(Boolean).map((id) => `${id}:${teamId}`),
    );
    const inLineup = riders.filter((rider) => rider.lineupKeys.some((key) => keys.has(key)));
    return inLineup.length > 0
      ? inLineup
      : riders.filter((rider) => rider.teamIds.includes(teamId));
  }, [events, riders, eventId, teamId]);

  function chooseEvent(id: string | null) {
    setEventId(id);
    const event = events.find((row) => row.id === id);
    if (event?.teamId && teams.some((team) => team.id === event.teamId)) setTeamId(event.teamId);
    if (event && !name.trim()) setName(event.title);
  }

  async function copyZwiftIds() {
    const { text, count, missing } = zwiftIdExport(
      lineup.map((rider, index) => ({ ...rider, displayOrder: index })),
    );
    const without = missing.length > 0 ? ` Zonder Zwift-ID: ${missing.join(", ")}.` : "";
    if (count === 0) {
      setCopied(`Geen Zwift-ID's gevonden.${without}`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`${count} Zwift-ID's gekopieerd.${without}`);
    } catch {
      setCopied(`Kopiëren lukte niet: ${text.replace(/\n/g, ", ")}.${without}`);
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setSource(await file.text());
    setResult(null);
  }

  function submit() {
    setResult(null);
    startTransition(async () => {
      const res = await importTttPlan({ planId, source, name, eventId, teamId });
      setResult(res);
      if (res.ok) {
        setPlanId(res.planId);
        setSource("");
      }
    });
  }

  const managed = teams.length > 0;
  const step = "flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground";

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6 rounded-lg border bg-card p-4">
        {managed && (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Event</span>
              <select
                value={eventId ?? ""}
                onChange={(e) => chooseEvent(e.target.value || null)}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                <option value="">Geen event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {new Date(event.startAt).toLocaleDateString("nl-NL", {
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    - {event.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Team</span>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Plannaam</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Teamnaam uit ZwiftGopher"
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
          </div>
        )}

        <ol className="space-y-6">
          <li className="flex gap-3">
            <span className={step}>1</span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Plannen in ZwiftGopher</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {managed && (
                  <Button variant="outline" onClick={copyZwiftIds}>
                    <Copy className="size-4" />
                    Zwift-ID&apos;s kopiëren ({lineup.length})
                  </Button>
                )}
                <a
                  href={ZWIFTGOPHER_TTT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: managed ? "default" : "outline" }))}
                >
                  <ExternalLink className="size-4" />
                  Open ZwiftGopher
                </a>
              </div>
              {copied && <p className="mt-2 text-sm text-muted-foreground">{copied}</p>}
            </div>
          </li>

          {managed && (
            <li className="flex gap-3">
              <span className={step}>2</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">
                  {planId ? "Plan opnieuw importeren" : "Plan importeren"}
                </h2>
                <textarea
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setResult(null);
                  }}
                  rows={5}
                  spellCheck={false}
                  placeholder="Export JSON, Export Link of Export Text"
                  className="mt-3 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,.txt,.csv,application/json,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    void readFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    <FileUp className="size-4" />
                    Bestand
                  </Button>
                  <Button disabled={pending || !source.trim() || !teamId} onClick={submit}>
                    <Import className="size-4" />
                    {pending ? "Bezig..." : "Importeren"}
                  </Button>
                </div>

                {result && !result.ok && (
                  <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {result.error}
                  </p>
                )}
                {result?.ok && (
                  <div className="mt-3 rounded-md border bg-background">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 text-sm">
                      <span className="font-medium text-primary">{result.message}</span>
                      <Link href={`/teams/ttt-planner/${result.planId}`} className="underline">
                        Bekijk plan
                      </Link>
                    </div>
                    <ol className="divide-y text-sm">
                      {result.riders.map((rider, index) => (
                        <li key={index} className="flex items-center justify-between gap-3 px-3 py-2">
                          <span className="min-w-0 truncate">
                            <span className="mr-2 tabular-nums text-muted-foreground">{index + 1}</span>
                            {rider.name}
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {rider.pullWatts != null ? `${rider.pullWatts} w` : "-"} · {rider.pullSeconds} s
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </li>
          )}
        </ol>
      </div>

      <aside className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Opgeslagen plannen</h2>
        {savedPlans.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nog geen TTT-plannen.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {savedPlans.map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`/teams/ttt-planner/${plan.id}`}
                  className="tg-link tg-kalender block rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
                >
                  <span className="block font-medium">{plan.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {plan.teamName ?? "Team"} - {plan.eventTitle ?? "Geen event"} -{" "}
                    {plan.published ? "gepubliceerd" : "concept"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </section>
  );
}
