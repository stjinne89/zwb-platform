import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchExternalLiveTiming } from "@/lib/live/external-timing";
import { isChronoLiveTimingUrl } from "@/lib/event-results/scrape";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, results: [], error: "Niet ingelogd." },
      { status: 401 },
    );
  }

  const { data: event } = await supabase
    .from("events")
    .select("live_timing_url")
    .eq("id", eventId)
    .single();
  const source =
    event && isChronoLiveTimingUrl(event.live_timing_url)
      ? event.live_timing_url
      : null;

  if (!source) {
    return NextResponse.json(
      {
        ok: false,
        results: [],
        error: "Geen ondersteunde ACN-live timing voor dit event.",
      },
      { status: 404 },
    );
  }

  const outcome = await fetchExternalLiveTiming(source).catch(() => ({
    ok: false,
    results: [],
    error: "Live timing ophalen is mislukt.",
  }));
  return NextResponse.json(outcome, {
    status: outcome.ok ? 200 : 502,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
