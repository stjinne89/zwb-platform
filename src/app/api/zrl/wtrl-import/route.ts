import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { checkCronSecret } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { wtrlPathKind } from "@/lib/wtrl/import";
import { runWtrlImport, type WtrlPage } from "@/lib/wtrl/run";

// WTRL-import vanaf de pc van de eigenaar (`npm run wtrl`, migr. 0361). Het
// script haalt met de eigen WTRL-sessie op wat dit adres vraagt en stuurt het
// terug; het platform roept WTRL zelf nooit aan. Zie src/lib/wtrl/run.ts.
// Bearer WTRL_IMPORT_SECRET.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** My Teams is zo'n 260 KB; een uitslag of team een paar tientallen. */
const MAX_PAGE_BYTES = 2_000_000;
const MAX_PAGES = 40;

export async function POST(request: NextRequest) {
  const auth = checkCronSecret(request, "WTRL_IMPORT_SECRET");
  if (!auth.ok) return new NextResponse(auth.message, { status: 403 });

  let input: { pages?: unknown; carry?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return NextResponse.json({ ok: false, error: "Geen JSON." }, { status: 400 });
  }
  const raw = Array.isArray(input.pages) ? input.pages : [];
  if (raw.length > MAX_PAGES) return NextResponse.json({ ok: false, error: "Te veel pagina's." }, { status: 400 });
  const pages: WtrlPage[] = [];
  for (const item of raw) {
    const page = item as Partial<WtrlPage>;
    if (typeof page?.path !== "string" || !wtrlPathKind(page.path)) {
      return NextResponse.json({ ok: false, error: "Onbekend WTRL-pad." }, { status: 400 });
    }
    if (typeof page.body !== "string" || page.body.length > MAX_PAGE_BYTES || typeof page.status !== "number") {
      return NextResponse.json({ ok: false, error: `Ongeldige pagina: ${page.path}` }, { status: 400 });
    }
    pages.push({ path: page.path, status: page.status, body: page.body });
  }

  const step = await runWtrlImport(createAdminClient(), pages, input.carry);
  if (pages.length > 0) {
    revalidatePath("/beheer/zrl/teams");
    revalidatePath("/teams", "layout");
  }
  return NextResponse.json({ ok: true, ...step });
}
