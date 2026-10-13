import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTttShareToken, tttPlanExport } from "@/lib/ttt/plan-export";

// Het TTT-plan als JSON voor de Discord-bot (bot/). Geen sessie: de bot draait
// buiten het platform. Het token in het pad is de sleutel; de captain maakt het
// aan in de planner en kan het daar intrekken.
const HEADERS = { "Cache-Control": "no-store, max-age=0" };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isTttShareToken(token)) {
    return NextResponse.json({ error: "not-found" }, { status: 404, headers: HEADERS });
  }

  const admin = createAdminClient();
  const { data: plan, error } = await admin
    .from("ttt_plans")
    .select("id, name, event_id, api_response")
    .eq("share_token", token)
    .maybeSingle<{ id: string; name: string; event_id: string | null; api_response: unknown }>();
  if (error) {
    return NextResponse.json({ error: "error" }, { status: 502, headers: HEADERS });
  }
  if (!plan) {
    return NextResponse.json({ error: "not-found" }, { status: 404, headers: HEADERS });
  }

  const [{ data: riders }, { data: event }] = await Promise.all([
    admin
      .from("ttt_plan_riders")
      .select("name, zwift_id, pull_watts, pull_duration_seconds, display_order")
      .eq("plan_id", plan.id),
    plan.event_id
      ? admin
          .from("events")
          .select("title, start_at")
          .eq("id", plan.event_id)
          .maybeSingle<{ title: string | null; start_at: string | null }>()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json(tttPlanExport(plan, riders ?? [], event), { headers: HEADERS });
}
