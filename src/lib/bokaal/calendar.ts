// De kalender van een seizoen in één keer: alle wedstrijden van de gekozen
// reeksen en de kampioenschappen (verzoek eigenaar, 2026-10-19: Wereldbeker,
// Superprestige, HG Cross en de kampioenschappen).
//
// Een reekspagina op CyclingFlash geeft per categorie de wedstrijden met
// datum, maar zonder starttijd. Die komt van de eventpagina zodra beheer de
// startlijst ophaalt (refreshBoard); tot dan staat er een standaardtijd en
// blijft de koers een concept.

import * as cheerio from "cheerio";
import type { Category } from "./rules";

export type SeriesKey = "wereldbeker" | "superprestige" | "hg-cross";

/** De reeksen en hun slug op CyclingFlash. Sponsornamen (Telenet, HG) kunnen per seizoen wijzigen. */
export const SERIES: { key: SeriesKey; label: string; slug: (season: string) => string }[] = [
  { key: "wereldbeker", label: "Wereldbeker", slug: (s) => `uci-cyclo-cross-world-cup-${s}` },
  { key: "superprestige", label: "Superprestige", slug: (s) => `telenet-superprestige-${s}` },
  { key: "hg-cross", label: "HG Cross", slug: (s) => `hg-cross-${s}` },
];

/** BK, NK, EK en WK; andere landen en de Pan-Amerikaanse niet. */
export const CHAMPIONSHIP =
  /^(belgian-national-championships-cx|dutch-national-championships-cx|uec-cyclo-cross-european-championships|uci-cyclo-cross-world-championships(-[a-z-]+)?)-\d{4}$/;

/** In deze maanden vallen EK (november), BK, NK en WK (januari, soms februari). */
export const CHAMPIONSHIP_MONTHS = [11, 1, 2] as const;

export type SeriesRace = { slug: string; name: string; date: string };
export type PlannedRace = SeriesRace & { category: Category; eventSlug: string };

/** "27-11-2026" → "2026-11-27". */
function isoDate(text: string): string | null {
  const m = text.match(/(\d{2})-(\d{2})-(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

export function parseSeries(html: string): SeriesRace[] {
  const $ = cheerio.load(html);
  const races: SeriesRace[] = [];
  $("tbody tr").each((_, tr) => {
    const link = $(tr).find('a[href^="/race/"]').first();
    const slug = link.attr("href")?.match(/^\/race\/([a-z0-9-]+)/)?.[1];
    const date = isoDate($(tr).text());
    if (slug && date) races.push({ slug, name: link.text().replace(/\s+/g, " ").trim(), date });
  });
  return races;
}

/** De eventslugs van de kampioenschappen in een maandkalender. */
export function parseChampionships(html: string): string[] {
  const $ = cheerio.load(html);
  const slugs = new Set<string>();
  $('a[href^="/event/"]').each((_, a) => {
    const slug = $(a).attr("href")?.match(/^\/event\/([a-z0-9-]+)$/)?.[1];
    if (slug && CHAMPIONSHIP.test(slug)) slugs.add(slug);
  });
  return [...slugs];
}

/**
 * Dames- en herenwedstrijden van een reeks als koersen. Het event is de
 * herenwedstrijd met dezelfde naam en datum (op CyclingFlash is de eventslug
 * gelijk aan die van de heren); zonder herenwedstrijd valt "-we" weg.
 * Wat vóór `today` valt, blijft weg.
 */
export function planSeries(men: SeriesRace[], women: SeriesRace[], today: string): PlannedRace[] {
  const key = (r: SeriesRace) => `${r.date}|${r.name}`;
  const menByKey = new Map(men.map((r) => [key(r), r.slug]));
  return [
    ...women.map((r) => ({ ...r, category: "w" as const, eventSlug: menByKey.get(key(r)) ?? r.slug.replace(/-we(?=-\d{4})/, "") })),
    ...men.map((r) => ({ ...r, category: "m" as const, eventSlug: r.slug })),
  ]
    .filter((r) => r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.category.localeCompare(b.category));
}
