// Live ZRL-stand voor één ZWB-teamevent: Zwift-data ophalen en doorrekenen.
//
// Tijdens de race wordt niets opgeslagen. De Zwift-kant is 15 s gecachet per
// Zwift-event, dus de belasting op Zwift is gelijk bij één of duizend kijkers
// (hetzelfde patroon als src/lib/live/external-timing.ts). Is de race gereden en
// de stand definitief, dan bevriest deze module één regel: de plaats van ons
// team (migr. 0188), zodat de raceweekpagina die kan tonen zonder Zwift opnieuw
// te bevragen; de cron `/api/zrl/freeze` zorgt dat dat ook gebeurt als niemand
// kijkt. Zie docs/live-zrl-dashboard.md.

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchEntrants,
  fetchSegmentResults,
  fetchSubgroupResults,
  fetchZwiftEvent,
  type SubgroupResult,
} from "@/lib/events/zwift-club";
import { routeSegments } from "@/lib/zwift/route-segments";
import { scoreRace, type Passage, type Rider, type ScoreResult } from "@/lib/zrl-live/scoring";
import { extractTeamTag, pickTeamLabel, teamKey, zrlLeagueKey } from "@/lib/zrl-live/team-tags";
import { freezeZrlTeamResult } from "@/lib/zrl-live/team-result";

/** Geen nieuwe passage of uitslag meer: dan noemen we de stand definitief. */
const QUIET_BEFORE_FINAL_MS = 15 * 60 * 1000;

/**
 * Tot hoe lang na de laatste subgroepstart passages meetellen. Een ZRL-race duurt
 * ongeveer drie kwartier (de traagste finisher van 22 september: 58 minuten).
 * Daarna halen we een vast venster op in plaats van "tot nu": wie dagen later
 * over hetzelfde segment rijdt, verandert de uitslag niet meer, en er komen geen
 * tienduizenden passages van de rest van de wereld mee.
 */
export const RACE_WINDOW_MS = 2 * 60 * 60 * 1000;

type ZwiftSubgroup = {
  id: string;
  label: string;
  startAt: number;
  routeId: string | null;
  laps: number;
};

type RaceData = {
  fetchedAt: number;
  eventName: string;
  subgroups: Array<
    ZwiftSubgroup & {
      entrants: Array<{ zwiftId: string; name: string }>;
      results: SubgroupResult[];
      /** Zwift gaf de uitslag zonder fout (leeg kan ook: nog niemand binnen). */
      resultsOk: boolean;
    }
  >;
  passages: Passage[];
  /** Alle segmenten van de route kwamen zonder fout terug. */
  segmentsOk: boolean;
};

function toMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseSubgroups(event: unknown): ZwiftSubgroup[] {
  const rows = ((event as { eventSubgroups?: unknown[] })?.eventSubgroups ?? []) as Array<Record<string, unknown>>;
  return rows.flatMap((row) => {
    const startAt = toMs(row.eventSubgroupStart);
    if (row.id == null || startAt == null) return [];
    return [{
      id: String(row.id),
      label: String(row.subgroupLabel ?? ""),
      startAt,
      routeId: row.routeId == null ? null : String(row.routeId),
      laps: Number(row.laps) || 1,
    }];
  });
}

async function fetchRaceData(zwiftEventId: string): Promise<RaceData> {
  const zwiftEvent = await fetchZwiftEvent(zwiftEventId);
  const subgroups = parseSubgroups(zwiftEvent);
  const withRiders = await Promise.all(
    subgroups.map(async (subgroup) => {
      const [entrants, outcome] = await Promise.all([
        fetchEntrants([subgroup.id]),
        // Een haperende uitslag mag de live stand niet breken, maar mag ook niet
        // stil als "nog niemand binnen" gelden: dan zou er bevroren worden.
        fetchSubgroupResults(subgroup.id).then(
          (results) => ({ results, resultsOk: true }),
          () => ({ results: [] as SubgroupResult[], resultsOk: false }),
        ),
      ]);
      return { ...subgroup, entrants: entrants.map(({ zwiftId, name }) => ({ zwiftId, name })), ...outcome };
    }),
  );

  const occupied = withRiders.filter((subgroup) => subgroup.entrants.length > 0);
  const entrantIds = new Set(occupied.flatMap((s) => s.entrants.map((e) => Number(e.zwiftId))));
  const segmentIds = new Set<string>();
  for (const subgroup of occupied) {
    for (const ref of (subgroup.routeId && routeSegments(subgroup.routeId, subgroup.laps)) || []) {
      segmentIds.add(ref.segmentId);
    }
  }
  const from = Math.min(...occupied.map((s) => s.startAt));
  const windowEnd = Math.max(...occupied.map((s) => s.startAt)) + RACE_WINDOW_MS;
  // Tijdens de race geeft Zwift zonder `to` alles tot nu; daarna een vast venster.
  const to = Date.now() > windowEnd ? windowEnd : undefined;
  const passages: Passage[] = [];
  let segmentsOk = true;
  if (Number.isFinite(from) && Date.now() > from) {
    const settled = await Promise.allSettled(
      [...segmentIds].map((segmentId) => fetchSegmentResults(segmentId, { from, to })),
    );
    // Eén haperend segment mag de live stand niet breken; allemaal wel een fout.
    // Bevriezen mag dan niet: de punten van dat segment ontbreken.
    const failed = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed && settled.every((r) => r.status === "rejected")) throw failed.reason;
    segmentsOk = !failed;
    const perSegment = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    for (const result of perSegment.flat()) {
      if (!entrantIds.has(result.athleteId)) continue;
      passages.push({
        id: result.id,
        athleteId: result.athleteId,
        segmentId: result.segmentId,
        ts: result.ts,
        elapsed: result.elapsed,
      });
    }
  }
  const eventName = String((zwiftEvent as { name?: unknown })?.name ?? "");
  return { fetchedAt: Date.now(), eventName, subgroups: withRiders, passages, segmentsOk };
}

// Versie in de sleutel: Netlify bewaart deze cache over deploys heen.
const fetchCachedRaceData = unstable_cache(fetchRaceData, ["zrl-live-race", "v3"], { revalidate: 15 });

/**
 * Verversen op de achtergrond kan stil mislukken; Next blijft dan oude data geven
 * (gezien 2026-09-22: na een deploy bleef "bijgewerkt" op één tijd staan). Is de
 * cache ouder dan dit, dan halen we direct op, en een fout wordt zichtbaar.
 */
const MAX_CACHE_AGE_MS = 60 * 1000;

export type ZrlLiveView = {
  event: { id: string; title: string; teamName: string | null; zwiftEventId: string };
  subgroupLabel: string;
  startAt: number;
  fetchedAt: number;
  /** Onze team-sleutel in `score.teams`. */
  ownTeam: string | null;
  ownRiders: number[];
  /** Waaronder een teambijstelling bewaard wordt. */
  leagueKey: string;
  /** Alle inschrijvers van onze subgroep, ook zonder punten. */
  entrants: Rider[];
  /** Teamsleutel → weergavenaam (eigen teamnaam, anders de eerste tag zoals getypt). */
  teamLabels: Record<string, string>;
  score: ScoreResult;
  /** Uitslag en alle segmenten kwamen zonder fout van Zwift; voorwaarde om te bevriezen. */
  complete: boolean;
};

export type ZrlLiveOutcome =
  | { status: "ok"; view: ZrlLiveView; /** Wat het bevriezen deed, of waarom niet. */ freeze?: string }
  | { status: "not-found" | "no-zwift-event" | "no-route" | "error"; message?: string };

function addZwiftIds(ids: Set<number>, rows: unknown) {
  // Supabase typeert een to-one-join soms als lijst.
  for (const row of [rows].flat() as Array<{ zwift_id?: string | null } | null>) {
    const id = Number(row?.zwift_id);
    if (id) ids.add(id);
  }
}

/**
 * Onze renners: WTRL-renners en leden van het team, plus de opstelling van dit
 * event of van het hoofdevent van de raceweek (daar staat die sinds migr. 0178).
 */
async function ownZwiftIds(teamId: string | null, eventIds: string[]): Promise<Set<number>> {
  if (!teamId) return new Set();
  const admin = createAdminClient();
  const ids = new Set<number>();
  const { data: lineup } = await admin
    .from("team_event_lineups")
    .select("profiles!team_event_lineups_profile_id_fkey(zwift_id), roster_entries(zwift_id)")
    .in("event_id", eventIds)
    .eq("team_id", teamId);
  for (const row of (lineup ?? []) as unknown as Array<{ profiles: unknown; roster_entries: unknown }>) {
    addZwiftIds(ids, row.profiles);
    addZwiftIds(ids, row.roster_entries);
  }
  const { data: wtrl } = await admin.from("wtrl_teams").select("trc_ref").eq("team_id", teamId);
  const refs = (wtrl ?? []).map((row) => row.trc_ref as string);
  if (refs.length) {
    const { data } = await admin.from("wtrl_team_riders").select("zwift_id").in("trc_ref", refs);
    for (const row of data ?? []) ids.add(Number(row.zwift_id));
  }
  const { data: members } = await admin
    .from("team_members")
    .select("profiles(zwift_id)")
    .eq("team_id", teamId);
  for (const row of (members ?? []) as unknown as Array<{ profiles: unknown }>) {
    addZwiftIds(ids, row.profiles);
  }
  return ids;
}

/** "Linda Kuiper [ZWB]", "Femke Vaessen [ZWB-Synergy]". */
function hasZwbTag(name: string): boolean {
  return teamKey(extractTeamTag(name) ?? "").split(" ").includes("zwb");
}

/**
 * Onze subgroep: waar de meeste renners staan die we als eigen kennen óf die
 * "ZWB" in hun teamtag hebben; zonder zulke renners de eerste met inschrijvers.
 */
export function pickSubgroup<T extends { entrants: Array<{ zwiftId: string; name: string }> }>(
  subgroups: T[],
  own: Set<number>,
): T | undefined {
  const occupied = subgroups.filter((s) => s.entrants.length > 0);
  // Eigen renner of ZWB-tag, elk één keer: één verkeerd gekoppelde "Femke" in A
  // mag niet winnen van vier ZWB'ers in B (Zwiftladies B, 2026-09-22).
  const score = (s: T) =>
    s.entrants.filter((e) => own.has(Number(e.zwiftId)) || hasZwbTag(e.name)).length;
  // Bij gelijkspel de groep met onze eigen renners. Twee ZWB-ploegen kunnen in
  // hetzelfde Zwift-event zitten: A in groep A en B1 in groep B (Open Aqua
  // Division 1, 2026-09-22), allebei vijf ZWB-tags. Zonder deze regel won de
  // eerste groep en kreeg B1 de stand van A te zien.
  const ourRiders = (s: T) => s.entrants.filter((e) => own.has(Number(e.zwiftId))).length;
  return [...occupied].sort((a, b) => score(b) - score(a) || ourRiders(b) - ourRiders(a))[0];
}

export async function loadZrlLive(
  eventId: string,
  options: {
    /** Vaste Zwift-subgroep (de Sauce-overlay volgt de renner in beeld). */
    subgroupId?: string;
    /**
     * Een ploegleider zegt dat de race voorbij is ("Uitslag vastzetten"): verse
     * Zwift-data, de Zwift-uitslag geldt direct als definitief en er wordt
     * bevroren zonder de 90 minuten af te wachten. De controle of alle data
     * binnen is, blijft staan.
     */
    raceOver?: boolean;
  } = {},
): Promise<ZrlLiveOutcome> {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, title, type, team_id, parent_event_id, zwift_event_id, teams(name)")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || event.type !== "zrl") return { status: "not-found" };
  if (!event.zwift_event_id) return { status: "no-zwift-event" };
  const teamName = (event.teams as { name?: string } | null)?.name ?? null;

  let data: RaceData;
  try {
    data = options.raceOver
      ? await fetchRaceData(String(event.zwift_event_id))
      : await fetchCachedRaceData(String(event.zwift_event_id));
    if (Date.now() - data.fetchedAt > MAX_CACHE_AGE_MS) {
      data = await fetchRaceData(String(event.zwift_event_id));
    }
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : undefined };
  }

  const own = await ownZwiftIds(
    event.team_id as string | null,
    [event.id as string, event.parent_event_id as string | null].filter((id): id is string => Boolean(id)),
  );
  const subgroup = options.subgroupId
    ? data.subgroups.find((s) => s.id === options.subgroupId && s.entrants.length > 0)
    : pickSubgroup(data.subgroups, own);
  if (!subgroup) return { status: options.subgroupId ? "not-found" : "no-route" };
  // Kent het platform niemand in deze groep, dan gelden de ZWB-tags als ons team.
  if (!subgroup.entrants.some((e) => own.has(Number(e.zwiftId)))) {
    for (const e of subgroup.entrants) if (hasZwbTag(e.name)) own.add(Number(e.zwiftId));
  }
  const route = subgroup.routeId ? routeSegments(subgroup.routeId, subgroup.laps) : null;
  if (!route) return { status: "no-route" };

  const leagueKey = zrlLeagueKey(data.eventName, subgroup.label, String(event.zwift_event_id));
  const { data: assignmentRows } = await admin
    .from("zrl_team_assignments")
    .select("zwift_id, team_label")
    .eq("league_key", leagueKey);
  const assignments = new Map(
    (assignmentRows ?? []).map((row) => [Number(row.zwift_id), String(row.team_label)]),
  );

  const ownTeam = teamName ? teamKey(teamName) : null;
  const spellings = new Map<string, string[]>();
  const riders: Rider[] = subgroup.entrants.map((entrant) => {
    const id = Number(entrant.zwiftId);
    // Eigen renners kennen we; daarna gaat de bijstelling van de ploegleider voor de tag.
    const label = assignments.get(id) ?? extractTeamTag(entrant.name);
    const team = own.has(id) && ownTeam ? ownTeam : label ? teamKey(label) || null : null;
    if (team && label) spellings.set(team, [...(spellings.get(team) ?? []), label]);
    return { athleteId: id, name: entrant.name, team };
  });
  const teamLabels: Record<string, string> = Object.fromEntries(
    [...spellings].map(([team, list]) => [team, pickTeamLabel(list)]),
  );
  if (ownTeam && teamName) teamLabels[ownTeam] = teamName;

  const riderIds = new Set(riders.map((r) => r.athleteId));
  const finishedAt = new Map(
    subgroup.results
      .filter((r) => r.durationMs != null)
      .map((r) => [r.profileId, subgroup.startAt + (r.durationMs as number) + 1000]),
  );
  // Alleen passages die meetellen: doorfietsen na de eigen finish houdt de stand
  // anders "voorlopig" zolang iemand uitrijdt over een sprint.
  const lastActivity = Math.max(
    subgroup.startAt,
    ...data.passages
      .filter((p) => riderIds.has(p.athleteId) && p.ts <= (finishedAt.get(p.athleteId) ?? Infinity))
      .map((p) => p.ts),
    ...subgroup.results.map((r) => subgroup.startAt + (r.durationMs ?? 0)),
  );
  const final =
    subgroup.resultsOk &&
    subgroup.results.length > 0 &&
    (options.raceOver || data.fetchedAt - lastActivity > QUIET_BEFORE_FINAL_MS);

  const score = scoreRace({
    route: route.map(({ segmentId, name }) => ({ segmentId, name })),
    riders,
    passages: data.passages,
    startAt: subgroup.startAt,
    finishedAt,
    finish: { finishers: subgroup.results.map((r) => r.profileId), final },
  });

  const view: ZrlLiveView = {
    event: { id: event.id as string, title: event.title as string, teamName, zwiftEventId: String(event.zwift_event_id) },
    subgroupLabel: subgroup.label,
    startAt: subgroup.startAt,
    fetchedAt: data.fetchedAt,
    ownTeam,
    ownRiders: riders.filter((r) => own.has(r.athleteId)).map((r) => r.athleteId),
    leagueKey,
    entrants: riders,
    teamLabels,
    score,
    complete: subgroup.resultsOk && data.segmentsOk,
  };

  // Race gereden en alle Zwift-data binnen: wegschrijven, zodat de raceweekpagina
  // de plaats kan tonen zonder Zwift opnieuw te bevragen. Na het vaste venster
  // is de data steeds dezelfde; opnieuw schrijven neemt alleen een latere
  // teambijstelling mee.
  const freeze = await freezeZrlTeamResult(
    view.event.id,
    (event.team_id as string | null) ?? null,
    subgroup.startAt,
    view,
    { raceOver: options.raceOver },
  );

  return { status: "ok", view, freeze };
}

/**
 * Het ZWB-teamevent bij een Zwift-event en -subgroep, voor de Sauce-overlay.
 * Alleen Zwift-events die aan een ZWB-ZRL-event hangen: anders zou iedereen het
 * serviceaccount willekeurige events laten ophalen. Hangen er meerdere teams aan
 * hetzelfde Zwift-event, dan wint het team met de meeste eigen renners in die groep.
 */
export async function loadZrlLiveForZwift(
  zwiftEventId: string,
  subgroupId: string,
): Promise<ZrlLiveOutcome> {
  if (!/^\d+$/.test(zwiftEventId) || !/^\d+$/.test(subgroupId)) return { status: "not-found" };
  const admin = createAdminClient();
  const { data: events } = await admin
    .from("events")
    .select("id")
    .eq("type", "zrl")
    .eq("zwift_event_id", zwiftEventId)
    .not("team_id", "is", null)
    .limit(10);
  let best: ZrlLiveOutcome = { status: "not-found" };
  for (const row of events ?? []) {
    const outcome = await loadZrlLive(row.id as string, { subgroupId });
    if (outcome.status !== "ok") {
      if (best.status === "not-found") best = outcome;
      continue;
    }
    if (best.status !== "ok" || outcome.view.ownRiders.length > best.view.ownRiders.length) best = outcome;
  }
  return best;
}
