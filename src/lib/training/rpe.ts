// RPE tegenover %FTP: één schaal voor de notities bij de blokken (catalog.ts)
// en de verwachte RPE bij de naleving (compliance-breakdown.ts). Dezelfde
// banden als de prompt voorschrijft (workouts.ts). Puur, ook in de browser.

export const RPE_BANDS: Array<{ upTo: number; low: number; high: number; feel: string }> = [
  { upTo: 60, low: 2, high: 3, feel: "heel licht" },
  { upTo: 70, low: 4, high: 4, feel: "rustig, praattempo" },
  { upTo: 80, low: 5, high: 5, feel: "stevig, praten in zinnen" },
  { upTo: 89, low: 6, high: 6, feel: "comfortabel zwaar" },
  { upTo: 104, low: 7, high: 7, feel: "zwaar, korte zinnen" },
  { upTo: 118, low: 8, high: 8, feel: "erg zwaar, enkele woorden" },
  { upTo: 135, low: 9, high: 9, feel: "bijna voluit" },
  { upTo: Infinity, low: 10, high: 10, feel: "voluit" },
];

export function rpeBand(pct: number) {
  return RPE_BANDS.find((band) => pct <= band.upTo) ?? RPE_BANDS[RPE_BANDS.length - 1];
}
