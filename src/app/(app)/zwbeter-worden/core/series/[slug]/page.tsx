import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { equipmentLabel, seriesEquipment } from "@/lib/training/equipment";
import { seriesMinutes } from "@/lib/training/mobility";
import { formatWellnessDate } from "../../../_components/format";
import { completeSeries, undoSession } from "../../_actions";
import { loadSeriesBySlug, loadSessions, requireViewer, todayKeyAmsterdam } from "../../_data";
import { seriesLoad } from "@/lib/training/muscles";
import { articlesForSeries } from "@/lib/training/strength-library";
import { ExerciseVisual } from "../../_components/exercise-visual";
import { ExerciseMuscleSummary, MuscleSummary } from "../../_components/muscle-summary";
import { SeriesRunner } from "../../_components/series-runner";
import { UndoSessionButton } from "../../_components/undo-session-button";
import { BackLink } from "@/components/app-ui";

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
  const equipment = equipmentLabel(seriesEquipment(series.items));
  const articles = articlesForSeries(series.slug);

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/zwbeter-worden/core/series" label="Series" />
        <h2 className="mt-1 text-xl font-semibold">{series.title}</h2>
        {series.subtitle && (
          <p className="text-sm text-muted-foreground">{series.subtitle}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {minutes} min · {series.items.length} oefeningen
          {lastDone ? ` · laatst ${formatWellnessDate(lastDone.completed_on)}` : ""}
        </p>
        {equipment && <p className="mt-0.5 text-xs text-muted-foreground">{equipment}</p>}
        <MuscleSummary
          load={seriesLoad(series.items)}
          size="lg"
          limit={4}
          className="mt-3"
        />
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
                <ExerciseMuscleSummary slug={item.exercise.slug} className="mt-2" />
                <div className="mt-2">
                  <Markdown source={item.exercise.cue_md} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {articles.length > 0 && (
        <section className="rounded-lg border bg-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Onderbouwing
          </h3>
          <ul className="mt-2 divide-y">
            {articles.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/zwbeter-worden/core/kennis/${article.slug}`}
                  className="flex min-h-[44px] items-center justify-between gap-3 text-sm hover:text-primary"
                >
                  {article.title}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Stop bij pijn. Bij aanhoudende klachten: overleg met een fysiotherapeut.
      </p>
    </div>
  );
}
