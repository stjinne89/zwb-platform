import "server-only";

// Laadt de koppelingsrijen per lid, voor /beheer/koppelingen (alle goedgekeurde
// leden) en voor de pop-up "nog niet gekoppeld" (één lid, in de layout).
//
// Met de admin-client: deze tabellen zijn onder RLS alleen voor het lid zelf
// leesbaar. Daarom selecteren we nooit tokens, sleutels, chat-ID's of
// push-endpoints: alleen tijdstempels, foutteksten en wat de status bepaalt.
// Van een Telegram-koppeling gaat alleen "wel of niet" verder, van een
// pushabonnement alleen de user-agent (die member-overview tot een toesteltype
// terugbrengt).

import { CYCLING_SPORTS } from "@/lib/strava/sports";
import { stravaAthleteCap } from "@/lib/strava/sweep";
import type {
  AgendaInput,
  IntervalsInput,
  LiveInput,
  MemberIntegrationInput,
  PushInput,
  StravaInput,
  TelegramInput,
} from "@/lib/integrations/member-overview";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export type LoadedMember = {
  profileId: string;
  name: string;
  input: MemberIntegrationInput;
};

/** Zo ver terug zoeken we de laatste rit; ouder telt als "geen recente rit". */
const LAST_RIDE_WINDOW_DAYS = 120;
const PAGE = 1000;

type Query = {
  in: (column: string, values: string[]) => Query;
  range: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/**
 * Alle rijen van een query, in pagina's van 1000 (de PostgREST-grens). Met
 * `ids` alleen de rijen van die leden.
 */
async function allRows<T>(
  build: () => Query,
  ids: string[] | null,
  column = "profile_id",
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const query = ids ? build().in(column, ids) : build();
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) return { rows, error: error.message };
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE) return { rows, error: null };
  }
}

function groupBy<T extends { profile_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.profile_id);
    if (list) list.push(row);
    else map.set(row.profile_id, [row]);
  }
  return map;
}

async function loadIntervals(admin: Admin, ids: string[] | null) {
  const full = await allRows<IntervalsInput & { profile_id: string }>(
    () =>
      admin
        .from("intervals_connections")
        .select(
          "profile_id, athlete_id, created_at, last_synced_at, last_ride_sync_error, visit_confirmed_at, wellness_opt_in, rides_via_intervals",
        ),
    ids,
  );
  if (!full.error) return full.rows;
  // Zonder de latere kolommen (0056, 0198, 0299) toch de koppeling zelf tonen.
  const base = await allRows<{
    profile_id: string;
    athlete_id: string | null;
    created_at: string | null;
    last_synced_at: string | null;
  }>(
    () => admin.from("intervals_connections").select("profile_id, athlete_id, created_at, last_synced_at"),
    ids,
  );
  return base.rows.map((row) => ({
    ...row,
    last_ride_sync_error: null,
    visit_confirmed_at: null,
    wellness_opt_in: null,
    rides_via_intervals: null,
  }));
}

async function loadLastRides(admin: Admin, now: Date, ids: string[] | null): Promise<Map<string, string>> {
  const since = new Date(now.getTime() - LAST_RIDE_WINDOW_DAYS * 86_400_000).toISOString();
  const { rows } = await allRows<{ profile_id: string; start_date: string }>(
    () =>
      admin
        .from("strava_activities")
        .select("profile_id, start_date")
        .gte("start_date", since)
        .in("sport_type", CYCLING_SPORTS)
        .order("start_date", { ascending: false }),
    ids,
  );
  const last = new Map<string, string>();
  for (const row of rows) {
    const current = last.get(row.profile_id);
    if (!current || row.start_date > current) last.set(row.profile_id, row.start_date);
  }
  return last;
}

/**
 * De koppelingsrijen van goedgekeurde leden, op naam gesorteerd. Zonder
 * `profileIds` alle leden.
 */
export async function loadMemberIntegrationInputs(
  admin: Admin,
  options: { profileIds?: string[]; now?: Date } = {},
): Promise<LoadedMember[]> {
  const ids = options.profileIds ?? null;
  const now = options.now ?? new Date();
  if (ids && ids.length === 0) return [];

  const [profiles, strava, intervals, telegram, push, agenda, live, lastRides] = await Promise.all([
    allRows<{
      id: string;
      display_name: string | null;
      zwift_id: string | number | null;
      zwift_opt_out: boolean | null;
    }>(
      () =>
        admin
          .from("profiles")
          .select("id, display_name, zwift_id, zwift_opt_out")
          .eq("is_approved", true)
          .order("display_name", { ascending: true }),
      ids,
      "id",
    ),
    allRows<StravaInput & { profile_id: string }>(
      () =>
        admin
          .from("strava_connections")
          .select(
            "profile_id, connected_at, last_synced_at, scope, revoked_at, revoked_reason, inactivity_warned_at, consecutive_failures, last_error, last_error_at",
          ),
      ids,
    ),
    loadIntervals(admin, ids),
    allRows<{
      profile_id: string;
      chat_id: number | string | null;
      linked_at: string | null;
      link_token_expires_at: string | null;
    }>(() => admin.from("telegram_links").select("profile_id, chat_id, linked_at, link_token_expires_at"), ids),
    allRows<PushInput & { profile_id: string }>(
      () => admin.from("push_subscriptions").select("profile_id, user_agent, created_at, last_used_at"),
      ids,
    ),
    allRows<AgendaInput & { profile_id: string }>(
      () => admin.from("calendar_feed_tokens").select("profile_id, created_at, last_fetched_at"),
      ids,
    ),
    allRows<LiveInput & { profile_id: string }>(
      () =>
        admin
          .from("live_tracker_tokens")
          .select("profile_id, provider, enabled, last_seen_at, last_checked_at")
          .is("revoked_at", null),
      ids,
    ),
    loadLastRides(admin, now, ids),
  ]);

  if (profiles.error) throw new Error(profiles.error);

  const zwiftIds = profiles.rows
    .map((profile) => (profile.zwift_id == null ? "" : String(profile.zwift_id).trim()))
    .filter((id) => /^\d+$/.test(id));
  const refused = new Set<string>();
  if (zwiftIds.length > 0) {
    const { rows } = await allRows<{ zwift_id: number | string }>(
      () => admin.from("zwift_race_score_sync").select("zwift_id").eq("refused", true),
      ids ? zwiftIds : null,
      "zwift_id",
    );
    for (const row of rows) refused.add(String(row.zwift_id));
  }

  const stravaBy = new Map(strava.rows.map((row) => [row.profile_id, row]));
  const intervalsBy = new Map(intervals.map((row) => [row.profile_id, row]));
  const telegramBy = new Map(
    telegram.rows.map((row): [string, TelegramInput] => [
      row.profile_id,
      {
        // Het chatnummer zelf blijft hier: alleen of het er is.
        linked: row.chat_id != null,
        linked_at: row.linked_at,
        link_token_expires_at: row.link_token_expires_at,
      },
    ]),
  );
  const pushBy = groupBy(push.rows);
  const agendaBy = new Map(agenda.rows.map((row) => [row.profile_id, row]));
  const liveBy = groupBy(live.rows);

  return profiles.rows.map((profile): LoadedMember => {
    const zwiftId = profile.zwift_id == null ? null : String(profile.zwift_id).trim() || null;
    return {
      profileId: profile.id,
      name: profile.display_name?.trim() || "Onbekend lid",
      input: {
        zwiftId,
        zwiftOptOut: Boolean(profile.zwift_opt_out),
        zwiftRefused: zwiftId != null && refused.has(zwiftId),
        strava: stravaBy.get(profile.id) ?? null,
        intervals: intervalsBy.get(profile.id) ?? null,
        telegram: telegramBy.get(profile.id) ?? null,
        push: pushBy.get(profile.id) ?? [],
        agenda: agendaBy.get(profile.id) ?? null,
        live: liveBy.get(profile.id) ?? [],
        lastRideAt: lastRides.get(profile.id) ?? null,
      },
    };
  });
}

/** Alle Strava-plekken bezet: een nieuwe koppeling zou Strava weigeren. */
export async function stravaCapIsFull(admin: Admin): Promise<boolean> {
  const { count, error } = await admin
    .from("strava_connections")
    .select("profile_id", { count: "exact", head: true })
    .is("revoked_at", null);
  if (error) return false;
  return (count ?? 0) >= stravaAthleteCap();
}

export type NoticeSummary = {
  createdAt: string;
  seenAt: string | null;
  resolvedAt: string | null;
};

/** De laatste pop-up per lid en koppeling; leeg zolang 0307 er niet is. */
export async function loadLatestNotices(
  admin: Admin,
): Promise<Map<string, Partial<Record<string, NoticeSummary>>>> {
  const map = new Map<string, Partial<Record<string, NoticeSummary>>>();
  const { rows, error } = await allRows<{
    profile_id: string;
    integration: string;
    created_at: string;
    seen_at: string | null;
    resolved_at: string | null;
  }>(
    () =>
      admin
        .from("integration_notices")
        .select("profile_id, integration, created_at, seen_at, resolved_at")
        .order("created_at", { ascending: false }),
    null,
  );
  if (error) return map;
  for (const row of rows) {
    const byKey = map.get(row.profile_id) ?? {};
    if (!byKey[row.integration]) {
      byKey[row.integration] = { createdAt: row.created_at, seenAt: row.seen_at, resolvedAt: row.resolved_at };
    }
    map.set(row.profile_id, byKey);
  }
  return map;
}
