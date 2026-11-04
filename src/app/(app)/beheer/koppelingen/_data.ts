import "server-only";

// Laadt per goedgekeurd lid de koppelingsrijen voor /beheer/koppelingen.
//
// Met de admin-client: deze tabellen zijn onder RLS alleen voor het lid zelf
// leesbaar. Daarom selecteren we nooit tokens, sleutels, chat-ID's of
// push-endpoints: alleen tijdstempels, foutteksten en wat de status bepaalt.
// Van een Telegram-koppeling gaat alleen "wel of niet" de deur uit, van een
// pushabonnement alleen het grove toesteltype (lib/integrations/member-overview).

import { createAdminClient } from "@/lib/supabase/admin";
import { lastSeenByProfile } from "@/lib/strava/sweep";
import { CYCLING_SPORTS } from "@/lib/strava/sports";
import {
  memberIntegrations,
  memberRideSource,
  worstState,
  compareStates,
  type AgendaInput,
  type IntegrationState,
  type IntegrationStatus,
  type IntervalsInput,
  type LiveInput,
  type MemberIntegrationInput,
  type PushInput,
  type StravaInput,
  type TelegramInput,
} from "@/lib/integrations/member-overview";
import type { RideSource } from "@/lib/intervals/rides";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export type MemberIntegrationRow = {
  profileId: string;
  name: string;
  state: IntegrationState;
  lastSeen: string | null;
  lastRideAt: string | null;
  rideSource: RideSource;
  integrations: IntegrationStatus[];
};

/** Zo ver terug zoeken we de laatste rit; ouder telt als "geen recente rit". */
const LAST_RIDE_WINDOW_DAYS = 120;
const PAGE = 1000;

/** Alle rijen van een query, in pagina's van 1000 (de PostgREST-grens). */
async function allRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
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

async function loadIntervals(admin: Admin) {
  const full = await allRows<IntervalsInput & { profile_id: string }>((from, to) =>
    admin
      .from("intervals_connections")
      .select(
        "profile_id, athlete_id, created_at, last_synced_at, last_ride_sync_error, visit_confirmed_at, wellness_opt_in, rides_via_intervals",
      )
      .range(from, to),
  );
  if (!full.error) return full.rows;
  // Zonder de latere kolommen (0056, 0198, 0299) toch de koppeling zelf tonen.
  const base = await allRows<{ profile_id: string; athlete_id: string | null; created_at: string | null; last_synced_at: string | null }>(
    (from, to) =>
      admin
        .from("intervals_connections")
        .select("profile_id, athlete_id, created_at, last_synced_at")
        .range(from, to),
  );
  return base.rows.map((row) => ({
    ...row,
    last_ride_sync_error: null,
    visit_confirmed_at: null,
    wellness_opt_in: null,
    rides_via_intervals: null,
  }));
}

async function loadLastRides(admin: Admin, now: Date): Promise<Map<string, string>> {
  const since = new Date(now.getTime() - LAST_RIDE_WINDOW_DAYS * 86_400_000).toISOString();
  const { rows } = await allRows<{ profile_id: string; start_date: string }>((from, to) =>
    admin
      .from("strava_activities")
      .select("profile_id, start_date")
      .gte("start_date", since)
      .in("sport_type", CYCLING_SPORTS)
      .order("start_date", { ascending: false })
      .range(from, to),
  );
  const last = new Map<string, string>();
  for (const row of rows) {
    const current = last.get(row.profile_id);
    if (!current || row.start_date > current) last.set(row.profile_id, row.start_date);
  }
  return last;
}

export async function loadMemberIntegrations(now = new Date()): Promise<MemberIntegrationRow[]> {
  const admin = createAdminClient();

  const [
    profiles,
    strava,
    intervals,
    telegram,
    push,
    agenda,
    live,
    zwiftRefused,
    lastRides,
    lastSeen,
  ] = await Promise.all([
    allRows<{ id: string; display_name: string | null; zwift_id: string | number | null }>((from, to) =>
      admin
        .from("profiles")
        .select("id, display_name, zwift_id")
        .eq("is_approved", true)
        .order("display_name", { ascending: true })
        .range(from, to),
    ),
    allRows<StravaInput & { profile_id: string }>((from, to) =>
      admin
        .from("strava_connections")
        .select(
          "profile_id, connected_at, last_synced_at, scope, revoked_at, revoked_reason, inactivity_warned_at, consecutive_failures, last_error, last_error_at",
        )
        .range(from, to),
    ),
    loadIntervals(admin),
    allRows<{
      profile_id: string;
      chat_id: number | string | null;
      linked_at: string | null;
      link_token_expires_at: string | null;
    }>((from, to) =>
      admin
        .from("telegram_links")
        .select("profile_id, chat_id, linked_at, link_token_expires_at")
        .range(from, to),
    ),
    allRows<PushInput & { profile_id: string }>((from, to) =>
      admin
        .from("push_subscriptions")
        .select("profile_id, user_agent, created_at, last_used_at")
        .range(from, to),
    ),
    allRows<AgendaInput & { profile_id: string }>((from, to) =>
      admin
        .from("calendar_feed_tokens")
        .select("profile_id, created_at, last_fetched_at")
        .range(from, to),
    ),
    allRows<LiveInput & { profile_id: string; revoked_at: string | null }>((from, to) =>
      admin
        .from("live_tracker_tokens")
        .select("profile_id, provider, enabled, last_seen_at, last_checked_at, revoked_at")
        .is("revoked_at", null)
        .range(from, to),
    ),
    allRows<{ zwift_id: number | string }>((from, to) =>
      admin
        .from("zwift_race_score_sync")
        .select("zwift_id")
        .eq("refused", true)
        .range(from, to),
    ),
    loadLastRides(admin, now),
    lastSeenByProfile(admin),
  ]);

  if (profiles.error) throw new Error(profiles.error);

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
  const refused = new Set(zwiftRefused.rows.map((row) => String(row.zwift_id)));

  const members = profiles.rows.map((profile): MemberIntegrationRow => {
    const zwiftId = profile.zwift_id == null ? null : String(profile.zwift_id).trim() || null;
    const input: MemberIntegrationInput = {
      zwiftId,
      zwiftRefused: zwiftId != null && refused.has(zwiftId),
      strava: stravaBy.get(profile.id) ?? null,
      intervals: intervalsBy.get(profile.id) ?? null,
      telegram: telegramBy.get(profile.id) ?? null,
      push: pushBy.get(profile.id) ?? [],
      agenda: agendaBy.get(profile.id) ?? null,
      live: liveBy.get(profile.id) ?? [],
      lastRideAt: lastRides.get(profile.id) ?? null,
    };
    const integrations = memberIntegrations(input, now);
    return {
      profileId: profile.id,
      name: profile.display_name?.trim() || "Onbekend lid",
      state: worstState(integrations),
      lastSeen: lastSeen?.byProfile.get(profile.id) ?? null,
      lastRideAt: input.lastRideAt,
      rideSource: memberRideSource(input),
      integrations,
    };
  });

  return members.sort(
    (a, b) => compareStates(a.state, b.state) || a.name.localeCompare(b.name, "nl"),
  );
}
