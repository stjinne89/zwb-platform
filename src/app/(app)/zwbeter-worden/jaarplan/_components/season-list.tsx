"use client";

// De inhoud van de jaarplanning, per maand. Dit is wat een lid op een telefoon
// werkelijk leest; de balk erboven is het overzicht.

import { useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EVENT_TYPE_LABELS } from "@/lib/event-types";
import {
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
import { deleteSeasonPeriod, deleteSeasonTarget, updateSeasonTarget } from "../_actions";

type Item = SeasonListRow;

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
  const verleden = item.date < today;

  function voerUit(fn: () => Promise<{ ok: boolean; error?: string } | null>) {
    setFout(null);
    startTransition(async () => {
      const result = await fn();
      if (result && !result.ok) setFout(result.error ?? "Opslaan faalde.");
    });
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

        {fout ? <p className="mt-1 text-sm text-destructive">{fout}</p> : null}
      </div>

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
