import Link from "next/link";
import { Cake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { EVENT_TYPE_LABELS } from "@/lib/event-types";
import {
  ageOnBirthday,
  amsterdamDateKey,
  formatDateKey,
  nextBirthdayOccurrence,
} from "@/lib/birthdays";

const STALE_AFTER_MIN = 15;
type RsvpStatus = "yes" | "maybe" | "no";

async function getActiveCutoffIso() {
  return new Date(Date.now() - STALE_AFTER_MIN * 60 * 1000).toISOString();
}

export default async function KalenderPage() {
  const supabase = await createClient();
  const [{ data: allEvents }, { data: birthdayProfiles }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, type, start_at, location, distance_km, elevation_m, cover_image_path",
      )
      .order("start_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, birth_date")
      .eq("is_approved", true)
      .eq("share_birthday", true)
      .not("birth_date", "is", null),
  ]);

  const todayKey = amsterdamDateKey(new Date());
  // Alleen vandaag + toekomstige events op de kalender — voorbije events
  // verhuizen naar /ritverslagen. Zo staat het event van vandaag (of het
  // eerstvolgende) bovenaan.
  const events = (allEvents ?? []).filter(
    (event) => amsterdamDateKey(new Date(event.start_at)) >= todayKey,
  );
  const pastCount = (allEvents?.length ?? 0) - events.length;
  const birthdays = (birthdayProfiles ?? []).flatMap((profile) => {
    if (!profile.birth_date) return [];
    const occurrence = nextBirthdayOccurrence(profile.birth_date, todayKey);
    if (!occurrence) return [];
    return [
      {
        kind: "birthday" as const,
        id: profile.id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        birthDate: profile.birth_date,
        dateKey: occurrence.dateKey,
        year: occurrence.year,
      },
    ];
  });
  const calendarItems = [
    ...events.map((event) => ({
      kind: "event" as const,
      sortKey:
        `${amsterdamDateKey(new Date(event.start_at))}|` +
        `${event.start_at}|event|${event.id}`,
      event,
    })),
    ...birthdays.map((birthday) => ({
      kind: "birthday" as const,
      sortKey:
        `${birthday.dateKey}|${birthday.dateKey}T09:00:00|` +
        `birthday|${birthday.id}`,
      birthday,
    })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  const todayEventIds = events
    .filter((event) => amsterdamDateKey(new Date(event.start_at)) === todayKey)
    .map((event) => event.id);
  const liveCountsByEvent = new Map<string, number>();

  if (todayEventIds.length > 0) {
    const cutoff = await getActiveCutoffIso();
    const [{ data: rsvps }, { data: sessions }] = await Promise.all([
      supabase
        .from("event_rsvps")
        .select("event_id, profile_id, status")
        .in("event_id", todayEventIds)
        .in("status", ["yes", "maybe"] satisfies RsvpStatus[]),
      supabase
        .from("live_sessions")
        .select("profile_id")
        .eq("mode", "outdoor")
        .is("ended_at", null)
        .gte("last_seen_at", cutoff),
    ]);

    const liveProfileIds = new Set((sessions ?? []).map((s) => s.profile_id));
    const liveProfilesByEvent = new Map<string, Set<string>>();
    for (const rsvp of rsvps ?? []) {
      if (!liveProfileIds.has(rsvp.profile_id)) continue;
      const current = liveProfilesByEvent.get(rsvp.event_id) ?? new Set<string>();
      current.add(rsvp.profile_id);
      liveProfilesByEvent.set(rsvp.event_id, current);
    }
    for (const [eventId, profileIds] of liveProfilesByEvent) {
      liveCountsByEvent.set(eventId, profileIds.size);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalender"
        actions={
          <Link href="/kalender/nieuw">
            <Button>Nieuw event</Button>
          </Link>
        }
      />

      {calendarItems.length === 0 ? (
        <EmptyState>
          Geen aankomende events of gedeelde verjaardagen.
          {pastCount > 0 && (
            <>
              {" "}
              <Link href="/ritverslagen" className="underline">
                Bekijk voorbije ritten
              </Link>
              .
            </>
          )}
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {calendarItems.map((item) => {
            if (item.kind === "birthday") {
              const birthday = item.birthday;
              const age = ageOnBirthday(birthday.birthDate, birthday.year);
              const isToday = birthday.dateKey === todayKey;
              return (
                <li
                  key={`birthday-${birthday.id}-${birthday.year}`}
                  className="relative overflow-hidden rounded-lg border border-zwb-gold/50 bg-gradient-to-r from-zwb-gold/20 via-card to-zwb-gold/5 p-4 pl-5 shadow-sm transition before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-zwb-gold before:content-[''] hover:border-zwb-gold/80 hover:shadow-md"
                >
                  <Link
                    href={`/verjaardagen/${birthday.id}?jaar=${birthday.year}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {birthday.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={birthday.avatarUrl}
                          alt=""
                          className="size-14 shrink-0 rounded-full object-cover ring-2 ring-zwb-gold/50 ring-offset-2 ring-offset-background"
                        />
                      ) : (
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-zwb-gold/15 text-zwb-gold ring-2 ring-zwb-gold/40 ring-offset-2 ring-offset-background">
                          <Cake className="size-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            Verjaardag van {birthday.displayName}
                          </p>
                          {isToday && (
                            <span className="rounded-full bg-zwb-gold px-2 py-0.5 text-xs font-semibold text-slate-950 shadow-sm">
                              Vandaag
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDateKey(birthday.dateKey, { dateStyle: "full" })}
                          {age !== null ? ` · ${age} jaar` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="hidden rounded-full border border-zwb-gold/40 bg-zwb-gold/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200 sm:inline">
                      Verjaardag
                    </span>
                  </Link>
                </li>
              );
            }

            const event = item.event;
            const liveCount = liveCountsByEvent.get(event.id) ?? 0;
            const coverUrl = event.cover_image_path
              ? supabase.storage
                  .from("event-photos")
                  .getPublicUrl(event.cover_image_path).data.publicUrl
              : null;
            return (
              <li
                key={event.id}
                className="flex flex-col gap-3 overflow-hidden rounded-lg border bg-card p-4 transition hover:border-foreground/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  href={`/events/${event.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  {coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt=""
                      className="hidden size-14 shrink-0 rounded-md object-cover sm:block"
                    />
                  )}
                  <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{event.title}</p>
                    {liveCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
                        <span className="size-1.5 animate-pulse rounded-full bg-current" />
                        Live nu ({liveCount})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.start_at).toLocaleString("nl-NL", {
                      dateStyle: "full",
                      timeStyle: "short",
                      timeZone: "Europe/Amsterdam",
                    })}
                    {event.location ? ` · ${event.location}` : ""}
                    {event.distance_km ? ` · ${event.distance_km} km` : ""}
                    {event.elevation_m ? ` · ${event.elevation_m} hm` : ""}
                  </p>
                  </div>
                </Link>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                    {EVENT_TYPE_LABELS[event.type] ?? event.type}
                  </span>
                  {liveCount > 0 && (
                    <Link
                      href={`/live/${event.id}`}
                      className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      Live volgen
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {calendarItems.length > 0 && pastCount > 0 && (
        <p className="text-sm text-muted-foreground">
          <Link href="/ritverslagen" className="font-medium text-primary hover:underline">
            Voorbije ritten ({pastCount}) →
          </Link>
        </p>
      )}
    </div>
  );
}
