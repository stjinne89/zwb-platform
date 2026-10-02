// Haalt de uitslagen van gereden SRC-races op (migr. 0202). Draait mee in de
// cron van /api/src/sync en achter de knop op /beheer/src.
//
// Per race: eerst de race in de uitslagenlijst zoeken (op zondag en geslacht,
// want de id's verschillen van die in de agenda), dan de uitslag, en die in één
// keer vervangen. Tot MyWhoosh de uitslag officieel noemt, gebeurt dat hooguit
// eens per drie uur, twee weken lang.

import type { SupabaseClient } from "@supabase/supabase-js";
import { safeFetch } from "@/lib/net/safe-fetch";
import type { SrcGender } from "@/lib/src/feed";
import {
  findSrcResultEvent,
  oldestListDay,
  parseSrcResults,
  SRC_RESULTS_API,
  srcRelevantResults,
  srcTeamStandings,
  type SrcApiResultRow,
  type SrcListEvent,
  type SrcMatchProfile,
} from "@/lib/src/results";

/** Na de start van cat 6 duurt het zo lang voor de laatsten binnen zijn. */
const RESULTS_AFTER_START_MS = 2 * 3600_000;
const RESYNC_MS = 3 * 3600_000;
const GIVE_UP_MS = 14 * 86400_000;
const MAX_LIST_PAGES = 15;
export const SRC_RESULTS_BUDGET_MS = 18000;

export type SrcPost = (path: string, body: Record<string, unknown>) => Promise<unknown>;

async function defaultPost(path: string, body: Record<string, unknown>) {
  const response = await safeFetch(`${SRC_RESULTS_API}/${path}`, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`MyWhoosh gaf status ${response.status}.`);
  return response.json();
}

type RaceRow = {
  event_id: string;
  sunday: string;
  gender: SrcGender;
  results_status: string | null;
  results_synced_at: string | null;
  events: { start_at: string } | { start_at: string }[] | null;
};

export type SrcResultsSyncResult = {
  synced: number;
  pending: number;
  notes: string[];
};

/** Moet deze race (nog eens) opgehaald worden? */
export function srcRaceNeedsResults(
  race: { results_status: string | null; results_synced_at: string | null },
  startAt: string,
  now: Date,
) {
  const start = new Date(startAt).getTime();
  const t = now.getTime();
  if (t < start + RESULTS_AFTER_START_MS || t > start + GIVE_UP_MS) return false;
  if (race.results_status === "official") return false;
  if (!race.results_synced_at) return true;
  return t - new Date(race.results_synced_at).getTime() >= RESYNC_MS;
}

export async function syncSrcResults(
  admin: SupabaseClient,
  options: { now?: Date; post?: SrcPost; force?: boolean } = {},
): Promise<SrcResultsSyncResult> {
  const now = options.now ?? new Date();
  const post = options.post ?? defaultPost;
  const deadline = Date.now() + SRC_RESULTS_BUDGET_MS;
  const result: SrcResultsSyncResult = { synced: 0, pending: 0, notes: [] };

  const since = new Date(now.getTime() - GIVE_UP_MS).toISOString().slice(0, 10);
  const { data: raceRows, error } = await admin
    .from("src_races")
    .select("event_id, sunday, gender, results_status, results_synced_at, events(start_at)")
    .gte("sunday", since);
  if (error) throw new Error(error.message);
  const due = ((raceRows ?? []) as unknown as RaceRow[])
    .map((race) => {
      const event = Array.isArray(race.events) ? race.events[0] : race.events;
      return { race, startAt: event?.start_at ?? `${race.sunday}T07:25:00Z` };
    })
    .filter(({ race, startAt }) =>
      options.force
        ? new Date(startAt).getTime() + RESULTS_AFTER_START_MS <= now.getTime() &&
          race.results_status !== "official"
        : srcRaceNeedsResults(race, startAt, now),
    )
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
  if (due.length === 0) return result;

  const [{ data: teamRows }, { data: profileRows }] = await Promise.all([
    admin.from("teams").select("mywhoosh_team_name").eq("type", "src"),
    admin.from("profiles").select("id, display_name, mywhoosh_id").eq("is_approved", true),
  ]);
  const teamNames = ((teamRows ?? []) as Array<{ mywhoosh_team_name: string | null }>)
    .map((row) => row.mywhoosh_team_name)
    .filter((name): name is string => Boolean(name));
  const profiles = (profileRows ?? []) as SrcMatchProfile[];

  // De uitslagenlijst, gedeeld over alle races van deze run.
  const list: SrcListEvent[] = [];
  let page = 0;
  let exhausted = false;
  async function findEvent(sunday: string, gender: SrcGender) {
    for (;;) {
      const found = findSrcResultEvent(list, sunday, gender);
      if (found) return found;
      const oldest = oldestListDay(list);
      if (exhausted || page >= MAX_LIST_PAGES || (oldest !== null && oldest < sunday)) return null;
      page += 1;
      const payload = (await post("src-events-list", { page })) as {
        data?: { data?: SrcListEvent[] };
      };
      const rows = payload?.data?.data;
      if (!Array.isArray(rows) || rows.length === 0) exhausted = true;
      else list.push(...rows);
    }
  }

  for (const { race } of due) {
    if (Date.now() > deadline) {
      result.pending += 1;
      continue;
    }
    try {
      const event = await findEvent(race.sunday, race.gender);
      if (!event) {
        result.notes.push(`Nog geen uitslag voor ${race.sunday} (${race.gender}).`);
        await admin
          .from("src_races")
          .update({ results_synced_at: now.toISOString(), results_error: null })
          .eq("event_id", race.event_id);
        continue;
      }
      const payload = (await post("getEventResults", {
        eventId: event.eventId,
        dayId: event.dayId,
        leaderboardType: "individual",
      })) as { data?: { resultData?: SrcApiResultRow[] } };
      const rows = payload?.data?.resultData;
      if (!Array.isArray(rows)) throw new Error("Uitslag zonder renners.");
      const parsed = parseSrcResults(rows);
      const stored = srcRelevantResults(parsed, teamNames, profiles);
      const teams = srcTeamStandings(parsed);
      const { error: replaceError } = await admin.rpc("src_replace_results", {
        p_event_id: race.event_id,
        p_result_event_id: event.eventId,
        p_status: event.status,
        p_rows: stored.map((row) => ({
          mywhoosh_user_id: row.userId,
          name: row.name,
          mywhoosh_team_id: row.teamId,
          team_name: row.teamName,
          category: row.category,
          category_rank: row.categoryRank,
          finished_ms: row.finishedMs,
          gap_ms: row.gapMs,
          status: row.status,
          profile_id: row.profileId,
          suggested_profile_id: row.suggestedProfileId,
        })),
        p_teams: teams.map((team) => ({
          category: team.category,
          mywhoosh_team_id: team.teamId,
          team_name: team.teamName,
          time_ms: team.timeMs,
          rank: team.rank,
          finishers: team.finishers,
        })),
      });
      if (replaceError) throw new Error(replaceError.message);
      result.synced += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Uitslag ophalen mislukt.";
      result.notes.push(`${race.sunday} (${race.gender}): ${message}`);
      await admin
        .from("src_races")
        .update({ results_synced_at: now.toISOString(), results_error: message })
        .eq("event_id", race.event_id);
    }
  }
  return result;
}
