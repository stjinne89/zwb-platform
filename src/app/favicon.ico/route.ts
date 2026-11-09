import { getClub } from "@/lib/club";
import { STATIC_FAVICON } from "@/lib/club-icons";

// Browsers vragen /favicon.ico zelf op, ook zonder link in de pagina. Tot 0322
// stond hier het ZWB-bestand voor iedereen; nu alleen bij ZWB, en een club met
// een beeldmerk krijgt het gegenereerde icoon. Anders niets.

// Per club anders, dus niet bij de build vastleggen.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { settings } = await getClub();
  const target = settings.markUrl
    ? "/club-icon/favicon-32.png"
    : settings.staticBrand
      ? STATIC_FAVICON
      : null;
  if (!target) return new Response(null, { status: 404 });
  return Response.redirect(new URL(target, request.url), 307);
}
