"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { amsterdamDateKey } from "@/lib/birthdays";
import {
  generateZrlRound,
  validateRoundSpec,
  type ZrlRaceFormat,
  type ZrlRoundSpec,
} from "@/lib/teams/zrl-season";

export type ImportInput = Omit<ZrlRoundSpec, "teamName"> & { teamIds: string[] };

/**
 * Zet een hele ZRL-ronde in de kalender: per raceweek één hoofdevent met de
 * gedeelde omschrijving, en daaronder per team een event. Idempotent: een
 * hoofdevent wordt herkend aan de dag, een teamevent aan (team_id, start_at).
 * Opnieuw draaien vult dus alleen aan, ook als er later een team bijkomt.
 */
export async function importZrlRound(input: ImportInput) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.hasAny(["teams.manage_roster", "events.manage_all", "community.manage"])) {
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
          description: zrlDescription(week.format, input.round, week.week),
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
  // aanvullen. Er is geen unieke index op (team_id, start_at), dus dit gebeurt
  // hier in plaats van met een upsert. Een teamevent van vóór de hoofdevents
  // wordt alsnog aan zijn week gehangen.
  const { data: existing } = await supabase
    .from("events")
    .select("id, team_id, start_at, parent_event_id")
    .eq("type", "zrl")
    .in("team_id", input.teamIds)
    .gte("start_at", starts[0])
    .lte("start_at", starts[starts.length - 1]);

  const seen = new Set(
    (existing ?? []).map(
      (row) => `${row.team_id}|${new Date(row.start_at as string).toISOString()}`,
    ),
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

  const fresh = rows.filter((row) => !seen.has(`${row.team_id}|${row.start_at}`));
  if (fresh.length > 0) {
    const { error } = await supabase.from("events").insert(fresh);
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath("/kalender");
  revalidatePath("/teams");
  revalidatePath("/beheer/zrl-kalender");

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

function zrlDescription(format: ZrlRaceFormat, round: number, week: number) {
  return format === "race_of_truth"
    ? "Race of Truth: puntenrace zonder stayeren, geen TT-fiets."
    : `Ronde ${round}, week ${week}.`;
}
