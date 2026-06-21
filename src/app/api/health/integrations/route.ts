// Integratie-health-check-cron — extern getriggerd (Netlify scheduled function
// `integrations-healthcheck`, elk uur) met `Authorization: Bearer
// ${HEALTHCHECK_SECRET}`. Draait lichte probes per externe bron, bewaart de
// status in `integration_health`, en stuurt admins een push zodra een bron van
// ok → faalt gaat. Zie docs/runbook.md.

import { createAdminClient } from "@/lib/supabase/admin";
import { runIntegrationHealthChecks } from "@/lib/health/checks";
import { sendNotificationToMembers } from "@/lib/push/send";

export async function POST(request: Request) {
  const expected = process.env.HEALTHCHECK_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const results = await runIntegrationHealthChecks();

    // Vorige status per bron ophalen om ok → faalt-overgangen te detecteren.
    const previousBySource = new Map<string, boolean>();
    await Promise.all(
      results.map(async (result) => {
        const { data } = await admin
          .from("integration_health")
          .select("ok")
          .eq("source", result.source)
          .order("checked_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) previousBySource.set(result.source, data.ok as boolean);
      }),
    );

    const checkedAt = new Date().toISOString();
    await admin.from("integration_health").insert(
      results.map((result) => ({
        source: result.source,
        ok: result.ok,
        detail: result.detail,
        checked_at: checkedAt,
      })),
    );

    // Nieuw kapot = bron die nu faalt en vorige keer ok was (of nieuw is).
    const newlyFailing = results.filter(
      (result) => !result.ok && (previousBySource.get(result.source) ?? true),
    );

    if (newlyFailing.length > 0) {
      const { data: adminRows } = await admin
        .from("profiles")
        .select("id")
        .eq("is_admin", true);
      const adminIds = (adminRows ?? []).map((row) => row.id as string);
      if (adminIds.length > 0) {
        const sources = newlyFailing.map((r) => r.source).join(", ");
        await sendNotificationToMembers(
          "on_admin_broadcast",
          {
            title: "Integratie faalt",
            body: `Controleer: ${sources}. Zie /beheer.`,
            url: "/beheer",
            tag: "integration-health",
          },
          { profileIds: adminIds },
        ).catch(() => null);
      }
    }

    return Response.json({
      ok: results.every((r) => r.ok),
      checked: results.length,
      newlyFailing: newlyFailing.map((r) => r.source),
      results,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Health-check faalde.",
      },
      { status: 500 },
    );
  }
}

// GET als alias voor handmatig testen.
export const GET = POST;
