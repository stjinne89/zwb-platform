import type { NextConfig } from "next";

// Origins die de app legitiem nodig heeft (embeds, kaarten, realtime, storage).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : "";

// Content-Security-Policy. Bewust eerst als *Report-Only* uitgerold zodat
// bestaande functionaliteit (Next inline-styles, YouTube/Spotify/Drive-embeds,
// Mapbox-tegels, Supabase-realtime) niet breekt. Na een observatieperiode kan
// dit naar de afdwingende `Content-Security-Policy`-header.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Next.js heeft inline scripts/styles nodig; 'unsafe-inline' tot we nonces inzetten.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' https: wss:${supabaseUrl ? ` ${supabaseUrl} wss://${supabaseHost}` : ""} https://api.mapbox.com https://events.mapbox.com`,
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://open.spotify.com https://docs.google.com https://drive.google.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

// De houdingmeting leest live de camera; alleen daar mag het. Zonder "/"
// vooraan, voor de uitsluiting in de algemene regel.
const CAMERA_PADEN = ["beheer/houding-meetproef", "zwbeter-worden/materiaal/houding"];

function securityHeaders(camera: "()" | "(self)") {
  return [
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: `camera=${camera}, microphone=(), payment=(), usb=(), geolocation=(self)`,
    },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "Content-Security-Policy-Report-Only", value: csp },
  ];
}

const nextConfig: NextConfig = {
  // De wekelijkse app-update leest PLAN.md van de versie die live staat
  // (src/lib/app-updates/auto.ts).
  outputFileTracingIncludes: {
    "/api/app-updates/weekly": ["./PLAN.md"],
  },
  experimental: {
    serverActions: {
      // De Strava-import (activities.csv / GPX-rit) upload via een Server
      // Action; de standaardlimiet van 1 MB is daarvoor te krap. Let op:
      // Netlify Functions kennen zelf een payload-limiet van ~6 MB.
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    // Elk pad krijgt precies één regel: twee regels met dezelfde sleutel kunnen
    // als twee headers aankomen, en dan is niet zeker welke de browser volgt.
    // Daarom sluit de algemene regel de camerapaden uit (2026-11-08).
    return [
      {
        source: `/:path((?!(?:${CAMERA_PADEN.join("|")})$).*)`,
        headers: securityHeaders("()"),
      },
      ...CAMERA_PADEN.map((pad) => ({ source: `/${pad}`, headers: securityHeaders("(self)") })),
    ];
  },
  // /training heet nu /zwbeter-worden. Permanent, want er staan al verstuurde
  // pushberichten en gedeelde links met de oude URL in omloop.
  async redirects() {
    return [
      { source: "/omnium/regels", destination: "/omnium/rules", permanent: true },
      { source: "/omnium/klassement", destination: "/omnium/standings", permanent: true },
      { source: "/omnium/inschrijven", destination: "/omnium/register", permanent: true },
      { source: "/omnium/:editie/uitslag", destination: "/omnium/:editie/results", permanent: true },
      { source: "/omnium/:editie/startlijst", destination: "/omnium/:editie/startlist", permanent: true },
      { source: "/training", destination: "/zwbeter-worden", permanent: true },
      {
        source: "/training/vermogen",
        destination: "/zwbeter-worden/vermogen",
        permanent: true,
      },
      // /onderhoud heet nu /mijn-garage. Ook hier staan er al pushberichten met
      // de oude URL in omloop.
      { source: "/onderhoud", destination: "/mijn-garage", permanent: true },
      // Wie weet wat heet sinds 2026-10-16 ZWBieb; oude links en pushmeldingen.
      { source: "/leden/wie-weet-wat", destination: "/zwbieb", permanent: true },
      // Vraag en Aanbod is uit de app (2026-10-18); het pad is nu ZWBeter materiaal.
      { source: "/materiaal", destination: "/zwbeter-worden/materiaal", permanent: true },
      { source: "/materiaal/:pad*", destination: "/zwbeter-worden/materiaal", permanent: true },
      { source: "/leden/wie-weet-wat/:path*", destination: "/zwbieb/:path*", permanent: true },
      // Achievements is sinds 2026-10-16 een tab onder Stats en heet sinds
      // 2026-10-26 ZWB Rankings; oude links en pushmeldingen. De querystring
      // (?week=vorige) gaat vanzelf mee.
      { source: "/achievements", destination: "/stats/rankings", permanent: true },
      { source: "/stats/achievements", destination: "/stats/rankings", permanent: true },
      // ZRL-kalender en WTRL-teams zijn samen ZRL-beheer (2026-10-13).
      { source: "/beheer/zrl-kalender", destination: "/beheer/zrl", permanent: true },
      { source: "/beheer/wtrl-teams", destination: "/beheer/zrl/teams", permanent: true },
      // Huisstijl en modules zijn stappen van de inrichting (2026-11-09).
      { source: "/beheer/huisstijl", destination: "/beheer/inrichting/huisstijl", permanent: true },
      { source: "/beheer/modules", destination: "/beheer/inrichting/modules", permanent: true },
    ];
  },
};

export default nextConfig;
