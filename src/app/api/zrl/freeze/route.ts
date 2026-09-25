import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCronSecret } from "@/lib/cron/auth";
import { loadZrlLive } from "@/lib/zrl-live/snapshot";
import { RACE_OVER_AFTER_MS } from "@/lib/zrl-live/team-result";

// Bevriest de teamuitslag van gereden ZRL-races (migr. 0188), ook als niemand de
// live stand opent. Cron-job.org, elke 15 min, bearer ZRL_FREEZE_SECRET.
//
// Eén teamevent tegelijk: zeven Zwift-berekeningen parallel knijpt Zwift het
// serviceaccount af (PLAN.md, 2026-09-22). Wat niet in het tijdsbudget past, of
// nog niet compleet is, komt de volgende run aan de beurt. Het antwoord noemt per
// event wat er gebeurde, zodat de job-historie laat zien waarom iets wacht.
//
// Is de uitslag al vóór de 90 minuten vastgezet met de knop op de live pagina,
// dan rekent deze cron hem daarna nog één keer na: wie te vroeg klikte (renners
// nog onderweg), wordt zo vanzelf rechtgezet.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Zo lang na de start blijven we het proberen. Na het vaste venster verandert de
 * Zwift-data niet meer, dus wat na een dag nog niet compleet is, wordt het ook
 * niet; dan kost elke run alleen Zwift-aanroepen. Daarna blijft de knop.
 */
const LOOKBACK_MS = 24 * 60 * 60 * 1000;
/** Ruim onder de functielimiet: één nieuw Zwift-event kost ongeveer acht seconden. */
const BUDGET_MS = 18 * 1000;

export async function POST(request: NextRequest) {
  const auth = checkCronSecret(request, "ZRL_FREEZE_SECRET");
  if (!auth.ok) return new NextResponse(auth.message, { status: 403 });

  const startedAt = Date.now();
  const admin = createAdminClient();
  const { data: events, error } = await admin
    .from("events")
    .select("id, title, start_at")
    .eq("type", "zrl")
    .not("team_id", "is", null)
    .not("zwift_event_id", "is", null)
    .gte("start_at", new Date(startedAt - LOOKBACK_MS).toISOString())
    .lte("start_at", new Date(startedAt - RACE_OVER_AFTER_MS).toISOString())
    // Nieuwste eerst: een race die blijft haperen, houdt de race van vanavond niet op.
    .order("start_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const ids = (events ?? []).map((event) => event.id as string);
  const { data: frozen } = ids.length
    ? await admin.from("zrl_team_results").select("event_id, computed_at").in("event_id", ids)
    : { data: [] };
  const startById = new Map((events ?? []).map((event) => [event.id as string, Date.parse(event.start_at as string)]));
  // Klaar is alleen een uitslag van ná de 90 minuten; een eerdere is met de knop gezet.
  const done = new Set(
    (frozen ?? [])
      .filter(
        (row) =>
          Date.parse(row.computed_at as string) >=
          (startById.get(row.event_id as string) ?? Infinity) + RACE_OVER_AFTER_MS,
      )
      .map((row) => row.event_id as string),
  );
  const open = (events ?? []).filter((event) => !done.has(event.id as string));

  const results: Array<{ event: string; status: string }> = [];
  for (const event of open) {
    if (Date.now() - startedAt > BUDGET_MS) {
      results.push({ event: event.title as string, status: "volgende run" });
      continue;
    }
    const outcome = await loadZrlLive(event.id as string);
    results.push({
      event: event.title as string,
      status: outcome.status === "ok" ? (outcome.freeze ?? "onbekend") : outcome.status,
    });
  }

  return NextResponse.json({ ok: true, alreadyFrozen: done.size, results });
}
