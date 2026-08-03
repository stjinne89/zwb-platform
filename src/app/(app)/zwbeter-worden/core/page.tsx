import Link from "next/link";
import { CalendarCheck, Flame, Library, Timer } from "lucide-react";
import {
  MOBILITY_SESSIONS_PER_WEEK,
  MOBILITY_WINDOW_DAYS,
  lastDoneOn,
  recommendSeries,
  sessionsLast28Days,
  weeklyStreak,
} from "@/lib/training/mobility";
import { MetricCard } from "../_components/ui";
import { formatWellnessDate } from "../_components/format";
import { saveOwnSeries } from "./_actions";
import {
  loadDayContext,
  loadExercises,
  loadSeries,
  loadSessions,
  requireViewer,
  todayKeyAmsterdam,
} from "./_data";
import { SeriesBuilder } from "./_components/series-builder";
import { SeriesCard } from "./_components/series-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CorePage() {
  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();

  const [series, sessions, exercises, dayContext] = await Promise.all([
    loadSeries(viewer),
    loadSessions(viewer, today),
    loadExercises(viewer),
    loadDayContext(viewer, today),
  ]);

  const recent = sessionsLast28Days(sessions, today);
  const streak = weeklyStreak(sessions, today);
  const suggestion = recommendSeries(series, sessions, today, dayContext);

  const standard = series.filter((row) => row.is_standard);
  const own = series.filter((row) => !row.is_standard);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={CalendarCheck}
          label={`Sessies in ${MOBILITY_WINDOW_DAYS} dagen`}
          value={String(recent.length)}
          hint={`Doel: ${MOBILITY_SESSIONS_PER_WEEK}-3 per week`}
        />
        <MetricCard
          icon={Flame}
          label="Weken op doel"
          value={String(streak)}
          hint="Achtereen, terugtellend vanaf vandaag"
        />
        <MetricCard
          icon={Timer}
          label="Vandaag"
          value={suggestion?.title ?? "-"}
          hint={suggestion?.subtitle ?? undefined}
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Series</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {standard.map((row) => (
            <SeriesCard
              key={row.id}
              series={row}
              lastDone={lastDoneOn(sessions, row.id)}
              suggested={row.id === suggestion?.id}
            />
          ))}
        </div>
      </section>

      {own.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Eigen series</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {own.map((row) => (
              <SeriesCard
                key={row.id}
                series={row}
                lastDone={lastDoneOn(sessions, row.id)}
                suggested={row.id === suggestion?.id}
              />
            ))}
          </div>
        </section>
      )}

      <SeriesBuilder exercises={exercises} saveAction={saveOwnSeries} />

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <Link
          href="/zwbeter-worden/core/oefeningen"
          className="inline-flex min-h-[44px] items-center gap-2 text-primary hover:underline"
        >
          <Library className="size-4" />
          Alle oefeningen
        </Link>
        <Link
          href="/hulp#core-mobiliteit"
          className="inline-flex min-h-[44px] items-center text-muted-foreground hover:underline"
        >
          Waarom dit werkt
        </Link>
      </div>

      {recent.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Laatst gedaan: {formatWellnessDate(recent[0].completed_on)}
        </p>
      )}
    </div>
  );
}
