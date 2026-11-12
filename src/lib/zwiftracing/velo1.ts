import "server-only";

// Legacy vELO (vELO1) per Zwift-ID uit `zwift_legacy_velo` (0301), voor een
// verwachting: de rating van nu (`velo_live`), anders de hoogste over 30 of 90
// dagen. De sync (rider-sync.ts) houdt hem bij voor ladderrenners en, sinds
// 2026-11-12, voor de renners van een racebriefje.
//
// Terugtoets 2026-11-12: op de ladder gaf vELO1 samen met ons vermogen de beste
// verwachting (Spearman 0,70); bij de ZRL scoorde vELO1 alleen 0,72 tegen 0,63
// voor de ZRS (docs/zwiftracing-events-onderzoek-2026-11-12.md).

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export async function loadVelo1(admin: Admin, zwiftIds: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  const ids = [...new Set(zwiftIds.filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (ids.length === 0) return out;
  const { data, error } = await admin.from("zwift_legacy_velo").select("zwift_id, velo_live, velo_max30, velo_max90").in("zwift_id", ids);
  if (error) return out;
  for (const row of (data ?? []) as Array<{ zwift_id: number | string; velo_live: number | string | null; velo_max30: number | string | null; velo_max90: number | string | null }>) {
    const id = Number(row.zwift_id);
    const value = [row.velo_live, row.velo_max30, row.velo_max90].map((v) => (v == null ? NaN : Number(v))).find((v) => Number.isFinite(v) && v > 0);
    if (Number.isSafeInteger(id) && id > 0 && value) out.set(id, Math.round(value * 10) / 10);
  }
  return out;
}
