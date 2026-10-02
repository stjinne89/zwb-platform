import { createAdminClient } from "@/lib/supabase/admin";
import { syncInstagramToMedia } from "@/lib/instagram-sync";

// Cron (cron-job.org, elk uur): posts en live stories van @zwb_cycling ophalen.
// Stories bestaan bij Instagram maar 24 uur, dus zonder deze job mist het
// dashboard ze; de run ververst ook de verlopende afbeeldingslinks van de posts.
export async function POST(request: Request) {
  const expected = process.env.INSTAGRAM_SYNC_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncInstagramToMedia(createAdminClient());
    return Response.json(summary, { status: summary.ok ? 200 : 502 });
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
