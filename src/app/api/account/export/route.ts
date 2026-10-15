import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// G2 — Data-export (AVG art. 15/20). Geeft een ingelogde gebruiker al zijn/haar
// eigen gegevens als één JSON-download. Geheimen (API-keys, OAuth-tokens) worden
// bewust NIET meegeleverd; van koppelingen alleen niet-gevoelige metadata.

// Tabellen met een directe profile_id-kolom → volledige export.
const PROFILE_TABLES: string[] = [
  "event_rsvps",
  "event_chat_messages",
  "event_reports",
  "event_report_comments",
  "training_goals",
  "training_plans",
  "training_workouts",
  "training_workout_reports",
  "training_chat_messages",
  "training_preferences",
  "profile_wellness",
  "strava_activities",
  "live_sessions",
  "live_positions",
  "achievement_awards",
  "profile_climbed_cols",
  "profile_completed_segments",
  "notification_preferences",
  "push_subscriptions",
  "calendar_feed_tokens",
  "team_members",
  "posts",
  "post_comments",
  "post_likes",
  "nutrition_profiles",
  "nutrition_recipe_prefs",
  "nutrition_log_settings",
  "nutrition_log_meals",
  "nutrition_log_ai_usage",
  "member_protocols",
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Niet ingelogd." }, { status: 401 });
  }

  const admin = createAdminClient();
  const data: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
  };

  // Profiel zelf.
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  data.profile = profile ?? null;

  // Koppelingen: alleen niet-gevoelige metadata (geen tokens/keys).
  const { data: intervals } = await admin
    .from("intervals_connections")
    .select("profile_id, athlete_id, athlete_name, wellness_opt_in, updated_at")
    .eq("profile_id", user.id)
    .maybeSingle();
  data.intervals_connection = intervals ?? null;

  const { data: strava } = await admin
    .from("strava_connections")
    .select("profile_id, strava_athlete_id, athlete_username, athlete_name, scope, updated_at")
    .eq("profile_id", user.id)
    .maybeSingle();
  data.strava_connection = strava ?? null;

  // Overige tabellen met profile_id (best-effort; sla missende tabellen over).
  for (const table of PROFILE_TABLES) {
    try {
      const { data: rows, error } = await admin
        .from(table)
        .select("*")
        .eq("profile_id", user.id);
      if (!error) data[table] = rows ?? [];
    } catch {
      // tabel bestaat (nog) niet of heeft geen profile_id → overslaan
    }
  }

  // Wat er in elke maaltijd van het eetdagboek zat; die regels hebben zelf geen
  // profile_id.
  const meals = (data.nutrition_log_meals ?? []) as { id: string }[];
  if (meals.length > 0) {
    const { data: items, error } = await admin
      .from("nutrition_log_items")
      .select("*")
      .in(
        "meal_id",
        meals.map((meal) => meal.id),
      );
    if (!error) data.nutrition_log_items = items ?? [];
  }

  // Afvinken en CORE-metingen per protocol; die rijen hebben geen profile_id.
  const protocols = (data.member_protocols ?? []) as { id: string }[];
  if (protocols.length > 0) {
    const ids = protocols.map((protocol) => protocol.id);
    for (const table of ["member_protocol_checks", "member_protocol_core_sessions"]) {
      const { data: rows, error } = await admin.from(table).select("*").in("protocol_id", ids);
      if (!error) data[table] = rows ?? [];
    }
  }

  const body = JSON.stringify(data, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="zwb-mijn-gegevens.json"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
