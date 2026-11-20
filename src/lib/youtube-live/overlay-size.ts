// De resolutie van de OBS-overlay per stream (0348, 2026-11-20). Leden
// streamen op een ander OBS-canvas (Basisresolutie); de overlay is ontworpen op
// 1920×1080 en schaalt naar het gekozen formaat, net als de plek van het
// Zwift-beeld. Alleen 16:9. Puur, voor de tests en /hulp.

export type OverlaySize = "1280x720" | "1600x900" | "1920x1080" | "2560x1440" | "3840x2160";

export const OVERLAY_SIZES: readonly { key: OverlaySize; width: number; height: number; label: string }[] = [
  { key: "1280x720", width: 1280, height: 720, label: "1280×720" },
  { key: "1600x900", width: 1600, height: 900, label: "1600×900" },
  { key: "1920x1080", width: 1920, height: 1080, label: "1920×1080" },
  { key: "2560x1440", width: 2560, height: 1440, label: "2560×1440" },
  { key: "3840x2160", width: 3840, height: 2160, label: "3840×2160" },
];

export const DEFAULT_OVERLAY_SIZE: OverlaySize = "1920x1080";

export function overlaySize(value: unknown): OverlaySize {
  return OVERLAY_SIZES.some((s) => s.key === value) ? (value as OverlaySize) : DEFAULT_OVERLAY_SIZE;
}

/** Hoeveel de overlay van 1920 breed vergroot of verkleint. */
export function overlayScale(size: OverlaySize): number {
  const found = OVERLAY_SIZES.find((s) => s.key === size) ?? OVERLAY_SIZES[2];
  return found.width / 1920;
}

/** Het ontwerp: het Zwift-beeld op 384, 216, 1536×864 bij 1920×1080. */
const WINDOW = { x: 384, y: 216, width: 1536, height: 864 } as const;

/** Waar het Zwift-beeld in OBS staat bij dit formaat. */
export function zwiftWindowFor(size: OverlaySize): { x: number; y: number; width: number; height: number } {
  const k = overlayScale(size);
  return {
    x: Math.round(WINDOW.x * k),
    y: Math.round(WINDOW.y * k),
    width: Math.round(WINDOW.width * k),
    height: Math.round(WINDOW.height * k),
  };
}
