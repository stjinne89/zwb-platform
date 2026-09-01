"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EVENT_TYPE_VALUES } from "@/lib/event-types";
import {
  eventRouteTotals,
  fetchZwiftPublicEvent,
  parseZwiftEventUrl,
} from "@/lib/events/zwift-route";

type EventInput = {
  title: string;
  type: string;
  start_at: string; // ISO
  end_at?: string | null;
  location?: string | null;
  // undefined = niet wijzigen (alleen voor update); null = expliciet leegmaken
  gpx_path?: string | null;
  distance_km?: number | null;
  elevation_m?: number | null;
  start_lat?: number | null;
  start_lon?: number | null;
  description?: string | null;
  external_url?: string | null;
  live_timing_url?: string | null;
  results_url?: string | null;
  cover_image_path?: string | null;
  team_id?: string | null;
  // Zwift-koppeling: gevuld door "Zwift-eventlink ophalen" in het formulier.
  // undefined = niet wijzigen, null = losmaken.
  zwift_event_id?: number | null;
  zwift_route_id?: number | null;
  laps?: number | null;
};

function validate(input: EventInput) {
  if (!input.title.trim()) return "Titel is verplicht.";
  if (!EVENT_TYPE_VALUES.includes(input.type as (typeof EVENT_TYPE_VALUES)[number]))
    return "Ongeldig type.";
  if (!input.start_at) return "Startdatum is verplicht.";
  if (input.external_url && !/^https?:\/\//i.test(input.external_url)) {
    return "Externe link moet beginnen met https:// of http://";
  }
  if (input.live_timing_url && !/^https?:\/\//i.test(input.live_timing_url)) {
    return "Live timing-URL moet beginnen met https:// of http://";
  }
  if (input.results_url && !/^https?:\/\//i.test(input.results_url)) {
    return "Uitslag-URL moet beginnen met https:// of http://";
  }
  return null;
}

export async function createEvent(input: EventInput) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("events.create")) {
    return { ok: false as const, error: "Geen recht om events aan te maken." };
  }

  const err = validate(input);
  if (err) return { ok: false as const, error: err };

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: input.title.trim(),
      type: input.type,
      start_at: input.start_at,
      end_at: input.end_at || null,
      location: input.location || null,
      gpx_path: input.gpx_path ?? null,
      distance_km: input.distance_km ?? null,
      elevation_m: input.elevation_m ?? null,
      start_lat: input.start_lat ?? null,
      start_lon: input.start_lon ?? null,
      description: input.description || null,
      external_url: input.external_url?.trim() || null,
      live_timing_url: input.live_timing_url?.trim() || null,
      results_url: input.results_url?.trim() || null,
      cover_image_path: input.cover_image_path ?? null,
      team_id: input.team_id || null,
      zwift_event_id: input.zwift_event_id ?? null,
      zwift_route_id: input.zwift_route_id ?? null,
      laps: input.laps ?? null,
      created_by: access.user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  // Best-effort push-notificatie naar opt-in leden. Faalt stil als de
  // VAPID-keys nog niet zijn ingesteld op de server.
  try {
    const { sendNotificationToMembers } = await import("@/lib/push/send");
    const startLabel = new Date(input.start_at).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Amsterdam",
    });
    await sendNotificationToMembers(
      "on_new_event",
      {
        title: "Nieuw event op de kalender",
        body: `${input.title.trim()} - ${startLabel}`,
        url: `/events/${data.id}`,
        tag: `event-${data.id}`,
      },
      { excludeProfileId: access.user.id },
    );
  } catch {
    // nooit blokkerend voor event-aanmaak
  }

  redirect(`/events/${data.id}`);
}

export async function updateEvent(id: string, input: EventInput) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };

  const err = validate(input);
  if (err) return { ok: false as const, error: err };

  // Permissie-check: alleen creator of iemand met beheerrecht mag bewerken.
  const { data: event } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", id)
    .single();
  if (!event) return { ok: false as const, error: "Event bestaat niet." };
  const isCreator = event.created_by === access.user.id;
  if (!isCreator && !access.has("events.manage_all")) {
    return { ok: false as const, error: "Geen toegang om dit event te bewerken." };
  }

  // Bouw update-payload op: undefined = veld niet wijzigen.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {
    title: input.title.trim(),
    type: input.type,
    start_at: input.start_at,
    end_at: input.end_at || null,
    location: input.location || null,
    description: input.description || null,
    external_url: input.external_url?.trim() || null,
    live_timing_url: input.live_timing_url?.trim() || null,
    results_url: input.results_url?.trim() || null,
    team_id: input.team_id || null,
  };
  // GPX-velden alleen overschrijven als ze expliciet zijn meegegeven
  // (undefined = behoud bestaande waarde). De form geeft null door om te
  // verwijderen, of de nieuwe waardes bij een upload.
  if (input.cover_image_path !== undefined)
    update.cover_image_path = input.cover_image_path;
  if (input.gpx_path !== undefined) update.gpx_path = input.gpx_path;
  if (input.distance_km !== undefined) update.distance_km = input.distance_km;
  if (input.elevation_m !== undefined) update.elevation_m = input.elevation_m;
  if (input.start_lat !== undefined) update.start_lat = input.start_lat;
  if (input.start_lon !== undefined) update.start_lon = input.start_lon;
  if (input.zwift_event_id !== undefined)
    update.zwift_event_id = input.zwift_event_id;
  if (input.zwift_route_id !== undefined)
    update.zwift_route_id = input.zwift_route_id;
  if (input.laps !== undefined) update.laps = input.laps;

  const { error } = await supabase.from("events").update(update).eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/events/${id}`);
  revalidatePath("/kalender");
  revalidatePath("/live");
  revalidatePath("/dashboard");
  redirect(`/events/${id}`);
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };

  // Permissie-check: alleen creator of iemand met beheerrecht mag verwijderen.
  const { data: event } = await supabase
    .from("events")
    .select("created_by, gpx_path, cover_image_path")
    .eq("id", id)
    .single();
  if (!event) return { ok: false as const, error: "Event bestaat niet." };
  const isCreator = event.created_by === access.user.id;
  if (!isCreator && !access.has("events.manage_all")) {
    return { ok: false as const, error: "Geen toegang om dit event te verwijderen." };
  }

  // Verwijder de event-rij. Alle gerelateerde rijen (rsvps, foto's, reminders,
  // results, reports, chat, roster) cascaden of worden op null gezet via de FK's.
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  // Storage best-effort opruimen (nooit blokkerend): GPX + de event-fotomap
  // (bevat foto's en de cover onder `<id>/cover/...`). Via de admin-client zodat
  // ook andermans geüploade foto's mee kunnen.
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    if (event.gpx_path) {
      await admin.storage.from("event-gpx").remove([event.gpx_path]);
    }
    const paths: string[] = [];
    const { data: top } = await admin.storage.from("event-photos").list(id);
    for (const item of top ?? []) {
      // Mappen hebben geen id; bestanden wel.
      if (item.id) {
        paths.push(`${id}/${item.name}`);
      } else {
        const { data: sub } = await admin.storage
          .from("event-photos")
          .list(`${id}/${item.name}`);
        for (const f of sub ?? []) {
          if (f.id) paths.push(`${id}/${item.name}/${f.name}`);
        }
      }
    }
    if (paths.length > 0) {
      await admin.storage.from("event-photos").remove(paths);
    }
  } catch {
    // Een achtergebleven bestand kan later worden opgeruimd; de delete is leidend.
  }

  revalidatePath("/kalender");
  revalidatePath("/live");
  revalidatePath("/dashboard");
  redirect("/kalender");
}

export type ZwiftLookupResult =
  | { ok: false; error: string }
  | {
      ok: true;
      zwift_event_id: number;
      zwift_route_id: number | null;
      laps: number | null;
      title: string;
      external_url: string;
      route_name: string | null;
      world: string | null;
      distance_km: number | null;
      elevation_m: number | null;
      accents: number;
      /** Het profiel van deze route staat nog niet in de bibliotheek. */
      profile_missing: boolean;
    };

/**
 * Haalt een Zwift-event op aan de hand van de link die de beheerder plakt, en
 * registreert de route meteen in `zwift_routes` — anders zou de foreign key van
 * `events.zwift_route_id` niet houden voordat de routesync heeft gedraaid. Het
 * profiel zelf komt uit die sync (/beheer/zwift-routes); dit zet alleen de
 * identificerende velden.
 */
export async function lookupZwiftEvent(link: string): Promise<ZwiftLookupResult> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false, error: "Niet ingelogd." };
  if (!access.has("events.create") && !access.has("events.manage_all")) {
    return { ok: false, error: "Geen recht om events te bewerken." };
  }

  const eventId = parseZwiftEventUrl(link);
  if (!eventId) {
    return { ok: false, error: "Geen geldige Zwift-eventlink of event-id." };
  }

  const result = await fetchZwiftPublicEvent(eventId);
  if (!result.ok) return { ok: false, error: result.error };

  const { event } = result;
  const route = event.route;
  const totals = eventRouteTotals(event);

  let profileMissing = true;
  if (route) {
    const admin = createAdminClient();
    // Alleen de identificatie; profile/shape/synced_at blijven aan de sync.
    const { error } = await admin.from("zwift_routes").upsert(
      {
        route_id: route.routeId,
        slug: route.slug,
        name: route.name,
        world: route.world,
        strava_segment_id: route.stravaSegmentId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "route_id", ignoreDuplicates: false },
    );
    if (error) return { ok: false, error: error.message };

    const { data: stored } = await admin
      .from("zwift_routes")
      .select("synced_at")
      .eq("route_id", route.routeId)
      .maybeSingle();
    profileMissing = !stored?.synced_at;
  }

  return {
    ok: true,
    zwift_event_id: event.eventId,
    zwift_route_id: route?.routeId ?? null,
    laps: totals?.laps ?? event.laps,
    title: event.title,
    external_url: event.externalUrl,
    route_name: route?.name ?? null,
    world: route?.world ?? null,
    distance_km: totals?.distanceKm ?? event.distanceKm,
    elevation_m: totals?.elevationM ?? null,
    accents: route?.accents.length ?? 0,
    profile_missing: profileMissing,
  };
}
