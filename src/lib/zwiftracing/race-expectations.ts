import "server-only";

// De verwachte plek van ZwiftRacing naast de echte, per lid en race (0326).
//
// De sync haalt voor elke bewaarde race (zrl_race_snapshots, geen groepsritten)
// één keer de uitslagpagina bij ZwiftRacing en bewaart alleen de rijen van
// renners met een ZWB-profiel. Eerder stond onder "Bewust niet" in de ronde
// "ZWBeter racen: verwachting, punten per bron en de terugblik" dat eerst de vELO
// van vóór de race bewaard moest worden; dat hoeft niet, ZwiftRacing bewaart de
// verwachting van vóór de start zelf.

import type { createAdminClient } from "@/lib/supabase/admin";
import { parseEventPage, penOf } from "./event-page";
import { fetchZwiftRacingPage } from "./fetch-page";

type Admin = ReturnType<typeof createAdminClient>;

/** Zo ver terug als de terugblik in ZWBeter racen kijkt. */
const LOOKBACK_DAYS = 120;
/** Pas zo lang na de start: dan staat de uitslag bij ZwiftRacing. */
const AFTER_START_MS = 2 * 60 * 60 * 1000;
/** Nog geen definitieve uitslag na zoveel dagen: dan komt hij ook niet meer. */
const GIVE_UP_MS = 3 * 24 * 60 * 60 * 1000;
/**
 * Nog niet definitief: pas zo lang later opnieuw, zodat een paar verse races niet
 * elke run de pagina's opmaken en de oudere races nooit aan de beurt komen.
 */
const RETRY_MS = 6 * 60 * 60 * 1000;

export type RaceExpectationResult = { done: number; unknown: number; none: number; stopped: string | null };

export type ZrRaceExpectation = { expected: number; position: number | null; penSize: number };

/** Races waarvan de uitslag bij ZwiftRacing nog opgehaald moet worden, nieuwste eerst. */
async function dueEvents(admin: Admin, now: number): Promise<Array<{ id: string; startMs: number }> | null> {
  const since = new Date(now - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("zrl_race_snapshots")
    .select("zwift_event_id, type:data->>eventType, start:data->subgroups->0->>startAt")
    .gt("frozen_at", since)
    .order("frozen_at", { ascending: false })
    .limit(300);
  if (error) return null;
  const rows = ((data ?? []) as unknown as Array<{ zwift_event_id: string | number; type: string | null; start: string | null }>)
    .filter((row) => row.type !== "GROUP_RIDE")
    .map((row) => ({ id: String(row.zwift_event_id), startMs: Number(row.start) }))
    .filter((row) => Number.isFinite(row.startMs) && now - row.startMs > AFTER_START_MS);
  if (rows.length === 0) return [];
  const { data: done, error: doneError } = await admin
    .from("zwiftracing_event_fetches")
    .select("zwift_event_id, status, fetched_at")
    .in("zwift_event_id", rows.map((row) => row.id));
  // Zonder 0326 bestaat de tabel niet: dan niets doen.
  if (doneError) return null;
  const seen = new Set(
    ((done ?? []) as Array<{ zwift_event_id: string; status: string; fetched_at: string }>)
      .filter((row) => row.status !== "pending" || now - Date.parse(row.fetched_at) < RETRY_MS)
      .map((row) => row.zwift_event_id),
  );
  return rows.filter((row) => !seen.has(row.id));
}

/** Profielen met een Zwift-ID uit deze lijst. */
async function memberIds(admin: Admin, zwiftIds: number[]): Promise<Set<number>> {
  const out = new Set<number>();
  for (let i = 0; i < zwiftIds.length; i += 200) {
    const chunk = zwiftIds.slice(i, i + 200).map(String);
    const { data } = await admin.from("profiles").select("zwift_id").in("zwift_id", chunk);
    for (const row of (data ?? []) as Array<{ zwift_id: string | number | null }>) {
      const id = Number(String(row.zwift_id ?? "").trim());
      if (Number.isSafeInteger(id) && id > 0) out.add(id);
    }
  }
  return out;
}

/** Haalt uitslagpagina's op tot `deadline` of `max` pagina's; elke race één keer. */
export async function harvestRaceExpectations(admin: Admin, deadline: number, userAgent: string, max = 3): Promise<RaceExpectationResult> {
  const result: RaceExpectationResult = { done: 0, unknown: 0, none: 0, stopped: null };
  const now = Date.now();
  const due = await dueEvents(admin, now);
  if (!due) return result;
  const mark = (id: string, status: "results" | "unknown" | "none" | "pending") =>
    admin.from("zwiftracing_event_fetches").upsert({ zwift_event_id: id, status, fetched_at: new Date().toISOString() });

  let fetched = 0;
  for (const event of due) {
    if (fetched >= max || Date.now() > deadline) break;
    fetched += 1;
    const page = await fetchZwiftRacingPage(`/events/${event.id}`, userAgent);
    if (page.kind === "stop") {
      result.stopped = page.reason;
      break;
    }
    if (page.kind === "unknown") {
      await mark(event.id, "unknown");
      result.unknown += 1;
      continue;
    }
    const parsed = parseEventPage(page.html, Number(event.id));
    if (!parsed) {
      result.stopped = "eventpagina niet herkend";
      break;
    }
    const late = now - event.startMs > GIVE_UP_MS;
    if (parsed.mode !== "results" || (!parsed.finalized && !late)) {
      // Nog geen definitieve uitslag: over zes uur opnieuw, na drie dagen niet meer.
      await mark(event.id, late ? "none" : "pending");
      if (late) result.none += 1;
      continue;
    }
    const ids = parsed.pens.flatMap((pen) => pen.riders.map((rider) => rider.zwiftId));
    const members = await memberIds(admin, ids);
    const rows = [...members].flatMap((zwiftId) => {
      const hit = penOf(parsed, zwiftId);
      if (!hit || hit.rider.expectedPosition == null) return [];
      return [{
        zwift_event_id: event.id,
        zwift_id: zwiftId,
        expected_position: hit.rider.expectedPosition,
        position: hit.rider.position,
        pen_size: Math.max(hit.size, hit.rider.expectedPosition, hit.rider.position ?? 0),
        fetched_at: new Date().toISOString(),
      }];
    });
    if (rows.length > 0) {
      const { error } = await admin.from("zwiftracing_race_expectations").upsert(rows, { onConflict: "zwift_event_id,zwift_id" });
      if (error) {
        result.stopped = `opslaan mislukt: ${error.message}`;
        break;
      }
    }
    await mark(event.id, "results");
    result.done += 1;
  }
  return result;
}

/** De verwachting van ZwiftRacing per race voor dit lid; leeg zonder 0326. */
export async function loadRaceExpectations(admin: Admin, zwiftId: number): Promise<Map<string, ZrRaceExpectation>> {
  const out = new Map<string, ZrRaceExpectation>();
  if (!Number.isSafeInteger(zwiftId) || zwiftId <= 0) return out;
  const { data, error } = await admin
    .from("zwiftracing_race_expectations")
    .select("zwift_event_id, expected_position, position, pen_size")
    .eq("zwift_id", zwiftId);
  if (error) return out;
  for (const row of (data ?? []) as Array<{ zwift_event_id: string; expected_position: number; position: number | null; pen_size: number }>) {
    out.set(String(row.zwift_event_id), { expected: row.expected_position, position: row.position, penSize: row.pen_size });
  }
  return out;
}
