import { EmptyState } from "@/components/app-ui";
import { TrainerNav } from "./_components/trainer-nav";
import { loadAssignments, loadRiders, trainerViewer } from "./_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

/**
 * Draagt de rennerkiezer en de tabbalk. Layouts renderen niet opnieuw bij
 * navigatie, dus de cijfers van álle renners worden hier één keer per laadbeurt
 * opgehaald in plaats van op elke tab.
 */
export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const viewer = await trainerViewer();
  if (!viewer.access.has("training.view_assigned")) {
    return <EmptyState>Je hebt geen trainer-rechten.</EmptyState>;
  }

  const assignments = await loadAssignments(viewer);
  if (assignments.length === 0) {
    return <EmptyState>Geen toegewezen leden.</EmptyState>;
  }

  const riders = await loadRiders(viewer, assignments);

  return (
    <div className="space-y-4">
      {/* Geen Suspense-grens: deze layout is al dynamisch (Supabase leest
          cookies), dus useSearchParams in TrainerNav is hier veilig. */}
      <TrainerNav riders={riders} />
      {children}
    </div>
  );
}
