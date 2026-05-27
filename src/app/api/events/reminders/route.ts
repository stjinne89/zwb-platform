// Event-reminder cron — wordt extern getriggerd (cron-job.org elke 15 min)
// met `Authorization: Bearer ${EVENT_REMINDER_SECRET}`.
//
// Stuurt push-notificaties naar RSVP-yes/maybe-leden 24u + 2u voor de
// event-start. Idempotent: een (event_id, profile_id, kind) krijgt
// maximaal 1 notificatie via de `event_reminder_sends`-log.
//
// Window-keuze (overlap zodat een 15-min-tick nooit mist):
//   2u  : start_at in [now + 90min,  now + 150min]
//   24u : start_at in [now + 23h,    now + 25h]

import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationToMembers } from "@/lib/push/send";

type ReminderKind = "24h" | "2h";

type EventRow = {
  id: string;
  title: string;
  location: string | null;
  start_at: string;
  event_rsvps: Array<{ profile_id: string; status: string }>;
};

function formatStart(date: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(date);
}

function formatTimeOnly(date: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(date);
}

function payloadFor(kind: ReminderKind, event: EventRow) {
  const start = new Date(event.start_at);
  if (kind === "24h") {
    return {
      title: "Morgen op de kalender",
      body: `${event.title} — ${formatStart(start)}${event.location ? ` @ ${event.location}` : ""}`,
      url: `/events/${event.id}`,
      tag: `event-reminder-${event.id}-24h`,
    };
  }
  return {
    title: `Over 2 uur: ${event.title}`,
    body: `Start om ${formatTimeOnly(start)}${event.location ? ` @ ${event.location}` : ""}`,
    url: `/events/${event.id}`,
    tag: `event-reminder-${event.id}-2h`,
  };
}

async function processWindow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  kind: ReminderKind,
  windowStart: Date,
  windowEnd: Date,
) {
  const { data: events, error } = await admin
    .from("events")
    .select(
      "id, title, location, start_at, event_rsvps(profile_id, status)",
    )
    .gte("start_at", windowStart.toISOString())
    .lte("start_at", windowEnd.toISOString());

  if (error) throw new Error(`events query failed: ${error.message}`);
  const rows = (events ?? []) as EventRow[];

  let sentTotal = 0;
  let eventsTouched = 0;
  let skippedDuplicates = 0;

  for (const ev of rows) {
    const candidateIds = Array.from(
      new Set(
        (ev.event_rsvps ?? [])
          .filter((r) => r.status === "yes" || r.status === "maybe")
          .map((r) => r.profile_id),
      ),
    );
    if (candidateIds.length === 0) continue;

    // Wie heeft deze reminder-kind al gekregen voor dit event?
    const { data: alreadySent } = await admin
      .from("event_reminder_sends")
      .select("profile_id")
      .eq("event_id", ev.id)
      .eq("reminder_kind", kind);
    const sentIds = new Set(
      (alreadySent ?? []).map((r: { profile_id: string }) => r.profile_id),
    );

    const targetIds = candidateIds.filter((id) => !sentIds.has(id));
    skippedDuplicates += candidateIds.length - targetIds.length;
    if (targetIds.length === 0) continue;

    const result = await sendNotificationToMembers(
      "on_event_reminder",
      payloadFor(kind, ev),
      { profileIds: targetIds },
    );

    if (result.sent > 0) {
      eventsTouched += 1;
      sentTotal += result.sent;
    }

    // Log voor ALLE targetIds (ook degenen die geen device hadden) zodat
    // we niet bij elke cron-tick dezelfde profielen opnieuw proberen.
    const rowsToLog = targetIds.map((profile_id) => ({
      event_id: ev.id,
      profile_id,
      reminder_kind: kind,
    }));
    if (rowsToLog.length > 0) {
      await admin.from("event_reminder_sends").insert(rowsToLog);
    }
  }

  return { sentTotal, eventsTouched, skippedDuplicates, eventsScanned: rows.length };
}

export async function POST(request: Request) {
  const expected = process.env.EVENT_REMINDER_SECRET;
  const actual = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const now = Date.now();
    const window2h = {
      start: new Date(now + 90 * 60 * 1000),
      end: new Date(now + 150 * 60 * 1000),
    };
    const window24h = {
      start: new Date(now + 23 * 60 * 60 * 1000),
      end: new Date(now + 25 * 60 * 60 * 1000),
    };

    const r2h = await processWindow(admin, "2h", window2h.start, window2h.end);
    const r24h = await processWindow(
      admin,
      "24h",
      window24h.start,
      window24h.end,
    );

    return Response.json({
      ok: true,
      "2h": r2h,
      "24h": r24h,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Reminder-cron faalde.",
      },
      { status: 500 },
    );
  }
}

// GET als alias voor handmatig testen vanuit browser/curl
export const GET = POST;
