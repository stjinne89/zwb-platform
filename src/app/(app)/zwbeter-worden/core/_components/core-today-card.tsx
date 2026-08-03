// Het core-blok op de Vandaag-pagina. Async server component, zodat de
// Vandaag-pagina er alleen de dagcontext aan hoeft door te geven die ze tóch al
// heeft — geen extra queries op training_workouts of Strava.

import Link from "next/link";
import { ChevronRight, Dumbbell } from "lucide-react";
import {
  MOBILITY_SESSIONS_PER_WEEK,
  recommendSeries,
  sessionsLast28Days,
  shiftDayKey,
  type RecommendContext,
} from "@/lib/training/mobility";
import { loadSeries, loadSessions, type Viewer } from "../_data";

export async function CoreTodayCard({
  viewer,
  today,
  context,
}: {
  viewer: Viewer;
  today: string;
  context: RecommendContext;
}) {
  const [series, sessions] = await Promise.all([
    loadSeries(viewer),
    loadSessions(viewer, today),
  ]);

  const suggestion = recommendSeries(series, sessions, today, context);
  if (!suggestion) return null;

  const doneToday = sessions.some(
    (session) => session.series_id === suggestion.id && session.completed_on === today,
  );
  const thisWeek = sessionsLast28Days(sessions, today).filter(
    (session) => session.completed_on >= shiftDayKey(today, -6),
  ).length;

  return (
    <Link
      href={`/zwbeter-worden/core/${suggestion.slug}`}
      className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border bg-card p-5 hover:border-primary"
    >
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 font-semibold">
          <Dumbbell className="size-5 text-primary" />
          {suggestion.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {doneToday
            ? "Vandaag al gedaan."
            : `${suggestion.duration_minutes} min · ${thisWeek} van ${MOBILITY_SESSIONS_PER_WEEK} deze week`}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
