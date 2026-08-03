import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { seriesMinutes } from "@/lib/training/mobility";
import { formatWellnessDate } from "../../_components/format";
import { completeSeries, undoSession } from "../_actions";
import { loadSeriesBySlug, loadSessions, requireViewer, todayKeyAmsterdam } from "../_data";
import { ExerciseVisual } from "../_components/exercise-visual";
import { SeriesRunner } from "../_components/series-runner";
import { UndoSessionButton } from "../_components/undo-session-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();

  const [series, sessions] = await Promise.all([
    loadSeriesBySlug(viewer, slug),
    loadSessions(viewer, today),
  ]);
  if (!series) notFound();

  const doneToday = sessions.find(
    (session) => session.series_id === series.id && session.completed_on === today,
  );
  const lastDone = sessions.find((session) => session.series_id === series.id);
  const minutes = series.duration_minutes || seriesMinutes(series.items);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/zwbeter-worden/core"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="size-4" />
          Core &amp; mobiliteit
        </Link>
        <h2 className="mt-1 text-xl font-semibold">{series.title}</h2>
        {series.subtitle && (
          <p className="text-sm text-muted-foreground">{series.subtitle}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {minutes} min · {series.items.length} oefeningen
          {lastDone ? ` · laatst ${formatWellnessDate(lastDone.completed_on)}` : ""}
        </p>
      </div>

      {doneToday ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">Vandaag afgevinkt.</p>
          <UndoSessionButton sessionId={doneToday.id} undoAction={undoSession} />
        </div>
      ) : (
        <SeriesRunner
          seriesId={series.id}
          items={series.items}
          completeAction={completeSeries}
        />
      )}

      <ol className="space-y-3">
        {series.items.map((item, index) => (
          <li key={item.id} className="rounded-lg border bg-card p-4">
            <div className="grid gap-4 sm:grid-cols-[200px_1fr] sm:items-start">
              <ExerciseVisual exercise={item.exercise} />
              <div className="min-w-0">
                <h3 className="font-semibold">
                  {index + 1}. {item.exercise.title}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {[
                    item.sets > 1 ? `${item.sets} sets` : null,
                    item.hold_seconds ? `${item.hold_seconds} sec` : null,
                    item.reps ? `${item.reps} herhalingen` : null,
                    item.exercise.is_unilateral ? "per kant" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="mt-2">
                  <Markdown source={item.exercise.cue_md} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-xs text-muted-foreground">
        Stop bij pijn. Bij aanhoudende klachten: overleg met een fysiotherapeut.
      </p>
    </div>
  );
}
