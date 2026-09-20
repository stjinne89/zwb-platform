import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCronSecret } from "@/lib/cron/auth";
import {
  DEFAULT_BUDGET_MS,
  DEFAULT_HORIZON_DAYS,
  syncZwiftEventCache,
} from "@/lib/zwift/event-cache";

// Uurlijkse sync van de Zwift-kalender naar `zwift_events`, de bron onder de
// eventvoorstellen bij een geplande training.
//
// Waarom elk uur: de publieke endpoint geeft per venster maximaal 200 rijen, en
// binnen één functie-timeout halen we er een beperkt aantal op. Elke run doet
// wat er in het budget past; de volgende run doet de rest. Idempotent, dus
// opnieuw aanroepen is altijd veilig.
//
// Bearer-token via ZWIFT_EVENT_SYNC_SECRET. Draait op cron-job.org, niet als
// Netlify scheduled function -- die gaan op deze site niet af (zie
// docs/runbook.md sectie 8).

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const auth = checkCronSecret(request, "ZWIFT_EVENT_SYNC_SECRET");
  if (!auth.ok) return new NextResponse(auth.message, { status: 403 });

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "admin client onbeschikbaar" },
      { status: 500 },
    );
  }

  const horizonDays = Number(process.env.ZWIFT_EVENT_HORIZON_DAYS) || DEFAULT_HORIZON_DAYS;
  const budgetMs = Number(process.env.ZWIFT_EVENT_SYNC_BUDGET_MS) || DEFAULT_BUDGET_MS;

  try {
    const result = await syncZwiftEventCache(admin, { horizonDays, budgetMs });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Zwift-eventsync mislukt." },
      { status: 500 },
    );
  }
}

export const GET = POST;
