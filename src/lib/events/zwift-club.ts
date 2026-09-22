// Geautoriseerde Zwift-club-sync (Increment 2).
//
// Zwift biedt geen officiele publieke OAuth voor clubdata van derden. Deze
// module gebruikt de onofficiele Zwift-API met een EIGEN ZWB-club-serviceaccount
// (credentials uitsluitend via env, nooit gelogd) om ZWB's eigen club-events en
// inschrijvingen te lezen. Daarna worden inschrijvers via hun Zwift-ID gematcht
// aan ZWB-profielen, zodat alleen ZWB'ers als deelnemer verschijnen.
//
// LET OP: de exacte club-/entrants-endpoints kunnen per Zwift-API-versie
// verschillen. Ze zijn daarom configureerbaar via env. Verifieer met de
// "Test clubkoppeling"-diagnose op /beheer/event-scan voordat je hierop leunt.

import { safeFetch } from "@/lib/net/safe-fetch";
import {
  mapZwiftEventRow,
  type ExternalEventCandidate,
  type ZwiftEventApiRow,
} from "@/lib/events/external-scan";
import {
  decodeSegmentResults,
  describeProtobuf,
  parseMessage,
  type SegmentResult,
} from "@/lib/zwift/segment-results-pb";

const TOKEN_URL =
  "https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token";
const ZWIFT_CLIENT_ID = "Zwift_Mobile_Link";

// App-identity-headers waarmee de officiele client zich voorstelt. Sommige
// Zwift-endpoints (o.a. club-events) weigeren met 403 zonder deze headers.
const ZWIFT_DEFAULT_HEADERS: Record<string, string> = {
  Platform: "OSX",
  Source: "Game Client",
  "User-Agent":
    "CNL/3.30.8 (macOS 13 Ventura; Darwin Kernel 22.4.0) zwift/1.0.110983 curl/7.78.0",
};
const ZWIFT_API_VERSION = "2.7";

export type ClubEntrant = {
  zwiftId: string;
  name: string;
  category: string | null;
};

export type ClubEventResult = {
  candidate: ExternalEventCandidate;
  subgroupIds: string[];
};

export type FeedEvent = ClubEventResult & {
  isClub: boolean;
  followeeSignups: number;
};

export function zwiftClubConfigured(): boolean {
  return Boolean(
    process.env.ZWIFT_USERNAME &&
      process.env.ZWIFT_PASSWORD &&
      process.env.ZWIFT_CLUB_ID,
  );
}

function apiBase(): string {
  return (process.env.ZWIFT_API_BASE ?? "https://us-or-rly101.zwift.com/api")
    .replace(/\/+$/, "");
}

function eventFeedUrl(): string {
  const path = process.env.ZWIFT_EVENT_FEED_PATH ?? "event-feed";
  return `${apiBase()}/${path.replace(/^\/+/, "")}`;
}

// Club-events zijn niet via een eigen lijst-endpoint te lezen (403), maar ze
// verschijnen wel in de member-feed met een verwijzing naar de club via
// `microserviceExternalResourceId`. Defensief vergelijken we ook de ruwe JSON.
function isZwbClubEvent(event: unknown): boolean {
  const clubId = process.env.ZWIFT_CLUB_ID ?? "";
  if (!clubId || !event || typeof event !== "object") return false;
  const resourceId = String(
    (event as Record<string, unknown>).microserviceExternalResourceId ?? "",
  );
  if (resourceId === clubId) return true;
  return JSON.stringify(event).includes(clubId);
}

// Zwift geeft zonder `limit` maar 20 inschrijvers terug (gemeten 2026-09-22: een
// subgroep van 47 leverde er 20). Bij grote events slaat doorbladeren bovendien
// renners over; Sauce for Zwift haalt daarom ook overlappende pagina's op, per 20.
const ENTRANTS_LIMIT = 100;
const ENTRANTS_OVERLAP_STEP = 20;
const ENTRANTS_MAX_PAGES = 10;

function entrantsUrl(subgroupId: string, start = 0): string {
  const template =
    process.env.ZWIFT_ENTRANTS_PATH ??
    "events/subgroups/entrants/{id}?type=all&participation=signed_up";
  const path = template.replace("{id}", encodeURIComponent(subgroupId));
  const url = new URL(`${apiBase()}/${path.replace(/^\/+/, "")}`);
  url.searchParams.set("limit", String(ENTRANTS_LIMIT));
  url.searchParams.set("start", String(start));
  return url.toString();
}

// Token-cache op moduleniveau; blijft binnen dezelfde server-instance bestaan.
let tokenCache: { accessToken: string; expiresAt: number } | null = null;

async function fetchToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    client_id: ZWIFT_CLIENT_ID,
    grant_type: "password",
    username: process.env.ZWIFT_USERNAME ?? "",
    password: process.env.ZWIFT_PASSWORD ?? "",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      ...ZWIFT_DEFAULT_HEADERS,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`Zwift-login mislukt (status ${response.status}).`);
  }
  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new Error("Zwift-login leverde geen token op.");
  }
  tokenCache = {
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return json.access_token;
}

async function authedJson(url: string): Promise<unknown> {
  const token = await fetchToken();
  const response = await safeFetch(url, {
    cache: "no-store",
    headers: {
      ...ZWIFT_DEFAULT_HEADERS,
      accept: "application/json",
      "Zwift-Api-Version": ZWIFT_API_VERSION,
      authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Zwift-API gaf status ${response.status} voor ${url}.`);
  }
  return response.json();
}

// Haalt de events uit de member-feed. Feed-items wikkelen het event in `event`;
// een platte array of `{events|results}` wordt ook ondersteund.
function feedEventRows(payload: unknown): ZwiftEventApiRow[] {
  let items: unknown[] = [];
  if (Array.isArray(payload)) {
    items = payload;
  } else if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["data", "events", "results"]) {
      if (Array.isArray(record[key])) {
        items = record[key] as unknown[];
        break;
      }
    }
  }
  return items.map((item) => {
    const wrapped = (item as { event?: unknown }).event;
    return (wrapped ?? item) as ZwiftEventApiRow;
  });
}

/**
 * Haalt alle aankomende events uit de member-feed (geauthenticeerd), met per
 * event of het een ZWB-club-event is en hoeveel gevolgde renners zich inschreven.
 */
export async function fetchFeedEvents(): Promise<FeedEvent[]> {
  const payload = await authedJson(eventFeedUrl());
  return feedEventRows(payload).flatMap((row) => {
    const candidate = mapZwiftEventRow(row);
    if (!candidate) return [];
    const subgroupIds = (row.eventSubgroups ?? [])
      .map((subgroup) => (subgroup.id == null ? null : String(subgroup.id)))
      .filter((id): id is string => Boolean(id));
    const followeeSignups = Number(
      (row as Record<string, unknown>).followeeSignedUpCount ?? 0,
    );
    return [
      {
        candidate,
        subgroupIds,
        isClub: isZwbClubEvent(row),
        followeeSignups: Number.isFinite(followeeSignups) ? followeeSignups : 0,
      },
    ];
  });
}

/** Alleen de ZWB-club-events uit de feed (voor de diagnose). */
export async function fetchClubEvents(): Promise<ClubEventResult[]> {
  return (await fetchFeedEvents())
    .filter((event) => event.isClub)
    .map(({ candidate, subgroupIds }) => ({ candidate, subgroupIds }));
}

type EntrantRow = {
  id?: number | string;
  profileId?: number | string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  subgroupLabel?: string | null;
  label?: string | null;
};

function entrantName(row: EntrantRow): string {
  if (row.name && row.name.trim()) return row.name.trim();
  return [row.firstName, row.lastName]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

async function fetchEntrantPage(subgroupId: string, start: number, strict: boolean): Promise<EntrantRow[]> {
  const payload = await authedJson(entrantsUrl(subgroupId, start));
  if (Array.isArray(payload)) return payload as EntrantRow[];
  const entrants = (payload as { entrants?: unknown } | null)?.entrants;
  if (Array.isArray(entrants)) return entrants as EntrantRow[];
  if (strict) throw new Error("Onbekend Zwift-startlijstformaat.");
  return [];
}

/** Alle pagina's van één subgroep, met dubbelingen (de aanroeper ontdubbelt). */
async function fetchAllEntrantRows(subgroupId: string, strict: boolean): Promise<EntrantRow[]> {
  const all: EntrantRow[] = [];
  let start = 0;
  for (let page = 0; page < ENTRANTS_MAX_PAGES; page++) {
    const rows = await fetchEntrantPage(subgroupId, start, strict);
    all.push(...rows);
    if (start > 0 || rows.length === ENTRANTS_LIMIT) {
      const offsets: number[] = [];
      for (let offset = ENTRANTS_OVERLAP_STEP; offset < ENTRANTS_LIMIT; offset += ENTRANTS_OVERLAP_STEP) {
        offsets.push(start + offset);
      }
      for (const extra of await Promise.all(offsets.map((o) => fetchEntrantPage(subgroupId, o, strict)))) {
        all.push(...extra);
      }
    }
    if (rows.length < ENTRANTS_LIMIT) break;
    start += rows.length;
  }
  return all;
}

/** Haalt de inschrijvers per subgroep op en dedupliceert op Zwift-ID. */
export async function fetchEntrants(subgroupIds: string[], options: { strict?: boolean } = {}): Promise<ClubEntrant[]> {
  const byId = new Map<string, ClubEntrant>();
  for (const subgroupId of subgroupIds) {
    let rows: EntrantRow[];
    try {
      rows = await fetchAllEntrantRows(subgroupId, Boolean(options.strict));
    } catch (error) {
      if (options.strict) throw error;
      continue; // Een kapotte subgroep mag de rest niet breken.
    }
    for (const row of rows) {
      const zwiftId = String(row.profileId ?? row.id ?? "").trim();
      const name = entrantName(row);
      if (options.strict && (!/^\d+$/.test(zwiftId) || !name)) throw new Error("Onvolledige Zwift-inschrijving.");
      if (!zwiftId || !name) continue;
      if (!byId.has(zwiftId)) {
        byId.set(zwiftId, {
          zwiftId,
          name,
          category: row.subgroupLabel ?? row.label ?? null,
        });
      }
    }
  }
  return [...byId.values()];
}

/** Alleen vaste, geautoriseerde leeseindpunten; accepteert nooit een externe URL. */
export async function fetchZwiftEvent(eventId: string): Promise<unknown> {
  if (!/^\d+$/.test(eventId)) throw new Error("Ongeldig Zwift-event-ID.");
  return authedJson(`${apiBase()}/events/${eventId}`);
}

export async function fetchZwiftRaceResults(eventId: string): Promise<unknown> {
  if (!/^\d+$/.test(eventId)) throw new Error("Ongeldig Zwift-event-ID.");
  return authedJson(`${apiBase()}/race-results/entries?event_id=${eventId}`);
}

export type SubgroupResult = { profileId: number; rank: number; durationMs: number | null };

/** Finishuitslag van één subgroep, per 50 (het maximum van Zwift). */
export async function fetchSubgroupResults(subgroupId: string): Promise<SubgroupResult[]> {
  if (!/^\d+$/.test(subgroupId)) throw new Error("Ongeldig subgroep-ID.");
  const results: SubgroupResult[] = [];
  for (let start = 0; start < 1000; start += 50) {
    const payload = await authedJson(
      `${apiBase()}/race-results/entries?event_subgroup_id=${subgroupId}&start=${start}&limit=50`,
    );
    const rows = (Array.isArray(payload)
      ? payload
      : ((payload as { entries?: unknown[] })?.entries ?? [])) as Array<Record<string, unknown>>;
    for (const row of rows) {
      const profileId = Number(row.profileId);
      const rank = Number(row.rank);
      if (!Number.isFinite(profileId) || !Number.isFinite(rank)) continue;
      const duration = Number((row.activityData as Record<string, unknown> | undefined)?.durationInMilliseconds);
      results.push({ profileId, rank, durationMs: Number.isFinite(duration) ? duration : null });
    }
    if (rows.length < 50) break;
  }
  return results.sort((a, b) => a.rank - b.rank);
}

/** "2026-09-22T12:00:00Z": ISO zonder milliseconden, zoals Sauce het stuurt. */
function zwiftDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, -5) + "Z";
}

/**
 * Segmentpassages van iedereen in het venster (protobuf). `world_id` is bij Zwift
 * altijd 1, ook buiten Watopia. Zonder `from` geeft Zwift het laatste uur.
 */
export async function fetchSegmentResultsRaw(
  segmentId: string,
  options: { from?: number; to?: number; athleteId?: number } = {},
): Promise<{ status: number; contentType: string; bytes: Uint8Array }> {
  if (!/^-?\d+$/.test(segmentId)) throw new Error("Ongeldig segment-ID.");
  const query = new URLSearchParams({ world_id: "1", segment_id: segmentId });
  if (options.athleteId) query.set("player_id", String(options.athleteId));
  // Zwift weigert milliseconden (400 zonder body, gemeten 2026-09-22).
  if (options.from) query.set("from", zwiftDate(options.from));
  if (options.to) query.set("to", zwiftDate(options.to));
  const token = await fetchToken();
  const response = await safeFetch(`${apiBase()}/segment-results?${query}`, {
    cache: "no-store",
    headers: {
      ...ZWIFT_DEFAULT_HEADERS,
      accept: "application/x-protobuf-lite",
      authorization: `Bearer ${token}`,
    },
  });
  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

export async function fetchSegmentResults(
  segmentId: string,
  options: { from?: number; to?: number; athleteId?: number } = {},
): Promise<SegmentResult[]> {
  const { status, bytes } = await fetchSegmentResultsRaw(segmentId, options);
  if (status !== 200) throw new Error(`Zwift-API gaf status ${status} voor segment ${segmentId}.`);
  return decodeSegmentResults(bytes);
}

/** Monceau Sprint (Parijs): druk bereden, en gebruikt in de meting van 2026-09-22. */
const PROBE_SEGMENT_ID = "1059797545";

/**
 * Diagnose voor het live ZRL-dashboard: mag het serviceaccount segmentresultaten
 * lezen, en klopt de veldindeling? Toont het ruwe eerste resultaat naast de
 * gedecodeerde waarden.
 */
export async function probeSegmentResults(): Promise<string> {
  const from = Date.now() - 60 * 60 * 1000;
  const { status, contentType, bytes } = await fetchSegmentResultsRaw(PROBE_SEGMENT_ID, { from });
  const lines = [`Status ${status}, ${contentType || "geen content-type"}, ${bytes.length} bytes.`];
  if (status !== 200) {
    lines.push(new TextDecoder().decode(bytes.subarray(0, 300)));
    return lines.join("\n");
  }
  let results: SegmentResult[];
  try {
    results = decodeSegmentResults(bytes);
  } catch (error) {
    lines.push(`Decoderen mislukt: ${error instanceof Error ? error.message : "onbekend"}.`);
    return lines.join("\n");
  }
  const riders = new Set(results.map((result) => result.athleteId)).size;
  const withSubgroup = results.filter((result) => result.eventSubgroupId).length;
  lines.push(`${results.length} passages van ${riders} renners in het laatste uur; ${withSubgroup} met een eventsubgroep.`);
  const first = results[0];
  if (first) {
    lines.push(
      `Eerste: renner ${first.athleteId}, ${new Date(first.ts).toISOString()}, ${first.elapsed} s, ${first.avgPower ?? "?"} W, segment ${first.segmentId}.`,
    );
    const raw = parseMessage(bytes).get(4)?.[0]?.bytes;
    if (raw) lines.push("Ruwe velden:", ...describeProtobuf(raw).map((line) => `  ${line}`));
  }
  return lines.join("\n");
}

/**
 * Wat geeft Zwift terug over het vermogen van één renner? Vraag van de eigenaar:
 * zFTP en zMAP per lid, voor de aanbevolen WTRL-divisie. Zwift documenteert dit
 * niet; deze probe probeert de kandidaat-endpoints en meldt per endpoint de
 * status, de velden die over vermogen of categorie gaan (met waarde) en de
 * overige veldnamen. Gewicht, leeftijd en andere persoonsgegevens alleen als
 * naam, nooit met waarde.
 */
export async function probeRiderPower(zwiftId: string): Promise<string> {
  if (!/^\d+$/.test(zwiftId)) throw new Error("Ongeldig Zwift-ID.");
  const candidates = [
    `${apiBase()}/profiles/${zwiftId}`,
    `${apiBase()}/power-curve/power-profile?profileId=${zwiftId}`,
    `${apiBase()}/power-curve/power-profile`,
  ];
  const lines: string[] = [];
  for (const url of candidates) {
    const path = url.slice(apiBase().length);
    try {
      const payload = await authedJson(url);
      lines.push(`${path}: OK`);
      lines.push(...describePowerFields(payload).map((line) => `  ${line}`));
    } catch (error) {
      lines.push(`${path}: ${error instanceof Error ? error.message : "mislukt"}`);
    }
  }
  return lines.join("\n");
}

const POWER_FIELD = /ftp|map|categor|racing|competition|power|vo2|score|cp/i;

export function describePowerFields(payload: unknown, prefix = "", depth = 0): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [`${prefix || "(waarde)"}: ${Array.isArray(payload) ? `lijst van ${payload.length}` : typeof payload}`];
  }
  const shown: string[] = [];
  const other: string[] = [];
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value) && depth < 2) {
      if (POWER_FIELD.test(key)) {
        shown.push(...describePowerFields(value, name, depth + 1));
      } else {
        other.push(`${name}{…}`);
      }
      continue;
    }
    if (POWER_FIELD.test(key) && (value === null || typeof value !== "object")) {
      shown.push(`${name} = ${JSON.stringify(value)}`);
    } else {
      other.push(name);
    }
  }
  if (other.length > 0) shown.push(`overige velden: ${other.join(", ")}`);
  return shown;
}

async function getMyProfileId(): Promise<string> {
  const me = await authedJson(`${apiBase()}/profiles/me`);
  return String((me as { id?: number | string })?.id ?? "");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Wie volgt het serviceaccount al? Voorkomt onnodige (rate-limited) follow-calls.
async function getFollowedIds(meId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let start = 0; start < 5000; start += 200) {
    let data: unknown;
    try {
      data = await authedJson(
        `${apiBase()}/profiles/${encodeURIComponent(meId)}/followees?start=${start}&limit=200`,
      );
    } catch {
      break;
    }
    const rows = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
    if (rows.length === 0) break;
    for (const row of rows) {
      const nested = row.followeeProfile as { id?: unknown } | undefined;
      const fid =
        row.followeeProfileId ?? nested?.id ?? row.profileId ?? row.id;
      if (fid != null) ids.add(String(fid));
    }
    if (rows.length < 200) break;
  }
  return ids;
}

export type FollowResult = {
  followed: number;
  alreadyFollowing: number;
  remaining: number;
  sample: string | null;
};

/**
 * Laat het serviceaccount de opgegeven Zwift-ID's volgen, zodat hun
 * inschrijvingen in de member-feed verschijnen. Slaat al gevolgde renners over,
 * throttelt om Zwift-rate-limits te ontzien, en stopt bij een 429 of als het
 * tijdsbudget op is — de rest wordt bij een volgende run opgepakt. Idempotent.
 */
export async function followZwbMembers(zwiftIds: string[]): Promise<FollowResult> {
  const meId = await getMyProfileId();
  if (!meId) throw new Error("Kon eigen Zwift-profiel niet ophalen.");
  const token = await fetchToken();
  const alreadyFollowing = await getFollowedIds(meId);

  const todo = zwiftIds
    .map((id) => id.trim())
    .filter((id) => id && id !== meId && !alreadyFollowing.has(id));

  const budgetMs = 7000;
  const startedAt = Date.now();
  let followed = 0;
  let sample: string | null = null;
  let index = 0;
  for (; index < todo.length; index += 1) {
    if (Date.now() - startedAt > budgetMs) break;
    const themId = todo[index];
    try {
      const response = await safeFetch(
        `${apiBase()}/profiles/${encodeURIComponent(meId)}/following/${encodeURIComponent(themId)}`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            ...ZWIFT_DEFAULT_HEADERS,
            accept: "application/json",
            "content-type": "application/json",
            "Zwift-Api-Version": ZWIFT_API_VERSION,
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ followeeId: themId, followerId: meId }),
        },
      );
      if (response.ok) {
        followed += 1;
      } else if (response.status === 429) {
        sample = "Zwift rate-limit (429) — rest volgt bij de volgende run.";
        break;
      } else if (!sample) {
        const text = (await response.text().catch(() => "")).slice(0, 160);
        sample = `id ${themId}: ${response.status} ${text}`;
      }
    } catch (error) {
      if (!sample) {
        sample = `id ${themId}: ${error instanceof Error ? error.message : "fout"}`;
      }
    }
    await sleep(400);
  }

  return {
    followed,
    alreadyFollowing: alreadyFollowing.size,
    remaining: todo.length - index,
    sample,
  };
}

/**
 * Eindcheck voor de beheerpagina: login, tel ZWB-club-events in de member-feed
 * en controleer of de entrants-endpoint bereikbaar is. Lekt geen secrets.
 */
export async function diagnoseZwiftClub(): Promise<string> {
  if (!zwiftClubConfigured()) {
    return "Zwift-clubkoppeling niet geconfigureerd (ZWIFT_USERNAME, ZWIFT_PASSWORD en ZWIFT_CLUB_ID ontbreken).";
  }
  try {
    await fetchToken();
  } catch (error) {
    return error instanceof Error
      ? `Zwift-login mislukt: ${error.message}`
      : "Zwift-login mislukt.";
  }

  let clubEvents: ClubEventResult[] = [];
  try {
    clubEvents = await fetchClubEvents();
  } catch (error) {
    return `Zwift-login gelukt, maar de event-feed ophalen mislukte: ${error instanceof Error ? error.message : "onbekend"}.`;
  }

  if (clubEvents.length === 0) {
    return "Zwift-login gelukt en de member-feed is bereikbaar, maar er staan nu geen aankomende ZWB-club-events in. Plan een clubrit op Zwift en test opnieuw.";
  }

  const first = clubEvents[0];
  let entrantCount = 0;
  try {
    entrantCount = (await fetchEntrants(first.subgroupIds)).length;
  } catch {
    // Entrants zijn optioneel voor de check; events vinden is het signaal.
  }
  return `Zwift-clubkoppeling werkt: ${clubEvents.length} aankomende ZWB-club-events gevonden. Eerste event "${first.candidate.title}" heeft ${entrantCount} ingeschreven renners zichtbaar.`;
}
