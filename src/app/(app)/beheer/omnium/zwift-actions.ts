"use server";
import { revalidatePath } from "next/cache";
import { requireOmniumAccess } from "@/lib/omnium/access";
import { fetchZwiftEvent } from "@/lib/events/zwift-club";
import { leagueMapSchema, mapSubgroups, type LeagueMap } from "@/lib/omnium/zwift-mapping";
import { syncOmniumEntrants } from "@/lib/omnium/zwift-entrants";
import { sprintSegmentOptions } from "@/lib/omnium/segment-results";

type Admin = Awaited<ReturnType<typeof requireOmniumAccess>>["admin"];

/** Apart gelezen, zodat de andere onderdelen blijven werken zolang 0190 er niet is. */
async function sprintSegmentId(admin: Admin, partId: string): Promise<string | null> {
  const { data, error } = await admin.from("omnium_edition_events").select("zwift_segment_id").eq("id", partId).single();
  if (error) throw new Error(error.message);
  return (data.zwift_segment_id as string | null) ?? null;
}

export async function loadZwiftGroups(partId: string) {
  try {
    const { admin } = await requireOmniumAccess();
    const { data, error } = await admin
      .from("omnium_edition_events")
      .select("zwift_event_id, subgroup_leagues, discipline")
      .eq("id", partId)
      .single();
    if (error) throw new Error(error.message);
    if (!data.zwift_event_id) throw new Error("Vul eerst het Zwift-event-ID in.");
    const event = await fetchZwiftEvent(data.zwift_event_id);
    const sprint = data.discipline === "sprint";
    return {
      ok: true as const,
      eventId: String(data.zwift_event_id),
      groups: mapSubgroups(event, leagueMapSchema.parse(data.subgroup_leagues)),
      segments: sprint ? sprintSegmentOptions(event) : null,
      segmentId: sprint ? await sprintSegmentId(admin, partId) : null,
    };
  } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Ophalen mislukt." }; }
}

/** `segmentId` alleen bij de Sprint Quali; undefined laat de kolom ongemoeid. */
export async function saveZwiftGroups(partId: string, eventId: string, mapping: LeagueMap, segmentId?: string | null) {
  try {
    const { admin } = await requireOmniumAccess();
    const parsed = leagueMapSchema.parse(mapping);
    const event = await fetchZwiftEvent(eventId);
    const groups = mapSubgroups(event, parsed);
    if (groups.some((g) => !g.league)) throw new Error("Kies voor elke subgroep een league.");
    if (segmentId && !sprintSegmentOptions(event).some((s) => s.segmentId === segmentId)) {
      throw new Error("Dit segment ligt niet op de route van het Zwift-event.");
    }
    const { data, error } = await admin
      .from("omnium_edition_events")
      .update({
        subgroup_leagues: parsed,
        zwift_subgroup_ids: groups.map((group) => group.id),
        ...(segmentId === undefined ? {} : { zwift_segment_id: segmentId }),
      })
      .eq("id", partId)
      .eq("zwift_event_id", eventId)
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Event-ID gewijzigd; laad de subgroepen opnieuw.");
    return { ok: true as const };
  } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Opslaan mislukt." }; }
}

export async function syncEntrantsAction(editionId: string) {
  try {
    const { admin } = await requireOmniumAccess();
    const result = await syncOmniumEntrants(admin, editionId);
    revalidatePath("/omnium", "layout");
    revalidatePath(`/beheer/omnium/${editionId}`);
    return { ok: true as const, ...result };
  } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Ophalen mislukt." }; }
}
