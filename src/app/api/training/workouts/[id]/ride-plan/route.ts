import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { todayKeyAmsterdam } from "@/app/(app)/zwbeter-worden/_data";
import { loadRidePlans, type PlannedRide } from "@/app/(app)/zwbeter-worden/voeding/_data";

// Het ritplan van één eigen training, voor het detail in de kalender van het
// schema. Het schema stuurde vroeger alle plannen in één keer mee (34 bij één lid,
// 338 KB van een pagina van 986 KB); nu pas als het lid een training openklapt.
// Alleen de eigen training: recepten, voorkeuren en zweettests zijn van het lid
// zelf en worden onder zijn eigen RLS gelezen.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return new NextResponse("unauthorized", { status: 401 });

  const { data: workout } = await supabase
    .from("training_workouts")
    .select("id, scheduled_at, duration_minutes, intensity, status")
    .eq("id", id)
    .eq("profile_id", access.user.id)
    .is("superseded_at", null)
    .maybeSingle();
  if (!workout) return new NextResponse("not found", { status: 404 });

  const viewer = { supabase, admin: createAdminClient(), access, user: access.user };
  const plans = await loadRidePlans(viewer, [workout as PlannedRide], todayKeyAmsterdam()).catch(() => null);
  return NextResponse.json(
    { plan: plans?.get(workout.id) ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
