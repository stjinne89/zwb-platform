// Garmin- en Wahoo-sessies bijwerken: "pull-on-view".
//
// Wordt aangeroepen door de pagina's die live-sessies tonen (/live, de
// eventpagina, de verjaardagsrit, de publieke eventticker, /kalender) en door de
// cleanup-cron. Per sessie hooguit één ophaalronde per 30 s
// (external_last_fetch_at is het slot), dus zonder kijkers kost het niets en met
// tien kijkers niet meer dan met één.
//
// - Garmin: nieuwe trackpoints naar live_positions; last_seen_at volgt het
//   nieuwste punt. De sessie sluit als Garmin de rit beëindigd meldt.
// - Wahoo: de punten komen uit de FIT-data op de live-pagina. De sessie sluit
//   als de pagina "completed" meldt of 30 minuten niets kreeg.
// - Vaste Wahoo-link: er komt geen mail bij de start, dus bij kijken wordt
//   elke gekoppelde link hooguit elke 3 minuten bekeken (keuze eigenaar
//   2026-09-28: alleen bij kijken). De cleanup-cron zoekt niet.
// - Lukt uitlezen niet: "live, met link". De sessie blijft zichtbaar tot
//   LINK_ONLY_MAX_MS na de start.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationToMembers } from "@/lib/push/send";
import {
  fetchGarminSession,
  fetchWahooPage,
  garminAuth,
  parseGarminLink,
  parseWahooPage,
  wahooIsRiding,
  type GarminAuth,
  type GarminLink,
  type LivePoint,
  type LiveSample,
} from "./external-livetrack";
import { wahooPagePoints } from "./fit-records";

const FETCH_EVERY_MS = 30 * 1000;
const WAHOO_DETECT_EVERY_MS = 3 * 60 * 1000;
export const LINK_ONLY_MAX_MS = 8 * 60 * 60 * 1000;
const WAHOO_ENDED_AFTER_S = 30 * 60;
const ROUND_BUDGET_MS = 7000;
const MAX_POINTS_PER_FETCH = 5000;
const MIN_POINT_SPACING_MS = 10 * 1000;

type ExternalSessionRow = {
  id: string;
  profile_id: string;
  source: "garmin" | "wahoo";
  external_track_url: string | null;
  tracker_token_id?: string | null;
  started_at: string;
  last_seen_at: string;
  external_last_fetch_at: string | null;
  external_last_point_at: string | null;
  shareHeartRate?: boolean;
};

type SessionUpdate = {
  last_seen_at?: string;
  ended_at?: string;
  external_status?: "live" | "ended" | "error" | "link";
  external_last_point_at?: string;
};

function mean(values: (number | null | undefined)[]) {
  const nums = values.filter((v): v is number => typeof v === "number");
  return nums.length === 0 ? null : Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/**
 * Eén kaartpunt per MIN_POINT_SPACING_MS, gerekend vanaf het laatst opgeslagen
 * punt. Wahoo levert elke seconde een meting; dat is te veel voor de kaart en
 * de database. Vermogen, cadans en hartslag worden gemiddeld over alle
 * metingen sinds het vorige kaartpunt, ook die zonder positie.
 */
export function thinPoints(
  samples: LiveSample[],
  after: string | null,
  spacingMs = MIN_POINT_SPACING_MS,
): LivePoint[] {
  let last = after ? Date.parse(after) : -Infinity;
  let window: LiveSample[] = [];
  const kept: LivePoint[] = [];
  for (const sample of samples) {
    const t = Date.parse(sample.recordedAt);
    if (t <= last) continue;
    window.push(sample);
    if (sample.lat === null || sample.lng === null || t - last < spacingMs) continue;
    kept.push({
      ...sample,
      lat: sample.lat,
      lng: sample.lng,
      powerW: mean(window.map((s) => s.powerW)),
      cadenceRpm: mean(window.map((s) => s.cadenceRpm)),
      heartRate: mean(window.map((s) => s.heartRate)),
      distanceM: sample.distanceM ?? null,
    });
    last = t;
    window = [];
  }
  return kept;
}

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

async function storePoints(admin: SupabaseClient, row: ExternalSessionRow, samples: LiveSample[]) {
  const recent = thinPoints(samples, row.external_last_point_at).slice(-MAX_POINTS_PER_FETCH);
  if (recent.length === 0) return null;
  const base = recent.map((p) => ({
    session_id: row.id,
    profile_id: row.profile_id,
    lat: p.lat,
    lng: p.lng,
    altitude: p.altitude,
    speed_kmh: p.speedKmh,
    recorded_at: p.recordedAt,
  }));
  const withMetrics = recent.map((p, i) => ({
    ...base[i],
    power_w: p.powerW ?? null,
    cadence_rpm: p.cadenceRpm ?? null,
    // Hartslag alleen met toestemming van het lid (0193).
    heart_rate: row.shareHeartRate ? (p.heartRate ?? null) : null,
    distance_m: p.distanceM ?? null,
  }));
  let { error } = await admin.from("live_positions").insert(withMetrics);
  if (error && /column/i.test(error.message)) {
    // 0193 nog niet toegepast: dan in elk geval de positie.
    ({ error } = await admin.from("live_positions").insert(base));
  }
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

async function refreshWahoo(
  admin: SupabaseClient,
  row: ExternalSessionRow,
  url: string,
  now: number,
): Promise<SessionUpdate> {
  const html = await fetchWahooPage(url);
  const nowIso = new Date(now).toISOString();
  const page = html ? parseWahooPage(html) : null;
  if (!html || !page?.found) return { ended_at: nowIso, external_status: "ended" };

  const lastPoint = await storePoints(admin, row, wahooPagePoints(html));
  const ended =
    page.workoutState === "completed" ||
    (page.secondsSinceUpdate !== null && page.secondsSinceUpdate > WAHOO_ENDED_AFTER_S);

  const update: SessionUpdate = { external_status: ended ? "ended" : "live" };
  if (lastPoint) update.external_last_point_at = lastPoint;
  if (ended) {
    update.ended_at = nowIso;
  } else if (lastPoint) {
    update.last_seen_at = lastPoint;
  } else if (page.secondsSinceUpdate !== null) {
    update.last_seen_at = new Date(now - page.secondsSinceUpdate * 1000).toISOString();
  } else {
    return { ...linkOnlyUpdate(row, now), ...update, external_status: "link" };
  }
  return update;
}

async function refreshOne(
  admin: SupabaseClient,
  row: ExternalSessionRow,
  wahooUrl: string | null,
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
    } else if (row.source === "wahoo" && wahooUrl) {
      update = await refreshWahoo(admin, row, wahooUrl, now);
    } else if (row.source === "wahoo" && row.tracker_token_id) {
      // Vaste link ingetrokken tijdens de rit.
      update = { ended_at: new Date(now).toISOString(), external_status: "ended" };
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

type WahooLinkRow = {
  id: string;
  profile_id: string;
  external_url: string;
  last_checked_at: string | null;
  profiles: { display_name: string | null; is_approved: boolean } | null;
};

/**
 * Vaste Wahoo-links bekijken van leden die nog niet live zijn. Rijdt iemand,
 * dan komt er een sessie bij; de posities volgen in dezelfde ronde.
 */
async function detectWahooRides(
  admin: SupabaseClient,
  profileIds: string[] | undefined,
  now: number,
) {
  let query = admin
    .from("live_tracker_tokens")
    .select("id, profile_id, external_url, last_checked_at, profiles(display_name, is_approved)")
    .eq("provider", "wahoo_link")
    .eq("enabled", true)
    .is("revoked_at", null);
  if (profileIds) query = query.in("profile_id", profileIds);
  const { data: links, error } = await query;
  if (error || !links?.length) return;

  const { data: open } = await admin
    .from("live_sessions")
    .select("profile_id")
    .eq("mode", "outdoor")
    .is("ended_at", null)
    .in(
      "profile_id",
      links.map((l) => l.profile_id),
    );
  const busy = new Set((open ?? []).map((s) => s.profile_id as string));
  const cutoff = new Date(now - WAHOO_DETECT_EVERY_MS).toISOString();

  const due = (links as unknown as WahooLinkRow[]).filter(
    (link) =>
      link.profiles?.is_approved &&
      !busy.has(link.profile_id) &&
      (!link.last_checked_at || Date.parse(link.last_checked_at) < Date.parse(cutoff)),
  );

  await Promise.allSettled(
    due.map(async (link) => {
      const { data: claimed } = await admin
        .from("live_tracker_tokens")
        .update({ last_checked_at: new Date(now).toISOString() })
        .eq("id", link.id)
        .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`)
        .select("id");
      if (!claimed?.length) return;

      const html = await fetchWahooPage(link.external_url);
      const page = html ? parseWahooPage(html) : null;
      if (!page || !wahooIsRiding(page)) return;

      const lastSeen = new Date(now - (page.secondsSinceUpdate ?? 0) * 1000).toISOString();
      const { data: session, error: insertError } = await admin
        .from("live_sessions")
        .insert({
          profile_id: link.profile_id,
          mode: "outdoor",
          source: "wahoo",
          tracker_token_id: link.id,
          visibility: "members",
          last_seen_at: lastSeen,
        })
        .select("id")
        .single();
      if (insertError || !session) return;

      await admin
        .from("live_tracker_tokens")
        .update({ last_seen_at: new Date(now).toISOString() })
        .eq("id", link.id);
      await sendNotificationToMembers(
        "on_live_started",
        {
          title: "ZWB'er is live",
          body: `${link.profiles?.display_name ?? "Een ZWB'er"} is live via Wahoo.`,
          url: "/live",
          tag: `live-${session.id}`,
        },
        { excludeProfileId: link.profile_id },
      ).catch(() => null);
    }),
  );
}

async function refreshOpenSessions(
  admin: SupabaseClient,
  profileIds: string[] | undefined,
  now: number,
) {
  let query = admin
    .from("live_sessions")
    .select("*")
    .in("source", ["garmin", "wahoo"])
    .is("ended_at", null);
  if (profileIds) query = query.in("profile_id", profileIds);
  const { data } = await query;

  const due = ((data ?? []) as ExternalSessionRow[]).filter(
    (row) =>
      !row.external_last_fetch_at ||
      now - Date.parse(row.external_last_fetch_at) >= FETCH_EVERY_MS,
  );
  if (due.length === 0) return;

  // Hartslag alleen opslaan voor leden die dat hebben aangezet (0193).
  const { data: consents } = await admin
    .from("profiles")
    .select("id, live_heart_rate_consent_at")
    .in("id", [...new Set(due.map((row) => row.profile_id))]);
  const consenting = new Set(
    (consents ?? []).filter((p) => p.live_heart_rate_consent_at).map((p) => p.id as string),
  );
  for (const row of due) row.shareHeartRate = consenting.has(row.profile_id);

  // De vaste Wahoo-link staat alleen in live_tracker_tokens (zie 0192).
  const tokenIds = due.map((row) => row.tracker_token_id).filter((id): id is string => !!id);
  const wahooUrlByToken = new Map<string, string>();
  if (tokenIds.length > 0) {
    const { data: tokens } = await admin
      .from("live_tracker_tokens")
      .select("id, external_url")
      .in("id", tokenIds)
      .eq("enabled", true)
      .is("revoked_at", null);
    for (const token of tokens ?? []) {
      if (token.external_url) wahooUrlByToken.set(token.id, token.external_url);
    }
  }

  // Eén CSRF-token per ronde, gedeeld door alle Garmin-sessies.
  let authPromise: Promise<GarminAuth> | null = null;
  const getAuth = (link: GarminLink) => () => (authPromise ??= garminAuth(link));

  await Promise.allSettled(
    due.map(async (row) => {
      if (!(await claim(admin, row.id, now))) return;
      const link = row.external_track_url ? parseGarminLink(row.external_track_url) : null;
      const wahooUrl = row.tracker_token_id
        ? (wahooUrlByToken.get(row.tracker_token_id) ?? null)
        : row.source === "wahoo"
          ? row.external_track_url
          : null;
      await refreshOne(
        admin,
        row,
        wahooUrl,
        link ? getAuth(link) : () => Promise.reject(new Error("Geen Garmin-link.")),
        now,
      );
    }),
  );
}

/**
 * Werk open Garmin- en Wahoo-sessies bij en zoek, tenzij `detect` false is,
 * naar Wahoo-ritten via de vaste link. Faalt nooit naar de aanroeper: een
 * pagina moet ook renderen als Garmin of Wahoo niet antwoordt.
 */
export async function refreshExternalLiveSessions(
  options: { profileIds?: string[]; admin?: SupabaseClient; detect?: boolean } = {},
): Promise<void> {
  if (options.profileIds && options.profileIds.length === 0) return;
  try {
    const admin = options.admin ?? createAdminClient();
    const now = Date.now();
    const work = (async () => {
      if (options.detect !== false) {
        await detectWahooRides(admin, options.profileIds, now).catch((err) =>
          console.warn("[live] Wahoo-links bekijken mislukt:", err),
        );
      }
      await refreshOpenSessions(admin, options.profileIds, now);
    })();
    await Promise.race([
      work,
      new Promise((resolve) => setTimeout(resolve, ROUND_BUDGET_MS)),
    ]);
  } catch (err) {
    console.warn("[live] externe sessies bijwerken mislukt:", err);
  }
}
