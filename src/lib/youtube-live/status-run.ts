import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendNotificationToMembers } from "@/lib/push/send";
import {
  CHECK_AFTER_MS,
  CHECK_BEFORE_MS,
  fetchVideoStatuses,
  liveNotificationText,
  planStatusChanges,
  type OpenStream,
  type StreamStatus,
} from "@/lib/youtube-live/status";

// De run achter `POST /api/youtube/status` (fase 2, 0339). Zonder open streams
// rond nu kost hij één databasequery en geen YouTube-aanroep.

export type StatusRunResult = {
  open: number;
  checked: number;
  changed: Record<StreamStatus, number>;
  notified: number;
};

export async function runStreamStatusCheck(
  admin: SupabaseClient,
  now = new Date(),
): Promise<StatusRunResult> {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) throw new Error("YOUTUBE_API_KEY ontbreekt.");

  const { data, error } = await admin
    .from("event_streams")
    .select("id, event_id, profile_id, youtube_video_id, scheduled_start_at, status, live_notified_at, source")
    .in("status", ["gepland", "live"])
    .lte("scheduled_start_at", new Date(now.getTime() + CHECK_BEFORE_MS).toISOString())
    .order("scheduled_start_at")
    .limit(200);
  if (error) throw new Error(error.message);
  const streams = (data ?? []) as OpenStream[];
  const result: StatusRunResult = {
    open: streams.length,
    checked: 0,
    changed: { gepland: 0, live: 0, afgelopen: 0, weg: 0 },
    notified: 0,
  };
  if (streams.length === 0) return result;

  // Wat te lang geleden gepland stond, hoeft niet meer naar YouTube.
  const recent = streams.filter(
    (stream) => now.getTime() <= Date.parse(stream.scheduled_start_at) + CHECK_AFTER_MS,
  );
  const fetched = recent.length
    ? await fetchVideoStatuses(apiKey, [...new Set(recent.map((s) => s.youtube_video_id))])
    : new Map<string, StreamStatus>();
  result.checked = fetched.size;

  const candidateEvents = [...new Set(streams.map((s) => s.event_id))];
  const { data: notifiedRows } = await admin
    .from("event_streams")
    .select("event_id")
    .in("event_id", candidateEvents)
    .not("live_notified_at", "is", null);
  const alreadyNotified = new Set((notifiedRows ?? []).map((row) => row.event_id as string));

  const plan = planStatusChanges(streams, fetched, alreadyNotified, now);
  const stamp = now.toISOString();
  const byStatus = new Map<StreamStatus, string[]>();
  for (const [id, status] of plan.updates) byStatus.set(status, [...(byStatus.get(status) ?? []), id]);
  for (const [status, ids] of byStatus) {
    await admin.from("event_streams").update({ status, status_checked_at: stamp }).in("id", ids);
    result.changed[status] = ids.length;
  }

  for (const eventId of plan.notifyEvents) {
    // Eerst vastleggen, dan versturen: een tweede run stuurt zo niets dubbel.
    const { data: claimed } = await admin
      .from("event_streams")
      .update({ live_notified_at: stamp })
      .eq("event_id", eventId)
      .is("live_notified_at", null)
      .select("id");
    if (!claimed?.length) continue;
    const [{ data: event }, { data: live }] = await Promise.all([
      admin.from("events").select("title").eq("id", eventId).maybeSingle(),
      admin
        .from("event_streams")
        .select("profile_id, profiles(display_name)")
        .eq("event_id", eventId)
        .eq("status", "live")
        .neq("source", "extra"),
    ]);
    const rows = (live ?? []) as Array<{
      profile_id: string;
      profiles: { display_name: string | null } | { display_name: string | null }[] | null;
    }>;
    const names = rows.map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return profile?.display_name?.trim() ?? "";
    });
    const text = liveNotificationText((event as { title?: string } | null)?.title ?? "De race", names);
    try {
      await sendNotificationToMembers(
        "on_race_stream_live",
        { ...text, url: `/events/${eventId}`, tag: `stream-${eventId}` },
        // Wie streamt, weet het al.
        rows.length === 1 ? { excludeProfileId: rows[0].profile_id } : {},
      );
      result.notified += 1;
    } catch (err) {
      console.error("[youtube/status] melding", err);
    }
  }
  return result;
}
