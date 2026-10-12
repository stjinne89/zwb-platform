// ZWBeter in het design "tegels": de onderdelen van ZWBeter Worden gegroepeerd
// in vier pijlers, elk met een eigen naam ("ZWBeter trainen", "ZWBeter voeden").
// Los van React, zodat de indeling te testen is.

export type PillarId = "trainen" | "voeden" | "kracht" | "coachen";

export type Pillar = {
  id: PillarId;
  /** Het woord achter "ZWBeter". */
  word: string;
  /** De routes van deze pijler; de eerste is de startpagina. */
  hrefs: string[];
};

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
      "/zwbeter-worden/logboek",
      // De AI-coach hoort bij het eigen trainen; coachen is voor trainers.
      "/zwbeter-worden/coach",
    ],
  },
  { id: "voeden", word: "voeden", hrefs: ["/zwbeter-worden/voeding"] },
  { id: "kracht", word: "kracht", hrefs: ["/zwbeter-worden/core"] },
  { id: "coachen", word: "coachen", hrefs: ["/zwbeter-worden/trainer"] },
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
