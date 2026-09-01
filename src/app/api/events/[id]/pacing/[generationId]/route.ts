import { NextResponse } from "next/server";
import { pollPacingDraft } from "@/lib/pacing/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; generationId: string }> },
) {
  try {
    const { id, generationId } = await context.params;
    const result = await pollPacingDraft(id, generationId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Status ophalen faalde.",
      },
      { status: 500 },
    );
  }
}
