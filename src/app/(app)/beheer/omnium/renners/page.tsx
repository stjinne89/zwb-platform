import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, EmptyState } from "@/components/app-ui";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { MergeRidersForm } from "./merge-form";

export const dynamic = "force-dynamic";

export default async function OmniumRidersPage() {
  const access = await getCurrentUserAccess(await createClient());
  if (!access.user) redirect("/login");
  if (!access.has("omnium.manage")) redirect("/dashboard");

  const { data } = await createAdminClient()
    .from("omnium_riders")
    .select("id, display_name, zwift_id, team_name")
    .is("merged_into_id", null)
    .order("display_name");
  const riders = (data ?? []).map((rider) => ({
    id: rider.id as string,
    displayName: rider.display_name as string,
    zwiftId: (rider.zwift_id as string | null) ?? null,
    teamName: (rider.team_name as string | null) ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ZWB Omnium"
        title="Renners samenvoegen"
        actions={<Link href="/beheer/omnium" className="text-sm underline">Terug</Link>}
      />
      {riders.length < 2 ? (
        <EmptyState>Er zijn nog geen dubbele renners.</EmptyState>
      ) : (
        <MergeRidersForm riders={riders} />
      )}
    </div>
  );
}
