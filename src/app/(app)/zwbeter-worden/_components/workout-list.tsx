// Lijst met workouts binnen een schema, voor het lid: kijken en rapporteren.
// Aanpassen gebeurt in de maandweergave van de trainer — een renner hoort een
// training niet op blokniveau te kunnen wijzigen, anders klopt de opbouw van
// het schema niet meer.
//
// Elke workout staat in een <details>: dicht toont de rij alleen dag, titel en
// het type training, open pas de blokken, de knoppen en de rapportage. Een
// schema van twaalf weken is anders niet te overzien.

import Link from "next/link";
import { ChevronDown, CircleHelp, Download, ExternalLink, MessageSquare } from "lucide-react";
import { intensityLabel, normalizeWorkoutBlocks, type WorkoutIntensity } from "@/lib/training/workouts";
import { targetHint } from "@/lib/training/targets";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { removeOwnRide, saveWorkoutReport } from "../_actions";
import { formAction, formatDayMonth } from "./format";
import type { WorkoutReportRow, WorkoutRow } from "./types";
import { WorkoutBlocks, intervalsWorkoutUrl } from "./workout-blocks";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[0.7rem] font-medium text-primary">
      {children}
    </span>
  );
}

function ReportPanel({ workout, report }: { workout: WorkoutRow; report?: WorkoutReportRow }) {
  return (
    <details className="mt-3 rounded-md border bg-background/60 p-3">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <MessageSquare className="size-4" />
        Rapportage en feedback
      </summary>
      <div className="mt-3 space-y-3">
        <form action={formAction(saveWorkoutReport)} className="space-y-2">
          <input type="hidden" name="workout_id" value={workout.id} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              RPE
              <input
                name="athlete_rpe"
                type="number"
                min="1"
                max="10"
                defaultValue={report?.athlete_rpe ?? ""}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Gevoel
              <select
                name="athlete_feel"
                defaultValue={report?.athlete_feel ?? ""}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
              >
                <option value="">-</option>
                <option value="goed">Goed</option>
                <option value="neutraal">Neutraal</option>
                <option value="zwaar">Zwaar</option>
                <option value="slecht">Slecht</option>
              </select>
            </label>
          </div>
          <textarea
            name="athlete_report"
            rows={3}
            defaultValue={report?.athlete_report ?? ""}
            placeholder="Hoe ging deze workout?"
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
          <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
            Rapportage opslaan
          </button>
        </form>
        {report?.trainer_feedback ? (
          <div>
            <p className="text-xs text-muted-foreground">Feedback van je trainer</p>
            <p className="mt-1 rounded-md border-l-2 border-primary bg-primary/5 p-3 text-sm whitespace-pre-line">
              {report.trainer_feedback}
            </p>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function WorkoutList({
  workouts,
  ftpWatts,
  reports,
  intervalsAthleteId,
  adaptedPlans,
}: {
  workouts: WorkoutRow[];
  ftpWatts?: number | null;
  reports?: Map<string, WorkoutReportRow>;
  intervalsAthleteId?: string;
  /** plan_id → label, voor workouts die uit een aanpassing komen. */
  adaptedPlans?: Map<string, string>;
}) {
  if (workouts.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Nog geen workouts in dit schema.</p>;
  }

  const todayKey = amsterdamDayKey(new Date());

  return (
    <ul className="divide-y">
      {workouts.map((workout) => {
        const blocks = normalizeWorkoutBlocks(
          workout.structure_json,
          workout.intensity as WorkoutIntensity,
        );
        const report = reports?.get(workout.id);
        const ownRide = workout.origin === "member";
        // Een toegezegd clubevent beheer je vanuit de keuzelijst, niet hier.
        const clubEvent = workout.origin === "event";
        const adaptedLabel = adaptedPlans?.get(workout.plan_id);
        const dayKey = String(workout.scheduled_at).slice(0, 10);
        return (
          <li key={workout.id}>
            <details className="group" open={dayKey === todayKey}>
              <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="w-24 shrink-0 text-sm text-muted-foreground">
                  {formatDayMonth(workout.scheduled_at)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{workout.title}</span>
                    {ownRide ? <Chip>Eigen rit</Chip> : null}
                    {clubEvent ? <Chip>Clubevent</Chip> : null}
                    {!ownRide && !clubEvent && adaptedLabel ? <Chip>{adaptedLabel}</Chip> : null}
                    {report?.athlete_rpe ? <Chip>RPE {report.athlete_rpe}</Chip> : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {workout.duration_minutes} min - {intensityLabel(workout.intensity)}
                    {workout.status === "completed" ? " - gereden" : ""}
                    {workout.publish_status === "failed"
                      ? ` - publicatiefout: ${workout.publish_error}`
                      : ""}
                  </span>
                </span>
                {!ownRide ? (
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {workout.publish_status}
                  </span>
                ) : null}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4">
                <WorkoutBlocks blocks={blocks} ftpWatts={ftpWatts} />
                {workout.structure_json && workout.structure_json.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {blocks.slice(0, 5).map((step, idx) => {
                      const hint = targetHint({
                        ftpWatts,
                        intensity: step.intensity,
                        target: step.target,
                        notes: step.notes,
                      });
                      return (
                        <span
                          key={idx}
                          className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {step.label ?? "Blok"} {step.durationMinutes ? `${step.durationMinutes}m` : ""}{" "}
                          {step.target ?? ""}
                          {hint ? ` - ${hint}` : ""}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {workout.publish_status === "published" && workout.intervals_event_id ? (
                    <>
                      <a
                        href={`/api/training/workouts/${workout.id}/fit`}
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        <Download className="size-3" />
                        Download FIT
                      </a>
                      <Link
                        href="/hulp#fit-export"
                        title="Hulp bij workout op je fietscomputer"
                        aria-label="Hulp bij workout op je fietscomputer"
                        className="inline-flex items-center rounded-md border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <CircleHelp className="size-3.5" />
                      </Link>
                    </>
                  ) : null}
                  {workout.intervals_event_id ? (
                    <a
                      href={intervalsWorkoutUrl(intervalsAthleteId, workout)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      <ExternalLink className="size-3" />
                      In intervals.icu
                    </a>
                  ) : null}
                  {ownRide ? (
                    <form action={formAction(removeOwnRide)}>
                      <input type="hidden" name="workout_id" value={workout.id} />
                      <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
                        Verwijder
                      </button>
                    </form>
                  ) : null}
                </div>
                <ReportPanel workout={workout} report={report} />
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
