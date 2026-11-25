import "server-only";

// Live stand van een ladderrace laden: het event, de Zwift-data (15 s gecachet,
// zie loadLiveRaceData) en wie bij welke ploeg rijdt. Niets wordt bewaard; na
// de race geldt de uitslag van de ladder op de racepagina.

import { createAdminClient } from "@/lib/supabase/admin";
import { getClub } from "@/lib/club";
import { normalizeTeamName } from "@/lib/ladder";
import { routeSegments } from "@/lib/zwift/route-segments";
import { hasClubTag, loadLiveRaceData, pickSubgroup, subgroupSettled } from "@/lib/zrl-live/snapshot";
import { ladderChallengerFromTitle, ladderOpponentFromTitle } from "./fixture-events";
import {
  inLadderLiveWindow,
  LADDER_LIVE_LEAD_MS,
  ladderLive,
  splitLadderRiders,
  type LadderLive,
  type LadderLiveRider,
} from "./live";

export type LadderLiveView = {
  event: { id: string; title: string; startAt: number; ladderUrl: string | null };
  ours: string;
  theirs: string;
  /** Wij dagen uit (gelijk is verlies), zij dagen uit, of onbekend. */
  challenger: boolean | null;
  fetchedAt: number;
  live: LadderLive;
  /** Wie bij Zwift is ingeschreven, voor de startlijst. */
  riders: LadderLiveRider[];
  /** Profiel-ID per Zwift-ID, voor de link naar het ledenprofiel. */
  profiles: Record<string, string>;
  /** Zwift gaf de uitslag of een segment niet: de stand kan achterlopen. */
  incomplete: boolean;
  /** De route staat niet in de segmenttabel: alleen de finish, geen tussenstand. */
  noRoute: boolean;
};

export type LadderLiveOutcome =
  | { status: "ok"; view: LadderLiveView }
  | { status: "waiting"; event: { id: string; title: string; startAt: number }; liveFrom: number }
  | { status: "over"; event: { id: string; title: string; startAt: number } }
  | { status: "not-found" | "no-zwift-event" | "error" };

const positiveId = (value: unknown) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export async function loadLadderLive(eventId: string, now: number = Date.now()): Promise<LadderLiveOutcome> {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, title, type, start_at, team_id, zwift_event_id, external_url, club_ladder_fixture_id, club_ladder_opponent, teams(name)")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || event.type !== "ladder" || !event.team_id) return { status: "not-found" };
  if (!event.zwift_event_id) return { status: "no-zwift-event" };
  const startAt = Date.parse(event.start_at as string);
  const summary = { id: event.id as string, title: event.title as string, startAt };
  // Buiten het venster niets bij Zwift: ervoor is er niets te zien, erna de ladderuitslag.
  if (!inLadderLiveWindow(startAt, now)) {
    return now < startAt
      ? { status: "waiting", event: summary, liveFrom: startAt - LADDER_LIVE_LEAD_MS }
      : { status: "over", event: summary };
  }

  const team = [event.teams].flat()[0] as { name?: string } | null | undefined;
  const ours = team?.name ?? "";
  const theirs =
    (event.club_ladder_opponent as string | null) ?? ladderOpponentFromTitle(event.title as string, ours) ?? "Tegenstander";

  let data;
  try {
    data = await loadLiveRaceData(String(event.zwift_event_id));
  } catch {
    return { status: "error" };
  }

  const fixtureId = positiveId(event.club_ladder_fixture_id);
  const [{ data: signups }, { data: members }, club] = await Promise.all([
    fixtureId
      ? admin.from("club_ladder_fixture_signups").select("zwift_id, team").eq("fixture_id", fixtureId)
      : Promise.resolve({ data: [] as Array<{ zwift_id: unknown; team: string }> }),
    admin.from("team_members").select("profiles(zwift_id)").eq("team_id", event.team_id as string),
    getClub(),
  ]);
  const known = { ours: new Set<number>(), theirs: new Set<number>(), members: new Set<number>() };
  for (const row of (signups ?? []) as Array<{ zwift_id: unknown; team: string }>) {
    const id = positiveId(row.zwift_id);
    if (id) (normalizeTeamName(row.team) === normalizeTeamName(ours) ? known.ours : known.theirs).add(id);
  }
  for (const row of (members ?? []) as unknown as Array<{ profiles: unknown }>) {
    for (const profile of [row.profiles].flat() as Array<{ zwift_id?: string | null } | null>) {
      const id = positiveId(profile?.zwift_id);
      if (id) known.members.add(id);
    }
  }
  const teamTag = club.recognition.teamTag;
  const subgroup = pickSubgroup(data.subgroups, new Set([...known.ours, ...known.theirs, ...known.members]), new Set(), teamTag);
  if (!subgroup) return { status: "error" };

  const riders = splitLadderRiders(subgroup.entrants, known, (name) => hasClubTag(name, teamTag));
  const route = subgroup.routeId ? routeSegments(subgroup.routeId, subgroup.laps) : null;
  const challenger = ladderChallengerFromTitle(event.title as string, ours);
  const live = ladderLive({
    riders,
    route: (route ?? []).map(({ segmentId, name }) => ({ segmentId, name })),
    passages: data.passages,
    startAt: subgroup.startAt,
    results: subgroup.results.map((r) => ({ zwiftId: r.profileId, durationMs: r.durationMs })),
    final: subgroupSettled(subgroup, data.passages, data.fetchedAt),
    challenger,
  });

  const { data: profileRows } = riders.length
    ? await admin.from("profiles").select("id, zwift_id").in("zwift_id", riders.map((r) => String(r.zwiftId)))
    : { data: [] };
  const profiles: Record<string, string> = {};
  for (const row of (profileRows ?? []) as Array<{ id: string; zwift_id: string | null }>) {
    const id = positiveId(row.zwift_id);
    if (id) profiles[String(id)] = row.id;
  }

  return {
    status: "ok",
    view: {
      event: { ...summary, startAt: subgroup.startAt, ladderUrl: (event.external_url as string | null) ?? null },
      ours,
      theirs,
      challenger,
      fetchedAt: data.fetchedAt,
      live,
      riders,
      profiles,
      incomplete: !subgroup.resultsOk || !data.segmentsOk,
      noRoute: !route,
    },
  };
}
