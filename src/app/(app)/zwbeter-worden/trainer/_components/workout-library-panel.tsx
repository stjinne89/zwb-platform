// De workout-bibliotheek bij een schema: kies een trainingsvorm, pak een
// workout op lengte en zet 'm op een datum. Daaronder een formulier om een
// eigen workout te bewaren.

import { Library } from "lucide-react";
import { INTENSITY_LABELS, WORKOUT_INTENSITIES, type WorkoutIntensity } from "@/lib/training/workouts";
import { TRAINING_FORMS, trainingFormLabel } from "@/lib/training/training-forms";
import {
  addWorkoutFromTemplate,
  deleteWorkoutTemplate,
  saveWorkoutTemplate,
} from "../../_actions";
import { formAction } from "../../_components/format";

export type WorkoutTemplateRow = {
  id: string;
  form: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  intensity: string;
  is_standard: boolean;
  created_by: string | null;
};

export function WorkoutLibraryPanel({
  templates,
  planId,
  defaultDate,
  viewerId,
}: {
  templates: WorkoutTemplateRow[];
  /** Het schema waar de workout in komt; zonder actief schema geen invoegknop. */
  planId: string | null;
  defaultDate: string;
  viewerId: string;
}) {
  // Alleen de vormen die ook echt workouts hebben, oplopend in duur.
  const byForm = TRAINING_FORMS.map((form) => ({
    ...form,
    items: templates
      .filter((template) => template.form === form.slug)
      .sort((a, b) => a.duration_minutes - b.duration_minutes),
  })).filter((form) => form.items.length > 0);

  return (
    <details className="rounded-lg border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold">
        <Library className="size-5 text-primary" />
        Workout-bibliotheek
        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {templates.length}
        </span>
      </summary>

      <div className="space-y-4 border-t p-4">
        {byForm.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen workouts in de bibliotheek.</p>
        ) : (
          byForm.map((form) => (
            <section key={form.slug}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {form.label}
              </h4>
              <ul className="mt-2 divide-y rounded-md border">
                {form.items.map((template) => (
                  <li
                    key={template.id}
                    className="grid gap-2 p-3 lg:grid-cols-[1fr_auto] lg:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{template.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.duration_minutes} min · {INTENSITY_LABELS[template.intensity as WorkoutIntensity] ?? template.intensity}
                        {template.description ? ` · ${template.description}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {planId ? (
                        <form
                          action={formAction(addWorkoutFromTemplate)}
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="plan_id" value={planId} />
                          <input type="hidden" name="template_id" value={template.id} />
                          <input
                            name="date"
                            type="date"
                            defaultValue={defaultDate}
                            className="rounded-md border bg-background px-2 py-1 text-sm"
                          />
                          <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
                            Invoegen
                          </button>
                        </form>
                      ) : null}
                      {!template.is_standard && template.created_by === viewerId ? (
                        <form action={formAction(deleteWorkoutTemplate)}>
                          <input type="hidden" name="template_id" value={template.id} />
                          <button className="rounded-md border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                            Verwijder
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        <details className="rounded-md border bg-background/60 p-3">
          <summary className="cursor-pointer text-sm font-medium">Eigen workout bewaren</summary>
          <form action={formAction(saveWorkoutTemplate)} className="mt-3 space-y-3">
            <div className="grid gap-2 lg:grid-cols-[1fr_160px_140px]">
              <label className="text-xs text-muted-foreground">
                Titel
                <input
                  name="title"
                  required
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Trainingsvorm
                <select
                  name="form"
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                >
                  {TRAINING_FORMS.map((form) => (
                    <option key={form.slug} value={form.slug}>
                      {trainingFormLabel(form.slug)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Intensiteit
                <select
                  name="intensity"
                  defaultValue="endurance"
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                >
                  {WORKOUT_INTENSITIES.map((value) => (
                    <option key={value} value={value}>
                      {INTENSITY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-xs text-muted-foreground">
              Instructie
              <textarea
                name="description"
                rows={2}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
              />
            </label>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Intervalblokken</p>
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded-md border p-2 lg:grid-cols-[1fr_80px_1fr_1fr_130px]"
                >
                  <input
                    name="block_label"
                    placeholder="Blok"
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                  />
                  <input
                    name="block_duration"
                    type="number"
                    min="0"
                    max="480"
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                  />
                  <input
                    name="block_target"
                    placeholder="Doel, bv. 88-94%"
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                  />
                  <input
                    name="block_notes"
                    placeholder="Notitie"
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                  />
                  <select
                    name="block_intensity"
                    defaultValue="endurance"
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                  >
                    {WORKOUT_INTENSITIES.map((value) => (
                      <option key={value} value={value}>
                        {INTENSITY_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              Bewaar in bibliotheek
            </button>
          </form>
        </details>
      </div>
    </details>
  );
}
