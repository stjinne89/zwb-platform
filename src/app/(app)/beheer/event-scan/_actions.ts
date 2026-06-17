"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { scanExternalEvents } from "@/lib/events/external-scan";
import {
  detectZwbMatchStatus,
  matchProfile,
  normalizeName,
  type MatchableProfile,
} from "@/lib/events/zwb-detection";
import {
  diagnoseZwiftClub,
  fetchEntrants,
  fetchFeedEvents,
  followZwbMembers,
  zwiftClubConfigured,
} from "@/lib/events/zwift-club";

type AdminClient = ReturnType<typeof createAdminClient>;

const MATCH_STATUSES = new Set(["unknown", "likely", "confirmed", "manual"]);
const CATEGORY_VALUES = new Set(["A", "B", "C", "D", "E"]);

function allowedExternalUrl(raw: string) {
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

async function requireEventScanAccess() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return null;
  if (!access.has("events.manage_all")) {
    return null;
  }
  return { userId: access.user.id, admin: createAdminClient() };
}

function cleanParticipantName(value: string) {
  return value
    .replace(/\([^)]*\)/g, " ")
    .replace(/\bcat(?:egory)?\s*[A-E]\b/gi, " ")
    .replace(/\b[A-E]\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseParticipantLines(input: string, defaultCategory: string | null) {
  const seen = new Set<string>();
  return input
    .split(/[\n,;]+/)
    .map((line) => {
      const raw = line.trim();
      const category =
        raw.match(/\bcat(?:egory)?\s*([A-E])\b/i)?.[1]?.toUpperCase() ??
        raw.match(/\(([A-E])\)/i)?.[1]?.toUpperCase() ??
        defaultCategory;
      const name = cleanParticipantName(raw);
      return {
        externalName: name,
        category: category && CATEGORY_VALUES.has(category) ? category : null,
        rawText: raw,
      };
    })
    .filter((participant) => {
      if (participant.externalName.length < 2) return false;
      const key = `${participant.externalName.toLowerCase()}|${participant.category ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function participantDescription(
  participants: Array<{ external_name: string; category: string | null }>,
) {
  if (participants.length === 0) return null;
  const names = participants
    .map((participant) =>
      participant.category
        ? `${participant.external_name} (${participant.category})`
        : participant.external_name,
    )
    .join(", ");
  return `ZWB-deelnemers: ${names}`;
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

export async function scanExternalEventCandidates() {
  const access = await requireEventScanAccess();
  if (!access) return;

  const scan = await scanExternalEvents();
  const params = new URLSearchParams();

  if (scan.candidates.length > 0) {
    const now = new Date().toISOString();
    // Alleen ZWB-relevante events bewaren: events die op een ZWB-marker matchen.
    // Generieke Zwift/MyWhoosh-events zonder ZWB-verband komen niet in de lijst;
    // events met ZWB-deelnemers worden los toegevoegd door de feedsync hieronder.
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

    if (rows.length > 0) {
      const { error } = await access.admin
        .from("external_event_candidates")
        .upsert(rows, { onConflict: "source,external_id" });
      if (error) {
        params.set("scan", "error");
        params.set("message", error.message);
        redirect(`/beheer/event-scan?${params.toString()}`);
      }

      // Auto-markeer ZWB's eigen events. Werk alleen 'unknown'-concepten bij,
      // zodat een handmatige beheerstatus nooit wordt overschreven.
      const detections = scan.candidates
        .map((candidate) => ({
          source: candidate.source,
          externalId: candidate.externalId,
          status: detectZwbMatchStatus(candidate),
        }))
        .filter((detection) => detection.status !== null);
      let autoFlagged = 0;
      for (const status of ["likely", "confirmed"] as const) {
        for (const source of ["mywhoosh", "zwift"] as const) {
          const externalIds = detections
            .filter((d) => d.status === status && d.source === source)
            .map((d) => d.externalId);
          if (externalIds.length === 0) continue;
          const { count } = await access.admin
            .from("external_event_candidates")
            .update({ zwb_match_status: status }, { count: "exact" })
            .eq("source", source)
            .in("external_id", externalIds)
            .eq("zwb_match_status", "unknown");
          autoFlagged += count ?? 0;
        }
      }
      if (autoFlagged > 0) params.set("auto", String(autoFlagged));
    }
    params.set("found", String(rows.length));
    params.set("saved", String(rows.length));
  } else {
    params.set("found", "0");
    params.set("saved", "0");
  }

  const notes = [...scan.notes];
  try {
    const feedSync = await syncZwiftFeed(access.admin);
    if (feedSync.note) {
      notes.push(feedSync.note);
      params.set("club", String(feedSync.events));
      params.set("clubMembers", String(feedSync.members));
    }
  } catch (error) {
    notes.push(
      error instanceof Error
        ? `Zwift-feedsync mislukt: ${error.message}`
        : "Zwift-feedsync mislukt.",
    );
  }

  revalidatePath("/beheer/event-scan");
  revalidatePath("/kalender");
  params.set("scan", scan.candidates.length > 0 ? "ok" : "empty");
  if (notes.length > 0) params.set("message", notes.join(" "));
  redirect(`/beheer/event-scan?${params.toString()}`);
}

export async function testZwiftClubConnection() {
  const access = await requireEventScanAccess();
  if (!access) return;
  const message = await diagnoseZwiftClub();
  const params = new URLSearchParams();
  params.set("club", "test");
  params.set("message", message);
  redirect(`/beheer/event-scan?${params.toString()}`);
}

// Laat het serviceaccount alle leden met een Zwift-ID volgen, zodat hun
// inschrijvingen in de member-feed opduiken voor de feedsync.
export async function followZwbMembersAction() {
  const access = await requireEventScanAccess();
  if (!access) return;
  const params = new URLSearchParams();
  params.set("club", "follow");

  if (!zwiftClubConfigured()) {
    params.set("message", "Zwift-clubkoppeling niet geconfigureerd.");
    redirect(`/beheer/event-scan?${params.toString()}`);
  }

  const { data: profileRows } = await access.admin
    .from("profiles")
    .select("zwift_id")
    .not("zwift_id", "is", null);
  const zwiftIds = ((profileRows ?? []) as Array<{ zwift_id: string | null }>)
    .map((row) => row.zwift_id?.trim())
    .filter((id): id is string => Boolean(id));

  if (zwiftIds.length === 0) {
    params.set("message", "Geen leden met een Zwift-ID gevonden.");
    redirect(`/beheer/event-scan?${params.toString()}`);
  }

  try {
    const result = await followZwbMembers(zwiftIds);
    params.set(
      "message",
      `Volgen klaar: ${result.followed} van ${zwiftIds.length} leden gevolgd${result.failed > 0 ? `, ${result.failed} mislukt` : ""}.`,
    );
  } catch (error) {
    params.set(
      "message",
      error instanceof Error ? `Volgen mislukt: ${error.message}` : "Volgen mislukt.",
    );
  }
  redirect(`/beheer/event-scan?${params.toString()}`);
}

export async function publishCandidate(formData: FormData) {
  const access = await requireEventScanAccess();
  if (!access) return;

  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  if (!candidateId) return;

  const { data: candidate } = await access.admin
    .from("external_event_candidates")
    .select(
      "id, title, start_at, external_url, distance_km, elevation_m, published_event_id",
    )
    .eq("id", candidateId)
    .maybeSingle();

  if (!candidate || candidate.published_event_id) return;
  if (!allowedExternalUrl(candidate.external_url)) return;

  const { data: participants } = await access.admin
    .from("external_event_participants")
    .select("external_name, category")
    .eq("candidate_id", candidateId)
    .order("external_name", { ascending: true });
  const description = participantDescription(
    (participants ?? []) as Array<{ external_name: string; category: string | null }>,
  );

  const { data: existing } = await access.admin
    .from("events")
    .select("id")
    .eq("external_url", candidate.external_url)
    .maybeSingle();
  if (existing) {
    await access.admin
      .from("external_event_candidates")
      .update({
        published_event_id: existing.id,
        published_at: new Date().toISOString(),
        published_by: access.userId,
      })
      .eq("id", candidateId);
    revalidatePath("/beheer/event-scan");
    return;
  }

  const { data: event, error } = await access.admin
    .from("events")
    .insert({
      title: candidate.title,
      type: "overig",
      start_at: new Date(candidate.start_at).toISOString(),
      end_at: null,
      location: "Online",
      description,
      external_url: candidate.external_url,
      live_timing_url: null,
      results_url: null,
      team_id: null,
      gpx_path: null,
      distance_km: candidate.distance_km,
      elevation_m: candidate.elevation_m,
      start_lat: null,
      start_lon: null,
      cover_image_path: null,
      created_by: access.userId,
    })
    .select("id")
    .single();

  if (error) return;

  await access.admin
    .from("external_event_candidates")
    .update({
      published_event_id: event.id,
      published_at: new Date().toISOString(),
      published_by: access.userId,
    })
    .eq("id", candidateId);

  revalidatePath("/beheer/event-scan");
  revalidatePath("/kalender");
  revalidatePath("/dashboard");
}

export async function addCandidateParticipants(formData: FormData) {
  const access = await requireEventScanAccess();
  if (!access) return;

  const params = new URLSearchParams();
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const participantsText = String(formData.get("participants") ?? "").trim();
  const defaultCategory = String(formData.get("category") ?? "").trim().toUpperCase();
  if (!candidateId || !participantsText) {
    params.set("import", "empty");
    params.set("message", "Geen deelnemers opgegeven.");
    redirect(`/beheer/event-scan?${params.toString()}`);
  }

  const [{ data: candidate }, { data: profiles }] = await Promise.all([
    access.admin
      .from("external_event_candidates")
      .select("id, published_event_id")
      .eq("id", candidateId)
      .is("ignored_at", null)
      .maybeSingle(),
    access.admin
      .from("profiles")
      .select("id, display_name, zwift_id, mywhoosh_id")
      .order("display_name", { ascending: true }),
  ]);
  if (!candidate || candidate.published_event_id) return;

  const parsed = parseParticipantLines(
    participantsText,
    CATEGORY_VALUES.has(defaultCategory) ? defaultCategory : null,
  );
  if (parsed.length === 0) {
    params.set("import", "empty");
    params.set("message", "Geen geldige deelnemers gevonden.");
    redirect(`/beheer/event-scan?${params.toString()}`);
  }

  const typedProfiles = (profiles ?? []) as MatchableProfile[];
  const { data: existingRows } = await access.admin
    .from("external_event_participants")
    .select("candidate_id, external_name, category")
    .eq("candidate_id", candidateId);
  const existing = new Set(
    ((existingRows ?? []) as Array<{
      candidate_id: string;
      external_name: string;
      category: string | null;
    }>).map((row) =>
      `${row.external_name.toLowerCase().trim()}|${row.category ?? ""}`,
    ),
  );

  const rows = parsed
    .filter((match) => !existing.has(`${match.externalName.toLowerCase()}|${match.category ?? ""}`))
    .map((match) => ({
      candidate_id: candidateId,
      source: "manual",
      external_name: match.externalName,
      category: match.category,
      profile_id: matchProfile(match.externalName, typedProfiles),
      raw_text: match.rawText,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length > 0) {
    const { error } = await access.admin
      .from("external_event_participants")
      .insert(rows);
    if (error) {
      params.set("import", "error");
      params.set("message", error.message);
      redirect(`/beheer/event-scan?${params.toString()}`);
    }

    await access.admin
      .from("external_event_candidates")
      .update({ zwb_match_status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", candidateId);
  }

  revalidatePath("/beheer/event-scan");
  params.set("import", rows.length > 0 ? "ok" : "empty");
  params.set("matched", String(parsed.length));
  params.set("saved", String(rows.length));
  redirect(`/beheer/event-scan?${params.toString()}`);
}

export async function ignoreCandidate(formData: FormData) {
  const access = await requireEventScanAccess();
  if (!access) return;
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  if (!candidateId) return;

  // Verwijder het concept; een volgende scan kan het opnieuw opvoeren.
  await access.admin
    .from("external_event_candidates")
    .delete()
    .eq("id", candidateId)
    .is("published_event_id", null);

  revalidatePath("/beheer/event-scan");
}

export async function ignoreAllCandidates() {
  const access = await requireEventScanAccess();
  if (!access) return;

  // Verwijder alle nog niet gepubliceerde concepten. Een volgende scan kan ze
  // opnieuw opvoeren; gepubliceerde events blijven staan.
  await access.admin
    .from("external_event_candidates")
    .delete()
    .is("published_event_id", null);

  revalidatePath("/beheer/event-scan");
}

export async function reopenCandidate(formData: FormData) {
  const access = await requireEventScanAccess();
  if (!access) return;
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  if (!candidateId) return;

  await access.admin
    .from("external_event_candidates")
    .update({ ignored_at: null })
    .eq("id", candidateId);

  revalidatePath("/beheer/event-scan");
}

export async function updateCandidateMatchStatus(formData: FormData) {
  const access = await requireEventScanAccess();
  if (!access) return;
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const status = String(formData.get("zwb_match_status") ?? "").trim();
  if (!candidateId || !MATCH_STATUSES.has(status)) return;

  await access.admin
    .from("external_event_candidates")
    .update({ zwb_match_status: status })
    .eq("id", candidateId);

  revalidatePath("/beheer/event-scan");
}
