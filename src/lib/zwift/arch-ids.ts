// Zwifts archId per segment (slug van zwift-data), voor de tag `arch_powerup`.
//
// Sauce for Zwift levert archId live bij getSegments, maar onze export
// (route-segments.json) nam hem niet mee. Tot een nieuwe export staan hier alleen
// de bogen die tegen een bron zijn gecontroleerd: ZRL W6 2026/27 op Spiral
// Summit, Zwift-tag tegen Zwift Insider (2026-10-27). Een segment zonder eigen
// archId krijgt bij Zwift 0; dat staat hier alleen waar het is nagekeken.

export const ARCH_IDS: Record<string, number> = {
  "jarvis-lap": 0,
  "jarvis-kom": 81,
  "jarvis-sprint": 82,
  "volcano-kom": 5,
};
