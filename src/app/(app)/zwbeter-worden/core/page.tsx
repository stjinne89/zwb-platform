import { CalendarCheck, Flame } from "lucide-react";
import {
  MOBILITY_SESSIONS_PER_WEEK,
  MOBILITY_WINDOW_DAYS,
  lastDoneOn,
  recommendSeries,
  recommendStrength,
  sessionsLast28Days,
  weeklyStreak,
} from "@/lib/training/mobility";
import { weekLoad } from "@/lib/training/muscles";
import {
  intervalsStrengthDays,
  intervalsWeekLoad,
  mergeLoad,
} from "@/lib/training/intervals-strength";
import { MetricCard } from "../_components/ui";
import { formatWellnessDate } from "../_components/format";
import { saveIntervalsMuscles } from "./_actions";
import {
  loadDayContext,
  loadIntervalsStrength,
  loadSeries,
  loadSessions,
  requireViewer,
  todayKeyAmsterdam,
} from "./_data";
import { IntervalsStrengthList } from "./_components/intervals-strength-list";
import { MuscleSummary } from "./_components/muscle-summary";
import { SeriesCard } from "./_components/series-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// De eerste tab: wat vandaag past en wat er deze week al gedaan is. De volledige
// lijst staat onder Series, de bibliotheek onder Oefeningen.
export default async function CoreTodayPage() {
  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();

  const [series, sessions, dayContext, intervalsStrength] = await Promise.all([
    loadSeries(viewer),
    loadSessions(viewer, today),
    loadDayContext(viewer, today),
    loadIntervalsStrength(viewer, today),
  ]);

  const recent = sessionsLast28Days(sessions, today);
  const streak = weeklyStreak(sessions, today);
  const suggestion = recommendSeries(series, sessions, today, dayContext);
  const strength = recommendStrength(
    series,
    sessions,
    today,
    dayContext,
    intervalsStrengthDays(intervalsStrength),
  );
  const todays = [suggestion, strength].filter((row) => row != null);
  const week = mergeLoad(
    weekLoad(sessions, series, today),
    intervalsWeekLoad(intervalsStrength, today),
  );
  const trainedThisWeek = Object.keys(week).length > 0;

  return (
    <div className="space-y-6">
      {todays.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Vandaag</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {todays.map((row) => (
              <SeriesCard
                key={row.id}
                series={row}
                items={row.items}
                lastDone={lastDoneOn(sessions, row.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Deze week</h2>
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
        {trainedThisWeek && (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold">Deze week getraind</h3>
            <MuscleSummary load={week} size="lg" limit={5} />
          </div>
        )}
      </section>

      {intervalsStrength.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Krachttraining uit intervals.icu</h2>
          <IntervalsStrengthList sessions={intervalsStrength} saveAction={saveIntervalsMuscles} />
        </section>
      )}

      {recent.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Laatst gedaan: {formatWellnessDate(recent[0].completed_on)}
        </p>
      )}
    </div>
  );
}
