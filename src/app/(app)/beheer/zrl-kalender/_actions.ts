"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  generateZrlRound,
  validateRoundSpec,
  type ZrlRoundSpec,
} from "@/lib/teams/zrl-season";

export type ImportInput = Omit<ZrlRoundSpec, "teamName"> & { teamIds: string[] };

/**
 * Zet een hele ZRL-ronde in de kalender: per team één event per raceweek.
 * Idempotent op (team_id, start_at): opnieuw draaien voegt niets dubbel toe,
 * zodat je een ronde veilig kunt bijwerken nadat WTRL een tijd verschuift.
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

  type Row = {
    type: "zrl";
    title: string;
    description: string;
    start_at: string;
    team_id: string;
    created_by: string;
  };
  const rows: Row[] = [];
  for (const team of teams) {
    for (const event of generateZrlRound({ ...input, teamName: team.name })) {
      rows.push({
        type: "zrl",
        title: event.title,
        description:
          event.format === "race_of_truth"
            ? "Race of Truth: puntenrace zonder stayeren, geen TT-fiets."
            : `Ronde ${input.round}, week ${event.week}.`,
        start_at: event.startAtIso,
        team_id: team.id as string,
        created_by: access.user.id,
      });
    }
  }
  if (rows.length === 0) {
    return { ok: false as const, error: "Deze opgave levert geen races op." };
  }

  // Bestaande races voor deze teams in dit venster ophalen, zodat we alleen
  // aanvullen. Er is geen unieke index op (team_id, start_at), dus dit gebeurt
  // hier in plaats van met een upsert.
  const starts = rows.map((row) => row.start_at).sort();
  const { data: existing } = await supabase
    .from("events")
    .select("team_id, start_at")
    .eq("type", "zrl")
    .in("team_id", input.teamIds)
    .gte("start_at", starts[0])
    .lte("start_at", starts[starts.length - 1]);

  const seen = new Set(
    (existing ?? []).map(
      (row) => `${row.team_id}|${new Date(row.start_at as string).toISOString()}`,
    ),
  );
  const fresh = rows.filter((row) => !seen.has(`${row.team_id}|${row.start_at}`));

  if (fresh.length === 0) {
    return {
      ok: true as const,
      created: 0,
      skipped: rows.length,
      message: "Deze ronde stond er al volledig in.",
    };
  }

  const { error } = await supabase.from("events").insert(fresh);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/kalender");
  revalidatePath("/teams");
  revalidatePath("/beheer/zrl-kalender");
  return {
    ok: true as const,
    created: fresh.length,
    skipped: rows.length - fresh.length,
    message: null,
  };
}
