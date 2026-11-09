import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BackLink, EmptyState, PageHeader } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import { CLUB_LADDER_SUMMARY_URL } from "@/lib/club-ladder/summary";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { SyncResultsButton } from "../_components/sync-results-button";
import { LadderCaptains } from "./_components/ladder-captains";
import { LadderPoolAdd } from "./_components/ladder-pool-add";
import { LadderPuzzle } from "./_components/ladder-puzzle";
import { canAssignLadderRiders, canEditLadderPuzzle } from "@/lib/club-ladder/access";
import { getRequestAccess } from "@/lib/auth/request";
import {
  latestResultFor,
  loadLadderAddOptions,
  loadLadderCaptains,
  loadLadderPuzzle,
  loadLadderRiders,
  loadLadderTeams,
} from "./_lib/load";

export const dynamic = "force-dynamic";

export const revalidate = 0;

export default async function ClubLadderPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  // De teamweergave staat sinds 2026-11-02 op een eigen pagina.
  const { team: oldTeamParam } = await searchParams;
  if (oldTeamParam && /^[0-9a-f-]{36}$/i.test(oldTeamParam)) redirect(`/teams/club-ladder/${oldTeamParam}`);

  const supabase = await createClient();
  const admin = createAdminClient();
  const [access, { teams: teamRows, sourcesByTeam, results: resultRows }] = await Promise.all([
    getRequestAccess(),
    loadLadderTeams(supabase),
  ]);

  const [{ riders: loadedRiders, withdrawn }, canAssign, canPuzzle] = await Promise.all([
    loadLadderRiders(teamRows, admin, supabase),
    canAssignLadderRiders(access),
    canEditLadderPuzzle(access),
  ]);
  // Wie uit de ladder is gehaald, valt uit de puzzel.
  const allLadderRiders = loadedRiders.filter((rider) => !withdrawn.has(rider.id));
  const puzzle = await loadLadderPuzzle(teamRows, allLadderRiders, admin);
  const [captainData, addOptions] = await Promise.all([
    canAssign ? loadLadderCaptains(teamRows, admin) : null,
    canAssign || canPuzzle ? loadLadderAddOptions(admin) : null,
  ]);
  // Rosternamen en puzzelteams deelt alleen de rol teamcaptain in.
  const inLadderRoster = new Set((puzzle?.roster ?? []).map((row) => row.roster_entry_id));
  // Zelfde recht als syncResultsNow; met alleen manage_results faalde de knop.
  const canSync = access.has("teams.sync_sources");
  const firstTeam = teamRows.find((team) => !team.is_graveyard) ?? teamRows[0] ?? null;

  return (
    <div className="space-y-6">
      <BackLink href="/teams" label="Teams" />
      <PageHeader
        eyebrow="Club"
        title="Club Ladder"
        actions={
          <div className="flex flex-col gap-2 sm:items-end">
            {canSync && <SyncResultsButton />}
            <Link
              href={CLUB_LADDER_SUMMARY_URL}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              target="_blank"
            >
              Ladder summary <ArrowRight className="size-4" />
            </Link>
          </div>
        }
      />

      {teamRows.length === 0 || !firstTeam ? (
        <EmptyState>Geen Club Ladder-teams gevonden.</EmptyState>
      ) : (
        <>
          <section className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold">ZWB teams</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {teamRows.map((team) => {
                const result = latestResultFor(team.id, resultRows);
                const source = sourcesByTeam.get(team.id) ?? null;
                return (
                  <Link
                    key={team.id}
                    href={`/teams/club-ladder/${team.id}`}
                    className="block rounded-md border bg-background p-3 text-sm hover:bg-muted"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{team.name}</span>
                      {team.is_graveyard ? (
                        <span className="text-xs text-muted-foreground">archief</span>
                      ) : (
                        <ArrowRight className="size-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {source?.match_name ?? "Geen Ladder-bron"} - positie {result?.position ?? "-"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {puzzle && (
            <LadderPuzzle
              teams={puzzle.teams}
              riders={puzzle.riders}
              otherTeams={puzzle.otherTeams}
              canEdit={canPuzzle}
            />
          )}

          {addOptions && (
            <LadderPoolAdd
              title="Renner aan de puzzel toevoegen"
              members={addOptions.members.filter(
                (member) => !allLadderRiders.some((rider) => rider.id === member.id),
              )}
              roster={canPuzzle && puzzle ? addOptions.roster.filter((entry) => !inLadderRoster.has(entry.id)) : []}
              teams={canPuzzle && puzzle ? puzzle.teams.map((team) => ({ id: team.id, name: team.name })) : []}
            />
          )}

          {captainData && (
            <LadderCaptains
              teams={captainData.teams}
              members={captainData.members}
              initialTeamId={firstTeam.id}
            />
          )}
        </>
      )}
    </div>
  );
}
