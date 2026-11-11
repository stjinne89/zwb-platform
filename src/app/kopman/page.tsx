import type { Metadata, Viewport } from "next";
import { notFound, redirect } from "next/navigation";
import { adminAreaPermission } from "@/lib/admin-areas";
import { getRequestUser } from "@/lib/auth/request";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { KopmanScreen } from "@/kopman/ui/kopman-app";

// Kopman (werktitel): de wielermanager. Een eigen pagina buiten de schil van de
// club (geen kop, menu of meldingen), zodat het spel het hele scherm heeft. Nog
// alleen voor wie ZWBgame beheert; het spel zelf staat los in src/kopman
// (docs/kopman.md).
export const metadata: Metadata = {
  title: "Kopman",
  manifest: "/kopman.webmanifest",
  appleWebApp: { capable: true, title: "Kopman", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#0f1b28", viewportFit: "cover" };
export const dynamic = "force-dynamic";

export default async function KopmanPage() {
  const [supabase, user] = await Promise.all([createClient(), getRequestUser()]);
  if (!user) redirect("/login");
  const access = await getCurrentUserAccess(supabase);
  if (!access.has(adminAreaPermission("zwbgame"))) notFound();
  return <KopmanScreen />;
}
