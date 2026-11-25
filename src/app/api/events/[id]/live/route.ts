import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/request";
import { loadLadderLive } from "@/lib/club-ladder/live-load";

// Live stand van een ladderrace voor de pagina /events/[id]/live, die hier elke
// 15 s opnieuw vraagt. De Zwift-kant is 15 s gecachet per Zwift-event, dus het
// aantal kijkers maakt voor Zwift niet uit.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getRequestUser())) return NextResponse.json({ status: "not-found" }, { status: 401 });
  const { id } = await params;
  const outcome = await loadLadderLive(id);
  return NextResponse.json(outcome, {
    status: outcome.status === "not-found" ? 404 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
