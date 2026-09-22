import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/app-ui";
import { groupSubEvents } from "@/lib/events/sub-events";
import { ZRL_2026_27_ROUNDS } from "@/lib/teams/zrl-season";
import { ImportForm, type TeamOption } from "./_components/import-form";

export const dynamic = "force-dynamic";

export default async function ZrlKalenderPage() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");
  if (!access.hasAny(["teams.manage_roster", "events.manage_all", "community.manage"])) {
    redirect("/dashboard");
  }

  const [{ data: teams }, { data: upcoming }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, type, is_graveyard, parent_team_id")
      .eq("type", "zrl")
      .order("name"),
    supabase
      .from("events")
      .select("id, title, start_at, parent_event_id, teams(name)")
      .eq("type", "zrl")
      .gte("start_at", new Date().toISOString())
      .order("start_at")
      .limit(120),
  ]);

  const { topLevel: raceWeeks, childrenByParent } = groupSubEvents(
    (upcoming ?? []) as Array<{
      id: string;
      title: string;
      start_at: string;
      parent_event_id: string | null;
      teams: { name: string } | { name: string }[] | null;
    }>,
  );
  const teamName = (event: (typeof raceWeeks)[number]) => {
    const team = Array.isArray(event.teams) ? event.teams[0] : event.teams;
    return team?.name ?? null;
  };

  type TeamRow = TeamOption & { is_graveyard?: boolean; parent_team_id: string | null };
  // Een hoofdteam met subteams start zelf niet; zijn subteams wel (migr. 0179).
  const hoofdteams = new Set(
    ((teams ?? []) as TeamRow[]).map((team) => team.parent_team_id).filter(Boolean),
  );
  const teamOptions = ((teams ?? []) as TeamRow[])
    .filter((team) => !team.is_graveyard && !hoofdteams.has(team.id))
    .map((team) => ({ id: team.id, name: team.name }));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">ZRL-racekalender</h1>
        <p className="text-sm text-muted-foreground">
          Zet een hele ronde in één keer in de kalender. Zodra de races er staan,
          kunnen leden hun beschikbaarheid opgeven en kan de captain een opstelling
          maken. Opnieuw toevoegen voegt niets dubbel toe.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ronde toevoegen
        </h2>
        {teamOptions.length === 0 ? (
          <EmptyState>Geen ZRL-teams gevonden.</EmptyState>
        ) : (
          <ImportForm teams={teamOptions} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Seizoen 2026/27 volgens WTRL
        </h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {ZRL_2026_27_ROUNDS.map((ronde) => (
            <li key={ronde.round}>
              <strong className="text-foreground">Ronde {ronde.round}</strong> — races{" "}
              {new Date(ronde.firstRaceDate).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "short",
              })}{" "}
              t/m{" "}
              {new Date(ronde.lastRaceDate).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              , registratie opent{" "}
              {new Date(ronde.registrationOpens).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "short",
              })}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Komende ZRL-races in de kalender ({raceWeeks.length})
        </h2>
        {raceWeeks.length === 0 ? (
          <EmptyState>Nog geen ZRL-races in de kalender.</EmptyState>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {raceWeeks.slice(0, 40).map((event) => {
              const own = teamName(event);
              const teams = (childrenByParent.get(event.id) ?? [])
                .map(teamName)
                .filter(Boolean);
              return (
                <li key={event.id} className="flex flex-wrap gap-2 p-3 text-sm">
                  <span className="tabular-nums text-muted-foreground">
                    {new Date(event.start_at).toLocaleString("nl-NL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Amsterdam",
                    })}
                  </span>
                  <Link href={`/events/${event.id}`} className="hover:underline">
                    {event.title}
                  </Link>
                  {own && <span className="text-muted-foreground">· {own}</span>}
                  {teams.length > 0 && (
                    <span className="text-muted-foreground">· {teams.join(", ")}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
