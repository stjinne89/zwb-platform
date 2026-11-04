import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-ui";
import { adminAreaPermission } from "@/lib/admin-areas";
import { getRequestAccess } from "@/lib/auth/request";
import { IntegrationHealth } from "../event-scan/_components/integration-health";
import { MemberIntegrations } from "./_components/member-integrations";
import { loadMemberIntegrations } from "./_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BeheerKoppelingenPage() {
  const access = await getRequestAccess();
  if (!access.user) redirect("/login");
  if (!access.has(adminAreaPermission("koppelingen"))) redirect("/dashboard");

  const members = await loadMemberIntegrations();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Beheer" title="Koppelingen" />
      <IntegrationHealth />
      <MemberIntegrations
        members={members}
        canSyncStrava={access.has(adminAreaPermission("strava"))}
      />
    </div>
  );
}
