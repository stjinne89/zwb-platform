// Lopende trainingsprotocollen ophalen voor de AI-generator. Met de admin-client,
// net als de andere invoer van de generator; die draait ook voor een trainer en
// in de dagelijkse aanpassing zonder ingelogd lid.

import type { createAdminClient } from "@/lib/supabase/admin";
import { protocolsForAi, type ProtocolForAi, type ProtocolRun } from "./index";

type Admin = ReturnType<typeof createAdminClient>;

export async function loadProtocolsForAi(
  admin: Admin,
  profileId: string,
  from: string,
  to: string,
): Promise<ProtocolForAi[]> {
  const { data, error } = await admin
    .from("member_protocols")
    .select("id, protocol_slug, start_date, race_date, status")
    .eq("profile_id", profileId)
    .eq("status", "actief");
  // Zolang 0237 niet is toegepast bestaat de tabel niet; dan zonder protocollen.
  if (error) return [];
  const runs: ProtocolRun[] = (data ?? []).map((row) => ({
    id: row.id as string,
    protocolSlug: row.protocol_slug as string,
    startDate: String(row.start_date).slice(0, 10),
    raceDate: row.race_date ? String(row.race_date).slice(0, 10) : null,
    status: row.status as ProtocolRun["status"],
  }));
  return protocolsForAi(runs, { from, to });
}
