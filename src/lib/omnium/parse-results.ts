// Parser voor geplakte Omnium-uitslagen.
//
// Dit is de productieroute voor uitslagen en blijft dat, ook als de
// Zwift-API-spike slaagt. Onder tijdsdruk tijdens een uitzending moet je een
// uitslag kunnen plakken zoals hij ergens vandaan komt, niet zoals wij hem
// graag zouden willen — dus de parser is tolerant: hij herkent het
// scheidingsteken zelf, sorteert de kolommen op hun vorm in plaats van op hun
// plaats, en meldt wat hij niet snapt in plaats van het stil weg te laten.
//
// Zelfde huispatroon als parseParticipantLines in beheer/event-scan en
// parseExport in beheer/citaten: eerst parsen naar kandidaten, dan pas
// bevestigen. Nooit automatisch wegschrijven.

import { OMNIUM_LEAGUES } from "@/lib/omnium/scales";
import type { Discipline, ResultStatus } from "@/lib/omnium/scoring";

export type ParseMode =
  | "finish"
  | "segment"
  | "crit_points"
  | "crit_detailed"
  | "sheet_csv";

export type ParsedResultRow = {
  lineNumber: number;
  raw: string;
  name: string;
  teamName: string | null;
  league: string | null;
  zwiftId: string | null;
  position: number | null;
  timeText: string | null;
  timeSeconds: number | null;
  segmentSeconds: number | null;
  points: number | null;
  /**
   * Achterstand op de leider in seconden, uit een "+4.187s"-kolom. ZwiftPower
   * toont alleen bij de eerste renner een absolute tijd; de rest staat op de
   * afgeronde leiderstijd met het echte verschil ernaast. Dat verschil is de
   * enige plek waar de duizendsten staan, en in een pakketsprint scheiden die
   * de hele uitslag.
   */
  deltaSeconds: number | null;
  status: ResultStatus;
  /** Alleen bij crit_detailed: in welk blok stond deze regel. */
  block: string | null;
};

export type ParseIssue = {
  lineNumber: number;
  raw: string;
  reason: string;
};

export type ParseOutcome = {
  rows: ParsedResultRow[];
  issues: ParseIssue[];
};

/** Punten per onderdeel uit één regel van de oude Google Sheet. */
export type SheetRow = {
  lineNumber: number;
  name: string;
  teamName: string | null;
  league: string | null;
  points: Partial<Record<Discipline, number>>;
  total: number | null;
};

/** "+4.187s", "+01:06", "+02:21" — met of zonder de s. */
const DELTA = /^\+\s*(\d{1,2}(?::\d{1,2}){0,2}(?:[.,]\d{1,3})?)\s*s?$/;

/** "22:42 +4.187s" in één cel: tijd en verschil horen uit elkaar. */
const TIME_WITH_DELTA =
  /^(\d{1,2}(?::\d{1,2}){0,2}(?:[.,]\d{1,3})?)\s+(\+\s*\d{1,2}(?::\d{1,2}){0,2}(?:[.,]\d{1,3})?\s*s?)$/;

/**
 * Splitst cellen waarin tijd en verschil aan elkaar geplakt zitten. Zonder deze
 * stap komt "22:42 +4.187s" als tekst binnen en belandt hij in de náám van de
 * renner — precies wat er gebeurde bij de proefdraai op editie 7.
 */
function expandTimeDelta(tokens: string[]): string[] {
  const out: string[] = [];
  for (const token of tokens) {
    const match = TIME_WITH_DELTA.exec(token.trim());
    if (match) {
      out.push(match[1], match[2].replace(/\s+/g, ""));
      continue;
    }
    out.push(token);
  }
  return out;
}

const STATUS_TOKENS: Record<string, ResultStatus> = {
  DNF: "dnf",
  DNS: "dns",
  DSQ: "dsq",
  DQ: "dsq",
};

/**
 * Zwift en ZwiftPower tonen vaak één kleur in plaats van de gepaarde league.
 * "RUBY" hoort dan bij DIAMOND-RUBY. Dat scheelt handmatig corrigeren.
 */
export function normalizeLeague(raw: string | null | undefined): string | null {
  const token = (raw ?? "").trim().toUpperCase().replace(/\s+/g, "-");
  if (!token) return null;
  for (const league of OMNIUM_LEAGUES) {
    if (league === token) return league;
  }
  for (const league of OMNIUM_LEAGUES) {
    if (league.split("-").includes(token)) return league;
  }
  return null;
}

/** "1:23.4", "12:34", "1:02:03" en "58.2" leveren allemaal seconden op. */
export function parseTimeToSeconds(raw: string): number | null {
  const token = raw.trim().replace(",", ".");
  if (!/^\d{1,2}(:\d{1,2}){0,2}(\.\d{1,3})?$/.test(token)) return null;
  const parts = token.split(":").map(Number);
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function looksLikeTime(token: string): boolean {
  return token.includes(":") && parseTimeToSeconds(token) !== null;
}

function looksLikeInteger(token: string): boolean {
  return /^\d{1,4}\.?$/.test(token.trim());
}

/**
 * Splitst een regel op het scheidingsteken dat er daadwerkelijk in staat. Tab
 * wint, dan puntkomma, dan twee-of-meer spaties, dan komma — die laatste als
 * laatste omdat namen er zelf ook een kunnen bevatten ("Janssen, Jeroen").
 */
export function splitLine(line: string): string[] {
  const candidates: Array<[string, RegExp]> = [
    ["\t", /\t/],
    [";", /;/],
    ["  ", / {2,}/],
    [",", /,/],
  ];
  for (const [, pattern] of candidates) {
    if (pattern.test(line)) {
      return line
        .split(pattern)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
    }
  }
  return line
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Splitst een echte CSV-regel en houdt lege cellen staan. Dat verschil met
 * splitLine is wezenlijk: bij geplakte uitslagen is een lege kolom ruis, maar
 * in een CSV telt de plaats van elke cel — de oude Omnium-sheet heeft een lege
 * Team-kolom, en die weggooien schuift alle punten een kolom op.
 */
export function splitCsvRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

/** Puntkomma of tab wint van komma, want namen bevatten zelf ook komma's. */
export function detectDelimiter(headerLine: string): string {
  if (headerLine.includes("\t")) return "\t";
  if (headerLine.includes(";")) return ";";
  return ",";
}

/** Haalt "[ZWB]" of "(ZWB)" uit de naam en geeft beide los terug. */
function splitTeam(name: string): { name: string; teamName: string | null } {
  const match = /[[(]([^\])]+)[\])]/.exec(name);
  if (!match) return { name: name.trim(), teamName: null };
  return {
    name: name.replace(match[0], "").replace(/\s+/g, " ").trim(),
    teamName: match[1].trim(),
  };
}

type Classified = {
  positions: number[];
  times: string[];
  /** Achterstanden op de leider, in seconden. */
  deltas: number[];
  integers: number[];
  league: string | null;
  status: ResultStatus | null;
  zwiftId: string | null;
  texts: string[];
};

function classify(tokens: string[]): Classified {
  const out: Classified = {
    positions: [],
    times: [],
    deltas: [],
    integers: [],
    league: null,
    status: null,
    zwiftId: null,
    texts: [],
  };

  for (const token of tokens) {
    const delta = DELTA.exec(token.trim());
    if (delta) {
      const seconds = parseTimeToSeconds(delta[1]);
      if (seconds != null) out.deltas.push(seconds);
      continue;
    }
    const upper = token.toUpperCase();
    if (STATUS_TOKENS[upper]) {
      out.status = STATUS_TOKENS[upper];
      continue;
    }
    const league = normalizeLeague(token);
    if (league) {
      out.league = league;
      continue;
    }
    if (looksLikeTime(token)) {
      out.times.push(token);
      continue;
    }
    // Een lang getal is een Zwift-ID, geen positie of punten.
    if (/^\d{5,}$/.test(token)) {
      out.zwiftId = token;
      continue;
    }
    if (looksLikeInteger(token)) {
      out.integers.push(Number(token.replace(".", "")));
      continue;
    }
    // Een kaal decimaal getal kan een segmenttijd in seconden zijn.
    if (/^\d{1,3}\.\d{1,2}$/.test(token)) {
      out.times.push(token);
      continue;
    }
    out.texts.push(token);
  }

  return out;
}

function emptyRow(lineNumber: number, raw: string): ParsedResultRow {
  return {
    lineNumber,
    raw,
    name: "",
    teamName: null,
    league: null,
    zwiftId: null,
    position: null,
    timeText: null,
    timeSeconds: null,
    segmentSeconds: null,
    points: null,
    deltaSeconds: null,
    status: "finished",
    block: null,
  };
}

function parseLine(
  line: string,
  lineNumber: number,
  mode: Exclude<ParseMode, "sheet_csv" | "crit_detailed">,
  defaultLeague: string | null,
): ParsedResultRow | ParseIssue {
  const tokens = expandTimeDelta(splitLine(line));
  if (tokens.length === 0) {
    return { lineNumber, raw: line, reason: "Lege regel." };
  }

  const info = classify(tokens);
  const nameToken = info.texts.join(" ").trim();
  if (!nameToken) {
    return { lineNumber, raw: line, reason: "Geen naam gevonden." };
  }

  const { name, teamName } = splitTeam(nameToken);
  const row = emptyRow(lineNumber, line);
  row.name = name;
  row.teamName = teamName;
  row.league = info.league ?? defaultLeague;
  row.zwiftId = info.zwiftId;
  row.status = info.status ?? "finished";
  row.deltaSeconds = info.deltas.length > 0 ? info.deltas[0] : null;

  if (mode === "finish") {
    // Het eerste kale getal is de klassering; de tijd is een tijd.
    row.position = info.integers.length > 0 ? info.integers[0] : null;
    if (info.times.length > 0) {
      row.timeText = info.times[0];
      row.timeSeconds = parseTimeToSeconds(info.times[0]);
    }
  } else if (mode === "segment") {
    const time = info.times[0] ?? null;
    if (!time) {
      return { lineNumber, raw: line, reason: "Geen segmenttijd gevonden." };
    }
    row.timeText = time;
    row.segmentSeconds = parseTimeToSeconds(time);
  } else {
    // crit_points: het laatste kale getal is het puntentotaal.
    if (info.integers.length === 0) {
      return { lineNumber, raw: line, reason: "Geen punten gevonden." };
    }
    row.points = info.integers[info.integers.length - 1];
    if (info.integers.length > 1) row.position = info.integers[0];
  }

  if (!row.league) {
    return { lineNumber, raw: line, reason: "Geen league; kies een standaard." };
  }

  return row;
}

function isIssue(value: ParsedResultRow | ParseIssue): value is ParseIssue {
  return "reason" in value;
}

const BLOCK_HEADER = /^(sprint\s*\d*|finish|finale)\b/i;

/**
 * Parseert een geplakte uitslag. Bij crit_detailed worden kopregels als
 * "SPRINT 1" en "FINISH" herkend en komen de regels eronder in dat blok
 * terecht; de motor deelt de FAL-punten daarna zelf uit.
 */
export function parseOmniumResults(
  input: string,
  options: { mode: ParseMode; defaultLeague?: string | null },
): ParseOutcome {
  const rows: ParsedResultRow[] = [];
  const issues: ParseIssue[] = [];
  const defaultLeague = normalizeLeague(options.defaultLeague ?? null);

  if (options.mode === "sheet_csv") {
    return { rows: [], issues: [] };
  }
  // Vastleggen in een const, anders verliest de narrowing zich in de closure.
  const mode = options.mode;

  const lines = input.split(/\r?\n/);
  let block: string | null = mode === "crit_detailed" ? "finish" : null;
  let positionInBlock = 0;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed) return;

    if (mode === "crit_detailed") {
      const header = BLOCK_HEADER.exec(trimmed);
      // Een kopregel bestaat alleen uit die kop; anders is het een renner die
      // toevallig "Finish" in zijn naam heeft staan.
      if (header && splitLine(trimmed).length <= 2) {
        block = trimmed.toLowerCase().startsWith("sprint")
          ? trimmed.toLowerCase().replace(/\s+/g, " ")
          : "finish";
        positionInBlock = 0;
        return;
      }
    }

    const lineMode = mode === "crit_detailed" ? "finish" : mode;
    const parsed = parseLine(trimmed, lineNumber, lineMode, defaultLeague);
    if (isIssue(parsed)) {
      issues.push(parsed);
      return;
    }

    if (mode === "crit_detailed") {
      positionInBlock += 1;
      // In een blok is de regelvolgorde de uitslag, tenzij er een nummer staat.
      parsed.position = parsed.position ?? positionInBlock;
      parsed.block = block;
    }

    rows.push(parsed);
  });

  applyDeltas(rows, mode);
  return { rows, issues };
}

/**
 * Zet de achterstanden om in echte tijden: leiderstijd + verschil.
 *
 * Nodig omdat de absolute tijd in zo'n uitslag is afgerond op hele seconden.
 * Acht renners in dezelfde seconde staan er dan als acht keer "22:42", en dat
 * zou de motor als één gedeelde plaats lezen. Het verschil draagt de
 * duizendsten en dus de werkelijke volgorde.
 *
 * Per league apart, want elke categorie heeft zijn eigen leider. Rijen zonder
 * verschil houden hun eigen tijd; is er geen leiderstijd, dan blijft het bij wat
 * er stond en beslist de regelvolgorde, zoals eerder.
 */
function applyDeltas(rows: ParsedResultRow[], mode: ParseMode): void {
  if (mode === "crit_points" || mode === "sheet_csv") return;
  const leaders = new Map<string, number>();

  for (const row of rows) {
    const league = row.league ?? "";
    const own = mode === "segment" ? row.segmentSeconds : row.timeSeconds;
    if (!leaders.has(league) && row.deltaSeconds == null && own != null) {
      leaders.set(league, own);
    }
  }

  for (const row of rows) {
    if (row.deltaSeconds == null) continue;
    const leader = leaders.get(row.league ?? "");
    if (leader == null) continue;
    // Afronden op duizendsten: 1358 + 4.187 mag geen 1362.1870000000001 worden.
    const exact = Math.round((leader + row.deltaSeconds) * 1000) / 1000;
    if (mode === "segment") row.segmentSeconds = exact;
    else row.timeSeconds = exact;
  }
}

const SHEET_DISCIPLINE_COLUMNS: Array<[RegExp, Discipline]> = [
  [/^prologue$/i, "prologue"],
  [/^scratch$/i, "scratch"],
  [/^sprint$/i, "sprint"],
  [/^crit$/i, "crit"],
];

/**
 * De oude Google Sheet per editie: `Pos,Rider,Team,Cat,Prologue,Sprint,
 * Scratch,Crit,Total`. Alleen puntentotalen, geen posities of tijden — dat is
 * genoeg om het seizoensklassement te herbouwen en tegen de oude GC-sheet te
 * leggen.
 */
export function parseSheetCsv(input: string): {
  rows: SheetRow[];
  issues: ParseIssue[];
} {
  const rows: SheetRow[] = [];
  const issues: ParseIssue[] = [];
  const lines = input.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { rows, issues };

  const delimiter = detectDelimiter(lines[0]);
  const header = splitCsvRow(lines[0], delimiter);
  const columnFor = (pattern: RegExp) =>
    header.findIndex((cell) => pattern.test(cell));

  const nameIndex = columnFor(/^(rider|name|renner)$/i);
  const teamIndex = columnFor(/^team$/i);
  const leagueIndex = columnFor(/^(cat|category|league)$/i);
  const totalIndex = columnFor(/^(total|gc|totaal)$/i);

  if (nameIndex < 0) {
    issues.push({
      lineNumber: 1,
      raw: lines[0],
      reason: "Geen kolom met rennernamen gevonden.",
    });
    return { rows, issues };
  }

  const disciplineIndexes = SHEET_DISCIPLINE_COLUMNS.map(
    ([pattern, discipline]) => [columnFor(pattern), discipline] as const,
  ).filter(([index]) => index >= 0);

  lines.slice(1).forEach((line, offset) => {
    const lineNumber = offset + 2;
    const cells = splitCsvRow(line, delimiter);
    const rawName = cells[nameIndex] ?? "";
    if (!rawName.trim()) {
      issues.push({ lineNumber, raw: line, reason: "Geen naam in deze regel." });
      return;
    }
    const { name, teamName } = splitTeam(rawName);
    const points: Partial<Record<Discipline, number>> = {};
    for (const [index, discipline] of disciplineIndexes) {
      const value = Number((cells[index] ?? "").trim());
      if (Number.isFinite(value)) points[discipline] = value;
    }
    const totalRaw = totalIndex >= 0 ? Number((cells[totalIndex] ?? "").trim()) : NaN;

    rows.push({
      lineNumber,
      name,
      teamName: teamName ?? (teamIndex >= 0 ? cells[teamIndex]?.trim() || null : null),
      league: leagueIndex >= 0 ? normalizeLeague(cells[leagueIndex]) : null,
      points,
      total: Number.isFinite(totalRaw) ? totalRaw : null,
    });
  });

  return { rows, issues };
}
