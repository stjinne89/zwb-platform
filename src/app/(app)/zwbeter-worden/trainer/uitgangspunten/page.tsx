import { EmptyState } from "@/components/app-ui";
import { preferenceRoleFor } from "@/lib/training/preferences";
import { PlanBasisView } from "../../_components/plan-basis-view";
import type { SearchParamsProp } from "../../_components/types";
import { trainerContext } from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainerPlanBasisPage({ searchParams }: SearchParamsProp) {
  const context = await trainerContext(searchParams);
  if (!context.ok) {
    return (
      <EmptyState>
        {context.reason === "no-permission"
          ? "Je hebt geen trainer-rechten."
          : "Geen toegewezen leden."}
      </EmptyState>
    );
  }
  const { viewer, athleteId } = context;

  // Voorkeuren zijn vrije tekst en blijven bij het lid en zijn aangewezen
  // trainers, net als de coachchat; wie meekijkt met beheerrechten ziet alleen
  // de uitgangspunten van het schema.
  const role = await preferenceRoleFor(viewer.admin, viewer.user.id, athleteId);

  return (
    <PlanBasisView
      admin={viewer.admin}
      profileId={athleteId}
      currentUserId={viewer.user.id}
      showPreferences={role != null}
      showLinks={false}
    />
  );
}
