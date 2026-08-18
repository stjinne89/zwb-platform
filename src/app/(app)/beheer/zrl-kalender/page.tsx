import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/app-ui";
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
      .select("id, name, type, is_graveyard")
      .eq("type", "zrl")
      .order("name"),
    supabase
      .from("events")
      .select("id, title, start_at, teams(name)")
      .eq("type", "zrl")
      .gte("start_at", new Date().toISOString())
      .order("start_at")
      .limit(40),
  ]);

  const teamOptions = ((teams ?? []) as Array<TeamOption & { is_graveyard?: boolean }>)
    .filter((team) => !team.is_graveyard)
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
          Komende ZRL-races in de kalender ({upcoming?.length ?? 0})
        </h2>
        {!upcoming || upcoming.length === 0 ? (
          <EmptyState>Nog geen ZRL-races in de kalender.</EmptyState>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {upcoming.map((event) => {
              const team = Array.isArray(event.teams) ? event.teams[0] : event.teams;
              return (
                <li key={event.id as string} className="flex flex-wrap gap-2 p-3 text-sm">
                  <span className="tabular-nums text-muted-foreground">
                    {new Date(event.start_at as string).toLocaleString("nl-NL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Amsterdam",
                    })}
                  </span>
                  <span>{event.title as string}</span>
                  {team?.name && (
                    <span className="text-muted-foreground">· {team.name}</span>
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
