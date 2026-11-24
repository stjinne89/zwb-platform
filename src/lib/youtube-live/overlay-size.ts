// De maat van de OBS-overlay per stream (0348, 0350, 0359). Het lid kiest de
// grootte van het Zwift-beeld; het canvas volgt daaruit, zodat het Zwift-beeld
// in OBS op 100% staat en het lid alleen de positie hoeft te zetten.
// Opgeslagen wordt het canvas (`overlay_size`). Het canvas is altijd 16:9 en
// de overlay is ontworpen op 1920×1080; hij schaalt naar het canvas.
//
// - Kader (16:9-Zwift): het Zwift-beeld is 80% van het canvas, met de balk
//   links en boven eromheen.
// - Ultrawide (21:9-Zwift, 0359): het Zwift-beeld vult de volle breedte, met
//   een balk boven en een balk onder. Zo zien kijkers geen zwarte randen en
//   valt er niets van het beeld weg.
//
// Puur, voor de tests en /hulp.

export type OverlaySize =
  | "1600x900"
  | "1920x1080"
  | "2400x1350"
  | "3200x1800"
  | "4800x2700"
  | "2560x1440"
  | "3440x1935";

export type OverlayLayout = "frame" | "wide";

type Size = {
  key: OverlaySize;
  layout: OverlayLayout;
  width: number;
  height: number;
  zwift: { x: number; y: number; width: number; height: number };
  label: string;
};

const frame = (zw: number, zh: number): Size => {
  const width = (zw * 5) / 4;
  const height = (zh * 5) / 4;
  return {
    key: `${width}x${height}` as OverlaySize,
    layout: "frame",
    width,
    height,
    zwift: { x: width - zw, y: height - zh, width: zw, height: zh },
    label: `Zwift ${zw}×${zh} · canvas ${width}×${height}`,
  };
};

/** Ultrawide: een 16:9-canvas zo breed als Zwift; `top` is de hoogte van de balk boven. */
const wide = (zw: number, zh: number, top: number): Size => {
  const height = (zw * 9) / 16;
  return {
    key: `${zw}x${height}` as OverlaySize,
    layout: "wide",
    width: zw,
    height,
    zwift: { x: 0, y: top, width: zw, height: zh },
    label: `Zwift ${zw}×${zh} ultrawide · canvas ${zw}×${height}`,
  };
};

/** Per grootte van het Zwift-beeld; 1536×864 (canvas 1920×1080) is het ontwerp en de standaard. */
export const OVERLAY_SIZES: readonly Size[] = [
  frame(1280, 720),
  frame(1536, 864),
  frame(1920, 1080),
  frame(2560, 1440),
  frame(3840, 2160),
  wide(2560, 1080, 200),
  wide(3440, 1440, 270),
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

/** Waar het Zwift-beeld in OBS staat, op 100%, in pixels van het canvas. */
export function zwiftWindowFor(key: OverlaySize): { x: number; y: number; width: number; height: number } {
  return { ...find(key).zwift };
}

export function overlayLayout(key: OverlaySize): OverlayLayout {
  return find(key).layout;
}

/**
 * Het gat voor Zwift in de maat van het ontwerp (1920 breed), voor de CSS van
 * de overlay: bovenkant en hoogte. Bij het kader altijd 216 en 864.
 */
export function overlayHole(key: OverlaySize): { top: number; height: number } {
  const s = find(key);
  const scale = s.width / 1920;
  return { top: s.zwift.y / scale, height: s.zwift.height / scale };
}
