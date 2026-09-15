// Pushmeldingen voor gewonnen en verloren ZWB KOM's en QOM's (migratie 0162).
//
// refresh_segment_koms zet gebeurtenissen in zwb_segment_kom_events; deze stap in de
// webhook-taak verstuurt ze. Eerst afvinken, dan versturen: bij een afgebroken run liever
// een gemiste dan een dubbele melding. Een gebeurtenis ouder dan een dag gaat niet meer
// weg, want dan klopt "net" niet meer.

import { formatSegmentTime } from "./explorer";
import type { PushPayload } from "@/lib/push/send";

export type KomTitle = "kom" | "qom";
export type KomEvent = {
  id: number;
  segment_id: number | string;
  title: KomTitle;
  profile_id: string;
  kind: "won" | "lost";
  seconds: number;
  holder_id: string | null;
  created_at: string;
};

const EVENT_LIMIT = 50;
const STALE_MS = 24 * 3600 * 1000;
const MIN_REMAINING_MS = 800;

export const KOM_TITLE_LABELS: Record<KomTitle, string> = { kom: "ZWB KOM", qom: "ZWB QOM" };

function titles(list: KomTitle[]) {
  return [...new Set(list)].sort().map((t) => KOM_TITLE_LABELS[t]).join(" en ");
}

/** Eén melding per lid, segment en soort; KOM en QOM tegelijk worden samengevoegd. */
export function komPushMessages(
  events: KomEvent[],
  names: { segments: Map<string, string>; profiles: Map<string, string> },
): Array<{ profileId: string; payload: PushPayload }> {
  const groups = new Map<string, KomEvent[]>();
  for (const event of events) {
    const key = `${event.profile_id}|${event.segment_id}|${event.kind}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.values()].map((group) => {
    const [first] = group;
    const label = titles(group.map((e) => e.title));
    const segment = names.segments.get(String(first.segment_id)) ?? "een ZWB Segment";
    const time = formatSegmentTime(first.seconds);
    const holder = (first.holder_id && names.profiles.get(first.holder_id)) || "Een andere ZWB'er";
    return {
      profileId: first.profile_id,
      payload: first.kind === "won"
        ? { title: `${label} gewonnen`, body: `Je bent de snelste op ${segment} (${time}).`, url: "/profiel", tag: `kom-${first.segment_id}-${first.profile_id}` }
        : { title: `${label} kwijt`, body: `${holder} was sneller op ${segment} (${time}).`, url: "/profiel/segments", tag: `kom-${first.segment_id}-${first.profile_id}` },
    };
  });
}

export type KomNotifyDeps = {
  now: () => number;
  send: (profileId: string, payload: PushPayload) => Promise<unknown>;
};

export type KomNotifyResult = { sent: number; expired: number } | { skipped: true } | { error: string };

export async function notifySegmentKomEvents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  options: { deadline: number; deps?: Partial<KomNotifyDeps> },
): Promise<KomNotifyResult> {
  const deps: KomNotifyDeps = {
    now: Date.now,
    send: async (profileId, payload) => {
      const { sendNotificationToMembers } = await import("@/lib/push/send");
      return sendNotificationToMembers("on_segment_kom", payload, { profileIds: [profileId] });
    },
    ...options.deps,
  };
  if (options.deadline - deps.now() < MIN_REMAINING_MS) return { skipped: true };
  try {
    const pending = await admin.from("zwb_segment_kom_events")
      .select("id,segment_id,title,profile_id,kind,seconds,holder_id,created_at")
      .is("notified_at", null).order("id").limit(EVENT_LIMIT);
    if (pending.error) return { error: pending.error.message };
    const events = (pending.data ?? []) as KomEvent[];
    if (events.length === 0) return { sent: 0, expired: 0 };

    const claimed = await admin.from("zwb_segment_kom_events")
      .update({ notified_at: new Date(deps.now()).toISOString() })
      .in("id", events.map((e) => e.id)).is("notified_at", null).select("id");
    if (claimed.error) return { error: claimed.error.message };
    // Alleen wat deze run zelf afvinkte: een parallelle run verstuurt de rest.
    const mine = new Set(((claimed.data ?? []) as Array<{ id: number }>).map((r) => r.id));
    const fresh = events.filter((e) => mine.has(e.id) && deps.now() - Date.parse(e.created_at) <= STALE_MS);
    if (fresh.length === 0) return { sent: 0, expired: mine.size };

    const [segments, profiles] = await Promise.all([
      admin.from("zwb_segment_maps").select("id,name").in("id", [...new Set(fresh.map((e) => e.segment_id))]),
      admin.from("profiles").select("id,display_name").in("id", [...new Set(fresh.flatMap((e) => e.holder_id ? [e.holder_id] : []))]),
    ]);
    const messages = komPushMessages(fresh, {
      segments: new Map(((segments.data ?? []) as Array<{ id: number | string; name: string }>).map((s) => [String(s.id), s.name])),
      profiles: new Map(((profiles.data ?? []) as Array<{ id: string; display_name: string | null }>).flatMap((p) => p.display_name ? [[p.id, p.display_name] as [string, string]] : [])),
    });
    let sent = 0;
    for (const message of messages) {
      try { await deps.send(message.profileId, message.payload); sent++; } catch { /* volgende melding */ }
    }
    return { sent, expired: mine.size - fresh.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "KOM-meldingen versturen faalde." };
  }
}
