import { NextResponse } from "next/server";
import { startPlanUpdateDraft } from "@/lib/training/draft";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Start de achtergrond-AI voor "schema bijwerken". Polling loopt via
// /api/training/ai-draft/[generationId] (gedeeld met de andere AI-flows).
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await startPlanUpdateDraft(formData);
    return NextResponse.json(result, { status: result.ok ? 202 : 400 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Schema bijwerken faalde.",
      },
      { status: 500 },
    );
  }
}
