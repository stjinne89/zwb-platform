// Een barcode uit een foto lezen, in de browser. Eerst de ingebouwde
// BarcodeDetector (Chrome op Android); waar die ontbreekt of niets vindt, zoals in
// Safari op de iPhone, ZXing. Die bibliotheek wordt pas geladen als hij nodig is.

/** Langste zijde waarop ZXing zoekt; groter maakt het traag zonder dat het helpt. */
const ZXING_MAX_PX = 1600;

/**
 * Hoeken waaronder ZXing de foto probeert. Een streepjescode leest hij alleen
 * als de strepen ongeveer dwars op een beeldrij staan; ondersteboven en
 * spiegelbeeldig vangt hij zelf af. Zijn eigen draaipoging (TRY_HARDER) werkt
 * niet in @zxing/browser 0.2.1: die gooit "Could not create a Canvas element.".
 */
const ZXING_ANGLES = [0, 90, 45, -45];

type Detector = { detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]> };
type DetectorClass = new (options?: { formats?: string[] }) => Detector;

async function withDetector(bitmap: ImageBitmap): Promise<string | null> {
  if (!("BarcodeDetector" in window)) return null;
  try {
    const Detector = (window as unknown as { BarcodeDetector: DetectorClass }).BarcodeDetector;
    const found = await new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] }).detect(bitmap);
    return found[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

/** De foto verkleind en over `angle` graden gedraaid, op een canvas dat er precies omheen past. */
function drawRotated(bitmap: ImageBitmap, angle: number): HTMLCanvasElement {
  const scale = Math.min(1, ZXING_MAX_PX / Math.max(bitmap.width, bitmap.height));
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  const radians = (angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * cos + height * sin);
  canvas.height = Math.ceil(width * sin + height * cos);
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(radians);
  context.drawImage(bitmap, -width / 2, -height / 2, width, height);
  return canvas;
}

async function withZxing(bitmap: ImageBitmap): Promise<string | null> {
  const [{ BrowserMultiFormatOneDReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ]);
  const hints = new Map<unknown, unknown>([
    [DecodeHintType.TRY_HARDER, true],
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
  ]);
  // @ts-expect-error de hints-map is in ZXing getypt op zijn eigen enum.
  const reader = new BrowserMultiFormatOneDReader(hints);
  for (const angle of ZXING_ANGLES) {
    try {
      return reader.decodeFromCanvas(drawRotated(bitmap, angle)).getText();
    } catch {
      // Niets gevonden onder deze hoek (of ZXings eigen draaipoging faalde): de volgende.
    }
  }
  return null;
}

/** De barcode op de foto, of null als er geen te lezen is. */
export async function readBarcode(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    return (await withDetector(bitmap)) ?? (await withZxing(bitmap));
  } finally {
    bitmap.close();
  }
}
