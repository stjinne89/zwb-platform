import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { ExpectationRider } from "./event-result";
import type { DurationWeights, PowerDuration } from "./routes";
import { DURATIONS, type PowerWkg } from "./team-power";

type Admin = ReturnType<typeof createAdminClient>;

export type FrozenExpectation = { riders: Map<number, PowerWkg>; weights: DurationWeights | null };

/**
 * Legt vóór de start vast waarmee de verwachting rekent (0308); elke opening
 * overschrijft, na de start schrijft niemand meer. Zonder 0308 doet dit niets.
 */
export async function saveLadderExpectation(
  admin: Admin,
  eventId: string,
  startAt: string,
  riders: ExpectationRider[],
  weights: DurationWeights | null,
) {
  if (riders.length === 0 || Date.parse(startAt) <= Date.now()) return;
  await admin
    .from("club_ladder_event_expectations")
    .upsert({ event_id: eventId, riders, weights, computed_at: new Date().toISOString() }, { onConflict: "event_id" });
}

const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null);

function parsePower(value: unknown): PowerWkg | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const wkg = Object.fromEntries(DURATIONS.map((d) => [d, number(raw[d])])) as PowerWkg;
  return DURATIONS.some((d) => wkg[d] != null) ? wkg : null;
}

function parseWeights(value: unknown): DurationWeights | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const out = {} as Record<PowerDuration, number>;
  for (const d of DURATIONS) {
    const weight = raw[d];
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) return null;
    out[d] = weight;
  }
  return out;
}

/** De verwachting van vóór de start, of null zonder (of zonder 0308). */
export async function loadLadderExpectation(admin: Admin, eventId: string): Promise<FrozenExpectation | null> {
  const { data, error } = await admin
    .from("club_ladder_event_expectations")
    .select("riders, weights")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error || !data) return null;
  const riders = new Map<number, PowerWkg>();
  for (const row of Array.isArray(data.riders) ? (data.riders as unknown[]) : []) {
    const rider = row as { zwiftId?: unknown; wkg?: unknown } | null;
    const zwiftId = Number(rider?.zwiftId);
    const wkg = parsePower(rider?.wkg);
    if (Number.isSafeInteger(zwiftId) && zwiftId > 0 && wkg) riders.set(zwiftId, wkg);
  }
  return riders.size > 0 ? { riders, weights: parseWeights(data.weights) } : null;
}
