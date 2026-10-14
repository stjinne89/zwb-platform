import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildIcsCalendar } from "@/lib/calendar/ics";
import { loadCalendarFeed } from "@/lib/calendar/feed";
import { calendarFeedTokenFromPath } from "@/lib/calendar/feed-token";

// Het agenda-abonnement (migr. 0236). Google Agenda, Outlook en Apple Agenda
// halen deze link zelf op, zonder sessie; het token in het pad is de sleutel.
// Het lid maakt de link aan op het profiel en kan hem daar intrekken.

/** Niet bij elke ophaalbeurt schrijven; een agenda-app vraagt soms elk kwartier. */
const TOUCH_AFTER_MS = 60 * 60 * 1000;

function siteUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return configured && /^https?:\/\//i.test(configured) ? configured : request.nextUrl.origin;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const token = calendarFeedTokenFromPath((await params).token);
  if (!token) return new NextResponse("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("calendar_feed_tokens")
    .select("profile_id, last_fetched_at")
    .eq("token", token)
    .maybeSingle<{ profile_id: string; last_fetched_at: string | null }>();
  if (error) return new NextResponse("Error", { status: 502 });
  if (!row) return new NextResponse("Not found", { status: 404 });

  let items;
  try {
    items = await loadCalendarFeed(admin, row.profile_id, siteUrl(request));
  } catch {
    // Een lege agenda zou bij de app alles laten verdwijnen; een fout laat de
    // vorige versie staan.
    return new NextResponse("Error", { status: 502 });
  }

  const lastFetched = row.last_fetched_at ? new Date(row.last_fetched_at).getTime() : 0;
  if (Date.now() - lastFetched > TOUCH_AFTER_MS) {
    await admin
      .from("calendar_feed_tokens")
      .update({ last_fetched_at: new Date().toISOString() })
      .eq("token", token);
  }

  return new NextResponse(buildIcsCalendar({ name: "ZWB", items }), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="zwb.ics"',
      "Cache-Control": "private, max-age=900",
      "X-Robots-Tag": "noindex",
    },
  });
}
