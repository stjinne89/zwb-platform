import { assertSafeUrl } from "@/lib/net/safe-fetch";

type SourceTeam = {
  name?: string | null;
  type?: string | null;
  division?: string | null;
};

type SourceRow = {
  id: string;
  team_id: string;
  provider: "wtrl" | "club_ladder";
  source_url: string;
  match_name: string;
  teams?: SourceTeam | SourceTeam[] | null;
};

type WtrlCandidate = {
  competitionValue: string;
  competitionLabel: string;
  leagueValue: string;
  leagueLabel: string;
  divisionValue: string;
  divisionLabel: string;
  raceValue: string;
  raceLabel: string;
  classStr: string;
};

type ParsedResult = {
  externalSource: "wtrl" | "club_ladder";
  externalId: string;
  teamId: string;
  competition: string;
  roundLabel: string | null;
  roundAt: string | null;
  position: number | null;
  points: number | null;
  totalTeams: number | null;
  notes: string | null;
  sourceUrl: string;
  metadata: Record<string, unknown>;
  rosterEntries?: SyncedRosterEntry[];
  riderResults?: SyncedZrlRiderResult[];
};

type SyncedRosterEntry = {
  name: string;
  zwiftId: string | null;
  paceCategory: string | null;
};

type SyncedZrlRiderResult = {
  name: string;
  zwiftId: string | null;
  category: string | null;
  position: number | null;
  points: number | null;
  timeText: string | null;
  timeSeconds: number | null;
  metadata: Record<string, unknown>;
};

type SyncSourceOutcome = {
  sourceId: string;
  provider: SourceRow["provider"];
  matchName: string;
  insertedOrUpdated: number;
  rosterSynced: number;
  skipped?: string;
  error?: string;
};

export type TeamResultsSyncSummary = {
  ok: boolean;
  teamsCreated: number;
  sourcesCreated: number;
  insertedOrUpdated: number;
  sources: SyncSourceOutcome[];
};

type TeamSeed = {
  name: string;
  type: "zrl" | "ladder" | "social" | "outdoor";
  division: string | null;
  description: string;
};

type SourceSeed = {
  teamName: string;
  provider: SourceRow["provider"];
  sourceUrl: string;
  matchName: string;
};

const WTRL_RESULTS_URL = "https://www.wtrl.racing/zwift-racing-league/results/";
const CLUB_LADDER_URL = "https://ladder.cycleracing.club/summary";

const DEFAULT_TEAM_SEEDS: TeamSeed[] = [
  {
    name: "ZRL B",
    type: "zrl",
    division: "B",
    description: "ZWB ZRL B - race-categorie B",
  },
  {
    name: "ZRL C",
    type: "zrl",
    division: "C",
    description: "ZWB ZRL C - race-categorie C",
  },
  {
    name: "ZRL Zwiftladies",
    type: "zrl",
    division: "Women",
    description: "ZWB Zwiftladies in ZRL",
  },
  {
    name: "ZWBeasts",
    type: "ladder",
    division: "Diamond-Ruby",
    description: "ZWB Club Ladder team Diamond-Ruby",
  },
  {
    name: "ZWBullets",
    type: "ladder",
    division: "Ruby-Sapphire",
    description: "ZWB Club Ladder team Ruby-Sapphire",
  },
  {
    name: "ZWBandits",
    type: "ladder",
    division: null,
    description: "ZWB Club Ladder team",
  },
  {
    name: "ZWB Zwiftladies",
    type: "ladder",
    division: null,
    description: "ZWB Zwiftladies Club Ladder team",
  },
];

const DEFAULT_SOURCE_SEEDS: SourceSeed[] = [
  { teamName: "ZRL B", provider: "wtrl", sourceUrl: WTRL_RESULTS_URL, matchName: "ZWB Cycling B1" },
  { teamName: "ZRL C", provider: "wtrl", sourceUrl: WTRL_RESULTS_URL, matchName: "ZWB Cycling C1" },
  { teamName: "ZRL Zwiftladies", provider: "wtrl", sourceUrl: WTRL_RESULTS_URL, matchName: "ZWB Zwiftladies" },
  { teamName: "ZWBeasts", provider: "club_ladder", sourceUrl: CLUB_LADDER_URL, matchName: "ZWBeasts" },
  { teamName: "ZWBullets", provider: "club_ladder", sourceUrl: CLUB_LADDER_URL, matchName: "ZWBullets" },
  { teamName: "ZWBandits", provider: "club_ladder", sourceUrl: CLUB_LADDER_URL, matchName: "ZWBandits" },
  { teamName: "ZWB Zwiftladies", provider: "club_ladder", sourceUrl: CLUB_LADDER_URL, matchName: "ZWB Zwiftladies" },
];

const LEGACY_WTRL_SOURCE_NAMES = ["ZRL B", "ZRL C"];

class SyncSkip extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncSkip";
  }
}

function asQuery<T>(value: unknown) {
  return value as Promise<{ data: T | null; error: { message: string } | null }>;
}

function syncError(message: string, context: string) {
  if (message.includes("team_result_sources") && message.includes("does not exist")) {
    return new Error(
      `${context}: tabel team_result_sources ontbreekt. Voer Supabase migratie 0009 uit.`,
    );
  }

  if (message.toLowerCase().includes("row-level security")) {
    return new Error(`${context}: Supabase RLS blokkeert deze actie. Sync als admin.`);
  }

  return new Error(`${context}: ${message}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findTeamByName(supabase: any, name: string) {
  return await asQuery<{ id: string }>(
    supabase.from("teams").select("id").ilike("name", name).limit(1).maybeSingle(),
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureDefaultTeamsAndSources(supabase: any) {
  const teamIds = new Map<string, string>();
  let teamsCreated = 0;
  let sourcesCreated = 0;

  for (const seed of DEFAULT_TEAM_SEEDS) {
    const existing = await findTeamByName(supabase, seed.name);
    if (existing.error) {
      throw syncError(existing.error.message, `Team "${seed.name}" opzoeken`);
    }

    if (existing.data?.id) {
      teamIds.set(seed.name, existing.data.id);
      continue;
    }

    const inserted = await asQuery<{ id: string }>(
      supabase
        .from("teams")
        .insert({
          name: seed.name,
          type: seed.type,
          division: seed.division,
          description: seed.description,
        })
        .select("id")
        .single(),
    );

    if (inserted.error) {
      throw syncError(inserted.error.message, `Team "${seed.name}" aanmaken`);
    }
    if (inserted.data?.id) {
      teamIds.set(seed.name, inserted.data.id);
      teamsCreated += 1;
    }
  }

  for (const seed of DEFAULT_SOURCE_SEEDS) {
    const teamId = teamIds.get(seed.teamName);
    if (!teamId) continue;

    const existing = await asQuery<{ id: string }>(
      supabase
        .from("team_result_sources")
        .select("id")
        .eq("team_id", teamId)
        .eq("provider", seed.provider)
        .ilike("match_name", seed.matchName)
        .limit(1)
        .maybeSingle(),
    );

    if (existing.error) {
      throw syncError(
        existing.error.message,
        `Bron "${seed.matchName}" voor "${seed.teamName}" opzoeken`,
      );
    }
    if (existing.data?.id) continue;

    const inserted = await asQuery<{ id: string }>(
      supabase
        .from("team_result_sources")
        .insert({
          team_id: teamId,
          provider: seed.provider,
          source_url: seed.sourceUrl,
          match_name: seed.matchName,
          enabled: true,
        })
        .select("id")
        .single(),
    );

    if (inserted.error) {
      throw syncError(
        inserted.error.message,
        `Bron "${seed.matchName}" voor "${seed.teamName}" koppelen`,
      );
    }
    if (inserted.data?.id) sourcesCreated += 1;
  }

  const disableLegacy = await asQuery<unknown>(
    supabase
      .from("team_result_sources")
      .update({ enabled: false })
      .eq("provider", "wtrl")
      .in("match_name", LEGACY_WTRL_SOURCE_NAMES),
  );

  if (disableLegacy.error) {
    throw syncError(disableLegacy.error.message, "Verouderde WTRL-bronnen uitschakelen");
  }

  return { teamsCreated, sourcesCreated };
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function absoluteWtrlUrl(path: string) {
  return path.startsWith("http") ? path : `https://www.wtrl.racing${path}`;
}

function fetchHeaders(provider: SourceRow["provider"]): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json, text/html;q=0.9, */*;q=0.8",
    "User-Agent": "ZWB Platform result sync",
  };

  if (provider === "wtrl" && process.env.WTRL_COOKIE) {
    headers.Cookie = process.env.WTRL_COOKIE;
    headers.Referer = "https://www.wtrl.racing/zwift-racing-league/results/";
    headers["X-Requested-With"] = "XMLHttpRequest";
  }

  return headers;
}

async function fetchText(source: SourceRow, url = source.source_url) {
  await assertSafeUrl(url); // SSRF-bescherming: blokkeer interne/private adressen
  const res = await fetch(url, {
    cache: "no-store",
    headers: fetchHeaders(source.provider),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new SyncSkip("WTRL rate limit bereikt; probeer later opnieuw.");
    }
    throw new Error(`${url} gaf HTTP ${res.status}.`);
  }

  return await res.text();
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function numberOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stringValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function stringOrNull(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && value > 0) return String(value);
  return null;
}

function parseClockToSeconds(value: string | null) {
  if (!value) return null;
  const match = value.match(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  const c = match[3] != null ? Number(match[3]) : null;
  if (c != null) return b < 60 && c < 60 ? a * 3600 + b * 60 + c : null;
  return b < 60 ? a * 60 + b : null;
}

function sourceTeam(source: SourceRow) {
  return Array.isArray(source.teams) ? source.teams[0] : source.teams;
}

function paceCategoryFrom(value: unknown) {
  const category =
    typeof value === "string" ? value.match(/[ABCDE]/i)?.[0]?.toUpperCase() : null;
  return category ?? null;
}

function parsePayloadRows(payload: unknown) {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const value = payload as Record<string, unknown>;
    for (const key of ["payload", "data", "results", "rows"]) {
      if (Array.isArray(value[key])) return value[key] as Record<string, unknown>[];
    }
  }
  return [];
}

function getDivisionParts(value: string) {
  const division = value.match(/[A-Za-z]+/)?.[0] ?? "";
  const divnum = value.match(/\d+/)?.[0] ?? "";
  return { division, divnum };
}

function wtrlClassString(competition: string, league: string, divisionCombined: string) {
  const { division, divnum } = getDivisionParts(divisionCombined);
  return `${competition.charAt(0)}${league}${division}${divnum}${competition.slice(-1)}`;
}

function knownWtrlCandidates(source: SourceRow): WtrlCandidate[] {
  const match = normalize(source.match_name);

  if (match === "zwb cycling b1") {
    return [
      {
        competitionValue: "250",
        competitionLabel: "2025/26 Round 4",
        leagueValue: "350",
        leagueLabel: "Regular",
        divisionValue: "B1",
        divisionLabel: "B1",
        raceValue: "4",
        raceLabel: "Race 4",
        classStr: "2350B10",
      },
    ];
  }

  return [];
}

function rosterFromWtrlRow(
  source: SourceRow,
  row: Record<string, unknown>,
): SyncedRosterEntry[] {
  if (!Array.isArray(row.a)) return [];

  const fallbackCategory =
    paceCategoryFrom(row.class) ?? paceCategoryFrom(row.zrldivision) ??
    paceCategoryFrom(sourceTeam(source)?.division);

  return row.a
    .map((rider) => {
      if (!rider || typeof rider !== "object") return null;
      const riderRow = rider as Record<string, unknown>;
      const name = stringValue(riderRow, ["name", "rider", "display_name"]);
      if (!name) return null;

      return {
        name,
        zwiftId: stringOrNull(riderRow.zwid ?? riderRow.zwift_id ?? riderRow.zwiftId),
        paceCategory: paceCategoryFrom(riderRow.class) ?? fallbackCategory,
      };
    })
    .filter((entry): entry is SyncedRosterEntry => Boolean(entry));
}

function riderResultsFromWtrlRow(
  source: SourceRow,
  row: Record<string, unknown>,
): SyncedZrlRiderResult[] {
  if (!Array.isArray(row.a)) return [];

  const fallbackCategory =
    paceCategoryFrom(row.class) ?? paceCategoryFrom(row.zrldivision) ??
    paceCategoryFrom(sourceTeam(source)?.division);

  return row.a
    .map((rider) => {
      if (!rider || typeof rider !== "object") return null;
      const riderRow = rider as Record<string, unknown>;
      const name = stringValue(riderRow, ["name", "rider", "display_name"]);
      if (!name) return null;
      const timeText = stringValue(riderRow, [
        "time",
        "finish_time",
        "elapsed",
        "duration",
      ]);
      return {
        name,
        zwiftId: stringOrNull(riderRow.zwid ?? riderRow.zwift_id ?? riderRow.zwiftId),
        category: paceCategoryFrom(riderRow.class) ?? fallbackCategory,
        position: numberOrNull(
          riderRow.position ?? riderRow.rank ?? riderRow.pos ?? riderRow.p,
        ),
        points: numberOrNull(
          riderRow.points ?? riderRow.pts ?? riderRow.score ?? riderRow.lpoints,
        ),
        timeText,
        timeSeconds: parseClockToSeconds(timeText),
        metadata: riderRow,
      };
    })
    .filter((entry): entry is SyncedZrlRiderResult => Boolean(entry));
}

function resultFromWtrlRow(
  source: SourceRow,
  row: Record<string, unknown>,
  sourceUrl: string,
  fallbackRoundLabel: string,
) {
  const teamName = stringValue(row, ["teamname", "d", "team", "name"]);
  if (!teamName || !teamNameMatches(teamName, source.match_name)) {
    return null;
  }

  const position = numberOrNull(row.p1 ?? row.c ?? row.position ?? row.rank);
  const points = numberOrNull(row.lpoints ?? row.j ?? row.totp ?? row.points);

  return {
    externalSource: "wtrl" as const,
    externalId: `wtrl:${source.id}:${fallbackRoundLabel}`,
    teamId: source.team_id,
    competition: "WTRL ZRL",
    roundLabel: fallbackRoundLabel,
    roundAt: null,
    position,
    points,
    totalTeams: null,
    notes: teamName,
    sourceUrl,
    metadata: row,
    rosterEntries: rosterFromWtrlRow(source, row),
    riderResults: riderResultsFromWtrlRow(source, row),
  };
}

function teamNameMatches(candidate: string, expected: string) {
  const a = normalize(candidate);
  const b = normalize(expected);
  const aliases = new Set([
    b,
    b.replace(/^zwb cycling\s+/, "zwb "),
    b.replace(/^zwb\s+/, "zwb cycling "),
  ]);

  return Array.from(aliases).some((alias) => a.includes(alias) || alias.includes(a));
}

function likelyWtrlCandidates(
  competitions: Record<string, unknown>[],
  source: SourceRow,
): WtrlCandidate[] {
  const match = normalize(source.match_name);
  const wantedExactDivision =
    match.match(/\b([abcde]\s*\d+)\b/)?.[1]?.replace(/\s+/g, "").toUpperCase() ??
    match.match(/\bcycling\s+([abcde]\s*\d+)\b/)?.[1]?.replace(/\s+/g, "").toUpperCase() ??
    "";
  const wantedDivision =
    wantedExactDivision.charAt(0) ||
    match.match(/\b([abcde])\s*\d*\b/)?.[1]?.toUpperCase() ||
    match.match(/\bcycling\s+([abcde])\d*\b/)?.[1]?.toUpperCase() ||
    sourceTeam(source)?.division?.match(/[ABCDE]/i)?.[0]?.toUpperCase() ||
    "";

  const candidates: WtrlCandidate[] = [];

  for (const competition of competitions) {
    const competitionValue = String(competition.value ?? "");
    const competitionLabel = String(competition.text ?? competition.label ?? competitionValue);
    const leagues = Array.isArray(competition.leagues) ? competition.leagues : [];
    for (const league of leagues as Record<string, unknown>[]) {
      const leagueValue = String(league.value ?? "");
      const leagueLabel = String(league.text ?? league.label ?? leagueValue);
      const divisions = Array.isArray(league.divisions) ? league.divisions : [];
      for (const division of divisions as Record<string, unknown>[]) {
        const divisionValue = String(division.value ?? "");
        const divisionLabel = String(division.text ?? division.label ?? divisionValue);
        const normalizedDivision = divisionValue.toUpperCase();
        if (wantedExactDivision && normalizedDivision !== wantedExactDivision) {
          continue;
        }
        if (!wantedExactDivision && wantedDivision && !normalizedDivision.startsWith(wantedDivision)) {
          continue;
        }

        const races = Array.isArray(division.races) ? [...division.races] : [];
        races.sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0));

        for (const race of races as Record<string, unknown>[]) {
          const raceValue = String(race.value ?? "");
          if (!raceValue) continue;
          candidates.push({
            competitionValue,
            competitionLabel,
            leagueValue,
            leagueLabel,
            divisionValue,
            divisionLabel,
            raceValue,
            raceLabel: String(race.text ?? race.label ?? raceValue),
            classStr: wtrlClassString(competitionValue, leagueValue, divisionValue),
          });
        }
      }
    }
  }

  return candidates.slice(0, 24);
}

async function syncWtrlSource(source: SourceRow) {
  const results: ParsedResult[] = [];
  const configuredUrl = source.source_url;

  if (!process.env.WTRL_COOKIE) {
    throw new SyncSkip(
      "WTRL vereist een ingelogde sessie-cookie; bron overgeslagen.",
    );
  }

  if (configuredUrl.includes("/api/zrl/")) {
    const json = JSON.parse(await fetchText(source, configuredUrl));
    for (const row of parsePayloadRows(json.payload ?? json)) {
      const parsed = resultFromWtrlRow(source, row, configuredUrl, "WTRL API");
      if (parsed) results.push(parsed);
    }
    return results;
  }

  const metadataUrl = absoluteWtrlUrl("/api/zrl/results/19");
  const metadata = JSON.parse(await fetchText(source, metadataUrl));
  const competitions = metadata?.payload?.competition;

  if (!Array.isArray(competitions)) {
    throw new Error("WTRL metadata bevat geen competition-lijst.");
  }

  const seenCandidates = new Set<string>();
  const candidates = [
    ...knownWtrlCandidates(source),
    ...likelyWtrlCandidates(competitions, source),
  ].filter((candidate) => {
    const key = `${candidate.classStr}:${candidate.raceValue}`;
    if (seenCandidates.has(key)) return false;
    seenCandidates.add(key);
    return true;
  });

  for (const candidate of candidates) {
    const roundLabel = `${candidate.competitionLabel} ${candidate.leagueLabel} ${candidate.divisionLabel} ${candidate.raceLabel}`;
    const leagueUrl = absoluteWtrlUrl(
      `/api/zrl/league/19/${candidate.classStr}/${candidate.raceValue}`,
    );
    const json = JSON.parse(await fetchText(source, leagueUrl));
    const candidateResults: ParsedResult[] = [];

    for (const row of parsePayloadRows(json.payload ?? json)) {
      const parsed = resultFromWtrlRow(source, row, leagueUrl, roundLabel);
      if (parsed) candidateResults.push(parsed);
    }

    if (candidateResults.length > 0) {
      const resultUrl = absoluteWtrlUrl(
        `/api/zrl/results/19/${candidate.classStr}/${candidate.raceValue}`,
      );

      try {
        const raceJson = JSON.parse(await fetchText(source, resultUrl));
        for (const row of parsePayloadRows(raceJson.payload ?? raceJson)) {
          const raceResult = resultFromWtrlRow(source, row, resultUrl, roundLabel);
          if (!raceResult?.rosterEntries?.length) continue;

          const target =
            candidateResults.find(
              (result) =>
                result.notes &&
                raceResult.notes &&
                teamNameMatches(result.notes, raceResult.notes),
            ) ?? candidateResults[0];

          target.rosterEntries = raceResult.rosterEntries;
          target.metadata = {
            league: target.metadata,
            race: raceResult.metadata,
          };
          break;
        }
      } catch (err) {
        candidateResults[0].metadata = {
          league: candidateResults[0].metadata,
          roster_sync_warning:
            err instanceof Error ? err.message : "WTRL roster niet opgehaald.",
        };
      }

      return candidateResults;
    }

    await wait(750);
  }

  throw new SyncSkip(`Geen WTRL-resultaat gevonden voor "${source.match_name}".`);
}

async function syncClubLadderSource(source: SourceRow) {
  const html = await fetchText(source);
  const text = stripHtml(html);
  const matchIndex = normalize(text).indexOf(normalize(source.match_name));

  if (matchIndex === -1) {
    throw new SyncSkip(
      `Geen publieke Club Ladder-stand gevonden voor "${source.match_name}".`,
    );
  }

  const start = Math.max(0, matchIndex - 300);
  const end = Math.min(text.length, matchIndex + source.match_name.length + 300);
  const context = text.slice(start, end);
  const rankMatch = context.match(/(?:rank|#|positie)?\s*(\d{1,4})/i);
  const position = rankMatch ? Number(rankMatch[1]) : null;

  if (!position) {
    throw new SyncSkip(
      `Club Ladder-vermelding voor "${source.match_name}" gevonden, maar positie niet herkend.`,
    );
  }

  return [
    {
      externalSource: "club_ladder" as const,
      externalId: `club_ladder:${source.id}:current`,
      teamId: source.team_id,
      competition: "Club Ladder",
      roundLabel: "Ladder positie",
      roundAt: null,
      position,
      points: null,
      totalTeams: null,
      notes: null,
      sourceUrl: source.source_url,
      metadata: { context },
    },
  ];
}

async function syncSource(source: SourceRow) {
  if (source.provider === "wtrl") return await syncWtrlSource(source);
  return await syncClubLadderSource(source);
}

// Supabase query builders are structurally typed here because this helper is
// shared by both user-scoped SSR clients and service-role cron clients.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveResult(supabase: any, result: ParsedResult) {
  const existing = await asQuery<{ id: string }>(
    supabase
      .from("team_results")
      .select("id")
      .eq("external_source", result.externalSource)
      .eq("external_id", result.externalId)
      .maybeSingle(),
  );

  const values = {
    team_id: result.teamId,
    competition: result.competition,
    round_label: result.roundLabel,
    round_at: result.roundAt,
    position: result.position,
    points: result.points,
    total_teams: result.totalTeams,
    notes: result.notes,
    external_source: result.externalSource,
    external_id: result.externalId,
    source_url: result.sourceUrl,
    synced_at: new Date().toISOString(),
    metadata: result.metadata,
  };

  if (existing.error) throw new Error(existing.error.message);

  if (existing.data?.id) {
    const update = await asQuery<unknown>(
      supabase.from("team_results").update(values).eq("id", existing.data.id),
    );
    if (update.error) throw new Error(update.error.message);
    return existing.data.id;
  }

  const insert = await asQuery<{ id: string }>(
    supabase.from("team_results").insert(values).select("id").single(),
  );
  if (insert.error) throw new Error(insert.error.message);
  if (!insert.data?.id) throw new Error("Teamresultaat opgeslagen zonder id.");
  return insert.data.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureTeamMember(supabase: any, teamId: string, profileId: string) {
  const existing = await asQuery<{ team_id: string }>(
    supabase
      .from("team_members")
      .select("team_id")
      .eq("team_id", teamId)
      .eq("profile_id", profileId)
      .maybeSingle(),
  );
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return;

  const insert = await asQuery<unknown>(
    supabase.from("team_members").insert({
      team_id: teamId,
      profile_id: profileId,
      role: "member",
    }),
  );
  if (insert.error) throw new Error(insert.error.message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveRosterEntries(supabase: any, result: ParsedResult) {
  const entries = result.rosterEntries ?? [];
  let synced = 0;

  for (const entry of entries) {
    const existing = await asQuery<{ id: string; claimed_by: string | null }>(
      supabase
        .from("roster_entries")
        .select("id, claimed_by")
        .ilike("name", entry.name)
        .limit(1)
        .maybeSingle(),
    );
    if (existing.error) throw new Error(existing.error.message);

    const values = {
      team_name: result.notes,
      team_id: result.teamId,
      pace_category: entry.paceCategory,
      team_assignment_source: "roster_sync",
      ...(entry.zwiftId ? { zwift_id: entry.zwiftId } : {}),
    };

    if (existing.data?.id) {
      const update = await asQuery<unknown>(
        supabase.from("roster_entries").update(values).eq("id", existing.data.id),
      );
      if (update.error) throw new Error(update.error.message);

      if (existing.data.claimed_by) {
        await ensureTeamMember(supabase, result.teamId, existing.data.claimed_by);
      }

      synced += 1;
      continue;
    }

    const insert = await asQuery<unknown>(
      supabase.from("roster_entries").insert({
        name: entry.name,
        zwift_id: entry.zwiftId,
        pace_category: entry.paceCategory,
        team_name: result.notes,
        team_id: result.teamId,
        team_assignment_source: "roster_sync",
      }),
    );
    if (insert.error) throw new Error(insert.error.message);
    synced += 1;
  }

  return synced;
}

function normalizedName(value: string) {
  return value
    .replace(/\[[^\]]*\]|\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function matchZrlRider(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  rider: SyncedZrlRiderResult,
) {
  if (rider.zwiftId) {
    const profile = await asQuery<{ id: string }>(
      supabase
        .from("profiles")
        .select("id")
        .eq("zwift_id", rider.zwiftId)
        .limit(1)
        .maybeSingle(),
    );
    if (profile.error) throw new Error(profile.error.message);
    if (profile.data?.id) {
      return { profileId: profile.data.id, rosterEntryId: null, matchedVia: "zwift_id" };
    }

    const roster = await asQuery<{ id: string; claimed_by: string | null }>(
      supabase
        .from("roster_entries")
        .select("id, claimed_by")
        .eq("zwift_id", rider.zwiftId)
        .limit(1)
        .maybeSingle(),
    );
    if (roster.error) throw new Error(roster.error.message);
    if (roster.data?.id) {
      return {
        profileId: roster.data.claimed_by,
        rosterEntryId: roster.data.id,
        matchedVia: roster.data.claimed_by ? "zwift_id" : "roster",
      };
    }
  }

  const roster = await asQuery<{ id: string; claimed_by: string | null }>(
    supabase
      .from("roster_entries")
      .select("id, claimed_by")
      .ilike("name", rider.name)
      .limit(1)
      .maybeSingle(),
  );
  if (roster.error) throw new Error(roster.error.message);
  if (roster.data?.id) {
    return {
      profileId: roster.data.claimed_by,
      rosterEntryId: roster.data.id,
      matchedVia: "roster",
    };
  }

  const profile = await asQuery<{ id: string }>(
    supabase
      .from("profiles")
      .select("id")
      .ilike("display_name", rider.name)
      .limit(1)
      .maybeSingle(),
  );
  if (profile.error) throw new Error(profile.error.message);
  if (profile.data?.id) {
    return { profileId: profile.data.id, rosterEntryId: null, matchedVia: "profile_name" };
  }

  return { profileId: null, rosterEntryId: null, matchedVia: "unmatched" };
}

async function saveZrlRiderResults(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  result: ParsedResult,
  teamResultId: string,
) {
  const riders = result.riderResults ?? [];
  let synced = 0;

  for (const rider of riders) {
    const match = await matchZrlRider(supabase, rider);
    const riderKey = rider.zwiftId ?? normalizedName(rider.name);
    const externalId = `${result.externalId}:rider:${riderKey}`;
    const values = {
      team_result_id: teamResultId,
      event_id: null,
      team_id: result.teamId,
      profile_id: match.profileId,
      roster_entry_id: match.rosterEntryId,
      external_source: result.externalSource,
      external_id: externalId,
      rider_name: rider.name,
      zwift_id: rider.zwiftId,
      category: rider.category,
      position: rider.position,
      points: rider.points,
      time_text: rider.timeText,
      time_seconds: rider.timeSeconds,
      matched_via: match.matchedVia,
      round_label: result.roundLabel,
      round_at: result.roundAt,
      source_url: result.sourceUrl,
      metadata: rider.metadata,
      synced_at: new Date().toISOString(),
    };

    const existing = await asQuery<{ id: string }>(
      supabase
        .from("zrl_rider_results")
        .select("id")
        .eq("external_source", result.externalSource)
        .eq("external_id", externalId)
        .maybeSingle(),
    );
    if (existing.error) throw new Error(existing.error.message);

    const save = existing.data?.id
      ? await asQuery<unknown>(
          supabase.from("zrl_rider_results").update(values).eq("id", existing.data.id),
        )
      : await asQuery<unknown>(supabase.from("zrl_rider_results").insert(values));
    if (save.error) throw new Error(save.error.message);
    synced += 1;
  }

  return synced;
}

async function markSource(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  sourceId: string,
  values: Record<string, unknown>,
) {
  const res = await asQuery<unknown>(
    supabase.from("team_result_sources").update(values).eq("id", sourceId),
  );
  if (res.error) throw new Error(res.error.message);
}

export async function syncTeamResults(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<TeamResultsSyncSummary> {
  const defaults = await ensureDefaultTeamsAndSources(supabase);
  const { data, error } = await supabase
    .from("team_result_sources")
    .select("id, team_id, provider, source_url, match_name, teams(name, type, division)")
    .eq("enabled", true)
    .order("provider")
    .order("match_name");

  if (error) throw new Error(error.message);

  const sources = ((data ?? []) as SourceRow[]).sort((a, b) => {
    if (a.provider !== b.provider) return a.provider === "wtrl" ? -1 : 1;
    return a.match_name.localeCompare(b.match_name);
  });
  const outcomes: SyncSourceOutcome[] = [];
  let insertedOrUpdated = 0;

  for (const source of sources) {
    try {
      const parsedResults = await syncSource(source);
      let rosterSynced = 0;
      let ridersSynced = 0;
      for (const result of parsedResults) {
        const teamResultId = await saveResult(supabase, result);
        rosterSynced += await saveRosterEntries(supabase, result);
        ridersSynced += await saveZrlRiderResults(supabase, result, teamResultId);
      }
      insertedOrUpdated += parsedResults.length;
      await markSource(supabase, source.id, {
        last_synced_at: new Date().toISOString(),
        last_error: null,
      });
      outcomes.push({
        sourceId: source.id,
        provider: source.provider,
        matchName: source.match_name,
        insertedOrUpdated: parsedResults.length,
        rosterSynced: rosterSynced + ridersSynced,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Onbekende sync-fout.";
      if (err instanceof SyncSkip) {
        await markSource(supabase, source.id, {
          last_synced_at: new Date().toISOString(),
          last_error: null,
        });
        outcomes.push({
          sourceId: source.id,
          provider: source.provider,
          matchName: source.match_name,
          insertedOrUpdated: 0,
          rosterSynced: 0,
          skipped: message,
        });
        continue;
      }

      await markSource(supabase, source.id, {
        last_synced_at: new Date().toISOString(),
        last_error: message,
      });
      outcomes.push({
        sourceId: source.id,
        provider: source.provider,
        matchName: source.match_name,
        insertedOrUpdated: 0,
        rosterSynced: 0,
        error: message,
      });
    }
  }

  return {
    ok: outcomes.every((source) => !source.error),
    teamsCreated: defaults.teamsCreated,
    sourcesCreated: defaults.sourcesCreated,
    insertedOrUpdated,
    sources: outcomes,
  };
}
