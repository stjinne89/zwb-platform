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

function entrantsUrl(subgroupId: string): string {
  const template =
    process.env.ZWIFT_ENTRANTS_PATH ??
    "events/subgroups/entrants/{id}?type=all&participation=signed_up";
  const path = template.replace("{id}", encodeURIComponent(subgroupId));
  return `${apiBase()}/${path.replace(/^\/+/, "")}`;
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

/** Haalt de inschrijvers per subgroep op en dedupliceert op Zwift-ID. */
export async function fetchEntrants(subgroupIds: string[]): Promise<ClubEntrant[]> {
  const byId = new Map<string, ClubEntrant>();
  for (const subgroupId of subgroupIds) {
    let payload: unknown;
    try {
      payload = await authedJson(entrantsUrl(subgroupId));
    } catch {
      continue; // Een kapotte subgroep mag de rest niet breken.
    }
    const rows = Array.isArray(payload)
      ? (payload as EntrantRow[])
      : ((payload as { entrants?: EntrantRow[] })?.entrants ?? []);
    for (const row of rows) {
      const zwiftId = String(row.profileId ?? row.id ?? "").trim();
      const name = entrantName(row);
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
