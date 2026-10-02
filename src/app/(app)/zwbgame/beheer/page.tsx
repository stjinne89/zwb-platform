import { notFound } from "next/navigation";
import { requireGameMember } from "@/lib/zwbgame/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { adminAreaPermission } from "@/lib/admin-areas";
import { createAdminClient } from "@/lib/supabase/admin";
import { RosterAdmin } from "./roster-admin";
import { BackLink } from "@/components/app-ui";

export default async function GameAdminPage() {
  const { client } = await requireGameMember();
  const access = await getCurrentUserAccess(client);
  if (!access.has(adminAreaPermission("zwbgame"))) notFound();
  const admin = createAdminClient();
  const [roster, excluded] = await Promise.all([
    admin.from("roster_entries").select("id, name").is("claimed_by", null).order("name"),
    admin.from("zwbgame_roster_exclusions").select("roster_id"),
  ]);
  const exclusions = new Set((excluded.data ?? []).map((r) => r.roster_id));
  return <div className="mx-auto max-w-2xl space-y-5"><BackLink href="/zwbgame" label="ZWBgame" /><h1 className="text-2xl font-bold">ZWBgame · rosterdeelname</h1>{roster.error || excluded.error ? <p role="alert">Deelnemers laden mislukt.</p> : <RosterAdmin rows={(roster.data ?? []).map((r) => ({ id: r.id, name: r.name, excluded: exclusions.has(r.id) }))} />}</div>;
}
