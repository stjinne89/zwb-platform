import { getClub } from "@/lib/club";
import { themeColors } from "@/lib/club-theme";

// Het manifest van de app, met de kleuren van de club (0314). Tot 2026-11-09 een
// vast bestand in public/; het adres /manifest.json blijft gelijk, zodat
// geïnstalleerde apps hun manifest blijven vinden. Namen volgen in fase 3 van de
// generieke versie (docs/multi-club-ontwerp.md).

export async function GET() {
  const colors = themeColors((await getClub()).settings.palette);
  const manifest = {
    name: "ZWB Cycling Platform",
    short_name: "ZWB",
    description: "Hub voor ZWB Cycling Community — events, training, teams en chat.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: colors.background,
    theme_color: colors.light,
    lang: "nl",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
