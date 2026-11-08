// Zet de WASM-bestanden van @mediapipe/tasks-vision in public/, zodat de
// houdingmeting ze van ZWB zelf laadt en niet van jsDelivr (2026-11-08).
//
// De map heet naar de pakketversie, zodat een browser een bestand mag blijven
// bewaren: bij een nieuwe versie verandert het pad. De bestanden komen uit
// node_modules en staan niet in git (.gitignore). Draait vóór `dev` en `build`.

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pakket = join(root, "node_modules", "@mediapipe", "tasks-vision");
const { version } = JSON.parse(readFileSync(join(pakket, "package.json"), "utf8"));
const doel = join(root, "public", "mediapipe", version);

// FilesetResolver kiest zelf tussen de SIMD- en de nosimd-variant.
const bestanden = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

mkdirSync(doel, { recursive: true });
for (const naam of bestanden) {
  const bron = join(pakket, "wasm", naam);
  if (!existsSync(bron)) throw new Error(`MediaPipe-bestand ontbreekt: ${bron}`);
  copyFileSync(bron, join(doel, naam));
}
console.log(`MediaPipe ${version}: ${bestanden.length} bestanden naar public/mediapipe/${version}`);
