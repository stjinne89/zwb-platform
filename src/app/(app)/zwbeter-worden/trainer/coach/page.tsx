import { EmptyState } from "@/components/app-ui";
import { loadChatMessages } from "@/lib/training/coach-chat";
import { CoachChat } from "../../_components/coach-chat";
import { trainerContext } from "../_data";
import type { SearchParamsProp } from "../../_components/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainerCoachChatPage({ searchParams }: SearchParamsProp) {
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

  const messages = await loadChatMessages(context.viewer.admin, context.athleteId);

  return (
    <CoachChat
      profileId={context.athleteId}
      currentUserId={context.viewer.user.id}
      viewerRole="trainer"
      initialMessages={messages}
      trainerNames={[]}
    />
  );
}
