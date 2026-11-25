import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type TeamUsage = {
  subteams: number;
  /** Leden, races, uitslagen en rennersuitslagen opgeteld. */
  history: number;
};

/**
 * Wat er aan een team hangt. Een leeg team mag weg, en alleen bij een leeg team
 * mogen type en hoofdteam nog wisselen: anders blijven opstellingen en
 * beschikbaarheid aan het oude hoofdteam hangen.
 */
export async function loadTeamUsage(admin: Admin, teamId: string): Promise<TeamUsage> {
  const count = async (table: string, column: string) => {
    const { count: rows, error } = await admin
      .from(table)
      .select(column, { count: "exact", head: true })
      .eq(column, teamId);
    if (error) throw new Error(error.message);
    return rows ?? 0;
  };
  const [subteams, members, races, results, riderResults, roster] = await Promise.all([
    count("teams", "parent_team_id"),
    count("team_members", "team_id"),
    count("events", "team_id"),
    count("team_results", "team_id"),
    count("zrl_rider_results", "team_id"),
    count("roster_entries", "team_id"),
  ]);
  return { subteams, history: members + races + results + riderResults + roster };
}

export function isTeamEmpty(usage: TeamUsage) {
  return usage.subteams === 0 && usage.history === 0;
}
