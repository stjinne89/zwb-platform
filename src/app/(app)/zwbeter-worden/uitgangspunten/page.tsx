import { requireViewer } from "../_data";
import { PlanBasisView } from "../_components/plan-basis-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlanBasisPage() {
  const viewer = await requireViewer();
  return (
    <PlanBasisView
      admin={viewer.admin}
      profileId={viewer.user.id}
      currentUserId={viewer.user.id}
      showPreferences
    />
  );
}
