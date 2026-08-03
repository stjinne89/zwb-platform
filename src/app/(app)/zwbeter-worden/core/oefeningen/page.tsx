import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Markdown } from "@/components/markdown";
import type { MobilityCategory } from "@/lib/training/mobility";
import { ExerciseVisual } from "../_components/exercise-visual";
import { loadExercises, requireViewer } from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CATEGORY_LABELS: Record<MobilityCategory, string> = {
  core: "Core",
  mobiliteit: "Mobiliteit",
  activatie: "Activatie",
};

const CATEGORY_ORDER: MobilityCategory[] = ["core", "mobiliteit", "activatie"];

export default async function ExerciseLibraryPage() {
  const viewer = await requireViewer();
  const exercises = await loadExercises(viewer);

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
        <h2 className="mt-1 text-xl font-semibold">Oefeningen</h2>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const rows = exercises.filter((exercise) => exercise.category === category);
        if (rows.length === 0) return null;

        return (
          <section key={category} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABELS[category]}
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {rows.map((exercise) => (
                <li key={exercise.id} className="rounded-lg border bg-card p-4">
                  <ExerciseVisual exercise={exercise} />
                  <h4 className="mt-2 font-semibold">{exercise.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {[
                      exercise.region,
                      exercise.default_hold_seconds
                        ? `${exercise.default_hold_seconds} sec`
                        : null,
                      exercise.default_reps ? `${exercise.default_reps} herhalingen` : null,
                      exercise.is_unilateral ? "per kant" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="mt-2">
                    <Markdown source={exercise.cue_md} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
