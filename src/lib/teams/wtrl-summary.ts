// WTRL-waarden per renner voor de rostertabel (migr. 0180).

import type { SupabaseClient } from "@supabase/supabase-js";
import { summarizeWtrlRiders, type WtrlRiderSummary } from "@/lib/teams/wtrl-roster";

function numberOrNull(value: unknown) {
  return value == null || !Number.isFinite(Number(value)) ? null : Number(value);
}

/**
 * zFTP, zMAP en advies per Zwift-ID, over de WTRL-teams die aan deze ZWB-teams
 * hangen (of alle gekoppelde WTRL-teams als teamIds null is).
 */
export async function loadWtrlSummaries(
  supabase: SupabaseClient,
  teamIds: string[] | null,
): Promise<Map<string, WtrlRiderSummary>> {
  let query = supabase
    .from("wtrl_teams")
    .select("trc_ref, division")
    .not("team_id", "is", null);
  if (teamIds) query = query.in("team_id", teamIds);
  const { data: teams } = await query;
  const refs = ((teams ?? []) as Array<{ trc_ref: string }>).map((row) => row.trc_ref);
  if (refs.length === 0) return new Map();

  const { data: riders } = await supabase
    .from("wtrl_team_riders")
    .select("trc_ref, zwift_id, name, category, status, zftp_w, zftp_wkg, zmap_wkg")
    .in("trc_ref", refs);
  const rows = (riders ?? []) as Array<Record<string, unknown>>;

  return summarizeWtrlRiders(
    ((teams ?? []) as Array<{ trc_ref: string; division: string | null }>).map((team) => ({
      division: team.division,
      riders: rows
        .filter((rider) => rider.trc_ref === team.trc_ref)
        .map((rider) => ({
          zwiftId: rider.zwift_id as string,
          name: rider.name as string,
          category: (rider.category as string | null) ?? null,
          status: rider.status === "invited" ? ("invited" as const) : ("member" as const),
          zftpW: numberOrNull(rider.zftp_w),
          zftpWkg: numberOrNull(rider.zftp_wkg),
          zmapWkg: numberOrNull(rider.zmap_wkg),
        })),
    })),
  );
}
