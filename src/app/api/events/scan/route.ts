// Eventscan-cron — wordt extern getriggerd (cron-job.org) met
// `Authorization: Bearer ${EVENT_SCAN_SECRET}`.
//
// Draait dezelfde scan als de "Scan bronnen"-knop op /beheer/event-scan:
// volgt eerst leden met een Zwift-ID, scant publieke ZWB-relevante events en
// de Zwift-member-feed, en bewaart events met ZWB-deelname als concept.
// Daarna de startlijsten van komende omnium-edities.
// Publiceren naar de kalender blijft een handmatige beheeractie, behalve voor
// events van de ZWB-club zelf: die zet de uurlijkse Zwift-sync erop.
//
// Alles samen duurde op 2026-10-21 langer dan de 30 seconden die cron-job.org
// wacht. Daarom draait cron-job.org de onderdelen los, met `?step=follow`,
// `scan`, `feed` en `omnium` (docs/runbook.md). Zonder `step` loopt alles.

import { createAdminClient } from "@/lib/supabase/admin";
import { runEventScan, SCAN_STEPS, type ScanStep } from "@/lib/events/scan-runner";
import { syncUpcomingOmniumEntrants } from "@/lib/omnium/zwift-entrants";

export const maxDuration = 30;

/** Zoveel tijd krijgt de feedsync; de rest pakt de volgende run op. */
const FEED_BUDGET_MS = 20_000;

const STEPS = [...SCAN_STEPS, "omnium"] as const;
type Step = (typeof STEPS)[number];

export async function POST(request: Request) {
  const expected = process.env.EVENT_SCAN_SECRET;
  const actual = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const step = new URL(request.url).searchParams.get("step");
  if (step !== null && !STEPS.includes(step as Step)) {
    return Response.json({ ok: false, error: `Onbekende stap: ${step}.` }, { status: 400 });
  }
  const steps: readonly Step[] = step ? [step as Step] : STEPS;
  const scanSteps = steps.filter((s): s is ScanStep => s !== "omnium");

  try {
    const admin = createAdminClient();
    const result =
      scanSteps.length > 0
        ? await runEventScan(admin, {
            steps: scanSteps,
            feedDeadline: Date.now() + FEED_BUDGET_MS,
          })
        : null;
    const omnium = steps.includes("omnium") ? await syncUpcomingOmniumEntrants(admin) : null;
    return Response.json({
      ...result,
      omnium,
      ok: !result?.error && (omnium?.failures.length ?? 0) === 0,
    });
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
