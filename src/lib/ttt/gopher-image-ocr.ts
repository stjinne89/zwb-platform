// Tekstherkenning op het toestel: de afbeelding verlaat de browser niet.
// tesseract.js laadt zijn rekenkern en de Engelse taaldata bij het eerste
// gebruik van jsDelivr; daarna staan ze in de cache van de browser.

import { gopherImageRiders, type OcrWord } from "@/lib/ttt/gopher-image";

// Op 1024 px (de breedte van Create Image) las tesseract 290 als 200 en 4.2 als
// 42. In de browser, in grijstinten: op 2048 px klopten de getallen maar werd
// Stijn "stijin", op 2560 en 3072 px klopte alles (gemeten 2026-10-16, ruim een
// halve seconde per afbeelding).
const TARGET_WIDTH = 3072;

async function prepare(file: Blob) {
  const bitmap = await createImageBitmap(file);
  const scale = bitmap.width < TARGET_WIDTH ? TARGET_WIDTH / bitmap.width : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("De afbeelding is niet te lezen.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const grey = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    pixels[i] = pixels[i + 1] = pixels[i + 2] = grey;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export async function recognizeGopherImage(file: Blob) {
  const canvas = await prepare(file);
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    // Eén blok: in de standaardmodus viel de tabel uiteen en raakte de kopregel zoek.
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: "1",
    });
    const { data } = await worker.recognize(canvas, {}, { blocks: true });
    const lines: OcrWord[][] = (data.blocks ?? []).flatMap((block) =>
      block.paragraphs.flatMap((paragraph) =>
        paragraph.lines.map((line) =>
          line.words.map((word) => ({ text: word.text, x0: word.bbox.x0, x1: word.bbox.x1 })),
        ),
      ),
    );
    return gopherImageRiders(lines, canvas.width);
  } finally {
    await worker.terminate();
  }
}
