import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { suggestProfileLinks } from "@/lib/teams/wtrl-membership";
import { WtrlImportForm, type ZwbTeamOption } from "./_components/import-form";
import { LinkSuggestions } from "./_components/link-suggestions";

export const dynamic = "force-dynamic";

export default async function WtrlTeamsPage() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");
  if (!access.has("teams.manage_roster")) redirect("/dashboard");

  const [
    { data: teams },
    { data: wtrlTeams },
    { data: riderRows },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, is_graveyard")
      .eq("type", "zrl")
      .order("name"),
    supabase
      .from("wtrl_teams")
      .select("trc_ref, name, division, team_id, imported_at, teams(name)")
      .order("name"),
    supabase.from("wtrl_team_riders").select("trc_ref, zwift_id, name"),
    supabase.from("profiles").select("id, display_name, zwift_id"),
  ]);

  const teamOptions: ZwbTeamOption[] = (
    (teams ?? []) as Array<ZwbTeamOption & { is_graveyard?: boolean }>
  )
    .filter((team) => !team.is_graveyard)
    .map((team) => ({ id: team.id, name: team.name }));
  const existing = (wtrlTeams ?? []) as Array<{
    trc_ref: string;
    name: string;
    division: string | null;
    team_id: string | null;
    imported_at: string;
    teams: { name: string } | { name: string }[] | null;
  }>;
  const riderList = (riderRows ?? []) as Array<{ trc_ref: string; zwift_id: string; name: string }>;
  const riderCount = new Map<string, number>();
  for (const row of riderList) {
    riderCount.set(row.trc_ref, (riderCount.get(row.trc_ref) ?? 0) + 1);
  }
  const wtrlTeamName = new Map(existing.map((row) => [row.trc_ref, row.name]));
  const suggestions = suggestProfileLinks(
    riderList.map((row) => ({
      zwiftId: row.zwift_id,
      name: row.name,
      team: wtrlTeamName.get(row.trc_ref) ?? row.trc_ref,
    })),
    (profiles ?? []) as Array<{ id: string; display_name: string | null; zwift_id: string | null }>,
  );

  return (
    <div className="space-y-8">
      <PageHeader title="WTRL-teams" />

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <WtrlImportForm
          teams={teamOptions}
          knownMapping={Object.fromEntries(existing.map((row) => [row.trc_ref, row.team_id]))}
        />
      </section>

      {suggestions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Koppelvoorstellen ({suggestions.length})
          </h2>
          <LinkSuggestions suggestions={suggestions} />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Opgeslagen ({existing.length})
        </h2>
        {existing.length === 0 ? (
          <EmptyState>Nog niets geïmporteerd.</EmptyState>
        ) : (
          <ul className="divide-y rounded-lg border bg-card text-sm">
            {existing.map((row) => {
              const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
              return (
                <li key={row.trc_ref} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
                  <span className="font-medium">{row.name}</span>
                  <span className="text-muted-foreground">{row.division ?? "-"}</span>
                  <span className="text-muted-foreground">
                    {riderCount.get(row.trc_ref) ?? 0} renners
                  </span>
                  <span className="text-muted-foreground">
                    → {team?.name ?? "niet gekoppeld"}
                  </span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {new Date(row.imported_at).toLocaleString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Amsterdam",
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
