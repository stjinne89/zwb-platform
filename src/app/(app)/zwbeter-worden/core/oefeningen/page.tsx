
import { Markdown } from "@/components/markdown";
import { equipmentLabel, exerciseEquipment } from "@/lib/training/equipment";
import type { MobilityCategory } from "@/lib/training/mobility";
import { ExerciseVisual } from "../_components/exercise-visual";
import { ExerciseMuscleSummary } from "../_components/muscle-summary";
import { loadExercises, requireViewer } from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CATEGORY_LABELS: Record<MobilityCategory, string> = {
  core: "Core",
  mobiliteit: "Mobiliteit",
  activatie: "Activatie",
  kracht: "Kracht",
};

const CATEGORY_ORDER: MobilityCategory[] = ["core", "mobiliteit", "activatie", "kracht"];

export default async function ExerciseLibraryPage() {
  const viewer = await requireViewer();
  const exercises = await loadExercises(viewer);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Oefeningen</h2>

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
                      equipmentLabel(exerciseEquipment(exercise.slug)),
                      exercise.default_hold_seconds
                        ? `${exercise.default_hold_seconds} sec`
                        : null,
                      exercise.default_reps ? `${exercise.default_reps} herhalingen` : null,
                      exercise.is_unilateral ? "per kant" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <ExerciseMuscleSummary slug={exercise.slug} className="mt-2" />
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
