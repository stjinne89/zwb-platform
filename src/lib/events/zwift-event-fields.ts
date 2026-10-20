// De velden die een Zwift-event op de kalender krijgt als je de link in het
// eventformulier ophaalt: omschrijving, wereld, eindtijd, route, ronden,
// afstand, spelregels en cover. Voor wat zonder formulier op de kalender komt
// (clubevents, de "Publiceer"-knop van de eventscan), zodat die er net zo
// compleet staan als een met de hand aangemaakt event.

import { prefillFromZwift } from "@/lib/events/link-prefill";
import { eventRouteTotals, zwiftStartFor, type ZwiftEventInfo } from "@/lib/events/zwift-route";

export type ZwiftEventFields = {
  title: string | null;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  location: string | null;
  type: string | null;
  kind: string | null;
  zwift_event_id: number;
  zwift_route_id: number | null;
  laps: number | null;
  distance_km: number | null;
  elevation_m: number | null;
  zwift_event_type: string | null;
  zwift_rules: string[];
  zwift_tags: string[];
  zwift_bike_hash: number | null;
};

/**
 * Puur. Zonder eigen subgroep: start van de vroegste groep, route en ronden van
 * het event zelf, net als het formulier zonder ZRL-team.
 */
export function zwiftEventFields(event: ZwiftEventInfo): ZwiftEventFields {
  const prefill = prefillFromZwift(event, zwiftStartFor(event, null));
  const totals = eventRouteTotals(event);
  return {
    title: prefill.title,
    description: prefill.description,
    start_at: prefill.start_at,
    end_at: prefill.end_at,
    location: prefill.location,
    type: prefill.type,
    kind: prefill.kind,
    zwift_event_id: event.eventId,
    zwift_route_id: event.route?.routeId ?? null,
    laps: totals?.laps ?? event.laps,
    distance_km: totals?.distanceKm ?? event.distanceKm,
    elevation_m: totals?.elevationM ?? null,
    zwift_event_type: event.eventType,
    zwift_rules: event.rules,
    zwift_tags: event.tags,
    zwift_bike_hash: event.bikeHash,
  };
}
