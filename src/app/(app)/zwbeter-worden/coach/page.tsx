import { requireViewer } from "../_data";
import { CoachChat } from "../_components/coach-chat";
import { activeTrainersOf } from "@/lib/training/coach-access";
import { loadChatMessages } from "@/lib/training/coach-chat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CoachChatPage() {
  const viewer = await requireViewer();
  const [messages, trainers] = await Promise.all([
    loadChatMessages(viewer.admin, viewer.user.id),
    activeTrainersOf(viewer.admin, viewer.user.id),
  ]);

  return (
    <CoachChat
      profileId={viewer.user.id}
      currentUserId={viewer.user.id}
      viewerRole="member"
      initialMessages={messages}
      trainerNames={trainers.map((trainer) => trainer.name)}
    />
  );
}
