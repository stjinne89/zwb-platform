import { EmptyState } from "@/components/app-ui";
import { preferenceRoleFor } from "@/lib/training/preferences";
import { PlanBasisView } from "../../_components/plan-basis-view";
import type { SearchParamsProp } from "../../_components/types";
import { trainerContext } from "../_data";
import { todayKeyAmsterdam } from "../../_data";
import { loadActiveRuns, loadChecks, loadCoreSessions, loadProtocolProfile } from "../../_protocol-data";
import { ProtocolRunsOverview } from "../../_components/protocols/protocol-views";

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

  // Protocollen volgen dezelfde kring als de voorkeuren (RLS in 0237): de
  // eigen trainer leest mee, beheer niet. viewer.supabase dwingt dat af.
  const today = todayKeyAmsterdam();
  const runs = role != null ? await loadActiveRuns(viewer.supabase, athleteId) : [];
  const [checks, coreSessions, profile] = await Promise.all([
    loadChecks(viewer.supabase, runs.map((run) => run.id)),
    loadCoreSessions(viewer.supabase, runs.map((run) => run.id)),
    loadProtocolProfile(viewer.supabase, athleteId, today),
  ]);

  return (
    <div className="space-y-8">
      <PlanBasisView
        admin={viewer.admin}
        profileId={athleteId}
        currentUserId={viewer.user.id}
        showPreferences={role != null}
        showLinks={false}
      />
      <ProtocolRunsOverview
        runs={runs}
        checks={checks}
        coreSessions={coreSessions}
        weightKg={profile.weightKg}
        today={today}
      />
    </div>
  );
}
