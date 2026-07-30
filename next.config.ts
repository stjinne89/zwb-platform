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

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // De Strava-import (activities.csv / GPX-rit) upload via een Server
      // Action; de standaardlimiet van 1 MB is daarvoor te krap. Let op:
      // Netlify Functions kennen zelf een payload-limiet van ~6 MB.
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // /training heet nu /zwbeter-worden. Permanent, want er staan al verstuurde
  // pushberichten en gedeelde links met de oude URL in omloop.
  async redirects() {
    return [
      { source: "/training", destination: "/zwbeter-worden", permanent: true },
      {
        source: "/training/vermogen",
        destination: "/zwbeter-worden/vermogen",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
