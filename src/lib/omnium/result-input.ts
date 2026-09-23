import { z } from "zod";
import { parseOmniumResults, parseSheetCsv, type ParsedResultRow, type ParseMode } from "./parse-results";
import { OMNIUM_LEAGUES } from "./scales";
import type { Discipline } from "./scoring";
import { nameKeyOf } from "./import";

const nullableNumber = z.number().finite().nonnegative().nullable();
export const parsedRowsSchema = z.array(z.object({
  lineNumber: z.number().int().positive(), raw: z.string().max(5000), name: z.string().trim().min(1).max(300),
  teamName: z.string().max(300).nullable(), league: z.string().nullable(), zwiftId: z.string().regex(/^\d+$/).nullable(),
  position: z.number().int().positive().nullable(), timeText: z.string().max(100).nullable(), timeSeconds: nullableNumber,
  segmentSeconds: nullableNumber, points: nullableNumber, deltaSeconds: nullableNumber,
  status: z.enum(["finished", "dnf", "dns", "dsq"]), block: z.string().max(100).nullable(),
})).max(5000);

export function prepareResultInput(input: { raw: string; mode: ParseMode; defaultLeague?: string | null; parsedRows?: ParsedResultRow[] }, discipline: Discipline) {
  if (input.raw.length > 1_000_000) throw new Error("Uitslag te groot.");
  if (input.mode === "sheet_csv") {
    const sheet = parseSheetCsv(input.raw);
    const rows: ParsedResultRow[] = sheet.rows.filter((r) => r.points[discipline] !== undefined).map((r) => ({
      lineNumber: r.lineNumber, raw: "Sheet-CSV", name: r.name, teamName: r.teamName, league: r.league ?? input.defaultLeague ?? null,
      zwiftId: null, position: null, timeText: null, timeSeconds: null, segmentSeconds: null, points: r.points[discipline]!, deltaSeconds: null, status: "finished", block: null,
    }));
    if (!rows.length) throw new Error(`Geen ${discipline}-punten in deze Sheet-CSV.`);
    return { rows: parsedRowsSchema.parse(rows), issues: sheet.issues };
  }
  if (input.parsedRows) {
    const rows = parsedRowsSchema.parse(input.parsedRows).map((r) => ({ ...r, block: discipline === "crit" ? "finish" : null }));
    if (discipline === "sprint" && rows.some((r) => !r.segmentSeconds)) throw new Error("Sprint Quali vereist segmenttijden.");
    const extra = discipline === "crit" && input.raw.trim() ? parseOmniumResults(input.raw, { mode: "crit_detailed", defaultLeague: input.defaultLeague }) : { rows: [], issues: [] };
    if (extra.rows.some((r) => !r.block || !/^sprint\s*\d*$/i.test(r.block))) throw new Error("Plak alleen sprintblokken bij een Zwift-finishuitslag.");
    return { rows: [...rows, ...extra.rows.map((r, i) => ({ ...r, lineNumber: rows.length + i + 1 }))], issues: extra.issues };
  }
  const allowed = discipline === "crit" ? ["crit_points", "crit_detailed"] : discipline === "sprint" ? ["segment", "finish"] : ["finish"];
  if (!allowed.includes(input.mode)) throw new Error("Ongeldige invoervorm voor dit onderdeel.");
  return parseOmniumResults(input.raw, { mode: input.mode, defaultLeague: input.defaultLeague });
}

export function checkResultRows(rows: ParsedResultRow[]) {
  const keys = new Set<string>();
  for (const row of rows) {
    if (!OMNIUM_LEAGUES.some((l) => l === row.league)) throw new Error(`Kies een league voor ${row.name}.`);
    const key = `${row.zwiftId ?? row.name.toLocaleLowerCase()}|${row.block ?? ""}`;
    if (keys.has(key)) throw new Error(`Dubbele uitslag voor ${row.name}.`);
    keys.add(key);
  }
}

/** Filter vóór het rangschikken: gasten mogen de punten van ingeschreven renners niet verschuiven. */
export function eligibleResultRows(rows: ParsedResultRow[], registered: Set<string> | null, idOf: (row: ParsedResultRow) => string) {
  return { eligible: rows.filter((r) => registered === null || registered.has(idOf(r))), guests: rows.filter((r) => registered !== null && !registered.has(idOf(r))) };
}

/**
 * Een API-finisher en een geplakte tussensprint hebben niet dezelfde velden.
 * Als binnen deze ene import exact één Zwift-ID bij een naam hoort, gebruikt
 * ook de naamregel dat ID. Bij twee gelijknamige Zwift-renners blijft de naam
 * bewust los en moet beheer de identiteit oplossen.
 */
export function resultKeyResolver(rows: ParsedResultRow[]) {
  const idsByName = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.zwiftId) continue;
    const key = nameKeyOf(row.name);
    const ids = idsByName.get(key) ?? new Set<string>();
    ids.add(row.zwiftId);
    idsByName.set(key, ids);
  }
  return (row: ParsedResultRow) => {
    if (row.zwiftId) return `zwift:${row.zwiftId}`;
    const ids = idsByName.get(nameKeyOf(row.name));
    if (ids?.size === 1) return `zwift:${[...ids][0]}`;
    return nameKeyOf(row.name);
  };
}
