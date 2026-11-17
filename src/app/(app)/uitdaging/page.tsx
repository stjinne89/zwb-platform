import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, HeartHandshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request";
import { moduleName } from "@/lib/club";
import { EmptyState, PageHeader, SectionHeader } from "@/components/app-ui";
import { MemberLink } from "@/components/member-link";
import {
  countdownLabel,
  daysUntil,
  eventsSince,
  formatEur,
  percentOf,
  sortEntries,
  teamTotals,
  type ChallengeEntry,
} from "@/lib/uitdaging";
import { EntryForm } from "./_components/entry-form";

export async function generateMetadata() {
  return { title: await moduleName("uitdaging") };
}
export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  title: string;
  start_at: string;
  location: string | null;
};

type EntryRow = {
  event_id: string;
  profile_id: string;
  target_climbs: number;
  climbs_done: number | null;
  fundraising_target_eur: number | null;
  raised_eur: number | null;
  fundraising_url: string | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
};

type NamedEntry = ChallengeEntry & { name: string };

const DATE = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Amsterdam",
});

function displayName(rel: EntryRow["profiles"]): string {
  const single = Array.isArray(rel) ? rel[0] : rel;
  return single?.display_name?.trim() || "Lid";
}

export default async function UitdagingPage() {
  const [supabase, user, title] = await Promise.all([
    createClient(),
    getRequestUser(),
    moduleName("uitdaging"),
  ]);
  if (!user) redirect("/login");

  const since = eventsSince();
  const { data: eventRows } = await supabase
    .from("events")
    .select("id, title, start_at, location")
    .eq("kind", "goed_doel")
    .gte("start_at", since)
    .order("start_at", { ascending: true })
    .returns<EventRow[]>();
  const events = eventRows ?? [];

  const { data: entryRows } = events.length
    ? await supabase
        .from("challenge_entries")
        .select(
          "event_id, profile_id, target_climbs, climbs_done, fundraising_target_eur, raised_eur, fundraising_url, profiles(display_name)",
        )
        .in(
          "event_id",
          events.map((e) => e.id),
        )
        .returns<EntryRow[]>()
    : { data: [] as EntryRow[] };

  const byEvent = new Map<string, NamedEntry[]>();
  for (const row of entryRows ?? []) {
    const list = byEvent.get(row.event_id) ?? [];
    list.push({
      profileId: row.profile_id,
      name: displayName(row.profiles),
      targetClimbs: row.target_climbs,
      climbsDone: row.climbs_done,
      fundraisingTargetEur: row.fundraising_target_eur,
      raisedEur: row.raised_eur,
      fundraisingUrl: row.fundraising_url,
    });
    byEvent.set(row.event_id, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} />

      {events.length === 0 && <EmptyState>Geen rit gepland.</EmptyState>}

      {events.map((event) => {
        const entries = sortEntries(byEvent.get(event.id) ?? []);
        const mine = entries.find((e) => e.profileId === user.id) ?? null;
        const totals = teamTotals(entries);
        const days = daysUntil(event.start_at);
        const percent = percentOf(totals.raisedEur, totals.targetEur);
        const showDone = entries.some((e) => e.climbsDone !== null);

        return (
          <section key={event.id} className="space-y-4 rounded-lg border bg-card p-4">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">
                  <Link href={`/events/${event.id}`} className="hover:underline">
                    {event.title}
                  </Link>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {DATE.format(new Date(event.start_at))}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
              </div>
              <span className="w-fit shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {countdownLabel(days)}
              </span>
            </header>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Deelnemers" value={String(totals.riders)} />
              <Stat
                label={totals.doneClimbs === null ? "Keer omhoog" : "Gehaald / doel"}
                value={
                  totals.doneClimbs === null
                    ? String(totals.plannedClimbs)
                    : `${totals.doneClimbs} / ${totals.plannedClimbs}`
                }
              />
              <Stat label="Opgehaald" value={formatEur(totals.raisedEur)} />
              <Stat
                label="Sponsordoel"
                value={totals.targetEur > 0 ? formatEur(totals.targetEur) : "–"}
              />
            </dl>

            {percent !== null && (
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Opgehaald van het sponsordoel"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
            )}

            <EntryForm eventId={event.id} entry={mine} eventStarted={days <= 0} />

            <div>
              <SectionHeader icon={HeartHandshake} title="Wie fietst er mee" />
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nog niemand.</p>
              ) : (
                <ul className="divide-y">
                  {entries.map((entry) => (
                    <li
                      key={entry.profileId}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm"
                    >
                      <MemberLink id={entry.profileId} className="font-medium">
                        {entry.name}
                      </MemberLink>
                      <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                        <span>
                          {showDone && entry.climbsDone !== null
                            ? `${entry.climbsDone} van ${entry.targetClimbs}×`
                            : `${entry.targetClimbs}×`}
                        </span>
                        <span className="tabular-nums">
                          {formatEur(entry.raisedEur ?? 0)}
                          {entry.fundraisingTargetEur
                            ? ` van ${formatEur(entry.fundraisingTargetEur)}`
                            : ""}
                        </span>
                        {entry.fundraisingUrl && (
                          <a
                            href={entry.fundraisingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 items-center gap-1 font-medium text-primary hover:underline"
                          >
                            Sponsor
                            <ExternalLink className="size-3.5" aria-hidden />
                          </a>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/60 p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
