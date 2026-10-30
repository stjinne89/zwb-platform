// Genereert de PWA-icons, favicons, de push-badge en de Open Graph-kaart.
//
// App-icons en favicons komen uit het echte ZWB-logo uit de balk
// (public/zwb-logo.png), zonder de regel "Cycling Community" en op een lichte
// tegel: de B is zwart en valt weg op een donker vlak. Het logo vult de
// breedte van de tegel; met de ondertitel erbij bleef er op 192px maar een
// klein logo in een groot wit vlak over.
//
// De push-badge en de OG-kaart houden het beeldmerk (de drie schuine
// parallellogrammen). Android tekent de badge als alfamasker, dus daar telt
// alleen de vorm; de OG-kaart staat op het petrolvlak waar de zwarte B wegvalt.
//
// Run met: npm run generate-icons

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const logoPath = join(publicDir, "zwb-logo.png");
const faviconIcoPath = join(__dirname, "..", "src", "app", "favicon.ico");

// zwb-logo.png is 300x104; rij 0-83 zijn de letters, daaronder de ondertitel.
const LETTERS = { left: 0, top: 0, width: 300, height: 84 };

// Het lichte vlak achter het logo, gelijk aan --tg-paper in de balk.
const PAPER = { r: 0xfb, g: 0xfb, b: 0xf7, alpha: 1 };
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

/** Het volledige beeldmerk zonder achtergrondvlak, voor de OG-kaart. */
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

/**
 * Vierkant icoon: de ZWB-letters gecentreerd op het lichte vlak, `fill` als
 * aandeel van de breedte. Kleine favicons krijgen meer breedte, anders zijn
 * de letters op 16px maar drie pixels hoog.
 */
async function renderIcon(size, fill) {
  const width = Math.round(size * fill);
  const letters = await sharp(logoPath)
    .extract(LETTERS)
    .resize({ width, kernel: "lanczos3" })
    .png()
    .toBuffer();
  const meta = await sharp(letters).metadata();
  return sharp({
    create: { width: size, height: size, channels: 4, background: PAPER },
  })
    .composite([
      {
        input: letters,
        top: Math.round((size - (meta.height ?? 0)) / 2),
        left: Math.round((size - (meta.width ?? width)) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * ICO met PNG-frames (Vista+), zodat /favicon.ico hetzelfde logo toont als de
 * PNG-favicons. sharp schrijft zelf geen ICO.
 */
function toIco(frames) {
  const header = Buffer.alloc(6 + 16 * frames.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach(({ size, png }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...frames.map((f) => f.png)]);
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
  // Maskable: Android snijdt tot een cirkel van ~80%. Een logo van 66% breed
  // en 18% hoog blijft daar met zijn hoeken binnen.
  const squares = [
    { name: "icon-192.png", size: 192, fill: 0.8 },
    { name: "icon-512.png", size: 512, fill: 0.8 },
    { name: "icon-192-maskable.png", size: 192, fill: 0.66 },
    { name: "icon-512-maskable.png", size: 512, fill: 0.66 },
    { name: "apple-touch-icon.png", size: 180, fill: 0.8 },
    { name: "favicon-32.png", size: 32, fill: 0.94 },
    { name: "favicon-16.png", size: 16, fill: 1 },
  ];
  for (const t of squares) {
    await writeFile(join(publicDir, t.name), await renderIcon(t.size, t.fill));
    console.log(`✓ ${t.name} (${t.size}x${t.size})`);
  }

  const icoFrames = [];
  for (const [size, fill] of [
    [16, 1],
    [32, 0.94],
    [48, 0.9],
    [256, 0.8],
  ]) {
    icoFrames.push({ size, png: await renderIcon(size, fill) });
  }
  await writeFile(faviconIcoPath, toIco(icoFrames));
  console.log("✓ src/app/favicon.ico (16/32/48/256)");

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
