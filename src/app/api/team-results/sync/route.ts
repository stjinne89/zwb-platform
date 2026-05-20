import { createAdminClient } from "@/lib/supabase/admin";
import { syncTeamResults } from "@/lib/team-results/sync";

export async function POST(request: Request) {
  const expected = process.env.TEAM_RESULTS_SYNC_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const summary = await syncTeamResults(supabase);
    return Response.json(summary, { status: summary.ok ? 200 : 207 });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Onbekende sync-fout.",
      },
      { status: 500 },
    );
  }
}
