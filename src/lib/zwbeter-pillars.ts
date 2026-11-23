// ZWBeter in het design "tegels": de onderdelen van ZWBeter Worden gegroepeerd
// in zes pijlers, elk met een eigen naam ("ZWBeter trainen", "ZWBeter racen").
// Los van React, zodat de indeling te testen is.

export type PillarId = "trainen" | "racen" | "voeden" | "kracht" | "materiaal" | "coachen";

export type Pillar = {
  id: PillarId;
  /** Het woord achter "ZWBeter". */
  word: string;
  /** De routes van deze pijler; de eerste is de startpagina. */
  hrefs: string[];
};

// De volgorde is die van het gebruik (meting 2026-11-23): op de telefoon zijn de
// eerste twee zichtbaar. Coachen staat op twee, maar alleen trainers zien het.
export const ZWBETER_PILLARS: Pillar[] = [
  {
    id: "trainen",
    word: "trainen",
    hrefs: [
      "/zwbeter-worden",
      "/zwbeter-worden/schema",
      "/zwbeter-worden/jaarplan",
      "/zwbeter-worden/belasting",
      "/zwbeter-worden/vermogen",
      "/zwbeter-worden/doelen",
      "/zwbeter-worden/uitgangspunten",
      "/zwbeter-worden/logboek",
      "/zwbeter-worden/protocollen",
      "/zwbeter-worden/kennis",
      // De AI-coach hoort bij het eigen trainen; coachen is voor trainers.
      "/zwbeter-worden/coach",
    ],
  },
  { id: "coachen", word: "coachen", hrefs: ["/zwbeter-worden/trainer"] },
  { id: "voeden", word: "voeden", hrefs: ["/zwbeter-worden/voeding"] },
  { id: "kracht", word: "kracht", hrefs: ["/zwbeter-worden/core"] },
  // Analyse van gereden ZRL-races (2026-10-15), los van het eigen trainen.
  { id: "racen", word: "racen", hrefs: ["/zwbeter-worden/racen"] },
  // Materiaal en kleine winsten (2026-10-18): kennisbank en rekenaar.
  { id: "materiaal", word: "materiaal", hrefs: ["/zwbeter-worden/materiaal"] },
];

/** De pijler waar dit pad onder valt; alles wat niet past is trainen. */
export function pillarForPath(pathname: string): PillarId {
  let best: { id: PillarId; length: number } | null = null;
  for (const pillar of ZWBETER_PILLARS) {
    for (const href of pillar.hrefs) {
      if (href === "/zwbeter-worden") continue;
      if (pathname !== href && !pathname.startsWith(`${href}/`)) continue;
      if (!best || href.length > best.length) best = { id: pillar.id, length: href.length };
    }
  }
  return best?.id ?? "trainen";
}
