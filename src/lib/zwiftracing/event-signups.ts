import "server-only";

// Op het event van een gewone Zwift-race: welke leden zich bij Zwift hebben
// aangemeld, met hun verwachte plek in hun pen volgens ZwiftRacing. Uit de
// eventpagina van ZwiftRacing vóór de start (event-cache.ts); na de start niets,
// want dan is er de uitslag en ZWBeter racen.

import type { createAdminClient } from "@/lib/supabase/admin";
import { PHENOTYPE_LABELS } from "@/lib/race-briefing/field";
import { loadZwiftRacingEvent } from "./event-cache";

type Admin = ReturnType<typeof createAdminClient>;

export type ZrSignupRow = {
  profileId: string;
  name: string;
  pen: string | null;
  expected: number;
  penSize: number;
  type: string | null;
};

/** Zo ver vooruit kijkt de eventlijst van ZwiftRacing (gezien 2026-11-12: een week). */
const SIGNUPS_AHEAD_MS = 7 * 24 * 60 * 60 * 1000;

/** Het event is nog niet gestart en begint binnen een week. */
export function startsWithinSignupWindow(startAt: string, now = Date.now()): boolean {
  const start = Date.parse(startAt);
  return Number.isFinite(start) && start > now && start - now < SIGNUPS_AHEAD_MS;
}

export async function loadZwiftRacingSignups(admin: Admin, zwiftEventId: number | string): Promise<ZrSignupRow[]> {
  const event = await loadZwiftRacingEvent(zwiftEventId);
  if (!event || event.mode !== "signups") return [];
  const byId = new Map(event.pens.flatMap((pen) => pen.riders.map((rider) => [rider.zwiftId, { pen, rider }] as const)));
  if (byId.size === 0) return [];
  const ids = [...byId.keys()].map(String);
  const rows: ZrSignupRow[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin.from("profiles").select("id, display_name, zwift_id").in("zwift_id", ids.slice(i, i + 200));
    for (const profile of (data ?? []) as Array<{ id: string; display_name: string | null; zwift_id: string | number | null }>) {
      const hit = byId.get(Number(String(profile.zwift_id ?? "").trim()));
      if (!hit || hit.rider.expectedPosition == null) continue;
      rows.push({
        profileId: profile.id,
        name: profile.display_name?.trim() || "Lid",
        pen: hit.pen.label,
        expected: hit.rider.expectedPosition,
        penSize: hit.pen.riders.length,
        type: hit.rider.phenotype ? (PHENOTYPE_LABELS[hit.rider.phenotype] ?? null) : null,
      });
    }
  }
  return rows.sort((a, b) => (a.pen ?? "").localeCompare(b.pen ?? "") || a.expected - b.expected);
}
