// Het core-blok op het dashboard: welke serie er vandaag wordt geadviseerd, met
// de oefeningen erbij, en hoe lang het lid het al volhoudt.
//
// Dezelfde loaders en dezelfde regel als het blok op de Vandaag-pagina
// (recommendSeries), zodat er niet twee verschillende adviezen naast elkaar
// kunnen ontstaan. Wel met de oefeningen erbij: op het dashboard is dit het enige
// dat een lid van het core-spoor te zien krijgt, en een serietitel alleen zegt
// niet waar je aan begint.
//
// Async server component achter een Suspense, net als de trainingsstatus: de
// queries hieronder mogen de rest van het dashboard niet ophouden.

import Link from "next/link";
import { CheckCircle2, ChevronRight, Dumbbell, Flame } from "lucide-react";
import { InlineMoreLink, SectionHeader } from "@/components/app-ui";
import {
  itemLabel,
  MOBILITY_SESSIONS_PER_WEEK,
  recommendSeries,
  sessionsLast28Days,
  shiftDayKey,
  weeklyStreak,
  type MobilitySeries,
} from "@/lib/training/mobility";
import {
  loadDayContext,
  loadSeries,
  loadSessions,
  requireViewer,
  todayKeyAmsterdam,
} from "../../zwbeter-worden/core/_data";

const TIMING_LABELS: Record<MobilitySeries["timing"], string> = {
  pre_ride: "Voor de rit",
  post_ride: "Na de rit",
  rustdag: "Rustdag",
};

/** Hoeveel oefeningen er passen zonder dat de kaart een lijst wordt. */
const VISIBLE_ITEMS = 5;

export async function CoreStatus() {
  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();

  const [series, sessions, dayContext] = await Promise.all([
    loadSeries(viewer),
    loadSessions(viewer, today),
    loadDayContext(viewer, today),
  ]);

  const suggestion = recommendSeries(series, sessions, today, dayContext);
  if (!suggestion) return null;

  const doneToday = sessions.some(
    (session) => session.series_id === suggestion.id && session.completed_on === today,
  );
  const window28 = sessionsLast28Days(sessions, today);
  const thisWeek = window28.filter(
    (session) => session.completed_on >= shiftDayKey(today, -6),
  ).length;
  const streak = weeklyStreak(sessions, today);
  const items = suggestion.items ?? [];

  return (
    <section>
      <SectionHeader
        icon={Dumbbell}
        title="Core & mobiliteit"
        action={<InlineMoreLink href="/zwbeter-worden/core">Core</InlineMoreLink>}
      />
      <div className="space-y-3">
        <Link
          href={`/zwbeter-worden/core/${suggestion.slug}`}
          className="block rounded-lg border bg-card p-4 transition hover:border-primary"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                {doneToday ? (
                  <CheckCircle2 className="size-3.5 text-primary" />
                ) : (
                  <Dumbbell className="size-3.5" />
                )}
                {doneToday ? "Vandaag gedaan" : "Vandaag"}
              </div>
              <p className="mt-1 font-medium">{suggestion.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {suggestion.duration_minutes} min · {TIMING_LABELS[suggestion.timing]}
              </p>
            </div>
            <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
          </div>

          {items.length > 0 && (
            <ul className="mt-3 space-y-1 border-t pt-3">
              {items.slice(0, VISIBLE_ITEMS).map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate">{item.exercise.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {itemLabel(item)}
                  </span>
                </li>
              ))}
              {items.length > VISIBLE_ITEMS && (
                <li className="text-xs text-muted-foreground">
                  en {items.length - VISIBLE_ITEMS} meer
                </li>
              )}
            </ul>
          )}
        </Link>

        <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm">
            <Flame className={`size-4 ${streak > 0 ? "text-primary" : "text-muted-foreground"}`} />
            {/* Weken, geen dagen: het doel is twee sessies per week, dus een
                dagteller zou bij een goed uitgevoerd programma elke dag breken.
                Zie weeklyStreak() in mobility.ts. */}
            <span className="font-medium">
              {streak > 0
                ? `${streak} ${streak === 1 ? "week" : "weken"} op rij`
                : "Nog geen reeks"}
            </span>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {thisWeek} van {MOBILITY_SESSIONS_PER_WEEK} deze week
          </span>
        </div>
      </div>
    </section>
  );
}

export function CoreStatusSkeleton() {
  return (
    <section>
      <SectionHeader icon={Dumbbell} title="Core & mobiliteit" />
      <div className="space-y-3">
        <div className="h-40 animate-pulse rounded-lg border bg-muted/40" />
        <div className="h-14 animate-pulse rounded-lg border bg-muted/40" />
      </div>
    </section>
  );
}
