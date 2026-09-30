import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/app-ui";
import { genderLabel, type SrcGender } from "@/lib/src/feed";
import type { SrcSyncState } from "@/lib/src/sync";
import { RefreshButton } from "./_components/refresh-button";
import { SrcTeamForm } from "./_components/team-form";

export const dynamic = "force-dynamic";

type ParentRow = { id: string; title: string; start_at: string; src_sunday: string };
type RaceRow = {
  event_id: string;
  sunday: string;
  gender: SrcGender;
  registration_closes_at: string | null;
  participants: number | null;
  events: { start_at: string } | { start_at: string }[] | null;
};

function when(iso: string | null) {
  if (!iso) return "nooit";
  return new Date(iso).toLocaleString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

export default async function SrcKalenderPage() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");
  if (!access.hasAny(["events.manage_all", "community.manage"])) redirect("/dashboard");

  // Vanaf vorige week, zodat de uitslag van afgelopen zondag nog te vinden is.
  const since = new Date(new Date().getTime() - 7 * 86400_000).toISOString().slice(0, 10);
  const [{ data: stateRow }, { data: parentRows }, { data: raceRows }, { data: teamRows }] =
    await Promise.all([
      supabase
        .from("src_sync_state")
        .select("created_by, synced_at, sync_error, races_in_feed")
        .eq("id", true)
        .maybeSingle(),
      supabase
        .from("events")
        .select("id, title, start_at, src_sunday")
        .not("src_sunday", "is", null)
        .is("parent_event_id", null)
        .gte("src_sunday", since)
        .order("src_sunday"),
      supabase
        .from("src_races")
        .select("event_id, sunday, gender, registration_closes_at, participants, events(start_at)")
        .gte("sunday", since),
      supabase
        .from("teams")
        .select("id, name, mywhoosh_team_name")
        .eq("type", "src")
        .order("name"),
    ]);
  const teams = (teamRows ?? []) as Array<{
    id: string;
    name: string;
    mywhoosh_team_name: string | null;
  }>;
  const state = stateRow as SrcSyncState | null;
  const parents = (parentRows ?? []) as ParentRow[];
  const races = (raceRows ?? []) as unknown as RaceRow[];

  const raceIds = races.map((race) => race.event_id);
  const { data: rsvpRows } =
    raceIds.length > 0
      ? await supabase
          .from("event_rsvps")
          .select("event_id")
          .in("event_id", raceIds)
          .eq("status", "yes")
      : { data: [] };
  const yesCount = new Map<string, number>();
  for (const row of (rsvpRows ?? []) as Array<{ event_id: string }>) {
    yesCount.set(row.event_id, (yesCount.get(row.event_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">SRC-kalender</h1>
      </header>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <dl className="text-sm">
          <dt className="inline text-muted-foreground">Laatste sync: </dt>
          <dd className="inline">
            {when(state?.synced_at ?? null)}
            {state?.races_in_feed != null && ` · ${state.races_in_feed} races in de feed`}
          </dd>
          {state?.sync_error && <p className="text-destructive">{state.sync_error}</p>}
        </dl>
        <RefreshButton />
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Teams
        </h2>
        {teams.map((team) => (
          <SrcTeamForm
            key={team.id}
            initial={{ id: team.id, name: team.name, mywhooshTeamName: team.mywhoosh_team_name }}
          />
        ))}
        <SrcTeamForm />
      </section>

      {parents.length === 0 ? (
        <EmptyState>Nog geen SRC-zondagen.</EmptyState>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {parents.map((parent) => {
            const ofSunday = races
              .filter((race) => race.sunday === parent.src_sunday)
              .sort((a, b) => a.gender.localeCompare(b.gender));
            const closes = ofSunday.find((race) => race.registration_closes_at)
              ?.registration_closes_at;
            return (
              <li key={parent.id} className="space-y-1 p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/events/${parent.id}`} className="font-medium hover:underline">
                    {parent.title}
                  </Link>
                  {closes && (
                    <span className="text-muted-foreground">Inschrijven tot {when(closes)}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ofSunday.map((race) => {
                    const event = Array.isArray(race.events) ? race.events[0] : race.events;
                    const count = yesCount.get(race.event_id);
                    return (
                      <Link
                        key={race.event_id}
                        href={`/events/${race.event_id}`}
                        className="rounded-full border px-2 py-0.5 text-xs tabular-nums hover:bg-muted"
                      >
                        {genderLabel(race.gender)}
                        {event ? ` ${time(event.start_at)}` : null}
                        {count ? ` · ${count} ZWB` : null}
                        {race.participants ? ` · ${race.participants} ingeschreven` : null}
                      </Link>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
