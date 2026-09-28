// "Clubevents op kalender" op /beheer/event-scan: zet alle aankomende events
// van de ZWB-club op Zwift in één keer op de kalender, met de ingeschreven
// ZWB'ers als deelnemer. Losse concepten reviewen blijft voor de rest van de
// scan (andere events waar leden op inschrijven) een handmatige stap.

import {
  fetchClubCalendarEvents,
  zwiftClubConfigured,
  type ClubEventRoute,
} from "@/lib/events/zwift-club";
import {
  loadMemberIndex,
  saveConfirmedZwiftCandidate,
  type AdminClient,
} from "@/lib/events/scan-runner";
import { publishCandidateToCalendar } from "@/lib/events/publish-candidate";

export type ClubCalendarResult = {
  found: number;
  published: number;
  alreadyPublished: number;
  ignored: number;
  failed: number;
  route: ClubEventRoute;
};

export async function publishClubEvents(
  admin: AdminClient,
  userId: string,
): Promise<ClubCalendarResult | null> {
  if (!zwiftClubConfigured()) return null;

  const { events, route } = await fetchClubCalendarEvents();
  const now = Date.now();
  const upcoming = events.filter(
    (event) => new Date(event.candidate.startAt).getTime() >= now,
  );

  const result: ClubCalendarResult = {
    found: upcoming.length,
    published: 0,
    alreadyPublished: 0,
    ignored: 0,
    failed: 0,
    route,
  };
  if (upcoming.length === 0) return result;

  const members = await loadMemberIndex(admin);
  for (const event of upcoming) {
    const saved = await saveConfirmedZwiftCandidate(admin, event, members, {
      requireMembers: false,
    });
    if (!saved) {
      result.failed += 1;
    } else if (saved.saved.published_event_id) {
      result.alreadyPublished += 1;
    } else if (saved.saved.ignored_at) {
      result.ignored += 1;
    } else if (await publishCandidateToCalendar(admin, saved.saved.id, userId)) {
      result.published += 1;
    } else {
      result.failed += 1;
    }
  }
  return result;
}
