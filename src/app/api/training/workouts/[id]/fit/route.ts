import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { fetchIntervalsWorkoutFit } from "@/lib/intervals/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function canAccessWorkout(userId: string, workout: { profile_id: string; trainer_id: string | null }, canManage: boolean) {
  if (canManage || workout.profile_id === userId || workout.trainer_id === userId) return true;
  const admin = createAdminClient();
  const { data } = await admin
    .from("training_coach_assignments")
    .select("id")
    .eq("trainer_id", userId)
    .eq("athlete_id", workout.profile_id)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return new NextResponse("unauthorized", { status: 401 });

  const admin = createAdminClient();
  const { data: workout } = await admin
    .from("training_workouts")
    .select("id, profile_id, trainer_id, scheduled_at, title, intervals_event_id, publish_status")
    .eq("id", id)
    .single();

  if (!workout) return new NextResponse("not found", { status: 404 });
  if (!(await canAccessWorkout(access.user.id, workout, access.has("training.manage_assignments")))) {
    return new NextResponse("forbidden", { status: 403 });
  }
  if (workout.publish_status !== "published" || !workout.intervals_event_id) {
    return NextResponse.json({ ok: false, error: "Deze workout is nog niet gepubliceerd naar intervals.icu." }, { status: 409 });
  }

  const { data: conn } = await admin
    .from("intervals_connections")
    .select("api_key, athlete_id")
    .eq("profile_id", workout.profile_id)
    .maybeSingle();
  if (!conn?.api_key || !conn?.athlete_id) {
    return NextResponse.json({ ok: false, error: "Renner heeft intervals.icu nog niet gekoppeld." }, { status: 409 });
  }

  try {
    const fit = await fetchIntervalsWorkoutFit(
      conn.api_key,
      conn.athlete_id,
      String(workout.intervals_event_id),
      String(workout.scheduled_at).slice(0, 10),
    );
    const filename = fit.filename.toLowerCase().endsWith(".fit")
      ? fit.filename
      : `${workout.title.replace(/[^a-z0-9_-]+/gi, "-")}.fit`;
    const body = fit.bytes.buffer.slice(
      fit.bytes.byteOffset,
      fit.bytes.byteOffset + fit.bytes.byteLength,
    ) as ArrayBuffer;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "FIT-download faalde." },
      { status: 502 },
    );
  }
}
