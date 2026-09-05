// Nachtelijke opruiming van Strava-koppelingen. Aangeschopt door de Netlify
// scheduled function `strava-lifecycle` met Authorization: Bearer
// ${STRAVA_SYNC_SECRET}. Zie src/lib/strava/sweep.ts voor wat er gebeurt en
// docs/runbook.md voor het beleid.

import { createAdminClient } from "@/lib/supabase/admin";
import { runStravaSweep } from "@/lib/strava/sweep";

function positiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function POST(request: Request) {
  const expected = process.env.STRAVA_SYNC_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const inactiveMonths = positiveInt(
    url.searchParams.get("inactiveMonths"),
    positiveInt(process.env.STRAVA_INACTIVITY_MONTHS ?? null, 12, 60),
    60,
  );
  const graceDays = positiveInt(
    url.searchParams.get("graceDays"),
    positiveInt(process.env.STRAVA_INACTIVITY_GRACE_DAYS ?? null, 30, 180),
    180,
  );

  try {
    const admin = createAdminClient();
    const result = await runStravaSweep(admin, { inactiveMonths, graceDays });
    return Response.json({ ok: result.errors.length === 0, ...result });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Strava-opruiming faalde.",
      },
      { status: 500 },
    );
  }
}

export const GET = POST;
