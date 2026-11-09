import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { IosViewportHerstel } from "@/components/ios-viewport-herstel";
import { getClub } from "@/lib/club";
import { clubStyleCss, themeColors } from "@/lib/club-theme";
import { clubIconUrl } from "@/lib/club-icons";
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
// beeldmerk de vaste ZWB-bestanden op hun oude adres. Naam en omschrijving
// komen uit de clubinstellingen (fase 3).
export async function generateMetadata(): Promise<Metadata> {
  const { settings, texts } = await getClub();
  const mark = settings.markUrl;
  const title = `${texts.name} Platform`;
  const description = clubDescription(texts);
  const icon = (file: Parameters<typeof clubIconUrl>[1]) =>
    clubIconUrl(mark, file);
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
        { url: icon("favicon-32.png"), sizes: "32x32", type: "image/png" },
        { url: icon("favicon-16.png"), sizes: "16x16", type: "image/png" },
        { url: icon("icon-192.png"), sizes: "192x192", type: "image/png" },
        { url: icon("icon-512.png"), sizes: "512x512", type: "image/png" },
      ],
      apple: [
        {
          url: icon("apple-touch-icon.png"),
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    // Zonder deze blokken heeft een gedeelde link geen og:image en pakt WhatsApp
    // zelf maar een favicon — dat was het blokkerige logo.
    openGraph: {
      type: "website",
      siteName: texts.name,
      locale: "nl_NL",
      title,
      description,
      images: [
        {
          url: icon("og.png"),
          width: 1200,
          height: 630,
          alt: clubCommunity(texts),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [icon("og.png")],
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
