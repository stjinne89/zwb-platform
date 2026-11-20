# Lettertypes

Alle lettertypes van de app staan hier als bestand en worden geladen met
`next/font/local`. Tot 2026-11-09 kwamen ze via `next/font/google`, waarbij de
build ze bij elke deploy bij Google Fonts ophaalde; als Google even haperde,
faalde de Netlify-build (Module not found
`@vercel/turbopack-next/internal/font/google/font`).

De bestanden zijn op 2026-11-09 van Google Fonts gehaald (css2-API, alleen de
subset `latin`, zoals voorheen ingesteld). Variabele lettertypes staan er als
één bestand met het gewichtsbereik in de naam. Alle lettertypes vallen onder de
SIL Open Font License 1.1 (Geist en Geist Mono: Vercel; de rest: zie
fonts.google.com), die meeleveren in een app toestaat.

| Bestand | Gebruikt in |
| --- | --- |
| `geist-*`, `geist-mono-*` | `src/app/layout.tsx` (hele app) |
| `barlow-semi-condensed-*` | `src/components/tegels/font.ts` |
| `cormorant-garamond-*`, `jost-*` | `src/components/briljant/fonts.ts` (ZWBriljant, ZWBekers) |
| `alfa-slab-one-*`, `cabin-sketch-*`, `kalam-*`, `courier-prime-*` | `src/components/bokaal/fonts.ts` |
| `big-shoulders-stencil-*` (assen wght en opsz), `karla-*` | `src/components/weekoverzicht/fonts.ts` |
| `shantell-sans-*` (assen wght, BNCE en INFM) | `src/components/spiekbriefje/paper.tsx`, `src/components/livestream/fonts.ts` (overlaystijl Strip) |

`og/` bevat ttf-bestanden voor de thumbnail van een stream
(`src/lib/youtube-live/thumbnail.tsx`): Satori leest geen woff2 en geen
variabele assen. De clubletters (`archivo`, `barlow`, `inter`, `schibsted`,
400 en 500) en, sinds 2026-11-20, de letters van de streamstijlen: `stencil-900`
(Big Shoulders Stencil, opsz 72) en `karla-500`/`-800` voor Zeefdruk,
`shantell-500`/`-700` voor Strip. Ook van de css2-API, subset `latin`.

Een nieuw lettertype: haal de woff2 van de subset `latin` op en zet hem hier,
in plaats van `next/font/google` te gebruiken.
