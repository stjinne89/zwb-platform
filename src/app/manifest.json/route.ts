import { getClub } from "@/lib/club";
import { themeColors } from "@/lib/club-theme";
import { clubIconUrl } from "@/lib/club-icons";
import { clubDescription } from "@/lib/club-texts";

// Het manifest van de app, met de kleuren van de club (0314). Tot 2026-11-09 een
// vast bestand in public/; het adres /manifest.json blijft gelijk, zodat
// geïnstalleerde apps hun manifest blijven vinden. Naam en omschrijving komen
// uit de clubinstellingen (fase 3, docs/multi-club-ontwerp.md).

export async function GET() {
  const { settings, texts } = await getClub();
  const colors = themeColors(settings.palette);
  const icon = (file: Parameters<typeof clubIconUrl>[1]) => clubIconUrl(settings.markUrl, file);
  const manifest = {
    name: `${texts.name} Platform`,
    short_name: texts.shortName,
    description: clubDescription(texts),
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: colors.background,
    theme_color: colors.light,
    lang: "nl",
    icons: [
      { src: icon("icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon("icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon("icon-192-maskable.png"), sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: icon("icon-512-maskable.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
