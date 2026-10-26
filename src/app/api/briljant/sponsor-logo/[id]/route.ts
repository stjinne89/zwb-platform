import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Het logo van een sponsor voor de wand van de ZWBriljant-galerij. De logo's
// staan grotendeels op zwbcycling.nl, dat geen CORS-kop meestuurt; een
// WebGL-textuur van een ander domein mag dan niet. Deze route haalt het logo op
// en geeft het vanaf ons eigen domein door. Alleen het adres uit de tabel
// `sponsors` wordt opgehaald, nooit een adres uit het verzoek.

const MAX_BYTES = 3 * 1024 * 1024;
// Geen SVG: die kan script bevatten en zou vanaf ons eigen domein draaien.
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const TIMEOUT_MS = 6_000;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: sponsor } = await supabase
    .from("sponsors")
    .select("logo_url")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle<{ logo_url: string | null }>();
  const url = sponsor?.logo_url;
  if (!url || !/^https:\/\//i.test(url)) return new NextResponse("Not found", { status: 404 });

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return new NextResponse("Bad gateway", { status: 502 });
  }
  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!response.ok || !IMAGE_TYPES.includes(type)) return new NextResponse("Not found", { status: 404 });
  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return new NextResponse("Too large", { status: 413 });

  return new NextResponse(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
