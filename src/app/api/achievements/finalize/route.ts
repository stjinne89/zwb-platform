import { createAdminClient } from "@/lib/supabase/admin";
import { awardCompletedAchievementWeeks } from "@/lib/achievements/awards";

export async function POST(request: Request) {
  const expected = process.env.ACHIEVEMENTS_SYNC_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const result = await awardCompletedAchievementWeeks(supabase);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Badges vastleggen faalde.",
      },
      { status: 500 },
    );
  }
}
