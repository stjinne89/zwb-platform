// Eventscan-cron — wordt extern getriggerd (bv. cron-job.org, elke 24u) met
// `Authorization: Bearer ${EVENT_SCAN_SECRET}`.
//
// Draait dezelfde scan als de "Scan bronnen"-knop op /beheer/event-scan:
// volgt eerst leden met een Zwift-ID, scant publieke ZWB-relevante events en
// de Zwift-member-feed, en bewaart events met ZWB-deelname als concept.
// Publiceren naar de kalender blijft een handmatige beheeractie.

import { createAdminClient } from "@/lib/supabase/admin";
import { runEventScan } from "@/lib/events/scan-runner";

export async function POST(request: Request) {
  const expected = process.env.EVENT_SCAN_SECRET;
  const actual = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const result = await runEventScan(admin, { follow: true });
    return Response.json({ ok: !result.error, ...result });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Eventscan-cron faalde.",
      },
      { status: 500 },
    );
  }
}

// GET als alias voor handmatig testen vanuit browser/curl.
export const GET = POST;
