// De core-tegel op het dashboard: welke serie er vandaag wordt geadviseerd, met
// het aantal oefeningen erbij, en hoe lang het lid het al volhoudt.
//
// Dezelfde loaders en dezelfde regel als het blok op de Vandaag-pagina
// (recommendSeries), zodat er niet twee verschillende adviezen naast elkaar
// kunnen ontstaan.
//
// Async server component achter een Suspense, net als de trainingsstatus: de
// queries hieronder mogen de rest van het dashboard niet ophouden.

import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { SectionHeader } from "@/components/app-ui";
import {
  MOBILITY_SESSIONS_PER_WEEK,
  recommendSeries,
  sessionsLast28Days,
  shiftDayKey,
  weeklyStreak,
} from "@/lib/training/mobility";
import {
  loadDayContext,
  loadSeries,
  loadSessions,
  requireViewer,
  todayKeyAmsterdam,
} from "../../zwbeter-worden/core/_data";

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
    <Link href={`/zwbeter-worden/core/series/${suggestion.slug}`} className="tg-tile tg-zwbeter">
      <span className="tg-tile-small">
        ZWBeter kracht · {doneToday ? "vandaag gedaan" : "vandaag"}
      </span>
      <span className="tg-tile-title mt-0.5">{suggestion.title}</span>
      <span className="mt-1 text-sm opacity-90">
        {suggestion.duration_minutes} min · {items.length} oefeningen
      </span>
      <span className="mt-auto flex items-end justify-between gap-3 pt-3 text-sm">
        <span>
          {streak > 0 ? `${streak} ${streak === 1 ? "week" : "weken"} op rij` : "Nog geen reeks"}
        </span>
        <span className="tabular-nums opacity-85">
          {thisWeek} van {MOBILITY_SESSIONS_PER_WEEK} deze week
        </span>
      </span>
    </Link>
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
