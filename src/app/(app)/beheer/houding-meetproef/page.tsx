import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-ui";
import { adminAreaPermission } from "@/lib/admin-areas";
import { getRequestAccess } from "@/lib/auth/request";
import { HoudingMeting } from "@/components/houding/houding-meting";

// Meetproef voor houding en bikefit uit live video (2026-11-08). Alleen voor
// beheer: eerst nagaan of het model goed genoeg meet, daarna pas een functie
// voor leden. Het beeld blijft op het toestel; niets wordt opgeslagen.

export const dynamic = "force-dynamic";

export default async function HoudingMeetproefPage() {
  const access = await getRequestAccess();
  if (!access.user) redirect("/login");
  if (!access.has(adminAreaPermission("houdingMeetproef"))) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Beheer" title="Houding-meetproef" />
      <HoudingMeting proef />
    </div>
  );
}
