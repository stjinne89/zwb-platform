// Het core-blok op de Vandaag-pagina. Async server component, zodat de
// Vandaag-pagina er alleen de dagcontext aan hoeft door te geven die ze tóch al
// heeft — geen extra queries op training_workouts of Strava.

import Link from "next/link";
import { ChevronRight, Dumbbell } from "lucide-react";
import {
  MOBILITY_SESSIONS_PER_WEEK,
  recommendSeries,
  recommendStrength,
  sessionsLast28Days,
  shiftDayKey,
  type RecommendContext,
} from "@/lib/training/mobility";
import { intervalsStrengthDays } from "@/lib/training/intervals-strength";
import { TodayFold } from "../../_components/today-fold";
import { loadIntervalsStrength, loadSeries, loadSessions, type Viewer } from "../_data";

export async function CoreTodayCard({
  viewer,
  today,
  context,
}: {
  viewer: Viewer;
  today: string;
  context: RecommendContext;
}) {
  const [series, sessions, intervalsStrength] = await Promise.all([
    loadSeries(viewer),
    loadSessions(viewer, today),
    loadIntervalsStrength(viewer, today, { refresh: false }),
  ]);

  const suggestion = recommendSeries(series, sessions, today, context);
  if (!suggestion) return null;
  // Kracht als tweede voorstel, alleen als het vandaag past (zie recommendStrength).
  const strength = recommendStrength(
    series,
    sessions,
    today,
    context,
    intervalsStrengthDays(intervalsStrength),
  );

  const doneToday = sessions.some(
    (session) => session.series_id === suggestion.id && session.completed_on === today,
  );
  const thisWeek = sessionsLast28Days(sessions, today).filter(
    (session) => session.completed_on >= shiftDayKey(today, -6),
  ).length;

  return (
    <TodayFold
      icon={Dumbbell}
      title="Core"
      summary={
        doneToday
          ? "Vandaag al gedaan"
          : `${suggestion.duration_minutes} min · ${thisWeek} van ${MOBILITY_SESSIONS_PER_WEEK} deze week`
      }
    >
      <Link
        href={`/zwbeter-worden/core/series/${suggestion.slug}`}
        className="flex min-h-[44px] items-center justify-between gap-3 border-t px-5 py-3 text-sm hover:bg-accent/40"
      >
        <span className="min-w-0 truncate font-medium">{suggestion.title}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
      {strength ? (
        <Link
          href={`/zwbeter-worden/core/series/${strength.slug}`}
          className="flex min-h-[44px] items-center justify-between gap-3 border-t px-5 py-3 text-sm hover:bg-accent/40"
        >
          <span className="min-w-0 truncate">
            Of kracht: <span className="font-medium">{strength.title}</span> ·{" "}
            {strength.duration_minutes} min
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}
    </TodayFold>
  );
}
