import { NextResponse } from "next/server";
import { fetchEventLiveSnapshot } from "@/lib/live/event-snapshot";

// Publieke polling-endpoint voor /live/[id]. Geeft alleen sessions
// + positions terug (geen GPX-URL — die is al via de page server-
// rendered en hoeft niet elke 10s opnieuw). Wordt elke 10s gepolled
// door de EventLiveTicker in pollUrl-mode.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  if (!eventId) {
    return NextResponse.json({ sessions: [], positions: [] });
  }

  try {
    const snapshot = await fetchEventLiveSnapshot(eventId);
    return NextResponse.json(
      {
        sessions: snapshot.sessions,
        positions: snapshot.positions,
      },
      {
        headers: {
          // Niet cachen — het is een real-time feed.
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { sessions: [], positions: [] },
      { status: 500 },
    );
  }
}
