import { notFound } from "next/navigation";
import Link from "next/link";
import { requireGameMember } from "@/lib/zwbgame/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RosterAdmin } from "./roster-admin";

export default async function GameAdminPage() {
  const { member } = await requireGameMember();
  if (!member.is_admin) notFound();
  const admin = createAdminClient();
  const [roster, excluded] = await Promise.all([
    admin.from("roster_entries").select("id, name").is("claimed_by", null).order("name"),
    admin.from("zwbgame_roster_exclusions").select("roster_id"),
  ]);
  const exclusions = new Set((excluded.data ?? []).map((r) => r.roster_id));
  return <div className="mx-auto max-w-2xl space-y-5"><Link href="/zwbgame" className="text-sm underline">Terug naar ZWBgame</Link><h1 className="text-2xl font-bold">ZWBgame · rosterdeelname</h1>{roster.error || excluded.error ? <p role="alert">Deelnemers laden mislukt.</p> : <RosterAdmin rows={(roster.data ?? []).map((r) => ({ id: r.id, name: r.name, excluded: exclusions.has(r.id) }))} />}</div>;
}
