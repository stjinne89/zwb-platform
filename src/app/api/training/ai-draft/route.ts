import { NextResponse } from "next/server";
import { generateAiDraftFromForm } from "@/lib/training/draft";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await generateAiDraftFromForm(formData);
    return NextResponse.json(result, { status: result.ok ? 202 : 400 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "AI-concept maken faalde.",
      },
      { status: 500 },
    );
  }
}
