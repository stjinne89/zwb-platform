import { ImageResponse } from "next/og";
import { getClub } from "@/lib/club";
import { DEFAULT_PALETTE } from "@/lib/club-theme";
import { ICON_VARIANTS, isIconFile } from "@/lib/club-icons";

// App-iconen, favicons en de deelkaart uit het beeldmerk van de club (0315).
// Zonder beeldmerk een redirect naar het vaste ZWB-bestand in public/, alleen
// bij ZWB (0322); bij een andere club een 404. De
// bestandsnaam eindigt op .png, zodat de middleware deze route overslaat (geen
// sessie nodig: browsers en WhatsApp halen dit zonder cookie op).

export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!isIconFile(file)) return new Response("Niet gevonden", { status: 404 });
  const variant = ICON_VARIANTS[file];

  const { settings } = await getClub();
  if (!settings.markUrl) {
    if (!settings.staticBrand) return new Response("Niet gevonden", { status: 404 });
    return Response.redirect(new URL(variant.source, request.url), 307);
  }

  const [width, height] = variant.size;
  const box = Math.round(Math.min(width, height) * (1 - variant.padding * 2));
  const background = (settings.palette ?? DEFAULT_PALETTE).primary;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori kent alleen <img> */}
        <img src={settings.markUrl} width={box} height={box} style={{ objectFit: "contain" }} alt="" />
      </div>
    ),
    {
      width,
      height,
      headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" },
    },
  );
}
