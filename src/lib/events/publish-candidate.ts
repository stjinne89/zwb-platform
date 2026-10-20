// Publiceert een extern concept (Zwift/MyWhoosh) als event op de kalender.
// Gedeeld door de losse "Publiceer"-knop, "Clubevents op kalender" op
// /beheer/event-scan en de uurlijkse Zwift-sync. Werkt met de service-role
// admin-client.
//
// Een Zwift-concept krijgt dezelfde velden als een event dat met de Zwift-link
// in het formulier is aangemaakt (zwift-event-fields.ts). Geeft Zwift het event
// niet, dan komt het er met de gegevens van het concept, zoals voorheen.

import type { createAdminClient } from "@/lib/supabase/admin";
import { allowedExternalUrl } from "@/lib/events/scan-runner";
import {
  eventTypeForSource,
  resultsUrlForSource,
} from "@/lib/events/external-publish";
import { fetchZwiftPublicEvent } from "@/lib/events/zwift-route";
import { zwiftEventFields, type ZwiftEventFields } from "@/lib/events/zwift-event-fields";
import { registerZwiftRoute } from "@/lib/events/zrl-route-sync";
import { zwiftCoverStore } from "@/lib/events/zrl-event-details";

type AdminClient = ReturnType<typeof createAdminClient>;

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

// Koppelt gematchte leden als RSVP "ja" aan het gepubliceerde event, zodat ze —
// net als bij gewone events — met avatar verschijnen. Idempotent via upsert op
// (event_id, profile_id); bestaande antwoorden van een lid blijven ongemoeid.
async function linkParticipantsAsRsvps(
  admin: AdminClient,
  eventId: string,
  profileIds: string[],
) {
  if (profileIds.length === 0) return;
  await admin.from("event_rsvps").upsert(
    profileIds.map((profileId) => ({
      event_id: eventId,
      profile_id: profileId,
      status: "yes",
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "event_id,profile_id", ignoreDuplicates: true },
  );
}

type ZwiftDetails = { fields: ZwiftEventFields; coverPath: string | null };

/**
 * Het Zwift-event achter een concept, met de route geregistreerd (voor de
 * foreign key van events.zwift_route_id) en de banner opgeslagen. Null als
 * Zwift het event niet geeft.
 */
async function loadZwiftDetails(
  admin: AdminClient,
  externalId: string,
): Promise<ZwiftDetails | null> {
  if (!/^\d+$/.test(externalId)) return null;
  const result = await fetchZwiftPublicEvent(Number(externalId));
  if (!result.ok) return null;
  if (result.event.route) await registerZwiftRoute(admin, result.event.route);
  const coverPath = await zwiftCoverStore(admin)(result.event);
  return { fields: zwiftEventFields(result.event), coverPath };
}

/**
 * Zet één concept op de kalender. Bestaat er al een event met dezelfde externe
 * link, dan wordt het concept daaraan gekoppeld in plaats van een dubbel te
 * maken. Geeft het event-ID terug, of `null` als er niets gepubliceerd werd.
 */
export async function publishCandidateToCalendar(
  admin: AdminClient,
  candidateId: string,
  userId: string,
): Promise<string | null> {
  const { data: candidate } = await admin
    .from("external_event_candidates")
    .select(
      "id, source, external_id, title, start_at, external_url, distance_km, elevation_m, published_event_id",
    )
    .eq("id", candidateId)
    .maybeSingle();

  if (!candidate || candidate.published_event_id) return null;
  if (!allowedExternalUrl(candidate.external_url)) return null;

  const { data: participants } = await admin
    .from("external_event_participants")
    .select("external_name, category, profile_id")
    .eq("candidate_id", candidateId)
    .order("external_name", { ascending: true });
  const allParticipants = (participants ?? []) as Array<{
    external_name: string;
    category: string | null;
    profile_id: string | null;
  }>;
  // Leden met een profiel koppelen we als deelnemer (RSVP "ja"), net als bij
  // gewone events — zij verschijnen dan met avatar in plaats van als tekstregel.
  // Alleen niet-gekoppelde namen blijven in de beschrijving staan.
  const linkedProfileIds = [
    ...new Set(
      allParticipants
        .map((participant) => participant.profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const description = participantDescription(
    allParticipants.filter((participant) => !participant.profile_id),
  );
  const { type, location } = eventTypeForSource(candidate.source);
  const resultsUrl = resultsUrlForSource(candidate.source, candidate.external_id);

  const { data: existing } = await admin
    .from("events")
    .select("id")
    .eq("external_url", candidate.external_url)
    .maybeSingle();

  let eventId: string;
  if (existing) {
    eventId = existing.id;
  } else {
    const zwift =
      candidate.source === "zwift"
        ? await loadZwiftDetails(admin, String(candidate.external_id ?? ""))
        : null;
    const fields = zwift?.fields;
    const { data: event, error } = await admin
      .from("events")
      .insert({
        title: fields?.title || candidate.title,
        type: fields?.type ?? type,
        kind: fields?.kind ?? null,
        start_at: fields?.start_at ?? new Date(candidate.start_at).toISOString(),
        end_at: fields?.end_at ?? null,
        location: fields?.location ?? location,
        description: [fields?.description, description].filter(Boolean).join("\n\n") || null,
        external_url: candidate.external_url,
        live_timing_url: null,
        results_url: resultsUrl,
        team_id: null,
        gpx_path: null,
        distance_km: fields ? fields.distance_km : candidate.distance_km,
        elevation_m: fields ? fields.elevation_m : candidate.elevation_m,
        start_lat: null,
        start_lon: null,
        cover_image_path: zwift?.coverPath ?? null,
        zwift_event_id: fields?.zwift_event_id ?? null,
        zwift_route_id: fields?.zwift_route_id ?? null,
        laps: fields?.laps ?? null,
        zwift_event_type: fields?.zwift_event_type ?? null,
        zwift_rules: fields?.zwift_rules ?? null,
        zwift_tags: fields?.zwift_tags ?? null,
        zwift_bike_hash: fields?.zwift_bike_hash ?? null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) return null;
    eventId = event.id;
  }

  await linkParticipantsAsRsvps(admin, eventId, linkedProfileIds);

  await admin
    .from("external_event_candidates")
    .update({
      published_event_id: eventId,
      published_at: new Date().toISOString(),
      published_by: userId,
    })
    .eq("id", candidateId);

  return eventId;
}
