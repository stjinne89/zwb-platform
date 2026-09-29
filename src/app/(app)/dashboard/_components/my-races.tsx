// "Jouw races": de komende clubraces waar het lid zelf in zit — de races van
// zijn teams (ZRL, Ladder, FRR) en clubraces waarvoor hij ja zei (Omnium).
//
// Een ZRL-raceweek is een hoofdevent met per team een teamevent eronder
// (migr. 0178). Wie in een paraplu zit, telt de races van alle subteams als
// eigen team (zelfde regel als de kalender, migr. 0179); tot de captain hem
// indeelt, toont het blok de raceweek zelf in plaats van elk subteam apart.
//
// Async server component achter een Suspense: de extra queries mogen de rest
// van het dashboard niet ophouden.

import Link from "next/link";
import { Flag, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { InlineMoreLink, SectionHeader } from "@/components/app-ui";
import { CLUB_RACE_TYPES, EVENT_TYPE_LABELS } from "@/lib/event-types";

type RaceEvent = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  team_id: string | null;
  parent_event_id: string | null;
  zwift_event_id: number | string | null;
  teams?: { name: string } | { name: string }[] | null;
};

type RaceStatus = "lineup" | "available" | "maybe" | "unavailable" | "yes" | null;

type MyRace = {
  key: string;
  href: string;
  title: string;
  type: string;
  startAt: string;
  teamName: string | null;
  status: RaceStatus;
  lineup: Array<{ name: string; isMe: boolean }>;
  liveHref: string | null;
};

const EVENT_COLUMNS = "id, title, type, start_at, team_id, parent_event_id, zwift_event_id";
/** Een race die net begon blijft staan, zodat de live stand bereikbaar is. */
const STARTED_GRACE_MS = 2 * 60 * 60 * 1000;
const LIVE_LEAD_MS = 15 * 60 * 1000;
const WINDOW_DAYS = 14;
const MAX_RACES = 3;

const STATUS_LABELS: Record<Exclude<RaceStatus, null>, string> = {
  lineup: "In de opstelling",
  available: "Beschikbaar",
  maybe: "Misschien",
  unavailable: "Niet beschikbaar",
  yes: "Aangemeld",
};

function teamName(rel: RaceEvent["teams"]) {
  if (!rel) return null;
  return (Array.isArray(rel) ? rel[0] : rel)?.name ?? null;
}

function statusClass(status: RaceStatus) {
  if (status === "lineup" || status === "yes") return "bg-primary text-primary-foreground";
  if (status === "available") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (status === "unavailable") return "bg-muted text-muted-foreground";
  return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
}

export async function MyRaces({ userId }: { userId: string }) {
  const supabase = await createClient();
  const now = new Date();
  const fromIso = new Date(now.getTime() - STARTED_GRACE_MS).toISOString();
  const toIso = new Date(now.getTime() + WINDOW_DAYS * 86400_000).toISOString();

  const [{ data: memberRows }, { data: rsvpRows }] = await Promise.all([
    supabase.from("team_members").select("team_id").eq("profile_id", userId),
    supabase
      .from("event_rsvps")
      .select(`event_id, events(${EVENT_COLUMNS})`)
      .eq("profile_id", userId)
      .eq("status", "yes"),
  ]);

  const directTeamIds = (memberRows ?? []).map((row) => row.team_id as string);
  const { data: subteamRows } =
    directTeamIds.length > 0
      ? await supabase.from("teams").select("id").in("parent_team_id", directTeamIds)
      : { data: [] };
  const teamIds = [
    ...new Set([...directTeamIds, ...(subteamRows ?? []).map((row) => row.id as string)]),
  ];

  const { data: teamEventRows } =
    teamIds.length > 0
      ? await supabase
          .from("events")
          .select(`${EVENT_COLUMNS}, teams(name)`)
          .in("team_id", teamIds)
          .in("type", CLUB_RACE_TYPES)
          .gte("start_at", fromIso)
          .lte("start_at", toIso)
          .order("start_at", { ascending: true })
          .limit(20)
      : { data: [] };
  const teamEvents = (teamEventRows ?? []) as unknown as RaceEvent[];

  const teamEventIds = new Set(teamEvents.map((event) => event.id));
  const rsvpEvents = ((rsvpRows ?? []) as unknown as Array<{
    events: RaceEvent | RaceEvent[] | null;
  }>)
    .map((row) => (Array.isArray(row.events) ? row.events[0] : row.events))
    .filter(
      (event): event is RaceEvent =>
        Boolean(event) &&
        CLUB_RACE_TYPES.includes(event!.type) &&
        event!.start_at >= fromIso &&
        event!.start_at <= toIso &&
        !teamEventIds.has(event!.id),
    );

  if (teamEvents.length === 0 && rsvpEvents.length === 0) return null;

  // Opstelling en beschikbaarheid staan op het teamevent of op de raceweek.
  const parentIds = [
    ...new Set(teamEvents.map((event) => event.parent_event_id).filter(Boolean) as string[]),
  ];
  const lookupIds = [...teamEventIds, ...parentIds];
  const [{ data: parentRows }, { data: lineupRows }, { data: availabilityRows }] =
    lookupIds.length > 0
      ? await Promise.all([
          parentIds.length > 0
            ? supabase.from("events").select("id, title, start_at").in("id", parentIds)
            : Promise.resolve({ data: [] }),
          supabase
            .from("team_event_lineups")
            .select(
              "event_id, team_id, profile_id, roster_entry_id, profiles!team_event_lineups_profile_id_fkey(display_name), roster_entries(name)",
            )
            .in("event_id", lookupIds)
            .in("team_id", teamIds),
          supabase
            .from("team_event_availability")
            .select("event_id, status")
            .eq("profile_id", userId)
            .in("event_id", lookupIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  const parents = new Map(
    ((parentRows ?? []) as Array<{ id: string; title: string; start_at: string }>).map(
      (row) => [row.id, row],
    ),
  );
  const lineups = (lineupRows ?? []) as unknown as Array<{
    event_id: string;
    team_id: string;
    profile_id: string | null;
    roster_entry_id: string | null;
    profiles: { display_name: string } | { display_name: string }[] | null;
    roster_entries: { name: string } | { name: string }[] | null;
  }>;
  const availability = new Map(
    ((availabilityRows ?? []) as Array<{ event_id: string; status: RaceStatus }>).map(
      (row) => [row.event_id, row.status],
    ),
  );

  function lineupFor(event: RaceEvent) {
    const seen = new Set<string>();
    const list: Array<{ name: string; isMe: boolean }> = [];
    for (const row of lineups) {
      if (row.team_id !== event.team_id) continue;
      if (row.event_id !== event.id && row.event_id !== event.parent_event_id) continue;
      const key = (row.profile_id ?? row.roster_entry_id) as string;
      if (seen.has(key)) continue;
      seen.add(key);
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const roster = Array.isArray(row.roster_entries)
        ? row.roster_entries[0]
        : row.roster_entries;
      list.push({
        name: profile?.display_name ?? roster?.name ?? "Onbekend",
        isMe: row.profile_id === userId,
      });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, "nl"));
  }

  function liveHref(event: RaceEvent) {
    if (event.type !== "zrl" || !event.team_id || !event.zwift_event_id) return null;
    const start = new Date(event.start_at).getTime();
    const t = now.getTime();
    return t >= start - LIVE_LEAD_MS && t <= start + STARTED_GRACE_MS
      ? `/live/zrl/${event.id}`
      : null;
  }

  function teamRace(event: RaceEvent): MyRace {
    const lineup = lineupFor(event);
    const status: RaceStatus = lineup.some((item) => item.isMe)
      ? "lineup"
      : (availability.get(event.id) ??
        (event.parent_event_id ? availability.get(event.parent_event_id) : null) ??
        null);
    return {
      key: event.id,
      href: `/events/${event.id}`,
      title: event.title,
      type: event.type,
      startAt: event.start_at,
      teamName: teamName(event.teams),
      status,
      lineup,
      liveHref: liveHref(event),
    };
  }

  // Per raceweek één regel: het team waarin het lid is opgesteld, anders zijn
  // eigen (directe) team, anders de raceweek zelf tot hij is ingedeeld.
  const groups = new Map<string, RaceEvent[]>();
  for (const event of teamEvents) {
    const key = event.parent_event_id ?? event.id;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  const races: MyRace[] = [];
  for (const [key, events] of groups) {
    const placed = events.find((event) => lineupFor(event).some((item) => item.isMe));
    const direct = events.filter((event) => directTeamIds.includes(event.team_id ?? ""));
    const pick =
      placed ?? (events.length === 1 ? events[0] : direct.length === 1 ? direct[0] : null);
    if (pick) {
      races.push(teamRace(pick));
      continue;
    }
    const parent = parents.get(key);
    races.push({
      key,
      href: `/events/${parent ? parent.id : events[0].id}`,
      title: parent?.title ?? events[0].title,
      type: events[0].type,
      startAt: parent?.start_at ?? events[0].start_at,
      teamName: null,
      status: availability.get(key) ?? null,
      lineup: [],
      liveHref: null,
    });
  }
  for (const event of rsvpEvents) {
    races.push({
      key: event.id,
      href: `/events/${event.id}`,
      title: event.title,
      type: event.type,
      startAt: event.start_at,
      teamName: null,
      status: "yes",
      lineup: [],
      liveHref: liveHref(event),
    });
  }

  const shown = races
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, MAX_RACES);

  return (
    <section>
      <SectionHeader
        icon={Flag}
        title="Jouw races"
        action={<InlineMoreLink href="/kalender">Kalender</InlineMoreLink>}
      />
      <ul className="divide-y rounded-lg border border-primary/30 bg-card">
        {shown.map((race) => (
          <li key={race.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <Link href={race.href} className="group min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                {new Date(race.startAt).toLocaleString("nl-NL", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Amsterdam",
                })}
              </p>
              <p className="truncate font-medium group-hover:underline">{race.title}</p>
              <p className="truncate text-sm text-muted-foreground">
                {[EVENT_TYPE_LABELS[race.type] ?? race.type, race.teamName]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {race.lineup.length > 0 && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {race.lineup.map((item, index) => (
                    <span key={`${item.name}-${index}`}>
                      {index > 0 ? ", " : ""}
                      <span className={item.isMe ? "font-semibold text-foreground" : ""}>
                        {item.name}
                      </span>
                    </span>
                  ))}
                </p>
              )}
            </Link>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {race.liveHref && (
                <Link
                  href={race.liveHref}
                  className="inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-destructive/90"
                >
                  <Radio className="size-3.5" />
                  Live stand
                </Link>
              )}
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(race.status)}`}
              >
                {race.status ? STATUS_LABELS[race.status] : "Nog niet opgegeven"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
