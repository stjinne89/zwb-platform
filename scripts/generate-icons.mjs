// Genereert de PWA-icons, de push-badge en de Open Graph-kaart uit het
// ZWB-beeldmerk (public/icon.svg — de drie schuine parallellogrammen).
//
// Waarom niet meer uit het wordmerk: dat is 956x313 en werd op een dekwit
// vierkant geplakt. Op 192px vulde het logo ~26% van de tegel, wat op een
// telefoon een wit vlak met een klein logo oplevert. Erger nog: Android maakt
// van de notificatie-badge een alfamasker, dus een volledig dekkende PNG werd
// een massief wit blok in de statusbalk.
//
// Run met: npm run generate-icons

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const markPath = join(publicDir, "icon.svg");

// De achtergrond van icon.svg, zodat composities naadloos aansluiten.
const BRAND_BG = { r: 0x1f, g: 0x3a, b: 0x47, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * Eén parallellogram uit het beeldmerk, in massief wit op transparant.
 * Android tekent de badge als alfamasker op ~24px: de drie vormen samen zijn
 * dan een streepje van een paar pixels hoog. Eén vorm blijft wél leesbaar.
 */
function badgeSvg(size) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">` +
      `<polygon points="34,8 82,8 66,92 18,92" fill="#ffffff"/>` +
      `</svg>`,
  );
}

/** Het volledige beeldmerk zonder achtergrondvlak, voor composities. */
function markOnlySvg(width) {
  const height = Math.round((width * 192) / 377);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="68 160 377 192">` +
      `<polygon points="93,160 193,160 168,352 68,352" fill="#b89968"/>` +
      `<polygon points="219,160 319,160 294,352 194,352" fill="#5e7c82"/>` +
      `<polygon points="345,160 445,160 420,352 320,352" fill="#0a0a0a"/>` +
      `</svg>`,
  );
}

/** Vierkant icoon: het beeldmerk inclusief eigen achtergrondvlak, opgeschaald. */
async function renderIcon(markBuffer, size) {
  return sharp(markBuffer, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Maskable variant: Android snijdt tot een cirkel van ~80%. Het merk krijgt
 * daarom extra lucht en staat op een egaal merkvlak dat wél tot de rand loopt.
 */
async function renderMaskable(size) {
  const inner = Math.round(size * 0.62);
  const mark = await sharp(markOnlySvg(inner)).png().toBuffer();
  const meta = await sharp(mark).metadata();
  return sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BG },
  })
    .composite([
      {
        input: mark,
        top: Math.round((size - (meta.height ?? inner)) / 2),
        left: Math.round((size - (meta.width ?? inner)) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Liggende Open Graph-kaart voor gedeelde links (WhatsApp, Signal, Slack). */
async function renderOgCard(width, height) {
  const markWidth = Math.round(width * 0.42);
  const mark = await sharp(markOnlySvg(markWidth)).png().toBuffer();
  const markMeta = await sharp(mark).metadata();

  const label = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="120">` +
      `<text x="50%" y="70" text-anchor="middle" fill="#e8e4dc" ` +
      `font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" ` +
      `letter-spacing="10">ZWB CYCLING COMMUNITY</text>` +
      `</svg>`,
  );

  const markTop = Math.round(height * 0.26);
  return sharp({
    create: { width, height, channels: 4, background: BRAND_BG },
  })
    .composite([
      {
        input: mark,
        top: markTop,
        left: Math.round((width - (markMeta.width ?? markWidth)) / 2),
      },
      { input: label, top: markTop + (markMeta.height ?? 0) + 48, left: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  const mark = await readFile(markPath);

  const squares = [
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "favicon-32.png", size: 32 },
    { name: "favicon-16.png", size: 16 },
  ];
  for (const t of squares) {
    await writeFile(join(publicDir, t.name), await renderIcon(mark, t.size));
    console.log(`✓ ${t.name} (${t.size}x${t.size})`);
  }

  for (const size of [192, 512]) {
    const name = `icon-${size}-maskable.png`;
    await writeFile(join(publicDir, name), await renderMaskable(size));
    console.log(`✓ ${name} (${size}x${size})`);
  }

  const badge = await sharp(badgeSvg(96), { density: 384 })
    .resize(96, 96, { fit: "contain", background: TRANSPARENT })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(join(publicDir, "badge-96.png"), badge);
  console.log("✓ badge-96.png (96x96, transparant)");

  await writeFile(join(publicDir, "og-default.png"), await renderOgCard(1200, 630));
  console.log("✓ og-default.png (1200x630)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
