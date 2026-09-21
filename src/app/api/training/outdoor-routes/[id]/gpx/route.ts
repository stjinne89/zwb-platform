import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { routeToGpx } from "@/lib/training/outdoor-suggestions";

// Een voorgesteld rondje als GPX, zodat het lid het op zijn fietscomputer of in
// Komoot/Strava krijgt. Zonder deze knop is een routevoorstel een plaatje.
//
// Alleen het lid zelf: een vertrekpunt is de meest privacygevoelige gegevens die
// dit platform bewaart, en een route begint en eindigt eraan. Geen trainer- of
// beheerinzage, anders dan bij de FIT-export -- zie de toelichting in migratie
// 0173.

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return new NextResponse("unauthorized", { status: 401 });

  const admin = createAdminClient();
  const { data: route } = await admin
    .from("outdoor_route_suggestions")
    .select("id, profile_id, distance_km, variant, geometry, workout_id")
    .eq("id", id)
    .maybeSingle();

  if (!route) return new NextResponse("not found", { status: 404 });
  if (route.profile_id !== access.user.id) return new NextResponse("forbidden", { status: 403 });

  const geometry = route.geometry as { lat?: number[]; lon?: number[]; ele?: Array<number | null> };
  if (!Array.isArray(geometry?.lat) || geometry.lat.length < 2) {
    return NextResponse.json({ ok: false, error: "Deze route heeft geen lijn." }, { status: 409 });
  }

  const { data: workout } = await admin
    .from("training_workouts")
    .select("title, scheduled_at")
    .eq("id", route.workout_id)
    .maybeSingle();

  const day = String(workout?.scheduled_at ?? "").slice(0, 10);
  const name = `${workout?.title ?? "Buitenrit"} — ${Number(route.distance_km).toFixed(0)} km`;
  const gpx = routeToGpx(name, {
    lat: geometry.lat,
    lon: geometry.lon ?? [],
    ele: geometry.ele ?? [],
  });

  return new NextResponse(gpx, {
    headers: {
      "content-type": "application/gpx+xml; charset=utf-8",
      "content-disposition": `attachment; filename="zwb-${day || "rit"}-${Number(route.distance_km).toFixed(0)}km.gpx"`,
      // Een vertrekpunt hoort nergens in een cache te blijven hangen.
      "cache-control": "private, no-store",
    },
  });
}
