"use server";

// Je eigen keuzes voor een event bewaren (0329, stap 4 van
// docs/eventvoeding-plan.md). De server rekent het plan zelf opnieuw uit met
// dezelfde planner als de pagina, en bewaart daarbij het getal en het vocht
// waarmee het plan rekent; wat de browser stuurt, zijn alleen de keuzes. Gelijk
// aan het advies: dan wist hij de rij.

import type { ClubEventRow } from "@/lib/training/events";
import { eventFuelRow, plannerChoiceFrom, sameChoice } from "@/lib/nutrition/event-planner";
import { loadEventRidePlan, requireViewer, todayKeyAmsterdam } from "./_data";

type ActionResult = { ok: true } | { ok: false; error: string };

const EVENT_COLUMNS =
  "id, title, type, start_at, end_at, distance_km, elevation_m, gpx_path, zwift_route_id, laps, duration_minutes, zwift_event_type, zwift_tags, parent_event_id";

export async function saveEventFuel(eventId: string, raw: unknown): Promise<ActionResult> {
  if (typeof eventId !== "string" || !eventId) return { ok: false, error: "Geen event." };
  const viewer = await requireViewer();
  const { data: event } = await viewer.supabase.from("events").select(EVENT_COLUMNS).eq("id", eventId).maybeSingle();
  if (!event) return { ok: false, error: "Event niet gevonden." };
  const ride = await loadEventRidePlan(viewer, event as ClubEventRow, todayKeyAmsterdam());
  if (!ride?.planner) return { ok: false, error: "Geen plan voor dit event." };
  const { planner } = ride;

  const choice = raw && typeof raw === "object" ? plannerChoiceFrom(planner, raw as Record<string, unknown>) : null;
  if (!choice || sameChoice(choice, planner.defaults)) {
    const { error } = await viewer.supabase
      .from("nutrition_event_fuel")
      .delete()
      .eq("profile_id", viewer.user.id)
      .eq("event_id", eventId);
    return error ? { ok: false, error: "Niet bewaard." } : { ok: true };
  }

  const { error } = await viewer.supabase.from("nutrition_event_fuel").upsert(
    {
      profile_id: viewer.user.id,
      event_id: eventId,
      ...eventFuelRow(planner, choice),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,event_id" },
  );
  return error ? { ok: false, error: "Niet bewaard." } : { ok: true };
}
