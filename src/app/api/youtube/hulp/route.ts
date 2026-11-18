import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordHelperReport } from "@/lib/youtube-live/helper";

// Terugmelding van de stream-hulp (livestreams, fase 3, 0340): de stand van OBS,
// bij het starten, bij elke verandering en elke tien minuten. Zonder sessie;
// de handtekening met het geheim uit de koppelcode is het bewijs.

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const ok = await recordHelperReport(createAdminClient(), body).catch(() => false);
  // Geen onderscheid tussen onbekend kanaal en foute handtekening.
  return NextResponse.json({ ok }, { status: ok ? 200 : 403 });
}
