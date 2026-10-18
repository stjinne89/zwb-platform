/**
 * Live renners verdelen over lopende events en Samen fietsen, voor de tegels op
 * Vandaag. Een renner hoort bij een event als die er ja of misschien op zei,
 * het event loopt (vanaf een half uur voor de start tot een uur na het einde)
 * en de sessie niet ruim voor de start begon. Wie bij geen event hoort, rijdt
 * op Samen fietsen. Past een renner bij meerdere events, dan telt het event dat
 * het laatst begon.
 */
export type LiveRider = { profileId: string; name: string; sessionStartedAt: string };
export type RunningEvent = { id: string; title: string; startAt: string; endAt: string | null };
export type EventRsvp = { eventId: string; profileId: string; status: string };

const LEAD_MS = 30 * 60 * 1000;
const GRACE_MS = 60 * 60 * 1000;
const EARLY_SESSION_MS = 60 * 60 * 1000;

export function isEventRunning(event: RunningEvent, now: number): boolean {
  const start = new Date(event.startAt).getTime();
  if (start - LEAD_MS > now) return false;
  return event.endAt === null || new Date(event.endAt).getTime() + GRACE_MS >= now;
}

export function splitLiveRiders(
  riders: LiveRider[],
  events: RunningEvent[],
  rsvps: EventRsvp[],
  now: number,
): {
  together: LiveRider[];
  byEvent: Array<{ event: RunningEvent; riders: LiveRider[] }>;
} {
  const running = events
    .filter((event) => isEventRunning(event, now))
    .sort((x, y) => y.startAt.localeCompare(x.startAt));
  const going = new Set(
    rsvps
      .filter((rsvp) => rsvp.status === "yes" || rsvp.status === "maybe")
      .map((rsvp) => `${rsvp.eventId}:${rsvp.profileId}`),
  );
  const together: LiveRider[] = [];
  const perEvent = new Map<string, LiveRider[]>();
  for (const rider of riders) {
    const sessionStart = new Date(rider.sessionStartedAt).getTime();
    const event = running.find(
      (candidate) =>
        going.has(`${candidate.id}:${rider.profileId}`) &&
        sessionStart >= new Date(candidate.startAt).getTime() - EARLY_SESSION_MS,
    );
    if (!event) {
      together.push(rider);
      continue;
    }
    perEvent.set(event.id, [...(perEvent.get(event.id) ?? []), rider]);
  }
  const byEvent = running
    .filter((event) => perEvent.has(event.id))
    .reverse()
    .map((event) => ({ event, riders: perEvent.get(event.id)! }));
  return { together, byEvent };
}
