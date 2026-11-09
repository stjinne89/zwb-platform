import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { IosViewportHerstel } from "@/components/ios-viewport-herstel";
import { getClub } from "@/lib/club";
import { clubThemeCss, themeColors } from "@/lib/club-theme";

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

export const metadata: Metadata = {
  // Zorgt dat relatieve OG-images (zoals /icon-512.png op /live/[id])
  // door scrapers als WhatsApp/Discord als absolute URLs kunnen worden
  // opgehaald. Fallback naar de Netlify-deploy als de env-var ontbreekt.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://zwb-platform.netlify.app",
  ),
  title: "ZWB Cycling Platform",
  description: "Hub voor ZWB Cycling Community — events, training, teams en chat.",
  applicationName: "ZWB",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "ZWB",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Zonder deze blokken heeft een gedeelde link geen og:image en pakt WhatsApp
  // zelf maar een favicon — dat was het blokkerige logo.
  openGraph: {
    type: "website",
    siteName: "ZWB Cycling",
    locale: "nl_NL",
    title: "ZWB Cycling Platform",
    description: "Hub voor ZWB Cycling Community — events, training, teams en chat.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "ZWB Cycling Community",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZWB Cycling Platform",
    description: "Hub voor ZWB Cycling Community — events, training, teams en chat.",
    images: ["/og-default.png"],
  },
};

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
  // Eigen kleuren van de club (0314) overschrijven de standaard in globals.css;
  // zonder eigen kleuren geen <style>.
  const palette = (await getClub()).settings.palette;
  return (
    <html
      lang="nl"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {palette && (
        <head>
          <style id="club-huisstijl" dangerouslySetInnerHTML={{ __html: clubThemeCss(palette) }} />
        </head>
      )}
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <IosViewportHerstel />
      </body>
    </html>
  );
}
