import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { SegmentSyncButton } from "./sync-button";
import { BackLink } from "@/components/app-ui";

export const dynamic = "force-dynamic";
export default async function SegmentAdminPage() {
  const access = await getCurrentUserAccess(await createClient());
  if (!access.user) redirect("/login");
  if (!access.has("community.manage")) redirect("/dashboard");
  const admin = createAdminClient();
  const [connections, errors] = await Promise.all([
    admin.from("strava_connections").select("profile_id,profiles(display_name)").is("revoked_at", null).order("profile_id").limit(1000),
    admin.from("zwb_segment_maps").select("id,name,geometry_status,geometry_error,geometry_checked_at").in("geometry_status", ["error","unavailable"]).order("geometry_checked_at", { ascending: false }).limit(30),
  ]);
  return <div className="space-y-5"><BackLink href="/profiel/segments" label="ZWB Segments" /><h1 className="text-2xl font-semibold">Segmentsynchronisatie</h1>
    {errors.error && <p role="alert">Segmentregistratie niet beschikbaar. Voer migratie 0152 uit.</p>}
    <ul className="divide-y rounded-lg border">{(connections.data ?? []).map((c) => {
      const relation = c.profiles as unknown as { display_name: string } | { display_name: string }[] | null;
      const name = Array.isArray(relation) ? relation[0]?.display_name : relation?.display_name;
      return <li key={c.profile_id} className="space-y-2 p-4"><p className="font-medium">{name ?? "ZWB-lid"}</p><SegmentSyncButton profileId={c.profile_id} /></li>;
    })}</ul>
    <h2 className="font-semibold">Geometrie: aandacht nodig</h2><ul className="space-y-2 text-sm">{(errors.data ?? []).map((r) => <li key={r.id}>{r.name} · {r.geometry_error ?? r.geometry_status}</li>)}</ul>
  </div>;
}
