import { notFound } from "next/navigation";
import { adminAreaPermission } from "@/lib/admin-areas";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { KopmanApp } from "@/kopman/ui/kopman-app";

// Kopman (werktitel): de wielermanager. Eerst alleen voor wie ZWBgame beheert;
// het spel zelf staat los van het platform in src/kopman (docs/kopman.md).
export const metadata = { title: "Kopman" };
export const dynamic = "force-dynamic";

export default async function KopmanPage() {
  const access = await getCurrentUserAccess(await createClient());
  if (!access.has(adminAreaPermission("zwbgame"))) notFound();
  return <KopmanApp />;
}
