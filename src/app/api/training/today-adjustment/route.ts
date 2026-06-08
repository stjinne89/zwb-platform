import { NextResponse } from "next/server";
import { startTodayAdjustmentDraft } from "@/lib/training/draft";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Start de achtergrond-AI voor "pas je training van vandaag aan". Polling loopt
// via /api/training/ai-draft/[generationId] (gedeeld met de trainer-flow).
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await startTodayAdjustmentDraft(formData);
    return NextResponse.json(result, { status: result.ok ? 202 : 400 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Aanpassing maken faalde.",
      },
      { status: 500 },
    );
  }
}
