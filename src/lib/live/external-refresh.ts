// Garmin- en Wahoo-sessies bijwerken: "pull-on-view".
//
// Wordt aangeroepen door de pagina's die live-sessies tonen (/live, de
// eventpagina, de publieke eventticker) en door de cleanup-cron. Per sessie
// hooguit één ophaalronde per 30 s (external_last_fetch_at is het slot), dus
// zonder kijkers kost het niets en met tien kijkers niet meer dan met één.
//
// - Garmin: nieuwe trackpoints naar live_positions; last_seen_at volgt het
//   nieuwste punt. De sessie sluit als Garmin de rit beëindigd meldt.
// - Wahoo: alleen de status; last_seen_at volgt de laatste update van de
//   ELEMNT. Posities zijn (nog) niet uit te lezen.
// - Lukt uitlezen niet: "live, met link". De sessie blijft zichtbaar tot
//   LINK_ONLY_MAX_MS na de start.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchGarminSession,
  fetchWahooState,
  garminAuth,
  parseGarminLink,
  type GarminAuth,
  type GarminLink,
  type LivePoint,
} from "./external-livetrack";

const FETCH_EVERY_MS = 30 * 1000;
export const LINK_ONLY_MAX_MS = 8 * 60 * 60 * 1000;
const WAHOO_ENDED_AFTER_S = 30 * 60;
const ROUND_BUDGET_MS = 7000;
const MAX_POINTS_PER_FETCH = 5000;

type ExternalSessionRow = {
  id: string;
  profile_id: string;
  source: "garmin" | "wahoo";
  external_track_url: string | null;
  started_at: string;
  last_seen_at: string;
  external_last_fetch_at: string | null;
  external_last_point_at: string | null;
};

type SessionUpdate = {
  last_seen_at?: string;
  ended_at?: string;
  external_status?: "live" | "ended" | "error" | "link";
  external_last_point_at?: string;
};

function linkOnlyUpdate(row: ExternalSessionRow, now: number): SessionUpdate {
  const expired = now - Date.parse(row.started_at) > LINK_ONLY_MAX_MS;
  const nowIso = new Date(now).toISOString();
  return expired
    ? { ended_at: nowIso, external_status: "link" }
    : { last_seen_at: nowIso, external_status: "link" };
}

async function claim(admin: SupabaseClient, id: string, now: number) {
  const cutoff = new Date(now - FETCH_EVERY_MS).toISOString();
  const { data } = await admin
    .from("live_sessions")
    .update({ external_last_fetch_at: new Date(now).toISOString() })
    .eq("id", id)
    .is("ended_at", null)
    .or(`external_last_fetch_at.is.null,external_last_fetch_at.lt.${cutoff}`)
    .select("id");
  return (data ?? []).length > 0;
}

async function storePoints(admin: SupabaseClient, row: ExternalSessionRow, points: LivePoint[]) {
  const recent = points.slice(-MAX_POINTS_PER_FETCH);
  if (recent.length === 0) return null;
  const { error } = await admin.from("live_positions").insert(
    recent.map((p) => ({
      session_id: row.id,
      profile_id: row.profile_id,
      lat: p.lat,
      lng: p.lng,
      altitude: p.altitude,
      speed_kmh: p.speedKmh,
      recorded_at: p.recordedAt,
    })),
  );
  if (error) throw new Error(error.message);
  return recent[recent.length - 1].recordedAt;
}

async function refreshGarmin(
  admin: SupabaseClient,
  row: ExternalSessionRow,
  link: GarminLink,
  getAuth: () => Promise<GarminAuth>,
  now: number,
): Promise<SessionUpdate> {
  const result = await fetchGarminSession(await getAuth(), link, row.external_last_point_at);
  const nowIso = new Date(now).toISOString();
  if (result.state === "gone") return { ended_at: nowIso, external_status: "ended" };

  const lastPoint = await storePoints(admin, row, result.points);
  const update: SessionUpdate = {
    external_status: result.state === "live" ? "live" : "ended",
  };
  if (lastPoint) {
    update.external_last_point_at = lastPoint;
    update.last_seen_at = lastPoint;
  }
  if (result.state === "ended") update.ended_at = nowIso;
  return update;
}

async function refreshWahoo(row: ExternalSessionRow, now: number): Promise<SessionUpdate> {
  const state = await fetchWahooState(row.external_track_url!);
  const nowIso = new Date(now).toISOString();
  if (state.state === "ended") return { ended_at: nowIso, external_status: "ended" };
  if (state.state === "unknown") return linkOnlyUpdate(row, now);
  if (state.secondsSinceUpdate > WAHOO_ENDED_AFTER_S) {
    return { ended_at: nowIso, external_status: "ended" };
  }
  return {
    last_seen_at: new Date(now - state.secondsSinceUpdate * 1000).toISOString(),
    external_status: "link",
  };
}

async function refreshOne(
  admin: SupabaseClient,
  row: ExternalSessionRow,
  getAuth: () => Promise<GarminAuth>,
  now: number,
) {
  let update: SessionUpdate;
  try {
    const garmin =
      row.source === "garmin" && row.external_track_url
        ? parseGarminLink(row.external_track_url)
        : null;
    if (garmin) {
      update = await refreshGarmin(admin, row, garmin, getAuth, now);
    } else if (row.source === "wahoo" && row.external_track_url) {
      update = await refreshWahoo(row, now);
    } else {
      update = linkOnlyUpdate(row, now);
    }
  } catch (err) {
    console.warn(
      `[live] ${row.source}-sessie ${row.id} niet uit te lezen:`,
      err instanceof Error ? err.message : err,
    );
    update = { ...linkOnlyUpdate(row, now), external_status: "error" };
  }
  await admin.from("live_sessions").update(update).eq("id", row.id);
}

/**
 * Werk open Garmin- en Wahoo-sessies bij. Faalt nooit naar de aanroeper: een
 * pagina moet ook renderen als Garmin of Wahoo niet antwoordt.
 */
export async function refreshExternalLiveSessions(
  options: { profileIds?: string[]; admin?: SupabaseClient } = {},
): Promise<void> {
  if (options.profileIds && options.profileIds.length === 0) return;
  try {
    const admin = options.admin ?? createAdminClient();
    let query = admin
      .from("live_sessions")
      .select(
        "id, profile_id, source, external_track_url, started_at, last_seen_at, external_last_fetch_at, external_last_point_at",
      )
      .in("source", ["garmin", "wahoo"])
      .is("ended_at", null);
    if (options.profileIds) query = query.in("profile_id", options.profileIds);
    const { data } = await query;

    const now = Date.now();
    const due = ((data ?? []) as ExternalSessionRow[]).filter(
      (row) =>
        !row.external_last_fetch_at ||
        now - Date.parse(row.external_last_fetch_at) >= FETCH_EVERY_MS,
    );
    if (due.length === 0) return;

    // Eén CSRF-token per ronde, gedeeld door alle Garmin-sessies.
    let authPromise: Promise<GarminAuth> | null = null;
    const getAuth = (link: GarminLink) => () => (authPromise ??= garminAuth(link));

    const work = Promise.allSettled(
      due.map(async (row) => {
        if (!(await claim(admin, row.id, now))) return;
        const link = row.external_track_url ? parseGarminLink(row.external_track_url) : null;
        await refreshOne(
          admin,
          row,
          link ? getAuth(link) : () => Promise.reject(new Error("Geen Garmin-link.")),
          now,
        );
      }),
    );
    await Promise.race([
      work,
      new Promise((resolve) => setTimeout(resolve, ROUND_BUDGET_MS)),
    ]);
  } catch (err) {
    console.warn("[live] externe sessies bijwerken mislukt:", err);
  }
}
