// Aankomende events van de ZWB-club op Zwift naar de kalender, met de
// ingeschreven ZWB'ers als deelnemer. Draait elk uur in de Zwift-sync
// (`/api/zwift/events/sync`), zodat een terugkerende clubrit als de ZWB Monday
// Ride vanzelf op de kalender komt zodra Zwift hem aanmaakt. De knop
// "Clubevents op kalender" op /beheer/event-scan doet hetzelfde met de hand.
// Losse concepten reviewen blijft voor de rest van de scan (andere events waar
// leden op inschrijven) een handmatige stap.

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
  /** Ooit gepubliceerd en daarna van de kalender verwijderd (alleen de cron). */
  removed: number;
  failed: number;
  route: ClubEventRoute;
  /** Waarom er niets gepubliceerd kon worden, als dat zo is. */
  note?: string;
};

/**
 * Namens wie de cron publiceert: wie het laatst een concept op de kalender
 * zette. Zo staat er een beheerder als maker, net als bij de SRC- en FRR-sync.
 */
async function lastPublisher(admin: AdminClient): Promise<string | null> {
  const { data } = await admin
    .from("external_event_candidates")
    .select("published_by")
    .not("published_by", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.published_by as string | null | undefined) ?? null;
}

/** Zonder `userId` (de cron) publiceert hij namens de laatste publicist. */
export async function publishClubEvents(
  admin: AdminClient,
  userId?: string,
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
    removed: 0,
    failed: 0,
    route,
  };
  if (upcoming.length === 0) return result;

  // Wat al op de kalender staat of genegeerd is, slaan we over vóór de
  // startlijst: de cron draait elk uur en elke startlijst kost Zwift-verzoeken.
  // Een verwijderd event laat `published_at` achter (de koppeling gaat op null);
  // dat zet alleen de knop terug, anders stond het een uur later weer op de kalender.
  const { data: known } = await admin
    .from("external_event_candidates")
    .select("external_id, published_event_id, published_at, ignored_at")
    .eq("source", "zwift")
    .in("external_id", upcoming.map((event) => event.candidate.externalId));
  const knownById = new Map(
    ((known ?? []) as Array<{
      external_id: string;
      published_event_id: string | null;
      published_at: string | null;
      ignored_at: string | null;
    }>).map((row) => [String(row.external_id), row]),
  );
  const todo = upcoming.filter((event) => {
    const row = knownById.get(event.candidate.externalId);
    if (row?.published_event_id) result.alreadyPublished += 1;
    else if (row?.ignored_at) result.ignored += 1;
    else if (row?.published_at && !userId) result.removed += 1;
    else return true;
    return false;
  });
  if (todo.length === 0) return result;

  const publisher = userId ?? (await lastPublisher(admin));
  if (!publisher) {
    result.failed = todo.length;
    result.note = "Druk één keer op Clubevents op kalender op /beheer/event-scan.";
    return result;
  }

  const members = await loadMemberIndex(admin);
  for (const event of todo) {
    const saved = await saveConfirmedZwiftCandidate(admin, event, members, {
      requireMembers: false,
    });
    if (!saved) {
      result.failed += 1;
    } else if (saved.saved.published_event_id) {
      result.alreadyPublished += 1;
    } else if (saved.saved.ignored_at) {
      result.ignored += 1;
    } else if (await publishCandidateToCalendar(admin, saved.saved.id, publisher)) {
      result.published += 1;
    } else {
      result.failed += 1;
    }
  }
  return result;
}
