import { NextResponse } from "next/server";
import { startPacingDraft } from "@/lib/pacing/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      goal?: string;
      targetSeconds?: unknown;
    };
    // Een doeltijd tussen een minuut en een etmaal; al het andere telt niet.
    const target = Number(body.targetSeconds);
    const targetSeconds = Number.isFinite(target) && target >= 60 && target <= 86_400 ? target : null;
    const result = await startPacingDraft(id, body.goal ?? null, targetSeconds);
    return NextResponse.json(result, { status: result.ok ? 202 : 400 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Pacingvoorstel maken faalde.",
      },
      { status: 500 },
    );
  }
}
