// De vier plekken van het design "tegels" en welke routes eronder vallen.
// Profiel, garage en beheer staan in het persoonlijke menu rechtsboven, hulp
// als vraagteken ernaast; die horen bij geen plek.
// Los van React, zodat de indeling te testen is.

export type PlaceId = "vandaag" | "kalender" | "zwbeter" | "club";

export type Place = {
  id: PlaceId;
  label: string;
  href: string;
  /** Routes die bij deze plek horen; de langste passende wint. */
  prefixes: string[];
};

export const PLACES: Place[] = [
  { id: "vandaag", label: "Vandaag", href: "/dashboard", prefixes: ["/dashboard"] },
  {
    id: "kalender",
    label: "Kalender",
    href: "/kalender",
    prefixes: ["/kalender", "/events", "/verjaardagen", "/ritverslagen"],
  },
  { id: "zwbeter", label: "ZWBeter", href: "/zwbeter-worden", prefixes: ["/zwbeter-worden"] },
  {
    id: "club",
    label: "Club",
    href: "/club",
    prefixes: [
      "/club",
      "/leden",
      "/teams",
      "/stats",
      "/profiel/segments",
      "/profiel/cols",
      "/zwblokken",
      "/zwbgame",
      "/omnium",
      "/src",
      "/polls",
      "/programmas",
      // Samen fietsen: met clubgenoten rijden en je tracker koppelen. Geen
      // kalenderding, want het gaat om nu (besluit eigenaar, 2026-10-16).
      "/samen-fietsen",
      "/live",
      // Sponsors: stond in het persoonlijke menu, hoort bij de club (besluit
      // eigenaar, 2026-10-16).
      "/sponsors",
    ],
  },
];

/** De plek waar dit pad onder valt, of null als het bij geen plek hoort. */
export function placeForPath(pathname: string): PlaceId | null {
  let best: { id: PlaceId; length: number } | null = null;
  for (const place of PLACES) {
    for (const prefix of place.prefixes) {
      if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) continue;
      if (!best || prefix.length > best.length) best = { id: place.id, length: prefix.length };
    }
  }
  return best?.id ?? null;
}
