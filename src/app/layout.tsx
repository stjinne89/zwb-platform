import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { IosViewportHerstel } from "@/components/ios-viewport-herstel";
import { getClub } from "@/lib/club";
import { clubStyleCss, themeColors } from "@/lib/club-theme";
import { STATIC_FAVICON, clubIconUrl, type IconFile } from "@/lib/club-icons";
import { clubCommunity, clubDescription } from "@/lib/club-texts";
import { ClubTextsProvider } from "@/components/club-texts-provider";

// De lettertypes staan in src/fonts, zodat de build niet van Google Fonts
// afhangt (zie de README daar).
const geistSans = localFont({
  variable: "--font-geist-sans",
  src: "../fonts/geist-100-900.woff2",
  weight: "100 900",
});

const geistMono = localFont({
  variable: "--font-geist-mono",
  src: "../fonts/geist-mono-100-900.woff2",
  weight: "100 900",
});

// De iconen en de deelkaart volgen het beeldmerk van de club (0315); zonder
// beeldmerk de vaste ZWB-bestanden op hun oude adres, maar alleen bij ZWB
// (0322). Een andere club zonder beeldmerk heeft geen iconen. Naam en
// omschrijving komen uit de clubinstellingen (fase 3).
export async function generateMetadata(): Promise<Metadata> {
  const { settings, texts } = await getClub();
  const title = `${texts.name} Platform`;
  const description = clubDescription(texts);
  const icon = (file: IconFile) => clubIconUrl(settings, file);
  const png = (file: IconFile, sizes: string) => {
    const url = icon(file);
    return url ? [{ url, sizes, type: "image/png" }] : [];
  };
  const og = icon("og.png");
  return {
    // Zorgt dat relatieve OG-images (zoals /icon-512.png op /live/[id])
    // door scrapers als WhatsApp/Discord als absolute URLs kunnen worden
    // opgehaald. Fallback naar de Netlify-deploy als de env-var ontbreekt.
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://zwb-platform.netlify.app",
    ),
    title,
    description,
    applicationName: texts.shortName,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      title: texts.shortName,
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [
        // Tot 0322 de favicon.ico van de app-map; nu een vast bestand, alleen bij ZWB.
        ...(settings.staticBrand && !settings.markUrl
          ? [{ url: STATIC_FAVICON, sizes: "256x256", type: "image/x-icon" }]
          : []),
        ...png("favicon-32.png", "32x32"),
        ...png("favicon-16.png", "16x16"),
        ...png("icon-192.png", "192x192"),
        ...png("icon-512.png", "512x512"),
      ],
      apple: png("apple-touch-icon.png", "180x180"),
    },
    // Zonder deze blokken heeft een gedeelde link geen og:image en pakt WhatsApp
    // zelf maar een favicon — dat was het blokkerige logo.
    openGraph: {
      type: "website",
      siteName: texts.name,
      locale: "nl_NL",
      title,
      description,
      images: og ? [{ url: og, width: 1200, height: 630, alt: clubCommunity(texts) }] : [],
    },
    twitter: {
      card: og ? "summary_large_image" : "summary",
      title,
      description,
      images: og ? [og] : [],
    },
  };
}

// De kleur van de browserbalk volgt de huisstijl van de club (0314).
export async function generateViewport(): Promise<Viewport> {
  const colors = themeColors((await getClub()).settings.palette);
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: colors.light },
      { media: "(prefers-color-scheme: dark)", color: colors.dark },
    ],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Eigen kleuren (0314) en letter (0315) van de club overschrijven de
  // standaard in globals.css; zonder eigen huisstijl geen <style>.
  const { settings, texts } = await getClub();
  const clubCss = clubStyleCss(settings.palette, settings.font);
  return (
    <html
      lang="nl"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {clubCss && (
        <head>
          <style
            id="club-huisstijl"
            dangerouslySetInnerHTML={{ __html: clubCss }}
          />
        </head>
      )}
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClubTextsProvider texts={texts}>{children}</ClubTextsProvider>
        </ThemeProvider>
        <IosViewportHerstel />
      </body>
    </html>
  );
}
