import { getClub } from "@/lib/club";
import { themeColors } from "@/lib/club-theme";
import { clubIconUrl, type IconFile } from "@/lib/club-icons";
import { clubDescription } from "@/lib/club-texts";

// Het manifest van de app, met de kleuren van de club (0314). Tot 2026-11-09 een
// vast bestand in public/; het adres /manifest.json blijft gelijk, zodat
// geïnstalleerde apps hun manifest blijven vinden. Naam en omschrijving komen
// uit de clubinstellingen (fase 3, docs/multi-club-ontwerp.md).

export async function GET() {
  const { settings, texts } = await getClub();
  const colors = themeColors(settings.palette);
  // Zonder beeldmerk (en buiten ZWB, 0322) geen iconen.
  const icon = (file: IconFile, sizes: string, purpose: "any" | "maskable") => {
    const src = clubIconUrl(settings, file);
    return src ? [{ src, sizes, type: "image/png", purpose }] : [];
  };
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
      ...icon("icon-192.png", "192x192", "any"),
      ...icon("icon-512.png", "512x512", "any"),
      ...icon("icon-192-maskable.png", "192x192", "maskable"),
      ...icon("icon-512-maskable.png", "512x512", "maskable"),
    ],
  };
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
