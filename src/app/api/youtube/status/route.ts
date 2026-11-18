import { NextResponse, type NextRequest } from "next/server";
import { checkCronSecret } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runStreamStatusCheck } from "@/lib/youtube-live/status-run";

// Live-status van de streams bij races (livestreams, fase 2, 0339).
// Cron-job.org, elke 2 minuten, bearer YOUTUBE_STATUS_SECRET. Zonder geplande
// stream rond nu doet hij niets behalve één databasequery.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const auth = checkCronSecret(request, "YOUTUBE_STATUS_SECRET");
  if (!auth.ok) return new NextResponse(auth.message, { status: 403 });
  try {
    const result = await runStreamStatusCheck(createAdminClient());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout.";
    console.error("[youtube/status]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = POST;
