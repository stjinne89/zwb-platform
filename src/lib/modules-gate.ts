import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isModuleCron, moduleForPath, resolveDisabled, type ModuleKey } from "@/lib/modules";

// De poort in de middleware voor modules die bij deze club uit staan (0313,
// docs/multi-club-ontwerp.md). Een pagina van zo'n module geeft de gewone 404,
// een API-route een 404 in JSON, en een cron-route een 200 die niets doet: een
// club die een module uitzet, hoeft dan niet ook de cronjob weg te halen.
//
// Dit is productinrichting, geen beveiliging: de rechten op data blijven in RLS
// en in de server-actions. Daarom faalt de poort open: lukt het lezen niet (de
// tabel bestaat nog niet, het netwerk hapert), dan staat alles aan.

// Kort onthouden binnen een warme instantie, zodat niet elke request een vraag
// kost. Next waarschuwt dat de middleware niet op globale staat mag rekenen;
// daarom alleen als versnelling: na een wijziging hooguit een minuut oud.
const TTL_MS = 60_000;
let cached: { at: number; disabled: Set<ModuleKey> } | null = null;

async function loadDisabled(supabase: SupabaseClient): Promise<Set<ModuleKey>> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.disabled;
  try {
    const { data, error } = await supabase
      .from("club_modules")
      .select("module_key")
      .eq("enabled", false);
    if (error) throw error;
    const disabled = resolveDisabled((data ?? []).map((row) => row.module_key as string));
    cached = { at: now, disabled };
    return disabled;
  } catch {
    // Niet onthouden: bij de volgende request opnieuw proberen.
    return new Set();
  }
}

/** Voor de tests: de onthouden stand vergeten. */
export function resetModuleGateCache() {
  cached = null;
}

/**
 * Een antwoord als het pad bij een uitgeschakelde module hoort, anders null.
 * Kernpaden kosten geen databasevraag.
 */
export async function moduleGateResponse(
  request: NextRequest,
  supabase: SupabaseClient,
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;
  const key = moduleForPath(pathname);
  if (key === null) return null;

  const disabled = await loadDisabled(supabase);
  if (!disabled.has(key)) return null;

  if (isModuleCron(key, pathname)) {
    return NextResponse.json({ ok: true, skipped: "module staat uit", module: key });
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  // Een pad dat niet bestaat: Next toont dan de eigen 404-pagina met status 404.
  const url = request.nextUrl.clone();
  url.pathname = "/_module-uit";
  url.search = "";
  return NextResponse.rewrite(url);
}
