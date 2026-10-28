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
  "training_goal_forecasts",
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
  "nutrition_menu_choices",
  "nutrition_log_settings",
  "nutrition_log_meals",
  "nutrition_log_ai_usage",
  "nutrition_sweat_tests",
  "member_zwift_bikes",
  "member_protocols",
  "member_knowledge",
  "member_knowledge_topics",
  "member_tips",
  "weekly_reviews",
  // Q&A: de eigen vragen (profile_id is de vrager) en waar het lid "Ik ook" tikte.
  "member_questions",
  "member_question_askers",
  // ZWBriljant (0265): of je deelt, en je hoogte per week.
  "zwbriljant_preferences",
  "zwbriljant_snapshots",
  // ZWBekers (0286): je voordrachten (profile_id is wie voordroeg), de bekers
  // waar je bij staat en je felicitaties.
  "zwbekers",
  "zwbeker_winners",
  "zwbeker_congrats",
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

  const { data: telegram } = await admin
    .from("telegram_links")
    .select("profile_id, chat_id, linked_at, created_at")
    .eq("profile_id", user.id)
    .maybeSingle();
  data.telegram_link = telegram ?? null;

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

  // ZWBieb: de gesprekken waarin het lid vrager of kenner is, en de
  // berichten die het zelf schreef. Die tabellen hebben geen profile_id.
  {
    const { data: threads, error } = await admin
      .from("knowledge_threads")
      .select("*")
      .or(`asker_id.eq.${user.id},expert_id.eq.${user.id}`);
    if (!error) data.knowledge_threads = threads ?? [];
    const { data: messages, error: messageError } = await admin
      .from("knowledge_messages")
      .select("*")
      .eq("author_id", user.id);
    if (!messageError) data.knowledge_messages = messages ?? [];
  }

  // Q&A: antwoorden die het lid zelf schreef, op vragen van anderen.
  {
    const { data: answers, error } = await admin
      .from("member_questions")
      .select("id, answer, answered_at")
      .eq("answered_by", user.id)
      .neq("profile_id", user.id);
    if (!error) data.member_question_answers = answers ?? [];
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
