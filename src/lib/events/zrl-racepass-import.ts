// Haalt de WTRL-racepasses van de komende races uit de racekalender op
// zwbcycling.nl en zet ze per team per racedatum in `zrl_race_passes` (migr. 0353).
//
// Alleen de clubsite wordt gelezen. De passlinks zelf worden nooit geopend: WTRL
// verbiedt scraping van zijn site (zie zrl-season.ts) en een pass is daar alleen
// met login te volgen.
//
// A/B en C staan soms op aparte pagina's van dezelfde datum. Een met de hand
// gezette pass blijft staan; wijkt de site af, dan bewaart de import de sitelink
// ernaast en toont het beheer het verschil.
//
// Sinds 2026-11-25 kan ook het WTRL-script van de eigenaar een pass zetten
// (bron 'wtrl', src/lib/wtrl/run.ts). Die gaat voor; deze import vult aan waar
// WTRL geen pass gaf.

import type { SupabaseClient } from "@supabase/supabase-js";
import { amsterdamDateKey } from "@/lib/birthdays";
import { normalizeRacepassUrl } from "@/lib/events/race-links";

const SITE = "https://www.zwbcycling.nl";
const USER_AGENT = "Mozilla/5.0 (compatible; ZWB-Platform/1.0; +https://zwbcycling.nl)";
const FETCH_TIMEOUT_MS = 4000;
/** Vandaag plus acht dagen: altijd de eerstvolgende dinsdag, ook op een dinsdagavond. */
const HORIZON_DAYS = 8;

/** De kalender en de teamlabels zijn van ZWB; een andere club slaat de import over. */
export function hasRacepassSite(websiteUrl: string | null | undefined): boolean {
  if (!websiteUrl) return false;
  try {
    return new URL(websiteUrl).hostname.replace(/^www\./, "") === "zwbcycling.nl";
  } catch {
    return false;
  }
}

// ── Lezen ───────────────────────────────────────────────────────────────────

export type CalendarRace = { pageId: number; slug: string; dateKey: string; title: string };

const CALENDAR_LINK =
  /<a\b[^>]*href=['"]\/race-kalender\/([^'"/]+)\/(\d+)['"][^>]*>\s*(\d{2})-(\d{2})-(\d{4})(?:\s+\d{2}:\d{2})?\s*-\s*([^<]*)<\/a>/gi;

/** De ZRL-races uit de kalenderpagina. */
export function parseRaceCalendar(html: string): CalendarRace[] {
  const races: CalendarRace[] = [];
  for (const [, slug, id, day, month, year, title] of html.matchAll(CALENDAR_LINK)) {
    if (!/zwift racing league/i.test(title)) continue;
    races.push({ pageId: Number(id), slug, dateKey: `${year}-${month}-${day}`, title: title.trim() });
  }
  return races;
}

export type PageRacepass = { label: string; url: string };

const PASS_LINK =
  /<a\b[^>]*href=['"](https:\/\/(?:www\.)?wtrl\.racing\/RacePass\/[^'"]+)['"][^>]*>\s*(Racepass[^<]*)<\/a>/gi;

/** De racepasslinks van een racepagina. Knop en zijbalk noemen dezelfde link. */
export function parseRacePagePasses(html: string): PageRacepass[] {
  const seen = new Set<string>();
  const passes: PageRacepass[] = [];
  for (const [, rawUrl, rawLabel] of html.matchAll(PASS_LINK)) {
    const url = normalizeRacepassUrl(rawUrl);
    const label = rawLabel.trim();
    const key = `${label}|${url}`;
    if (!url || seen.has(key)) continue;
    seen.add(key);
    passes.push({ label, url });
  }
  return passes;
}

/** Een pagina met een Racepass-kop maar zonder leesbare link is veranderd. */
export function pageHasPassHeading(html: string): boolean {
  return /<h5\b[^>]*>\s*Racepass\s*<\/h5>/i.test(html);
}

const TEAM_BY_LABEL: Record<string, string> = {
  a: "ZRL A",
  a1: "ZRL A",
  b1: "B1",
  b2: "B2",
  b3: "B3",
  bdev: "Bdev",
  c: "ZRL C",
  zwiftladies: "ZRL Zwiftladies B",
  zwiftladiesb: "ZRL Zwiftladies B",
  zwiftladiesc: "ZRL Zwiftladies C",
};

/** "Racepass B Dev" wordt "Bdev". Een onbekend label geeft null. */
export function teamNameForLabel(label: string): string | null {
  const key = label.toLowerCase().replace(/^racepass/, "").replace(/\s+/g, "");
  return TEAM_BY_LABEL[key] ?? null;
}

// ── Samenvoegen ─────────────────────────────────────────────────────────────

export type ScrapedRacepass = { teamId: string; teamName: string; raceDate: string; url: string };

/**
 * Eén link per team per datum. Noemt de site twee verschillende links voor
 * hetzelfde team, dan wordt er niet gegokt: dat team valt af en komt in `ambiguous`.
 */
export function collectRacepasses(
  pages: Array<{ dateKey: string; passes: PageRacepass[] }>,
  teamIdByName: Map<string, string>,
): { passes: ScrapedRacepass[]; ambiguous: string[]; unknownLabels: string[] } {
  const found = new Map<string, ScrapedRacepass>();
  const conflicting = new Set<string>();
  const unknownLabels = new Set<string>();

  for (const page of pages) {
    for (const pass of page.passes) {
      const teamName = teamNameForLabel(pass.label);
      const teamId = teamName ? teamIdByName.get(teamName) : undefined;
      if (!teamName || !teamId) {
        unknownLabels.add(pass.label);
        continue;
      }
      const key = `${teamId}|${page.dateKey}`;
      const current = found.get(key);
      if (current && current.url !== pass.url) conflicting.add(key);
      else found.set(key, { teamId, teamName, raceDate: page.dateKey, url: pass.url });
    }
  }

  const ambiguous = [...conflicting].map((key) => {
    const pass = found.get(key)!;
    return `${pass.teamName} (${pass.raceDate})`;
  });
  for (const key of conflicting) found.delete(key);
  return { passes: [...found.values()], ambiguous, unknownLabels: [...unknownLabels] };
}

export type StoredRacepass = {
  team_id: string;
  race_date: string;
  url: string;
  source: "site" | "manual" | "wtrl";
  site_url: string | null;
};

export type RacepassUpsert = {
  team_id: string;
  race_date: string;
  url: string;
  source: "site" | "manual" | "wtrl";
  site_url: string;
};

/** Wat de import moet schrijven, zonder een handmatige link te vervangen. */
export function planRacepassImport(
  existing: StoredRacepass[],
  scraped: ScrapedRacepass[],
): { upserts: RacepassUpsert[]; differs: string[] } {
  const byKey = new Map(existing.map((row) => [`${row.team_id}|${row.race_date}`, row]));
  const upserts: RacepassUpsert[] = [];
  const differs: string[] = [];

  for (const pass of scraped) {
    const current = byKey.get(`${pass.teamId}|${pass.raceDate}`);
    const fromSite: RacepassUpsert = {
      team_id: pass.teamId,
      race_date: pass.raceDate,
      url: pass.url,
      source: "site",
      site_url: pass.url,
    };
    // Een pass uit WTRL My Teams (0361) gaat voor de site; de site vult alleen
    // aan waar WTRL niets gaf. Wel bewaren wat de site zegt.
    if (current?.source === "wtrl") {
      if (current.site_url !== pass.url) upserts.push({ ...fromSite, url: current.url, source: "wtrl" });
      continue;
    }
    if (!current || current.url === pass.url || current.source === "site") {
      const same =
        current?.url === pass.url && current.source === "site" && current.site_url === pass.url;
      if (!same) upserts.push(fromSite);
      continue;
    }
    differs.push(`${pass.teamName} (${pass.raceDate})`);
    if (current.site_url !== pass.url) {
      upserts.push({ ...fromSite, url: current.url, source: "manual" });
    }
  }
  return { upserts, differs };
}

// ── Ophalen en opslaan ──────────────────────────────────────────────────────

export type RacepassImportResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  pages: number;
  saved: number;
  differs: string[];
  problems: string[];
};

async function fetchPage(url: string, deadline: number): Promise<string> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error("Geen tijd meer.");
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    headers: { "user-agent": USER_AGENT, accept: "text/html" },
    signal: AbortSignal.timeout(Math.min(FETCH_TIMEOUT_MS, remaining)),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function writeStatus(admin: SupabaseClient, success: boolean, error: string | null) {
  const now = new Date().toISOString();
  await admin.from("zrl_racepass_import_status").upsert({
    id: true,
    last_attempt_at: now,
    ...(success ? { last_success_at: now } : {}),
    last_error: error,
  });
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "mislukt";
}

export async function importZrlRacepasses(
  admin: SupabaseClient,
  { deadline }: { deadline: number },
): Promise<RacepassImportResult> {
  const empty = { pages: 0, saved: 0, differs: [], problems: [] };
  if (Date.now() >= deadline) return { ok: true, skipped: true, ...empty };

  const { data: club } = await admin.from("club_settings").select("website_url").maybeSingle();
  if (!hasRacepassSite((club as { website_url: string | null } | null)?.website_url)) {
    return { ok: true, skipped: true, ...empty };
  }

  try {
    const races = parseRaceCalendar(await fetchPage(`${SITE}/race-kalender`, deadline));
    if (races.length === 0) throw new Error("Racekalender niet herkend.");

    const today = amsterdamDateKey(new Date());
    const until = addDays(today, HORIZON_DAYS);
    const upcoming = races
      .filter((race) => race.dateKey >= today && race.dateKey <= until)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    const problems: string[] = [];
    const pages: Array<{ dateKey: string; passes: PageRacepass[] }> = [];
    for (const race of upcoming) {
      try {
        const html = await fetchPage(
          `${SITE}/race-kalender/${encodeURIComponent(decodeURIComponent(race.slug))}/${race.pageId}`,
          deadline,
        );
        const passes = parseRacePagePasses(html);
        if (passes.length === 0 && pageHasPassHeading(html)) {
          problems.push(`Geen passes herkend op pagina ${race.pageId}`);
        }
        pages.push({ dateKey: race.dateKey, passes });
      } catch (err) {
        problems.push(`Pagina ${race.pageId}: ${message(err)}`);
      }
    }

    const { data: teamRows, error: teamError } = await admin
      .from("teams")
      .select("id, name, is_graveyard")
      .eq("type", "zrl");
    if (teamError) throw new Error(teamError.message);
    const teamIdByName = new Map(
      ((teamRows ?? []) as Array<{ id: string; name: string; is_graveyard: boolean | null }>)
        .filter((team) => !team.is_graveyard)
        .map((team) => [team.name, team.id]),
    );

    const { passes, ambiguous, unknownLabels } = collectRacepasses(pages, teamIdByName);
    for (const team of ambiguous) problems.push(`Twee links voor ${team}`);
    for (const label of unknownLabels) problems.push(`Onbekend label: ${label}`);

    let saved = 0;
    let differs: string[] = [];
    if (passes.length > 0) {
      const dates = [...new Set(passes.map((pass) => pass.raceDate))];
      const { data: existing, error: readError } = await admin
        .from("zrl_race_passes")
        .select("team_id, race_date, url, source, site_url")
        .in("race_date", dates);
      if (readError) throw new Error(readError.message);

      const plan = planRacepassImport((existing ?? []) as StoredRacepass[], passes);
      differs = plan.differs;
      if (plan.upserts.length > 0) {
        const updatedAt = new Date().toISOString();
        const { error: writeError } = await admin
          .from("zrl_race_passes")
          .upsert(
            plan.upserts.map((row) => ({ ...row, updated_at: updatedAt })),
            { onConflict: "team_id,race_date" },
          );
        if (writeError) throw new Error(writeError.message);
        saved = plan.upserts.length;
      }
    }

    await writeStatus(admin, true, problems.length > 0 ? problems.join("; ") : null);
    return { ok: true, pages: pages.length, saved, differs, problems };
  } catch (err) {
    const error = message(err);
    await writeStatus(admin, false, error).catch(() => undefined);
    return { ok: false, error, ...empty };
  }
}
