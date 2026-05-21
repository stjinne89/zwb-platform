// Genereer PWA-icons in verschillende formaten uit public/icon.svg.
// Run met: npm run generate-icons

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const svgPath = join(publicDir, "icon.svg");

const PETROL = "#1f3a47";

// Voor maskable: we nestelen het origineel in een 1024px canvas met extra
// padding zodat content binnen de "safe zone" valt (inner 80% van de cirkel).
async function renderMaskable(srcBuffer, size) {
  const inset = Math.round(size * 0.15); // 15% padding aan alle kanten
  const inner = size - inset * 2;
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: PETROL,
    },
  })
    .composite([
      {
        input: await sharp(srcBuffer).resize(inner, inner).png().toBuffer(),
        top: inset,
        left: inset,
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  const svg = await readFile(svgPath);

  const targets = [
    { name: "icon-192.png", size: 192, mode: "normal" },
    { name: "icon-512.png", size: 512, mode: "normal" },
    { name: "icon-192-maskable.png", size: 192, mode: "maskable" },
    { name: "icon-512-maskable.png", size: 512, mode: "maskable" },
    { name: "apple-touch-icon.png", size: 180, mode: "normal" },
    { name: "favicon-32.png", size: 32, mode: "normal" },
    { name: "favicon-16.png", size: 16, mode: "normal" },
  ];

  for (const t of targets) {
    let buf;
    if (t.mode === "maskable") {
      buf = await renderMaskable(svg, t.size);
    } else {
      buf = await sharp(svg)
        .resize(t.size, t.size)
        .png({ compressionLevel: 9 })
        .toBuffer();
    }
    await writeFile(join(publicDir, t.name), buf);
    console.log(`✓ ${t.name} (${t.size}x${t.size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
