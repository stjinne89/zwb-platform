import { NextResponse, type NextRequest } from "next/server";
import { checkCronSecret } from "@/lib/cron/auth";
import { runWeeklyUpdate } from "@/lib/app-updates/auto";

// De wekelijkse app-update vanzelf uit PLAN.md (0294, zie lib/app-updates/auto.ts).
// Bearer-token via APP_UPDATES_SECRET. Draait elk uur op cron-job.org (zie
// docs/runbook.md); buiten donderdag 14:00 tot en met zondag doet een aanroep
// niets, en een week die al een update heeft ook niet.

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const auth = checkCronSecret(request, "APP_UPDATES_SECRET");
  if (!auth.ok) return new NextResponse(auth.message, { status: 403 });

  try {
    const result = await runWeeklyUpdate();
    return NextResponse.json({ ok: result.status !== "mislukt", ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "App-update mislukt" },
      { status: 500 },
    );
  }
}
