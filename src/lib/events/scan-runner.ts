// Herbruikbare eventscan-logica, gedeeld door de beheer-actie
// (`/beheer/event-scan`) en de cron (`/api/events/scan`). Werkt met een
// service-role admin-client; bevat geen sessie- of redirect-logica.

import { createAdminClient } from "@/lib/supabase/admin";
import { scanExternalEvents } from "@/lib/events/external-scan";
import {
  detectZwbMatchStatus,
  matchProfile,
  normalizeName,
  type MatchableProfile,
} from "@/lib/events/zwb-detection";
import {
  fetchEntrants,
  fetchFeedEvents,
  followZwbMembers,
  zwiftClubConfigured,
} from "@/lib/events/zwift-club";

export type AdminClient = ReturnType<typeof createAdminClient>;

export function allowedExternalUrl(raw: string) {
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      (url.hostname === "event.mywhoosh.com" ||
        url.hostname === "www.zwift.com" ||
        url.hostname === "zwift.com")
    );
  } catch {
    return false;
  }
}

// Volg alle leden met een Zwift-ID, zodat hun inschrijvingen in de member-feed
// verschijnen. Idempotent; veilig om bij elke (cron-)scan te draaien.
async function followMembers(admin: AdminClient): Promise<string | null> {
  if (!zwiftClubConfigured()) return null;
  const { data: profileRows } = await admin
    .from("profiles")
    .select("zwift_id")
    .not("zwift_id", "is", null);
  const zwiftIds = ((profileRows ?? []) as Array<{ zwift_id: string | null }>)
    .map((row) => row.zwift_id?.trim())
    .filter((id): id is string => Boolean(id));
  if (zwiftIds.length === 0) return null;
  const result = await followZwbMembers(zwiftIds);
  return `Volgen: ${result.followed}/${zwiftIds.length} leden${result.failed > 0 ? `, ${result.failed} mislukt` : ""}.`;
}

// Geautoriseerde Zwift-feed-sync: ZWB-club-events plus elk ander event waar
// minstens één ZWB'er zich op inschreef worden als bevestigd concept bewaard,
// met de ingeschreven ZWB'ers als deelnemer (match op Zwift-ID).
async function syncZwiftFeed(admin: AdminClient) {
  if (!zwiftClubConfigured()) return { events: 0, members: 0, note: null as string | null };

  const feed = await fetchFeedEvents();
  if (feed.length === 0) return { events: 0, members: 0, note: null };

  const { data: profileRows } = await admin
    .from("profiles")
    .select("id, display_name, zwift_id, mywhoosh_id");
  const profiles = (profileRows ?? []) as MatchableProfile[];

  const now = new Date().toISOString();
  let savedEvents = 0;
  let totalMembers = 0;

  for (const { candidate, subgroupIds, isClub } of feed) {
    if (!allowedExternalUrl(candidate.externalUrl)) continue;
    // Haal entrants op voor elk feed-event (de member-feed is al klein en
    // persoonlijk) en bewaar alleen events met een ZWB'er. Zo werkt het ook als
    // het serviceaccount zélf is ingeschreven — er is dan geen followee-signaal.
    const entrants = await fetchEntrants(subgroupIds);
    const seen = new Set<string>();
    const memberRows = entrants.flatMap((entrant) => {
      const profileId = matchProfile(entrant.name, profiles, {
        zwiftId: entrant.zwiftId,
      });
      if (!profileId) return [];
      const key = `${normalizeName(entrant.name)}|${entrant.category ?? ""}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [
        {
          source: "zwift_feed",
          external_name: entrant.name,
          category: entrant.category,
          profile_id: profileId,
          raw_text: `zwift:${entrant.zwiftId}`,
          updated_at: now,
        },
      ];
    });

    // Niet-club-events alleen bewaren als er echt een ZWB'er meedoet.
    if (!isClub && memberRows.length === 0) continue;

    const { data: saved } = await admin
      .from("external_event_candidates")
      .upsert(
        {
          source: candidate.source,
          external_id: candidate.externalId,
          external_url: candidate.externalUrl,
          title: candidate.title,
          start_at: candidate.startAt,
          distance_km: candidate.distanceKm,
          elevation_m: candidate.elevationM,
          raw_metadata: candidate.rawMetadata,
          zwb_match_status: "confirmed",
          last_seen_at: now,
          updated_at: now,
        },
        { onConflict: "source,external_id" },
      )
      .select("id, published_event_id, ignored_at")
      .maybeSingle();
    if (!saved || saved.published_event_id || saved.ignored_at) continue;
    savedEvents += 1;

    // Idempotent: ververs alleen de feed-gesyncte deelnemers, handmatige blijven.
    await admin
      .from("external_event_participants")
      .delete()
      .eq("candidate_id", saved.id)
      .eq("source", "zwift_feed");
    if (memberRows.length > 0) {
      await admin
        .from("external_event_participants")
        .insert(memberRows.map((row) => ({ ...row, candidate_id: saved.id })));
      totalMembers += memberRows.length;
    }
  }

  return {
    events: savedEvents,
    members: totalMembers,
    note: `Zwift-feedsync: ${savedEvents} events met ZWB-deelname, ${totalMembers} koppelingen.`,
  };
}

export type ScanSummary = {
  found: number;
  saved: number;
  auto: number;
  feedEvents: number;
  feedMembers: number;
  notes: string[];
  error: string | null;
};

/**
 * Draait een volledige scan: optioneel leden volgen, daarna de publieke
 * ZWB-relevante scan en de Zwift-feedsync. Schrijft via de admin-client.
 */
export async function runEventScan(
  admin: AdminClient,
  opts: { follow?: boolean } = {},
): Promise<ScanSummary> {
  const notes: string[] = [];
  let error: string | null = null;

  if (opts.follow) {
    try {
      const note = await followMembers(admin);
      if (note) notes.push(note);
    } catch (err) {
      notes.push(err instanceof Error ? `Volgen mislukt: ${err.message}` : "Volgen mislukt.");
    }
  }

  const scan = await scanExternalEvents();
  notes.push(...scan.notes);

  const now = new Date().toISOString();
  // Alleen ZWB-relevante events bewaren: events die op een ZWB-marker matchen.
  const rows = scan.candidates
    .filter(
      (candidate) =>
        allowedExternalUrl(candidate.externalUrl) &&
        detectZwbMatchStatus(candidate) !== null,
    )
    .map((candidate) => ({
      source: candidate.source,
      external_id: candidate.externalId,
      external_url: candidate.externalUrl,
      title: candidate.title,
      start_at: candidate.startAt,
      distance_km: candidate.distanceKm,
      elevation_m: candidate.elevationM,
      raw_metadata: candidate.rawMetadata,
      last_seen_at: now,
      updated_at: now,
    }));

  let auto = 0;
  if (rows.length > 0) {
    const { error: upsertError } = await admin
      .from("external_event_candidates")
      .upsert(rows, { onConflict: "source,external_id" });
    if (upsertError) {
      error = upsertError.message;
    } else {
      // Markeer ZWB-events; werk alleen 'unknown'-concepten bij, zodat een
      // handmatige beheerstatus nooit wordt overschreven.
      const detections = scan.candidates
        .map((candidate) => ({
          source: candidate.source,
          externalId: candidate.externalId,
          status: detectZwbMatchStatus(candidate),
        }))
        .filter((detection) => detection.status !== null);
      for (const status of ["likely", "confirmed"] as const) {
        for (const source of ["mywhoosh", "zwift"] as const) {
          const externalIds = detections
            .filter((d) => d.status === status && d.source === source)
            .map((d) => d.externalId);
          if (externalIds.length === 0) continue;
          const { count } = await admin
            .from("external_event_candidates")
            .update({ zwb_match_status: status }, { count: "exact" })
            .eq("source", source)
            .in("external_id", externalIds)
            .eq("zwb_match_status", "unknown");
          auto += count ?? 0;
        }
      }
    }
  }

  let feedEvents = 0;
  let feedMembers = 0;
  try {
    const feedSync = await syncZwiftFeed(admin);
    feedEvents = feedSync.events;
    feedMembers = feedSync.members;
    if (feedSync.note) notes.push(feedSync.note);
  } catch (err) {
    notes.push(
      err instanceof Error ? `Zwift-feedsync mislukt: ${err.message}` : "Zwift-feedsync mislukt.",
    );
  }

  return {
    found: rows.length,
    saved: error ? 0 : rows.length,
    auto,
    feedEvents,
    feedMembers,
    notes,
    error,
  };
}
