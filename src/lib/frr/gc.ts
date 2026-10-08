// Het algemeen klassement van een FRR-tour, van flammerougeracing.com.
//
// De GC-pagina is WordPress met wpDataTables. De eerste 25 rijen staan in de
// HTML, de rest komt via admin-ajax met de nonce uit de pagina. De tabel bevat
// het klassement na élke etappe (kolom 3); we bewaren alleen de laatste.
//
// De kolommen hebben geen namen in het antwoord, dus we lezen op positie en
// controleren elke rij. Verandert FRR de tabel, dan faalt de sync met een
// melding in plaats van onzin op te slaan. Vastgelegd op 2026-09-29 met de
// Triquetra-tabel (code "FTQ.5"):
//
//   0 tourcode   2 geslacht-klasse ("M-BON")   3 etappe   6 klasse
//   7 positie    8 naam   9 club   10 leeftijd   11 Zwift-ID ("4,662,751")
//   14 etappetijd (s)   15 gereden etappes   16 tourtijd (s, "26,165.40")
//   18 tijdverlies in deze etappe (s)
//   19 opgeteld tijdverlies (s), zonder straf
//   20 straf voor een upgrade ("(30s)" of "-")
//   21 opgeteld tijdverlies van de nummer één van de klasse (s)
//   23 eGAP zoals FRR hem toont ("1 m 10.886 s", "-" voor de leider)
//
// De eGAP van FRR is kolom 19 plus de straf, min kolom 21 (gemeten 2026-10-04
// op Ignite na etappe 2: 9,42 + 30 − 8,05 = 31,37 s). Tot die dag lazen we
// alleen kolom 19, waardoor een renner met straf op de goede plaats stond met
// een te kleine eGAP.

import * as cheerio from "cheerio";

export const FRR_GC_PAGE_URL = "https://flammerougeracing.com/tour-results-gc/";
export const FRR_AJAX_URL = "https://flammerougeracing.com/wp-admin/admin-ajax.php";

export type FrrGcRow = {
  tourCode: string;
  stage: number;
  genderClass: string;
  gender: "M" | "F";
  classCode: string;
  position: number;
  name: string;
  club: string | null;
  ageCat: string | null;
  zwiftId: string;
  stagesRidden: number | null;
  tourTimeS: number | null;
  /** Etappetijd van deze etappe, met een eventuele tijdstraf van FRR. */
  stageTimeS: number | null;
  /** Tijdverlies in deze etappe, zonder straf voor een upgrade. */
  stageEgapS: number | null;
  /** Achterstand op de leider van de klasse, met straf. */
  egapS: number | null;
  /** Straf voor een upgrade, in seconden; 0 zonder straf. */
  penaltyS: number;
};

/** Tabel-id en nonce van de eerste wpDataTable op de pagina. */
export function extractWdtTable(html: string): { tableId: string; nonce: string } | null {
  const table = /data-wpdatatable_id="(\d+)"/.exec(html);
  if (!table) return null;
  const nonce = new RegExp(
    `wdtNonceFrontendServerSide_${table[1]}"[^>]*value="([^"]+)"`,
  ).exec(html);
  if (!nonce) return null;
  return { tableId: table[1], nonce: nonce[1] };
}

function text(value: unknown) {
  const raw = String(value ?? "");
  if (!/[<&]/.test(raw)) return raw.trim();
  return cheerio.load(`<p>${raw}</p>`, null, false).text().trim();
}

function number(value: unknown): number | null {
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!cleaned || cleaned === "-") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** "(30s)" → 30; "-" of leeg → 0; iets onbekends → null. */
export function parseGcPenalty(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return 0;
  const match = /^\(?\s*(\d+(?:\.\d+)?)\s*s\s*\)?$/i.exec(trimmed);
  return match ? Number(match[1]) : null;
}

/** "1 hrs, 7 m 54.663 s" → 4074.663; null als het geen tijd is. */
export function parseGcDuration(value: string): number | null {
  const match = /^(?:(\d+)\s*hrs?,?\s*)?(?:(\d+)\s*m\s*)?(\d+(?:\.\d+)?)\s*s$/i.exec(value.trim());
  if (!match) return null;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3]);
}

/**
 * Zet de ruwe rijen om. Gooit bij de eerste rij die niet in het verwachte
 * patroon past, met rij en kolom erbij.
 */
export function parseGcRows(data: unknown): FrrGcRow[] {
  if (!Array.isArray(data)) throw new Error("FRR-klassement: geen rijen in het antwoord.");
  return data.map((row, index) => {
    const fail = (column: number, label: string): never => {
      const value = Array.isArray(row) ? String(row[column] ?? "") : "";
      throw new Error(
        `FRR-klassement rij ${index + 1}: kolom ${column} (${label}) onverwacht: "${value.slice(0, 40)}".`,
      );
    };
    if (!Array.isArray(row) || row.length < 20) fail(0, "rij");
    const cells = row as unknown[];

    const tourCode = text(cells[0]);
    if (!/^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)?$/.test(tourCode)) fail(0, "tourcode");

    const stage = Number(text(cells[3]));
    if (!Number.isSafeInteger(stage) || stage < 1) fail(3, "etappe");

    const genderClass = text(cells[2]);
    const classMatch = /^([MF])-([A-Z0-9]+)$/.exec(genderClass);
    if (!classMatch) fail(2, "klasse");
    const classCode = classMatch![2];
    if (text(cells[6]) !== classCode) fail(6, "klasse");

    const position = Number(text(cells[7]));
    if (!Number.isSafeInteger(position) || position < 1) fail(7, "positie");

    const zwiftId = text(cells[11]).replace(/,/g, "");
    if (!/^\d+$/.test(zwiftId)) fail(11, "Zwift-ID");

    const ridden = number(text(cells[15]));
    const penalty = parseGcPenalty(text(cells[20]));
    // Wat FRR toont gaat voor; "-" (de leider) en een onbekende vorm rekenen we na.
    const shown = parseGcDuration(text(cells[23]));
    const cumulative = number(text(cells[19]));
    const leader = number(text(cells[21]));
    const egapS =
      shown ??
      (cumulative === null
        ? null
        : Math.max(0, Math.round((cumulative + (penalty ?? 0) - (leader ?? 0)) * 1000) / 1000));
    return {
      tourCode,
      stage,
      genderClass,
      gender: classMatch![1] as "M" | "F",
      classCode,
      position,
      name: text(cells[8]) || `Zwift ${zwiftId}`,
      club: text(cells[9]) || null,
      ageCat: text(cells[10]) || null,
      zwiftId,
      stagesRidden: ridden !== null && Number.isSafeInteger(ridden) ? ridden : null,
      tourTimeS: number(text(cells[16])),
      stageTimeS: number(text(cells[14])),
      stageEgapS: number(text(cells[18])),
      egapS,
      // Een onbekende straf zit dan wel in de eGAP, maar is niet te tonen.
      penaltyS: penalty ?? 0,
    };
  });
}

/** De tourcodes die in de tabel staan, zodat een beheerder de juiste kan kiezen. */
export function gcTourCodes(rows: FrrGcRow[]): string[] {
  return [...new Set(rows.map((row) => row.tourCode))].sort();
}

/** Het klassement na elke etappe van één tour, oplopend op etappe. */
export function gcStages(
  rows: FrrGcRow[],
  tourCode: string,
): Array<{ stage: number; rows: FrrGcRow[] }> {
  const byStage = new Map<number, Map<string, FrrGcRow>>();
  for (const row of rows) {
    if (row.tourCode !== tourCode) continue;
    const stage = byStage.get(row.stage) ?? new Map<string, FrrGcRow>();
    // Eén rij per renner per klasse; bij een dubbele de beste positie.
    const key = `${row.genderClass}|${row.zwiftId}`;
    const known = stage.get(key);
    if (!known || row.position < known.position) stage.set(key, row);
    byStage.set(row.stage, stage);
  }
  return [...byStage.entries()]
    .sort(([a], [b]) => a - b)
    .map(([stage, stageRows]) => ({
      stage,
      rows: [...stageRows.values()].sort(
        (a, b) => a.genderClass.localeCompare(b.genderClass) || a.position - b.position,
      ),
    }));
}

/** Het klassement na de laatste etappe van één tour; null als de code er niet in staat. */
export function latestGcStage(
  rows: FrrGcRow[],
  tourCode: string,
): { stage: number; rows: FrrGcRow[] } | null {
  const stages = gcStages(rows, tourCode);
  return stages[stages.length - 1] ?? null;
}

const PAGE_SIZE = 500;
const MAX_ROWS = 20000;

/**
 * Haalt de hele GC-tabel op: pagina ophalen voor de nonce, daarna in stukken
 * van 500 via admin-ajax. Vaste host; nooit een URL van buitenaf.
 */
export async function fetchFrrGcRows(
  options: { deadline?: number } = {},
): Promise<FrrGcRow[]> {
  const headers = { "user-agent": "ZWB-platform (clubsite ZWB Cycling)" };
  const page = await fetch(FRR_GC_PAGE_URL, {
    cache: "no-store",
    headers,
    signal: AbortSignal.timeout(10000),
  });
  if (!page.ok) throw new Error(`FRR-klassement: pagina gaf status ${page.status}.`);
  const table = extractWdtTable(await page.text());
  if (!table) throw new Error("FRR-klassement: tabel of nonce niet gevonden op de pagina.");

  const all: unknown[] = [];
  let total = Infinity;
  for (let start = 0; start < Math.min(total, MAX_ROWS); start += PAGE_SIZE) {
    if (options.deadline && Date.now() > options.deadline) {
      throw new Error("FRR-klassement: tijd op voordat de tabel binnen was.");
    }
    const body = new URLSearchParams({
      draw: String(start / PAGE_SIZE + 1),
      start: String(start),
      length: String(PAGE_SIZE),
      wdtNonce: table.nonce,
      "search[value]": "",
    });
    const response = await fetch(
      `${FRR_AJAX_URL}?action=get_wdtable&table_id=${table.tableId}`,
      {
        method: "POST",
        cache: "no-store",
        headers: { ...headers, "content-type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw new Error(`FRR-klassement: status ${response.status}.`);
    const payload = (await response.json()) as {
      recordsTotal?: string | number;
      recordsFiltered?: string | number;
      data?: unknown[];
    };
    const rows = Array.isArray(payload.data) ? payload.data : [];
    total = Number(payload.recordsFiltered ?? payload.recordsTotal ?? 0) || 0;
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return parseGcRows(all);
}
