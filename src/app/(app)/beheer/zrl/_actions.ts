"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeRacepassUrl } from "@/lib/events/race-links";
import { importZrlRacepasses } from "@/lib/events/zrl-racepass-import";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { amsterdamDateKey } from "@/lib/birthdays";
import {
  generateZrlRound,
  validateRoundSpec,
  type ZrlRoundSpec,
} from "@/lib/teams/zrl-season";
import { adminAreaPermission } from "@/lib/admin-areas";

export type ImportInput = Omit<ZrlRoundSpec, "teamName"> & { teamIds: string[] };

/**
 * Zet een hele ZRL-ronde in de kalender: per raceweek één hoofdevent met de
 * gedeelde omschrijving, en daaronder per team een event. Idempotent: een
 * hoofdevent wordt herkend aan de dag, een teamevent aan team en dag.
 * Opnieuw draaien vult dus alleen aan, ook als er later een team bijkomt.
 */
export async function importZrlRound(input: ImportInput) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has(adminAreaPermission("zrl"))) {
    return { ok: false as const, error: "Geen recht om de racekalender te vullen." };
  }

  const errors = validateRoundSpec({ ...input, teamName: undefined });
  if (errors.length > 0) return { ok: false as const, error: errors.join(" ") };
  if (input.teamIds.length === 0) {
    return { ok: false as const, error: "Kies minstens één team." };
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .in("id", input.teamIds);
  if (!teams || teams.length === 0) {
    return { ok: false as const, error: "Team niet gevonden." };
  }
  const { data: subteams } = await supabase
    .from("teams")
    .select("parent_team_id")
    .in("parent_team_id", input.teamIds);
  if ((subteams ?? []).length > 0) {
    return {
      ok: false as const,
      error: "Een hoofdteam rijdt zelf niet; kies de subteams.",
    };
  }

  const weeks = generateZrlRound({ ...input, teamName: undefined });
  if (weeks.length === 0) {
    return { ok: false as const, error: "Deze opgave levert geen races op." };
  }
  const starts = weeks.map((week) => week.startAtIso).sort();
  // Hele dagen, zodat een hoofdevent waarvan de tijd met de hand is verschoven
  // nog steeds wordt herkend.
  const windowStart = `${weeks[0].dateKey}T00:00:00Z`;
  const windowEnd = new Date(
    new Date(starts[starts.length - 1]).getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  // 1. Hoofdevents: één per raceweek, zonder team.
  const { data: existingParents } = await supabase
    .from("events")
    .select("id, start_at")
    .eq("type", "zrl")
    .is("team_id", null)
    .is("parent_event_id", null)
    .gte("start_at", windowStart)
    .lt("start_at", windowEnd);
  const parentByDay = new Map<string, string>();
  for (const row of existingParents ?? []) {
    parentByDay.set(amsterdamDateKey(new Date(row.start_at as string)), row.id as string);
  }

  const missingParents = weeks.filter((week) => !parentByDay.has(week.dateKey));
  let parentsCreated = 0;
  if (missingParents.length > 0) {
    const { data: inserted, error } = await supabase
      .from("events")
      .insert(
        missingParents.map((week) => ({
          type: "zrl",
          title: week.title,
          description: `Ronde ${input.round}, week ${week.week}.`,
          start_at: week.startAtIso,
          created_by: access.user!.id,
        })),
      )
      .select("id, start_at");
    if (error) return { ok: false as const, error: error.message };
    for (const row of inserted ?? []) {
      parentByDay.set(amsterdamDateKey(new Date(row.start_at as string)), row.id as string);
    }
    parentsCreated = inserted?.length ?? 0;
  }

  // 2. Teamevents onder het hoofdevent van hun week.
  type Row = {
    type: "zrl";
    title: string;
    start_at: string;
    team_id: string;
    parent_event_id: string;
    created_by: string;
  };
  const rows: Row[] = [];
  for (const team of teams) {
    for (const event of generateZrlRound({ ...input, teamName: team.name })) {
      const parentId = parentByDay.get(event.dateKey);
      if (!parentId) continue;
      rows.push({
        type: "zrl",
        title: event.title,
        start_at: event.startAtIso,
        team_id: team.id as string,
        parent_event_id: parentId,
        created_by: access.user.id,
      });
    }
  }

  // Bestaande races voor deze teams in dit venster ophalen, zodat we alleen
  // aanvullen. Er is geen unieke index, dus dit gebeurt hier in plaats van met
  // een upsert. Herkend aan team en dag: de starttijd komt later uit de
  // Zwift-link en wijkt dan af van de importtijd. Een teamevent van vóór de
  // hoofdevents wordt alsnog aan zijn week gehangen.
  const { data: existing } = await supabase
    .from("events")
    .select("id, team_id, start_at, parent_event_id")
    .eq("type", "zrl")
    .in("team_id", input.teamIds)
    .gte("start_at", windowStart)
    .lt("start_at", windowEnd);

  const dayKey = (teamId: string, startAt: string) =>
    `${teamId}|${amsterdamDateKey(new Date(startAt))}`;
  const seen = new Set(
    (existing ?? []).map((row) => dayKey(row.team_id as string, row.start_at as string)),
  );
  let linked = 0;
  for (const row of existing ?? []) {
    if (row.parent_event_id) continue;
    const parentId = parentByDay.get(amsterdamDateKey(new Date(row.start_at as string)));
    if (!parentId) continue;
    const { error } = await supabase
      .from("events")
      .update({ parent_event_id: parentId })
      .eq("id", row.id as string);
    if (!error) linked += 1;
  }

  const fresh = rows.filter((row) => !seen.has(dayKey(row.team_id, row.start_at)));
  if (fresh.length > 0) {
    const { error } = await supabase.from("events").insert(fresh);
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath("/kalender");
  revalidatePath("/teams");
  revalidatePath("/beheer/zrl");

  if (fresh.length === 0 && parentsCreated === 0 && linked === 0) {
    return {
      ok: true as const,
      created: 0,
      skipped: rows.length,
      message: "Deze ronde stond er al volledig in.",
    };
  }
  return {
    ok: true as const,
    created: fresh.length,
    skipped: rows.length - fresh.length,
    message: null,
  };
}

/** Haalt de passes van de komende race meteen van zwbcycling.nl. */
export async function refreshRacepasses() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has(adminAreaPermission("zrl"))) {
    return { ok: false as const, error: "Geen recht om racepasses te zetten." };
  }

  const result = await importZrlRacepasses(createAdminClient(), {
    deadline: Date.now() + 15000,
  });
  revalidatePath("/beheer/zrl");
  revalidatePath("/events/[id]", "page");
  if (!result.ok) return { ok: false as const, error: result.error ?? "Ophalen mislukt." };
  return { ok: true as const, saved: result.saved, problems: result.problems };
}

/**
 * De WTRL-racepasses van één racedatum, per team (migr. 0353). Een leeg veld
 * haalt de pass weg; staat hij op de site, dan zet de volgende import hem terug.
 * Een link gelijk aan die van de site volgt de site weer.
 */
export async function saveRacepasses(input: {
  raceDate: string;
  passes: Array<{ teamId: string; url: string }>;
}) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has(adminAreaPermission("zrl"))) {
    return { ok: false as const, error: "Geen recht om racepasses te zetten." };
  }

  const raceDate = String(input.raceDate ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raceDate)) {
    return { ok: false as const, error: "Onbekende racedatum." };
  }

  const rows: Array<{ teamId: string; url: string | null }> = [];
  for (const pass of input.passes ?? []) {
    if (!pass.teamId) continue;
    const raw = String(pass.url ?? "").trim();
    if (!raw) {
      rows.push({ teamId: pass.teamId, url: null });
      continue;
    }
    const url = normalizeRacepassUrl(raw);
    if (!url) return { ok: false as const, error: `Geen WTRL-racepasslink: ${raw}` };
    rows.push({ teamId: pass.teamId, url });
  }

  const admin = createAdminClient();
  const { data: existingRows, error: readError } = await admin
    .from("zrl_race_passes")
    .select("team_id, url, site_url")
    .eq("race_date", raceDate);
  if (readError) return { ok: false as const, error: readError.message };
  const existing = new Map(
    ((existingRows ?? []) as Array<{ team_id: string; url: string; site_url: string | null }>).map(
      (row) => [row.team_id, row],
    ),
  );

  const clear = rows
    .filter((row) => !row.url && existing.has(row.teamId))
    .map((row) => row.teamId);
  if (clear.length > 0) {
    const { error } = await admin
      .from("zrl_race_passes")
      .delete()
      .eq("race_date", raceDate)
      .in("team_id", clear);
    if (error) return { ok: false as const, error: error.message };
  }
  // Alleen wat echt veranderde, zodat een ongemoeid veld de site blijft volgen.
  const upserts = rows
    .filter((row) => row.url && existing.get(row.teamId)?.url !== row.url)
    .map((row) => {
      const siteUrl = existing.get(row.teamId)?.site_url ?? null;
      return {
        team_id: row.teamId,
        race_date: raceDate,
        url: row.url as string,
        source: row.url === siteUrl ? "site" : "manual",
        site_url: siteUrl,
        created_by: access.user!.id,
        updated_at: new Date().toISOString(),
      };
    });
  if (upserts.length > 0) {
    const { error } = await admin
      .from("zrl_race_passes")
      .upsert(upserts, { onConflict: "team_id,race_date" });
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath("/beheer/zrl");
  revalidatePath("/events/[id]", "page");
  return { ok: true as const, saved: upserts.length };
}
