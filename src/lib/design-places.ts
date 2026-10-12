// De vijf plekken van het design "tegels" en welke routes eronder vallen.
// Los van React, zodat de indeling te testen is.

export type PlaceId = "vandaag" | "kalender" | "zwbeter" | "club" | "meer";

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
    prefixes: ["/kalender", "/events", "/samen-fietsen", "/live", "/verjaardagen", "/ritverslagen"],
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
      "/achievements",
      "/stats",
      "/profiel/segments",
      "/profiel/cols",
      "/zwblokken",
      "/zwbgame",
      "/omnium",
      "/src",
      "/polls",
      "/programmas",
    ],
  },
  {
    id: "meer",
    label: "Meer",
    href: "/meer",
    prefixes: [
      "/meer",
      "/profiel",
      "/mijn-garage",
      "/hulp",
      "/sponsors",
      "/beheer",
      "/community",
      "/media",
      "/materiaal",
    ],
  },
];

/** De plek waar dit pad onder valt; onbekende paden vallen onder Vandaag. */
export function placeForPath(pathname: string): PlaceId {
  let best: { id: PlaceId; length: number } | null = null;
  for (const place of PLACES) {
    for (const prefix of place.prefixes) {
      if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) continue;
      if (!best || prefix.length > best.length) best = { id: place.id, length: prefix.length };
    }
  }
  return best?.id ?? "vandaag";
}
