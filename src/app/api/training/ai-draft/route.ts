import { NextResponse } from "next/server";
import { generateAiDraft } from "@/app/(app)/training/_actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await generateAiDraft(formData);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
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
