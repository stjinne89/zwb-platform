import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-ui";
import { adminAreaPermission } from "@/lib/admin-areas";
import { getRequestAccess } from "@/lib/auth/request";
import { getClub } from "@/lib/club";
import { ladderSessionStatus } from "@/lib/club-ladder/session";
import { IntegrationHealth } from "../event-scan/_components/integration-health";
import { LadderSession } from "./_components/ladder-session";
import { MemberIntegrations } from "./_components/member-integrations";
import { loadMemberIntegrations } from "./_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BeheerKoppelingenPage() {
  const access = await getRequestAccess();
  if (!access.user) redirect("/login");
  if (!access.has(adminAreaPermission("koppelingen"))) redirect("/dashboard");

  const club = await getClub();
  const [{ members, stravaCapFull }, ladder] = await Promise.all([
    loadMemberIntegrations(),
    club.isEnabled("teams") ? ladderSessionStatus() : null,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Beheer" title="Koppelingen" />
      <IntegrationHealth />
      {ladder && <LadderSession status={ladder} />}
      <MemberIntegrations
        members={members}
        canSyncStrava={access.has(adminAreaPermission("strava"))}
        stravaCapFull={stravaCapFull}
      />
    </div>
  );
}
