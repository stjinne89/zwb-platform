// Uitslagen van de Sunday Race Club (migr. 0202). Puur: geen netwerk, geen
// database.
//
// Bron (openbaar, niet gedocumenteerd, gemeten 2026-09-30):
//   POST https://service14.mywhoosh.com/v2/v3/public/src-events-list  {page}
//     twee events per pagina, nieuwste eerst, ook andere races dan de SRC;
//     per event event_id (UUID), gender 0/1, created_at (start, UTC),
//     result_status en stages[].DayId.
//   POST …/public/getEventResults {eventId, dayId, leaderboardType: "individual"}
//     per renner userId, naam, teamId/teamName ("Individual" en een lege teamId
//     zonder team), categoryId, rank (over alle categorieën), finishedTime (ms).
//     Ook vermogen, gewicht en prijzengeld; die lezen we bewust niet.
//
// Het teamklassement van MyWhoosh zelf is de som van de beste drie finishtijden
// per team (nagerekend op de finale van 27 september 2026). Het endpoint daarvoor
// gaf steeds een 500, dus we rekenen het hier zelf, per categorie: teams bestaan
// uit renners van één categorie, en het prijzengeld gaat per categorie.

import { normalizeName } from "@/lib/events/zwb-detection";
import type { SrcGender } from "@/lib/src/feed";

export const SRC_RESULTS_API = "https://service14.mywhoosh.com/v2/v3/public";

export type SrcListEvent = {
  event_id?: string | null;
  event_name?: string | null;
  gender?: number | null;
  created_at?: string | null;
  result_status?: string | null;
  stages?: Array<{ DayId?: string | null }> | null;
};

export type SrcResultEvent = { eventId: string; dayId: string; status: string | null };

function isSrcResultName(name: string | null | undefined) {
  return /^(src|sunday race club)\b/i.test((name ?? "").trim());
}

/** De uitslag van de race op deze zondag voor dit geslacht, uit de lijst. */
export function findSrcResultEvent(
  list: SrcListEvent[],
  sunday: string,
  gender: SrcGender,
): SrcResultEvent | null {
  const code = gender === "men" ? 0 : 1;
  for (const event of list) {
    if (!isSrcResultName(event.event_name) || event.gender !== code) continue;
    if ((event.created_at ?? "").slice(0, 10) !== sunday) continue;
    const dayId = event.stages?.[0]?.DayId;
    if (!event.event_id || !dayId) continue;
    return { eventId: event.event_id, dayId, status: event.result_status ?? null };
  }
  return null;
}

/** Oudste startdatum op een pagina, om te weten wanneer verder bladeren zinloos is. */
export function oldestListDay(list: SrcListEvent[]) {
  return list
    .map((event) => (event.created_at ?? "").slice(0, 10))
    .filter(Boolean)
    .sort()[0] ?? null;
}

export type SrcApiResultRow = {
  userId?: string | null;
  userFullName?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  categoryId?: number | null;
  rank?: number | null;
  finishedTime?: number | null;
  gapTime?: number | null;
  result_status?: string | null;
};

export type SrcResult = {
  userId: string;
  name: string;
  /** null zonder team ("Individual"). */
  teamId: string | null;
  teamName: string | null;
  category: number | null;
  /** Plaats binnen de eigen categorie. */
  categoryRank: number | null;
  finishedMs: number | null;
  gapMs: number | null;
  status: string | null;
};

function positive(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function parseSrcResults(rows: SrcApiResultRow[]): SrcResult[] {
  const parsed: SrcResult[] = [];
  for (const row of rows) {
    const userId = row.userId?.trim();
    if (!userId) continue;
    const teamName = row.teamName?.trim() || null;
    const teamId = row.teamId?.trim() || null;
    const individual = !teamId || !teamName || teamName.toLowerCase() === "individual";
    parsed.push({
      userId,
      name: row.userFullName?.trim() || "Onbekend",
      teamId: individual ? null : teamId,
      teamName: individual ? null : teamName,
      category: positive(row.categoryId),
      categoryRank: null,
      finishedMs: positive(row.finishedTime),
      gapMs: typeof row.gapTime === "number" && row.gapTime >= 0 ? row.gapTime : null,
      status: row.result_status?.trim() || null,
    });
  }
  // Plaats per categorie, op finishtijd; wie niet finishte, krijgt er geen.
  const byCategory = new Map<number, SrcResult[]>();
  for (const result of parsed) {
    if (result.category === null || result.finishedMs === null) continue;
    const list = byCategory.get(result.category) ?? [];
    list.push(result);
    byCategory.set(result.category, list);
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) => a.finishedMs! - b.finishedMs!);
    list.forEach((result, index) => {
      result.categoryRank = index + 1;
    });
  }
  return parsed;
}

export type SrcTeamStanding = {
  category: number;
  teamId: string;
  teamName: string;
  /** Som van de beste drie finishtijden. */
  timeMs: number;
  rank: number;
  finishers: number;
};

/** Minimaal drie finishers; de beste drie tijden tellen. */
export const SRC_TEAM_SCORING = 3;

export function srcTeamStandings(results: SrcResult[]): SrcTeamStanding[] {
  const groups = new Map<string, SrcResult[]>();
  for (const result of results) {
    if (!result.teamId || result.category === null || result.finishedMs === null) continue;
    const key = `${result.category}|${result.teamId}`;
    const list = groups.get(key) ?? [];
    list.push(result);
    groups.set(key, list);
  }
  const standings: Omit<SrcTeamStanding, "rank">[] = [];
  for (const list of groups.values()) {
    if (list.length < SRC_TEAM_SCORING) continue;
    const times = list.map((result) => result.finishedMs!).sort((a, b) => a - b);
    standings.push({
      category: list[0].category!,
      teamId: list[0].teamId!,
      teamName: list[0].teamName!,
      timeMs: times.slice(0, SRC_TEAM_SCORING).reduce((sum, time) => sum + time, 0),
      finishers: list.length,
    });
  }
  standings.sort((a, b) => a.category - b.category || a.timeMs - b.timeMs);
  const ranked: SrcTeamStanding[] = [];
  let rank = 0;
  let category = -1;
  for (const standing of standings) {
    rank = standing.category === category ? rank + 1 : 1;
    category = standing.category;
    ranked.push({ ...standing, rank });
  }
  return ranked;
}

export type SrcMatchProfile = { id: string; display_name: string; mywhoosh_id: string | null };

export type SrcStoredResult = SrcResult & {
  profileId: string | null;
  suggestedProfileId: string | null;
};

/**
 * De renners die voor ZWB tellen: onder een ZWB-teamnaam, gekoppeld op
 * MyWhoosh-id, of met precies de naam van één lid (alleen als voorstel). De rest
 * bewaren we niet.
 */
export function srcRelevantResults(
  results: SrcResult[],
  zwbTeamNames: string[],
  profiles: SrcMatchProfile[],
): SrcStoredResult[] {
  const teamNames = new Set(zwbTeamNames.map((name) => name.trim().toLowerCase()));
  const byId = new Map<string, string>();
  const byName = new Map<string, string[]>();
  for (const profile of profiles) {
    const id = profile.mywhoosh_id?.trim().toLowerCase();
    if (id) byId.set(id, profile.id);
    const name = normalizeName(profile.display_name ?? "");
    if (name) byName.set(name, [...(byName.get(name) ?? []), profile.id]);
  }
  const linked = new Set(byId.values());

  const stored: SrcStoredResult[] = [];
  for (const result of results) {
    const profileId = byId.get(result.userId.toLowerCase()) ?? null;
    const candidates = profileId ? [] : byName.get(normalizeName(result.name)) ?? [];
    // Een lid dat al een ander MyWhoosh-id heeft, is geen voorstel.
    const suggestion =
      candidates.length === 1 && !linked.has(candidates[0]) ? candidates[0] : null;
    const zwbTeam = result.teamName !== null && teamNames.has(result.teamName.toLowerCase());
    if (!profileId && !suggestion && !zwbTeam) continue;
    stored.push({ ...result, profileId, suggestedProfileId: suggestion });
  }
  return stored;
}

/** Een race telt voor de finale als je hem uitreed. */
export function srcCompleted(result: { finished_ms: number | string | null }) {
  const ms = Number(result.finished_ms ?? 0);
  return Number.isFinite(ms) && ms > 0;
}

/** Nodig om in de finale voor een team te tellen (roadbook V7.0.7). */
export const SRC_QUALIFIERS_NEEDED = 2;

/** 4912345 → "1:21:52". */
export function formatRaceTime(ms: number | null) {
  if (ms === null || !Number.isFinite(ms)) return "—";
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export type SrcRiderRace = {
  profileId: string;
  sunday: string;
  isFinal: boolean;
  category: number | null;
  finishedMs: number | string | null;
};

export type SrcRiderProgress = {
  /** Uitgereden kwalificaties in de maand. */
  qualifiers: number;
  /** Genoeg voor een teamuitslag in de finale. */
  finalReady: boolean;
  /** Categorie van de laatst gereden race, ook uit een eerdere maand. */
  lastCategory: number | null;
};

/** Per lid: hoeveel kwalificaties deze maand, en in welke categorie het laatst. */
export function srcRiderProgress(
  races: SrcRiderRace[],
  month: string,
): Map<string, SrcRiderProgress> {
  const progress = new Map<string, SrcRiderProgress & { lastSunday: string }>();
  for (const race of races) {
    const entry = progress.get(race.profileId) ?? {
      qualifiers: 0,
      finalReady: false,
      lastCategory: null,
      lastSunday: "",
    };
    if (srcCompleted({ finished_ms: race.finishedMs })) {
      if (!race.isFinal && race.sunday.slice(0, 7) === month.slice(0, 7)) entry.qualifiers += 1;
      if (race.category !== null && race.sunday > entry.lastSunday) {
        entry.lastCategory = race.category;
        entry.lastSunday = race.sunday;
      }
    }
    entry.finalReady = entry.qualifiers >= SRC_QUALIFIERS_NEEDED;
    progress.set(race.profileId, entry);
  }
  return new Map(
    [...progress].map(([id, { qualifiers, finalReady, lastCategory }]) => [
      id,
      { qualifiers, finalReady, lastCategory },
    ]),
  );
}
