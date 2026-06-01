import { NextResponse } from "next/server";
import { pollAiDraft } from "@/lib/training/draft";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _request: Request,
  context: { params: Promise<{ generationId: string }> },
) {
  try {
    const { generationId } = await context.params;
    const result = await pollAiDraft(generationId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "AI-concept status ophalen faalde.",
      },
      { status: 500 },
    );
  }
}
