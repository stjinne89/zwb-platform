import "server-only";

import { amsterdamDateKey } from "@/lib/birthdays";
import type { createAdminClient } from "@/lib/supabase/admin";
import { saveWtrlTeams } from "@/lib/teams/wtrl-save";
import {
  matchResultRiders,
  parseMyTeams,
  parseResults,
  parseResultsMenu,
  parseTeamDetails,
  planAssignments,
  planWtrlRacepasses,
  WTRL_PATHS,
  wtrlClassCategory,
  wtrlDivisionKey,
  wtrlPathKind,
  type AssignmentRow,
  type StoredPass,
  type WtrlRaceStatus,
  type WtrlTeamDetails,
  type ZwiftResultRow,
} from "@/lib/wtrl/import";

// Eén stap van de WTRL-import (/api/zrl/wtrl-import). Het script stuurt de
// pagina's die het ophaalde en krijgt terug welke het daarna moet ophalen:
//
//   1. niets              → My Teams
//   2. My Teams           → per team de teamgegevens, en het uitslagmenu
//   3. teams en menu      → teams en racepasses opslaan; de uitslagen van de
//                           ronde die nog niet definitief verwerkt zijn
//   4. uitslagen          → tegenstanders indelen in de live stand
//
// Wat tussen de stappen nodig is (seizoen, racepasses, sleutels) gaat als
// `carry` heen en weer; het script past hem niet aan.

type Admin = ReturnType<typeof createAdminClient>;

export type WtrlPage = { path: string; status: number; body: string };

export type WtrlCarry = {
  season: number | null;
  /** TRC → racepass uit My Teams. */
  passes: Record<string, string>;
  /** WTRL-klasse → sleutel van de live stand en de namen van onze teams erin. */
  classes: Record<string, { key: string; ownTeams: string[] }>;
  /** "2420B40/2" → status in het menu. */
  status: Record<string, WtrlRaceStatus>;
};

export type WtrlStep = { fetch: string[]; carry: WtrlCarry; report: string[] };

/** Ruim boven wat een run nodig heeft (negen teams, een handvol uitslagen). */
const MAX_FETCH = 40;

function emptyCarry(): WtrlCarry {
  return { season: null, passes: {}, classes: {}, status: {} };
}

/** Neemt alleen over wat de vorm heeft die deze module zelf meegaf. */
export function cleanCarry(raw: unknown): WtrlCarry {
  const carry = emptyCarry();
  if (!raw || typeof raw !== "object") return carry;
  const input = raw as Record<string, unknown>;
  if (typeof input.season === "number" && Number.isSafeInteger(input.season)) carry.season = input.season;
  for (const [trc, url] of Object.entries((input.passes as Record<string, unknown>) ?? {})) {
    if (/^\d+$/.test(trc) && typeof url === "string" && url.startsWith("https://")) carry.passes[trc] = url;
  }
  for (const [cls, value] of Object.entries((input.classes as Record<string, unknown>) ?? {})) {
    const row = value as { key?: unknown; ownTeams?: unknown };
    if (typeof row?.key !== "string" || !Array.isArray(row.ownTeams)) continue;
    carry.classes[cls] = { key: row.key, ownTeams: row.ownTeams.filter((name): name is string => typeof name === "string") };
  }
  for (const [key, value] of Object.entries((input.status as Record<string, unknown>) ?? {})) {
    if (value === "final" || value === "provisional") carry.status[key] = value;
  }
  return carry;
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

export async function runWtrlImport(admin: Admin, pages: WtrlPage[], rawCarry: unknown): Promise<WtrlStep> {
  const carry = cleanCarry(rawCarry);
  const report: string[] = [];
  const fetch: string[] = [];
  if (pages.length === 0) return { fetch: ["/zrl/myteams/"], carry, report };

  const ok = pages.filter((page) => {
    if (page.status === 200) return true;
    report.push(`${page.path}: WTRL gaf HTTP ${page.status}.`);
    return false;
  });
  const ofKind = (kind: keyof typeof WTRL_PATHS) => ok.filter((page) => wtrlPathKind(page.path) === kind);

  // 1. My Teams: welke teams, welk seizoen, welke racepass.
  for (const page of ofKind("myTeams")) {
    const panels = parseMyTeams(page.body);
    const season = panels.find((panel) => panel.season)?.season ?? null;
    if (!season || panels.length === 0) {
      report.push("My Teams: geen teams gevonden. Is de WTRL-sessie nog geldig?");
      continue;
    }
    carry.season = season;
    for (const panel of panels) if (panel.racepass) carry.passes[panel.trc] = panel.racepass;
    fetch.push(...panels.map((panel) => `/api/zrl/${season}/teams/${panel.trc}`), `/api/zrl/results/${season}`);
    report.push(`My Teams: ${panels.length} teams, ${Object.keys(carry.passes).length} met een racepass.`);
  }

  // 2. Teamgegevens: roster en divisie zoals de plak, en de racepass.
  const details = ofKind("team")
    .map((page) => parseTeamDetails(parseJson(page.body)))
    .filter((row): row is WtrlTeamDetails => Boolean(row));
  if (details.length > 0) await saveTeams(admin, details, carry, report);

  // 3. Menu: welke uitslagen er zijn, en welke nog niet verwerkt.
  const menuPage = ofKind("menu")[0];
  if (menuPage && carry.season) {
    const ownClasses = new Map<string, string[]>();
    for (const row of details) {
      if (row.wtrlClass) ownClasses.set(row.wtrlClass, [...(ownClasses.get(row.wtrlClass) ?? []), row.team.name]);
    }
    fetch.push(...(await planResults(admin, parseJson(menuPage.body), carry, ownClasses, report)));
  }

  // 4. Uitslagen: tegenstanders indelen.
  for (const page of ofKind("results")) {
    await importResults(admin, page, carry, report);
  }

  return { fetch: [...new Set(fetch)].slice(0, MAX_FETCH), carry, report };
}

async function saveTeams(admin: Admin, details: WtrlTeamDetails[], carry: WtrlCarry, report: string[]) {
  const { data: stored } = await admin.from("wtrl_teams").select("trc_ref, team_id");
  const teamIdByRef = new Map(
    ((stored ?? []) as Array<{ trc_ref: string; team_id: string | null }>).map((row) => [row.trc_ref, row.team_id]),
  );
  const mapping = Object.fromEntries(details.map((row) => [row.team.trcRef, teamIdByRef.get(row.team.trcRef) ?? null]));
  const saved = await saveWtrlTeams(admin, { teams: details.map((row) => row.team), mapping, importedBy: null });
  if (!saved.ok) {
    report.push(`Teams niet opgeslagen: ${saved.error}`);
    return;
  }
  report.push(
    `Teams: ${saved.teams} bijgewerkt, ${saved.riders} renners; ${saved.added} leden erbij, ${saved.removed} eraf.`,
  );
  const unlinked = details.filter((row) => !mapping[row.team.trcRef]).map((row) => row.team.name);
  if (unlinked.length > 0) report.push(`Niet gekoppeld aan een ZWB-team: ${unlinked.join(", ")} (/beheer/zrl/teams).`);

  const today = amsterdamDateKey();
  const passes = details.flatMap((row) => {
    const teamId = mapping[row.team.trcRef];
    const url = carry.passes[row.trc];
    if (!teamId || !url || !row.nextStartAt) return [];
    const raceDate = amsterdamDateKey(new Date(row.nextStartAt));
    return raceDate >= today ? [{ teamId, raceDate, url }] : [];
  });
  if (passes.length === 0) return;
  const { data: existing, error } = await admin
    .from("zrl_race_passes")
    .select("team_id, race_date, url, source, site_url")
    .in("team_id", [...new Set(passes.map((pass) => pass.teamId))]);
  if (error) {
    report.push(`Racepasses niet gelezen: ${error.message}`);
    return;
  }
  const plan = planWtrlRacepasses((existing ?? []) as StoredPass[], passes);
  if (plan.upserts.length > 0) {
    const updatedAt = new Date().toISOString();
    const { error: writeError } = await admin
      .from("zrl_race_passes")
      .upsert(plan.upserts.map((row) => ({ ...row, updated_at: updatedAt })), { onConflict: "team_id,race_date" });
    if (writeError) {
      report.push(`Racepasses niet opgeslagen: ${writeError.message}`);
      return;
    }
  }
  report.push(`Racepasses: ${plan.upserts.length} bijgewerkt.`);
  for (const note of plan.skipped) report.push(`Racepass overgeslagen, ${note}.`);
}

async function planResults(
  admin: Admin,
  json: unknown,
  carry: WtrlCarry,
  ownClasses: Map<string, string[]>,
  report: string[],
): Promise<string[]> {
  const season = carry.season!;
  const menu = parseResultsMenu(json, season);
  if (!menu.seasonText) {
    report.push(`Uitslagmenu: seizoen ${season} niet gevonden.`);
    return [];
  }
  const { data: doneRows } = await admin
    .from("zrl_wtrl_result_imports")
    .select("class, race")
    .eq("season", season)
    .eq("done", true);
  const done = new Set(((doneRows ?? []) as Array<{ class: string; race: number }>).map((row) => `${row.class}/${row.race}`));

  const paths: string[] = [];
  for (const [wtrlClass, ownTeams] of ownClasses) {
    const division = menu.divisions.find((row) => row.wtrlClass === wtrlClass);
    const key = division ? wtrlDivisionKey(wtrlClass, division.league, menu.seasonText) : null;
    if (!division || !key) {
      report.push(`Uitslagmenu: klasse ${wtrlClass} (${ownTeams.join(", ")}) niet gevonden.`);
      continue;
    }
    carry.classes[wtrlClass] = { key, ownTeams };
    for (const { race, status } of division.races) {
      if (done.has(`${wtrlClass}/${race}`)) continue;
      carry.status[`${wtrlClass}/${race}`] = status;
      paths.push(`/api/zrl/results/${season}/${wtrlClass}/${race}`);
    }
  }
  report.push(`Uitslagen op te halen: ${paths.length}.`);
  return paths;
}

type SnapshotSubgroup = { label?: string; results?: ZwiftResultRow[] };

async function importResults(admin: Admin, page: WtrlPage, carry: WtrlCarry, report: string[]) {
  const [, seasonText, wtrlClass, raceText] = WTRL_PATHS.results.exec(page.path)!;
  const season = Number(seasonText);
  const race = Number(raceText);
  const info = carry.classes[wtrlClass];
  const category = wtrlClassCategory(wtrlClass);
  if (!info || !category) {
    report.push(`${wtrlClass} race ${race}: onbekende klasse, overgeslagen.`);
    return;
  }
  const riders = parseResults(parseJson(page.body));
  const eventIds = [...new Set(riders.map((rider) => rider.zwiftEventId))];

  // De Zwift-uitslag uit de bevroren data (0197): geen Zwift-aanroep nodig.
  const { data: snapshots } = eventIds.length
    ? await admin.from("zrl_race_snapshots").select("zwift_event_id, subgroups:data->subgroups").in("zwift_event_id", eventIds)
    : { data: [] };
  const resultsByEvent = new Map<string, ZwiftResultRow[]>();
  for (const row of (snapshots ?? []) as Array<{ zwift_event_id: string; subgroups: SnapshotSubgroup[] | null }>) {
    const subgroup = (row.subgroups ?? []).find((item) => item.label === category);
    if (subgroup?.results) resultsByEvent.set(String(row.zwift_event_id), subgroup.results);
  }

  const found = new Map<number, string>();
  for (const eventId of eventIds) {
    const results = resultsByEvent.get(eventId);
    if (!results) continue;
    const matched = matchResultRiders(riders.filter((rider) => rider.zwiftEventId === eventId), results);
    for (const [rider, profileId] of matched) found.set(profileId, rider.team);
  }

  // Ons eigen event moet bevroren zijn; anders later opnieuw.
  const ownEvents = new Set(riders.filter((rider) => info.ownTeams.includes(rider.team)).map((rider) => rider.zwiftEventId));
  const ownMissing = [...ownEvents].some((eventId) => !resultsByEvent.has(eventId));

  if (found.size > 0) {
    const { data: existing, error } = await admin
      .from("zrl_team_assignments")
      .select("zwift_id, team_label, source")
      .eq("league_key", info.key)
      .in("zwift_id", [...found.keys()]);
    if (error) {
      report.push(`${wtrlClass} race ${race}: indeling niet gelezen (${error.message}).`);
      return;
    }
    const upserts = planAssignments((existing ?? []) as AssignmentRow[], found);
    if (upserts.length > 0) {
      const updatedAt = new Date().toISOString();
      const { error: writeError } = await admin.from("zrl_team_assignments").upsert(
        upserts.map((row) => ({ ...row, league_key: info.key, source: "wtrl", updated_by: null, updated_at: updatedAt })),
        { onConflict: "league_key,zwift_id" },
      );
      if (writeError) {
        report.push(`${wtrlClass} race ${race}: indeling niet opgeslagen (${writeError.message}).`);
        return;
      }
    }
  }

  const final = carry.status[`${wtrlClass}/${race}`] === "final";
  await admin.from("zrl_wtrl_result_imports").upsert(
    {
      season,
      class: wtrlClass,
      race,
      done: final && !ownMissing,
      riders: riders.length,
      matched: found.size,
      imported_at: new Date().toISOString(),
    },
    { onConflict: "season,class,race" },
  );
  report.push(
    `${info.ownTeams.join(", ")} (${wtrlClass}) race ${race}: ${found.size} van ${riders.length} renners gekoppeld` +
      (ownMissing ? "; de Zwift-uitslag van ons event is nog niet bewaard, volgende keer opnieuw" : "") +
      (final ? "." : " (voorlopig)."),
  );
}
