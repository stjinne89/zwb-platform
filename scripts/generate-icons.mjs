// Genereer PWA-/app-icons uit het echte ZWB-logo (public/zwb-logo.png).
// Het logo (breed wordmerk) wordt met behoud van verhouding gecentreerd op een
// vierkant wit vlak gezet — zo blijft het herkenbaar en onvervormd, en de
// donkere "B" + petrol-vlakken blijven leesbaar (logo is voor lichte achtergrond).
// Run met: npm run generate-icons

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const logoPath = join(publicDir, "zwb-logo.png");

const BG = { r: 255, g: 255, b: 255, alpha: 1 };

async function renderIcon(srcBuffer, size, paddingRatio) {
  const inset = Math.round(size * paddingRatio);
  const inner = size - inset * 2;
  const logo = await sharp(srcBuffer)
    .resize(inner, inner, { fit: "inside" })
    .png()
    .toBuffer();
  const meta = await sharp(logo).metadata();
  const left = Math.round((size - (meta.width ?? inner)) / 2);
  const top = Math.round((size - (meta.height ?? inner)) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, top, left }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  const logo = await readFile(logoPath);

  const targets = [
    { name: "icon-192.png", size: 192, pad: 0.1 },
    { name: "icon-512.png", size: 512, pad: 0.1 },
    { name: "icon-192-maskable.png", size: 192, pad: 0.2 },
    { name: "icon-512-maskable.png", size: 512, pad: 0.2 },
    { name: "apple-touch-icon.png", size: 180, pad: 0.1 },
    { name: "favicon-32.png", size: 32, pad: 0.06 },
    { name: "favicon-16.png", size: 16, pad: 0.04 },
  ];

  for (const t of targets) {
    const buf = await renderIcon(logo, t.size, t.pad);
    await writeFile(join(publicDir, t.name), buf);
    console.log(`✓ ${t.name} (${t.size}x${t.size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
