// Een barcode uit een foto lezen, in de browser. Eerst de ingebouwde
// BarcodeDetector (Chrome op Android); waar die ontbreekt of niets vindt, zoals in
// Safari op de iPhone, ZXing. Die bibliotheek wordt pas geladen als hij nodig is.

/** Langste zijde waarop ZXing zoekt; groter maakt het traag zonder dat het helpt. */
const ZXING_MAX_PX = 1600;

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

async function withZxing(bitmap: ImageBitmap): Promise<string | null> {
  const scale = Math.min(1, ZXING_MAX_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const [{ BrowserMultiFormatOneDReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ]);
  const hints = new Map<unknown, unknown>([
    [DecodeHintType.TRY_HARDER, true],
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
  ]);
  try {
    // @ts-expect-error de hints-map is in ZXing getypt op zijn eigen enum.
    return new BrowserMultiFormatOneDReader(hints).decodeFromCanvas(canvas).getText();
  } catch {
    // ZXing gooit een NotFoundException als er geen barcode te lezen is.
    return null;
  }
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
