// WTRL-data lezen die het script op de pc van de eigenaar ophaalt (`npm run
// wtrl`, scripts/wtrl-sync.mjs). Puur: geen database, geen netwerk.
//
// Het platform roept WTRL zelf niet aan: hun voorwaarden verbieden dat zonder
// schriftelijke toestemming, en in september 2026 gaf WTRL vanaf Netlify meteen
// een 429 (PLAN.md, ronde van 2026-09-21). Het script draait met de eigen
// WTRL-sessie van de eigenaar en stuurt de antwoorden door; deze module zegt
// welke pagina's het moet ophalen en leest wat terugkomt. Gemeten 2026-11-25.
//
// - My Teams (`/zrl/myteams/`) is HTML: per team een paneel `id="trc79152"` met
//   `data-season="21"` en de knop `copyRacePass('<link>')`. Een week voor de
//   race was die link bij alle negen teams leeg.
// - Teamgegevens (`/api/zrl/21/teams/79152`) zijn JSON: divisie, WTRL-klasse,
//   de start van de volgende race en de renners met Zwift-ID en zFTP/zMAP.
// - Menu (`/api/zrl/results/21`): seizoenen, en per competitie, league en
//   divisie de races met "(Finalized)" of "(Provisional)".
// - Uitslag (`/api/zrl/results/21/2420B40/2`): per team de renners met korte
//   naam ("W. Staelens"), `timeResult` in seconden op de milliseconde, `watts`
//   en `zid`, het Zwift-event. Een Zwift-ID per renner staat er niet in.
//
// De renner vinden we in de bewaarde Zwift-uitslag van dat event: de rittijd is
// daar `durationMs`, tot op de milliseconde gelijk. Getoetst op Aqua B4, race 2
// van ronde 2: 18 van 19 renners met één treffer en hetzelfde vermogen; de
// misser reed 108 W en had geen Zwift-uitslag.

import { normalizeRacepassUrl } from "@/lib/events/race-links";
import { prettyName, type WtrlRider, type WtrlTeam } from "@/lib/teams/wtrl-roster";
import { zrlDivisionKey, zrlSeasonRound } from "@/lib/zrl-live/team-tags";

/** Alleen deze paden mag het script ophalen, en alleen op www.wtrl.racing. */
export const WTRL_PATHS = {
  myTeams: /^\/zrl\/myteams\/$/,
  team: /^\/api\/zrl\/(\d{1,4})\/teams\/(\d{1,9})$/,
  menu: /^\/api\/zrl\/results\/(\d{1,4})$/,
  results: /^\/api\/zrl\/results\/(\d{1,4})\/(\d{4}[A-E]\d{1,2}\d)\/(\d{1,2})$/,
  /** De competitiestand van een divisie na die race (0362). */
  league: /^\/api\/zrl\/league\/(\d{1,4})\/(\d{4}[A-E]\d{1,2}\d)\/(\d{1,2})$/,
} as const;

export function wtrlPathKind(path: string): keyof typeof WTRL_PATHS | null {
  for (const [kind, pattern] of Object.entries(WTRL_PATHS)) {
    if (pattern.test(path)) return kind as keyof typeof WTRL_PATHS;
  }
  return null;
}

// ── My Teams ────────────────────────────────────────────────────────────────

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
}

export type MyTeamsPanel = { trc: string; season: number | null; racepass: string | null };

/** De teampanelen van My Teams: TRC, seizoen en de racepass als die er is. */
export function parseMyTeams(html: string): MyTeamsPanel[] {
  const starts = [...html.matchAll(/<div\b[^>]*\bid="trc(\d+)"/g)];
  return starts.map((match, index) => {
    const end = starts[index + 1]?.index ?? html.length;
    const panel = html.slice(match.index, end);
    const season = /\bdata-season="(\d+)"/.exec(panel)?.[1];
    const link = /copyRacePass\(\s*'([^']*)'\s*\)/.exec(panel)?.[1] ?? "";
    return {
      trc: match[1],
      season: season ? Number(season) : null,
      racepass: link ? normalizeRacepassUrl(decodeEntities(link).trim()) : null,
    };
  });
}

// ── Teamgegevens ────────────────────────────────────────────────────────────

export type WtrlTeamDetails = {
  team: WtrlTeam;
  trc: string;
  /** WTRL-klasse, "2420B40". */
  wtrlClass: string | null;
  /** Start van de volgende race (UTC, ISO), of null. */
  nextStartAt: string | null;
};

type Json = Record<string, unknown>;
const obj = (value: unknown): Json => (value && typeof value === "object" ? (value as Json) : {});
const str = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : typeof value === "number" ? String(value) : null;
const num = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

function riderFromJson(raw: unknown): WtrlRider | null {
  const row = obj(raw);
  const zwiftId = num(row.profileId);
  const name = str(row.name);
  if (!zwiftId || zwiftId <= 0 || !name) return null;
  const category = str(row.category)?.toUpperCase() ?? null;
  return {
    zwiftId: String(zwiftId),
    // My Teams als tekst gaf namen in hoofdletters; zo blijven ze gelijk gespeld.
    name: name === name.toUpperCase() ? prettyName(name) : name,
    category: category && /^[A-E]$/.test(category) ? category : null,
    status: str(row.memberStatus)?.toUpperCase() === "INVITED" ? "invited" : "member",
    zftpW: num(row.zftpw),
    zftpWkg: num(row.zftp),
    zmapWkg: num(row.zmap),
  };
}

/** `/api/zrl/{seizoen}/teams/{trc}` → het team zoals de plak het ook gaf. */
export function parseTeamDetails(json: unknown): WtrlTeamDetails | null {
  const meta = obj(obj(json).meta);
  const team = obj(meta.team);
  const trc = str(meta.trc);
  const teamId = str(team.teamid);
  const name = str(team.name);
  if (!trc || !/^\d+$/.test(trc) || !teamId || !name) return null;
  const captain = obj(obj(meta.administrators).captain);
  const captainName = [str(captain.firstName), str(captain.lastName)].filter(Boolean).join(" ");
  const riders = (Array.isArray(obj(json).riders) ? (obj(json).riders as unknown[]) : [])
    .map(riderFromJson)
    .filter((rider): rider is WtrlRider => Boolean(rider));
  const wtrlClass = str(obj(meta.competition).class);
  const start = str(meta.divisionStartUTC);
  return {
    trc,
    wtrlClass: wtrlClass && /^\d{4}[A-E]\d{1,2}\d$/.test(wtrlClass) ? wtrlClass : null,
    nextStartAt: start && Number.isFinite(Date.parse(start)) ? new Date(start).toISOString() : null,
    team: {
      name,
      // Zoals de plak hem schreef: "TRC Ref 79152/20937".
      trcRef: `${trc}/${teamId}`,
      season: str(meta.racingSeason),
      division: str(meta.division),
      captain: captainName || null,
      riders,
    },
  };
}

// ── Menu ────────────────────────────────────────────────────────────────────

export type WtrlRaceStatus = "final" | "provisional";

export type WtrlMenuDivision = {
  wtrlClass: string;
  league: string;
  races: Array<{ race: number; status: WtrlRaceStatus }>;
};

export type WtrlMenu = { seasonText: string | null; divisions: WtrlMenuDivision[] };

function raceStatus(text: string): WtrlRaceStatus | null {
  if (/\(Finali[sz]ed\)/i.test(text)) return "final";
  if (/\(Provisional\)/i.test(text)) return "provisional";
  return null;
}

/** `/api/zrl/results/{seizoen}` → per WTRL-klasse de races met een uitslag. */
export function parseResultsMenu(json: unknown, season: number): WtrlMenu {
  const payload = obj(obj(json).payload);
  const seasons = Array.isArray(payload.seasons) ? (payload.seasons as unknown[]) : [];
  const seasonText = seasons.map(obj).find((row) => num(row.value) === season)?.text;
  const divisions: WtrlMenuDivision[] = [];
  for (const competition of Array.isArray(payload.competition) ? (payload.competition as unknown[]) : []) {
    const comp = str(obj(competition).value);
    if (!comp || !/^\d{2}$/.test(comp)) continue;
    for (const leagueRaw of (obj(competition).leagues as unknown[] | undefined) ?? []) {
      const league = obj(leagueRaw);
      const leagueValue = str(league.value);
      const leagueName = str(league.text);
      if (!leagueValue || !/^\d{3}$/.test(leagueValue) || !leagueName) continue;
      for (const divisionRaw of (league.divisions as unknown[] | undefined) ?? []) {
        const division = obj(divisionRaw);
        const value = str(division.value)?.toUpperCase();
        if (!value || !/^[A-E]\d{1,2}$/.test(value)) continue;
        const races = ((division.races as unknown[] | undefined) ?? []).flatMap((raceRaw) => {
          const race = num(obj(raceRaw).value);
          const status = raceStatus(str(obj(raceRaw).text) ?? "");
          return race && race > 0 && status ? [{ race, status }] : [];
        });
        divisions.push({
          wtrlClass: `${comp[0]}${leagueValue}${value}${comp[1]}`,
          league: leagueName.toLowerCase(),
          races,
        });
      }
    }
  }
  return { seasonText: typeof seasonText === "string" ? seasonText : null, divisions };
}

/**
 * Dezelfde sleutel als de live stand uit de Zwift-eventnaam maakt
 * (`zrlLeagueKey`): "2420B40" in "2026/27 Round 2" → "26/27|r2|open|aqua|4|B".
 * Klasse: eerste cijfer competitie (2 Open, 0 Women), league, divisie, tweede
 * cijfer competitie (1 Development).
 */
export function wtrlDivisionKey(wtrlClass: string, league: string, seasonText: string): string | null {
  const match = /^(\d)\d{3}([A-E])(\d{1,2})(\d)$/.exec(wtrlClass);
  const seasonRound = zrlSeasonRound(seasonText);
  if (!match || !seasonRound || !league) return null;
  return zrlDivisionKey({
    ...seasonRound,
    women: match[1] === "0",
    development: match[4] === "1",
    league: league.toLowerCase(),
    number: Number(match[3]),
    category: match[2],
  });
}

/** De categorie van een klasse: "2420B40" → "B". */
export function wtrlClassCategory(wtrlClass: string): string | null {
  return /^\d{4}([A-E])/.exec(wtrlClass)?.[1] ?? null;
}

// ── Uitslag ─────────────────────────────────────────────────────────────────

export type WtrlResultRider = { team: string; name: string; durationMs: number; watts: number | null; zwiftEventId: string };

/** `/api/zrl/results/{seizoen}/{klasse}/{race}` → alle renners met hun team. */
export function parseResults(json: unknown): WtrlResultRider[] {
  const payload = obj(json).payload;
  return (Array.isArray(payload) ? payload : []).flatMap((teamRaw) => {
    const team = str(obj(teamRaw).teamname);
    const riders = obj(teamRaw).a;
    if (!team || !Array.isArray(riders)) return [];
    return riders.flatMap((riderRaw) => {
      const rider = obj(riderRaw);
      const seconds = num(rider.timeResult);
      const zid = num(rider.zid);
      const name = str(rider.name);
      if (!seconds || seconds <= 0 || !zid || !name) return [];
      return [{
        team: team.slice(0, 60),
        name,
        durationMs: Math.round(seconds * 1000),
        watts: num(rider.watts),
        zwiftEventId: String(zid),
      }];
    });
  });
}

export type ZwiftResultRow = { profileId: number; durationMs: number | null; avgWatts?: number | null };

/**
 * Zoekt elke WTRL-renner in de Zwift-uitslag van zijn event: dezelfde rittijd
 * tot op de milliseconde. Meer dan één treffer: het vermogen beslist. Blijft
 * het dubbelzinnig, dan geen koppeling. Puur.
 */
export function matchResultRiders(
  riders: WtrlResultRider[],
  zwiftResults: ZwiftResultRow[],
): Map<WtrlResultRider, number> {
  const byDuration = new Map<number, ZwiftResultRow[]>();
  for (const row of zwiftResults) {
    if (row.durationMs == null) continue;
    byDuration.set(row.durationMs, [...(byDuration.get(row.durationMs) ?? []), row]);
  }
  const matched = new Map<WtrlResultRider, number>();
  const taken = new Map<number, number>();
  for (const rider of riders) {
    let candidates = byDuration.get(rider.durationMs) ?? [];
    if (candidates.length > 1 && rider.watts != null) {
      candidates = candidates.filter((row) => row.avgWatts === rider.watts);
    }
    if (candidates.length !== 1) continue;
    const profileId = candidates[0].profileId;
    matched.set(rider, profileId);
    taken.set(profileId, (taken.get(profileId) ?? 0) + 1);
  }
  // Twee WTRL-renners op één Zwift-renner: dan weten we het van geen van beiden.
  for (const [rider, profileId] of matched) {
    if ((taken.get(profileId) ?? 0) > 1) matched.delete(rider);
  }
  return matched;
}

export type AssignmentRow = { zwift_id: number; team_label: string; source: string };

/**
 * Welke indelingen de import schrijft: alleen nieuwe of gewijzigde, en nooit
 * over een bijstelling van een ploegleider heen. Puur.
 */
export function planAssignments(
  existing: AssignmentRow[],
  found: Map<number, string>,
): Array<{ zwift_id: number; team_label: string }> {
  const current = new Map(existing.map((row) => [Number(row.zwift_id), row]));
  return [...found].flatMap(([zwiftId, label]) => {
    const row = current.get(zwiftId);
    if (row && (row.source !== "wtrl" || row.team_label === label)) return [];
    return [{ zwift_id: zwiftId, team_label: label }];
  });
}

// ── Racepass ────────────────────────────────────────────────────────────────

export type StoredPass = { team_id: string; race_date: string; url: string; source: string; site_url: string | null };

/**
 * De passes uit My Teams. Een handmatige pass blijft staan. Een link die het
 * team al voor een eerdere race had, is de oude pass die WTRL nog toont: die
 * slaan we over, anders staat na een race de vorige pass bij de volgende.
 * Puur.
 */
export function planWtrlRacepasses(
  existing: StoredPass[],
  passes: Array<{ teamId: string; raceDate: string; url: string }>,
): { upserts: StoredPass[]; skipped: string[] } {
  const upserts: StoredPass[] = [];
  const skipped: string[] = [];
  for (const pass of passes) {
    const own = existing.filter((row) => row.team_id === pass.teamId);
    if (own.some((row) => row.race_date < pass.raceDate && row.url === pass.url)) {
      skipped.push(`${pass.raceDate}: pass van een eerdere race`);
      continue;
    }
    const current = own.find((row) => row.race_date === pass.raceDate);
    if (current?.source === "manual") continue;
    if (current?.source === "wtrl" && current.url === pass.url) continue;
    upserts.push({
      team_id: pass.teamId,
      race_date: pass.raceDate,
      url: pass.url,
      source: "wtrl",
      site_url: current?.site_url ?? null,
    });
  }
  return { upserts, skipped };
}

// ── Competitiestand ─────────────────────────────────────────────────────────

export type WtrlStanding = {
  rank: number;
  /** WTRL-team-ID: het tweede deel van de TRC-referentie. */
  teamId: string;
  name: string;
  /** League points. */
  points: number;
  /** League points per race, R1 tot en met de laatste race met punten. */
  perRace: number[];
  races: number;
  fin: number;
  fal: number;
  fts: number;
  pbp: number;
};

/**
 * `/api/zrl/league/{seizoen}/{klasse}/{race}`, gemeten 2026-11-25: per team
 * `c` plaats, `d` naam, `teamId`, `j` league points, `r1`..`r8` per race,
 * `l` aantal races, `i` FIN, `e` FAL, `k` FTS en `pbp` (de kolomtitels van
 * WTRL's eigen tabel).
 */
export function parseStandings(json: unknown): WtrlStanding[] {
  const payload = obj(json).payload;
  const rows = (Array.isArray(payload) ? payload : []).flatMap((raw) => {
    const row = obj(raw);
    const rank = num(row.c);
    const teamId = str(row.teamId);
    const name = str(row.d);
    if (!rank || !teamId || !/^\d{1,9}$/.test(teamId) || !name) return [];
    const perRace = Array.from({ length: 8 }, (_, i) => num(row[`r${i + 1}`]) ?? 0);
    const races = Math.max(0, Math.min(8, num(row.l) ?? 0));
    let last = perRace.length;
    while (last > races && perRace[last - 1] === 0) last -= 1;
    return [{
      rank,
      teamId,
      name: name.slice(0, 80),
      points: num(row.j) ?? 0,
      perRace: perRace.slice(0, last),
      races,
      fin: num(row.i) ?? 0,
      fal: num(row.e) ?? 0,
      fts: num(row.k) ?? 0,
      pbp: num(row.pbp) ?? 0,
    }];
  });
  return rows.sort((a, b) => a.rank - b.rank);
}

/**
 * Moet de stand van een divisie opnieuw? Als er een nieuwere race is dan de
 * bewaarde, of als de bewaarde race sindsdien definitief werd. Een voorlopige
 * stand halen we niet elke run opnieuw: dat kost een verzoek per divisie.
 */
export function standingsWanted(
  stored: { race: number; final: boolean } | null,
  latest: { race: number; status: WtrlRaceStatus },
): boolean {
  if (!stored || stored.race < latest.race) return true;
  return stored.race === latest.race && !stored.final && latest.status === "final";
}

// ── Wat een run ophaalt ─────────────────────────────────────────────────────

/**
 * Pagina's per divisie (uitslagen en standen samen) per run. Op 2026-11-25 gaf
 * WTRL na 16 verzoeken een 429; met negen teams, het menu en dit maximum blijft
 * een run rond de 19. De rest volgt bij een volgende run.
 */
export const MAX_DIVISION_PAGES_PER_RUN = 8;

/** 0 = uitslag die nog nooit binnen was, 1 = stand, 2 = voorlopige uitslag opnieuw. */
export type WantedPage = { path: string; race: number; priority: 0 | 1 | 2 };

/**
 * Hoogstens MAX_DIVISION_PAGES_PER_RUN: eerst uitslagen die nog nooit binnen
 * waren, dan standen, dan voorlopige uitslagen opnieuw; binnen elk de nieuwste
 * race eerst. Zonder die volgorde vulde de voorlopige uitslag van race 2 elke
 * run en kwam race 1 nooit aan de beurt (2026-11-25).
 */
export function pickDivisionPaths(wanted: WantedPage[]): string[] {
  return [...wanted]
    .sort((a, b) => a.priority - b.priority || b.race - a.race)
    .slice(0, MAX_DIVISION_PAGES_PER_RUN)
    .map((row) => row.path);
}
