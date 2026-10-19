// CyclingFlash lezen: veldritratings, eventpagina, startlijst en uitslag.
//
// De pagina's worden server-side gerenderd; robots.txt staat lezen toe. Het
// blijft bij een handvol verzoeken per koers, met bronvermelding op het bord.
// De parsers zijn puur (HTML in, data uit) en getest in
// tests/unit/bokaal-cyclingflash.test.ts.

import https from "node:https";
import * as cheerio from "cheerio";
import type { Category } from "./rules";
import type { ResultRow } from "./settle";

export const CYCLINGFLASH = "https://cyclingflash.com";

export type RatedRider = { slug: string; name: string; rating: number };
export type StartlistRider = { slug: string; name: string };
export type EventRace = { slug: string; category: Category; date: string | null; time: string | null };
export type EventInfo = { slug: string; name: string; location: string | null; races: EventRace[] };

const slugOf = (href: string | undefined) => href?.match(/^\/profile\/([a-z0-9-]+)/)?.[1] ?? null;
const clean = (text: string) => text.replace(/\s+/g, " ").trim();
const natOf = (alt: string | undefined) => alt?.match(/^([A-Z]{2}) flag$/)?.[1] ?? null;

export function parseRanking(html: string): RatedRider[] {
  const $ = cheerio.load(html);
  const riders: RatedRider[] = [];
  $("tbody tr").each((_, tr) => {
    const link = $(tr).find('a[href^="/profile/"]').first();
    const slug = slugOf(link.attr("href"));
    const rating = Number(clean($(tr).find("td").last().text()));
    if (slug && Number.isInteger(rating) && rating > 0) riders.push({ slug, name: clean(link.text()), rating });
  });
  return riders;
}

export function parseStartlist(html: string): StartlistRider[] {
  const $ = cheerio.load(html);
  const riders = new Map<string, StartlistRider>();
  $('tbody tr a[href^="/profile/"]').each((_, a) => {
    const slug = slugOf($(a).attr("href"));
    if (slug && !riders.has(slug)) riders.set(slug, { slug, name: clean($(a).text()) });
  });
  return [...riders.values()];
}

/** "+ 15" → 15, "+ 01:12" → 72, "+ 1:02:03" → 3723; null zonder tijd. */
export function parseGap(text: string): number | null {
  const m = text.replace(/\s/g, "").match(/^\+?(\d+)(?::(\d{2}))?(?::(\d{2}))?$/);
  if (!m) return null;
  const parts = [m[1], m[2], m[3]].filter((x) => x !== undefined).map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function parseResult(html: string): ResultRow[] {
  const $ = cheerio.load(html);
  const rows: ResultRow[] = [];
  let previousGap: number | null = 0;
  $("tbody tr").each((_, tr) => {
    const cells = $(tr).find("td");
    const link = $(tr).find('a[href^="/profile/"]').first();
    const slug = slugOf(link.attr("href"));
    if (!slug) return;
    const posText = clean(cells.first().text());
    const pos = /^\d+$/.test(posText) ? Number(posText) : null;
    const ageCell = cells.toArray().map((c) => clean($(c).text())).find((t, i) => i > 1 && /^\d{2}$/.test(t));
    const timeText = clean(cells.last().text());
    let gap: number | null = null;
    if (pos === 1) gap = 0;
    else if (pos != null) gap = /^["”″]$|^s\.?t\.?$/i.test(timeText) ? previousGap : timeText.startsWith("+") ? parseGap(timeText) : null;
    if (pos != null) previousGap = gap;
    rows.push({
      pos,
      slug,
      name: clean(link.text()),
      nat: natOf(link.find("img").attr("alt")),
      age: ageCell ? Number(ageCell) : null,
      team: clean($(tr).find('a[href^="/team/"]').first().text()) || null,
      gap,
    });
  });
  return rows;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** "Sat 17 October 2026" → "2026-10-17". */
export function parseEventDate(text: string): string | null {
  const m = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month < 0) return null;
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

export function parseEvent(html: string, slug: string): EventInfo {
  const $ = cheerio.load(html);
  const name = clean($("h1").first().text()) || slug;
  // Boven de titel staat "Belgium · Tielt".
  const place = $("main *")
    .filter((_, el) => $(el).children().length === 0 && /^[A-Za-z][A-Za-z ]* · [^·]{1,80}$/.test(clean($(el).text())) && !/elite|junior|u23|individual/i.test($(el).text()))
    .first();
  const location = place.length ? clean(place.text()).split(" · ")[1] : null;
  const races = new Map<string, EventRace>();
  let date: string | null = null;
  $("h2, time").each((_, el) => {
    if (el.tagName === "h2") {
      date = parseEventDate(clean($(el).text())) ?? date;
      return;
    }
    const header = $(el).parent();
    const link = header.find('a[href^="/race/"]').first();
    const raceSlug = link.attr("href")?.match(/^\/race\/([a-z0-9-]+)/)?.[1];
    const label = clean(link.text()).toLowerCase();
    if (!raceSlug || !label.includes("elite")) return;
    const category: Category | null = label.includes("women") ? "w" : label.includes("men") ? "m" : null;
    const time = clean($(el).text()).match(/^(\d{1,2}):(\d{2})$/) ? clean($(el).text()).padStart(5, "0") : null;
    if (category && !races.has(raceSlug)) races.set(raceSlug, { slug: raceSlug, category, date, time });
  });
  return { slug, name, location, races: [...races.values()] };
}

/** Een eventlink of -slug: "https://cyclingflash.com/event/x-2026" of "x-2026". */
export function eventSlugFrom(input: string): string | null {
  const text = input.trim();
  const fromUrl = text.match(/^https:\/\/(?:www\.)?cyclingflash\.com\/event\/([a-z0-9-]+)\/?(?:[?#].*)?$/)?.[1];
  if (fromUrl) return fromUrl;
  return /^[a-z0-9-]{3,160}$/.test(text) ? text : null;
}

/** Een datum en kloktijd in Belgische tijd als ISO-tijdstip. */
export function brusselsToIso(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const shown = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess - (shown - guess)).toISOString();
}

/** Melding als CyclingFlash de server weigert; beheer kan dan de paginabron plakken. */
export const BLOCKED = "CyclingFlash weigert de server. Plak de paginabron.";

// Bewust node:https en niet fetch: Cloudflare zet voor Nodes fetch (undici)
// een uitdaging neer (403, cf-mitigated: challenge), voor een gewoon
// https-verzoek met dezelfde user-agent niet (gemeten 2026-10-19, lokaal).
// Of dat vanaf Netlify ook zo is, is niet getest; daarvoor is BLOCKED.
function page(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      { host: "cyclingflash.com", path, headers: { "user-agent": "ZWB-platform voorZpWelBokaal (clubspel)", accept: "text/html" } },
      (response) => {
        if (response.statusCode === 403 || response.statusCode === 429) {
          response.resume();
          return reject(new Error(BLOCKED));
        }
        if (response.statusCode !== 200) {
          response.resume();
          return reject(new Error(`CyclingFlash gaf ${response.statusCode} op ${path}.`));
        }
        response.setEncoding("utf8");
        let body = "";
        response.on("data", (chunk: string) => {
          body += chunk;
          if (body.length > 5_000_000) request.destroy(new Error("Pagina te groot."));
        });
        response.on("end", () => resolve(body));
      },
    );
    request.setTimeout(8000, () => request.destroy(new Error("CyclingFlash reageert niet.")));
    request.on("error", reject);
  });
}

const RANKING_PATH: Record<Category, string> = {
  w: "/cyclingflash-ranking/cyclocross/women-elite",
  m: "/cyclingflash-ranking/cyclocross/men-elite",
};

/** De eerste `pages` pagina's van de veldritranking (50 renners per pagina). */
export async function fetchRanking(category: Category, pages = 4): Promise<RatedRider[]> {
  const riders: RatedRider[] = [];
  for (let p = 1; p <= pages; p++) {
    const batch = parseRanking(await page(`${RANKING_PATH[category]}${p > 1 ? `?page=${p}` : ""}`));
    riders.push(...batch);
    if (batch.length < 50) break;
  }
  return riders;
}

export const fetchEvent = async (slug: string) => parseEvent(await page(`/event/${slug}`), slug);
export const fetchStartlist = async (raceSlug: string) => parseStartlist(await page(`/race/${raceSlug}/startlist`));
export const fetchResult = async (raceSlug: string) => parseResult(await page(`/race/${raceSlug}/result`));
