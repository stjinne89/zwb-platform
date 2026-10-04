"use client";

// De inhoud van de jaarplanning, per maand. Dit is wat een lid op een telefoon
// werkelijk leest; de balk erboven is het overzicht.

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EVENT_TYPE_LABELS } from "@/lib/event-types";
import {
  SEASON_PERIOD_KINDS,
  SEASON_PERIOD_LABELS,
  SEASON_PRIORITIES,
  SEASON_PRIORITY_LABELS,
  seasonListRows,
  type SeasonEvent,
  type SeasonListRow,
  type SeasonPeriod,
  type SeasonPlanBar,
  type SeasonTarget,
} from "@/lib/training/season";
import {
  deleteSeasonPeriod,
  deleteSeasonTarget,
  updateSeasonPeriod,
  updateSeasonTarget,
} from "../_actions";

type Item = SeasonListRow;

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

function maandKop(dayKey: string) {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function dagLabel(dayKey: string) {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function SeasonList({
  today,
  targets,
  periods,
  plans,
  events,
  editable,
}: {
  today: string;
  targets: SeasonTarget[];
  periods: SeasonPeriod[];
  plans: SeasonPlanBar[];
  events: SeasonEvent[];
  editable: boolean;
}) {
  const items = seasonListRows({ targets, periods, events, plans });

  if (items.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Nog niets in je jaarplanning. Zet er je mikpunten en je vakanties in.
        </p>
      </section>
    );
  }

  const maanden: Array<{ key: string; label: string; items: Item[] }> = [];
  for (const item of items) {
    const key = item.date.slice(0, 7);
    const laatste = maanden.at(-1);
    if (laatste?.key === key) laatste.items.push(item);
    else maanden.push({ key, label: maandKop(item.date), items: [item] });
  }

  return (
    <section className="space-y-4">
      {maanden.map((maand) => (
        <div key={maand.key} className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold capitalize">{maand.label}</h3>
          <ul className="mt-3 space-y-2">
            {maand.items.map((item) => (
              <Row key={rowKey(item)} item={item} today={today} editable={editable} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function rowKey(item: Item) {
  if (item.kind === "target") return `target:${item.target.id}`;
  if (item.kind === "period") return `period:${item.period.id}`;
  if (item.kind === "event") return `event:${item.event.id}`;
  return `plan:${item.plan.rootId}:${item.rand}`;
}

function Row({ item, today, editable }: { item: Item; today: string; editable: boolean }) {
  const [pending, startTransition] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  const [bewerken, setBewerken] = useState(false);
  const verleden = item.date < today;

  function voerUit(
    fn: () => Promise<{ ok: boolean; error?: string } | null>,
    klaar?: () => void,
  ) {
    setFout(null);
    startTransition(async () => {
      const result = await fn();
      if (result && !result.ok) setFout(result.error ?? "Opslaan faalde.");
      else klaar?.();
    });
  }

  function bewaar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    voerUit(
      () => (item.kind === "period" ? updateSeasonPeriod(formData) : updateSeasonTarget(formData)),
      () => setBewerken(false),
    );
  }

  // Een mikpunt, los of op een event: dat is wat een prioriteit en een
  // verwijderknop heeft. Verwijderen haalt alleen het mikpunt weg, niet het event.
  const target = item.kind === "target" || item.kind === "event" ? item.target : null;

  const prioriteit = target ? (
    editable ? (
      <select
        aria-label={`Prioriteit van ${target.title}`}
        defaultValue={target.priority}
        key={target.priority}
        disabled={pending}
        onChange={(event) => {
          const formData = new FormData();
          formData.set("id", target.id);
          formData.set("priority", event.target.value);
          voerUit(() => updateSeasonTarget(formData));
        }}
        className="mt-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
      >
        {SEASON_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {SEASON_PRIORITY_LABELS[priority]}
          </option>
        ))}
      </select>
    ) : null
  ) : null;

  const notitie = target?.note ? (
    <p className="mt-1 text-sm text-muted-foreground">{target.note}</p>
  ) : null;

  return (
    <li
      className={`flex items-start gap-3 rounded-md border bg-background p-3 ${
        verleden ? "opacity-60" : ""
      }`}
    >
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{dagLabel(item.date)}</span>
      <div className="min-w-0 flex-1">
        {item.kind === "target" ? (
          <>
            <p className="text-sm font-medium">
              {item.target.title}{" "}
              {editable ? null : (
                <span className="text-xs font-normal text-muted-foreground">
                  · {SEASON_PRIORITY_LABELS[item.target.priority]}
                </span>
              )}
            </p>
            {prioriteit}
            {notitie}
          </>
        ) : null}

        {item.kind === "period" ? (
          <>
            <p className="text-sm font-medium">
              {item.period.title}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                · {SEASON_PERIOD_LABELS[item.period.kind]} t/m {dagLabel(item.period.endDate)}
              </span>
            </p>
            {item.period.note ? (
              <p className="mt-1 text-sm text-muted-foreground">{item.period.note}</p>
            ) : null}
          </>
        ) : null}

        {item.kind === "event" ? (
          <>
            <p className="text-sm">
              <Link href={`/events/${item.event.id}`} className="font-medium hover:underline">
                {item.event.title}
              </Link>{" "}
              <span className="text-xs text-muted-foreground">
                · {EVENT_TYPE_LABELS[item.event.type] ?? item.event.type} ·{" "}
                {item.event.rsvp === "yes" ? "je doet mee" : "misschien"}
                {item.target && !editable
                  ? ` · ${SEASON_PRIORITY_LABELS[item.target.priority]}`
                  : null}
              </span>
            </p>
            {prioriteit}
            {notitie}
          </>
        ) : null}

        {item.kind === "plan" ? (
          <p className="text-sm text-muted-foreground">
            Schema &quot;{item.plan.title}&quot; {item.rand === "start" ? "begint" : "eindigt"}
          </p>
        ) : null}

        {bewerken && target ? (
          <form onSubmit={bewaar} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={target.id} />
            {target.eventId ? null : (
              <>
                <label className="sm:col-span-2 text-sm">
                  Titel
                  <input
                    name="title"
                    required
                    defaultValue={target.title}
                    className={`mt-1 ${FIELD}`}
                  />
                </label>
                <label className="text-sm">
                  Datum
                  <input
                    type="date"
                    name="target_date"
                    required
                    defaultValue={target.targetDate}
                    className={`mt-1 ${FIELD}`}
                  />
                </label>
              </>
            )}
            <label className="sm:col-span-2 text-sm">
              Notitie
              <input name="note" defaultValue={target.note ?? ""} className={`mt-1 ${FIELD}`} />
            </label>
            <EditButtons pending={pending} onCancel={() => setBewerken(false)} />
          </form>
        ) : null}

        {bewerken && item.kind === "period" ? (
          <form onSubmit={bewaar} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={item.period.id} />
            <label className="sm:col-span-2 text-sm">
              Titel
              <input
                name="title"
                required
                defaultValue={item.period.title}
                className={`mt-1 ${FIELD}`}
              />
            </label>
            <label className="text-sm">
              Van
              <input
                type="date"
                name="start_date"
                required
                defaultValue={item.period.startDate}
                className={`mt-1 ${FIELD}`}
              />
            </label>
            <label className="text-sm">
              Tot en met
              <input
                type="date"
                name="end_date"
                required
                defaultValue={item.period.endDate}
                className={`mt-1 ${FIELD}`}
              />
            </label>
            <label className="text-sm">
              Soort
              <select name="kind" defaultValue={item.period.kind} className={`mt-1 ${FIELD}`}>
                {SEASON_PERIOD_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {SEASON_PERIOD_LABELS[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2 text-sm">
              Notitie
              <input
                name="note"
                defaultValue={item.period.note ?? ""}
                className={`mt-1 ${FIELD}`}
              />
            </label>
            <EditButtons pending={pending} onCancel={() => setBewerken(false)} />
          </form>
        ) : null}

        {fout ? <p className="mt-1 text-sm text-destructive">{fout}</p> : null}
      </div>

      {editable && (target || item.kind === "period") ? (
        <Button
          size="sm"
          variant="ghost"
          aria-label={item.kind === "event" ? "Mikpunt bewerken" : "Bewerken"}
          aria-expanded={bewerken}
          disabled={pending}
          onClick={() => setBewerken((value) => !value)}
        >
          <Pencil className="size-4" />
        </Button>
      ) : null}

      {editable && (target || item.kind === "period") ? (
        <Button
          size="sm"
          variant="ghost"
          aria-label={item.kind === "event" ? "Mikpunt verwijderen" : "Verwijderen"}
          disabled={pending}
          onClick={() =>
            voerUit(() => {
              const formData = new FormData();
              if (target) {
                formData.set("id", target.id);
                return deleteSeasonTarget(formData);
              }
              if (item.kind !== "period") return Promise.resolve(null);
              formData.set("id", item.period.id);
              return deleteSeasonPeriod(formData);
            })
          }
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </li>
  );
}

function EditButtons({ pending, onCancel }: { pending: boolean; onCancel: () => void }) {
  return (
    <div className="flex gap-2 sm:col-span-2">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Opslaan…" : "Opslaan"}
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onCancel}>
        Annuleren
      </Button>
    </div>
  );
}
