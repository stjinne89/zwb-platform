// De maat van de OBS-overlay per stream (0348, 0350, 2026-11-20). Het lid kiest
// de grootte van het Zwift-beeld; het canvas volgt daaruit: het Zwift-beeld
// is altijd 80% van het canvas, met de balk links en boven eromheen. Zo staat
// het Zwift-beeld in OBS op 100% en hoeft het lid alleen de positie te zetten.
// Opgeslagen wordt het canvas (`overlay_size`). De overlay is ontworpen op
// 1920×1080 en schaalt naar het canvas. Alleen 16:9. Puur, voor de tests en
// /hulp.

export type OverlaySize = "1600x900" | "1920x1080" | "2400x1350" | "3200x1800" | "4800x2700";

type Size = { key: OverlaySize; width: number; height: number; zwift: { width: number; height: number }; label: string };

const size = (zw: number, zh: number): Size => {
  const width = (zw * 5) / 4;
  const height = (zh * 5) / 4;
  return {
    key: `${width}x${height}` as OverlaySize,
    width,
    height,
    zwift: { width: zw, height: zh },
    label: `Zwift ${zw}×${zh} · canvas ${width}×${height}`,
  };
};

/** Per grootte van het Zwift-beeld; 1536×864 (canvas 1920×1080) is het ontwerp en de standaard. */
export const OVERLAY_SIZES: readonly Size[] = [
  size(1280, 720),
  size(1536, 864),
  size(1920, 1080),
  size(2560, 1440),
  size(3840, 2160),
];

export const DEFAULT_OVERLAY_SIZE: OverlaySize = "1920x1080";

export function overlaySize(value: unknown): OverlaySize {
  return OVERLAY_SIZES.some((s) => s.key === value) ? (value as OverlaySize) : DEFAULT_OVERLAY_SIZE;
}

function find(key: OverlaySize): Size {
  return OVERLAY_SIZES.find((s) => s.key === key) ?? OVERLAY_SIZES[1];
}

/** Hoeveel de overlay van 1920 breed vergroot of verkleint. */
export function overlayScale(key: OverlaySize): number {
  return find(key).width / 1920;
}

/** Het canvas in OBS (Basisresolutie) bij dit formaat. */
export function canvasFor(key: OverlaySize): { width: number; height: number } {
  const s = find(key);
  return { width: s.width, height: s.height };
}

/** Waar het Zwift-beeld in OBS staat, op 100%: rechtsonder, met een vijfde van het canvas links en boven vrij. */
export function zwiftWindowFor(key: OverlaySize): { x: number; y: number; width: number; height: number } {
  const s = find(key);
  return { x: s.width - s.zwift.width, y: s.height - s.zwift.height, width: s.zwift.width, height: s.zwift.height };
}
