"use client";

// De ZWBlokken-laag op de kaart.
//
// Duizenden losse <Polygon>'s zouden de browser laten kruipen. In plaats
// daarvan tekenen we per kaarttegel één canvas. Dat kan omdat het blokraster
// (zoom 14) exact het OSM-tegelraster is: een kaarttegel bevat óf een heel
// aantal blokken, óf valt binnen één blok. Het werk per frame is daarmee
// evenredig aan wat je ziet, niet aan hoeveel blokken iemand heeft.

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { BLOCK_ZOOM } from "@/lib/zwblokken/grid";

export type BlockSet = Map<number, Map<number, number>>;

type Props = {
  /** Blokken van de hele club, met het aantal leden dat er geweest is. */
  club: BlockSet;
  /** Blokken van het geselecteerde lid. */
  own: BlockSet;
  /** Hoogste rider_count in de clubset — ijkt de intensiteitsschaal. */
  maxRiders: number;
  /** Hertekenen zodra het thema wisselt (de kleuren komen uit CSS). */
  theme?: string;
};

const TILE_SIZE = 256;

type Palette = {
  club: [number, number, number];
  clubBusy: [number, number, number];
  own: [number, number, number];
};

function readTriplet(name: string, fallback: [number, number, number]) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return fallback;
  }
  return parts as [number, number, number];
}

function readPalette(): Palette {
  return {
    club: readTriplet("--zwblok-club", [127, 149, 144]),
    clubBusy: readTriplet("--zwblok-club-busy", [0, 70, 83]),
    own: readTriplet("--zwblok-own", [184, 135, 61]),
  };
}

function rgba([r, g, b]: [number, number, number], alpha: number) {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Kleur voor een clubblok: van teal (één lid) naar petrol (de hele club).
 * De schaal is logaritmisch omdat de meeste blokken door één of twee leden
 * bereden zijn — lineair zou alles er hetzelfde uitzien.
 *
 * De twee uiteinden liggen dicht bij elkaar in de teal-familie, dus de
 * dekking draagt het verschil in drukte. De ondergrens is bewust niet lager:
 * daaronder verdween een blok waar één lid reed tegen de kaart.
 */
function clubStyle(palette: Palette, riders: number, maxRiders: number) {
  const t =
    maxRiders <= 1 ? 0 : Math.log(riders) / Math.log(Math.max(2, maxRiders));
  const clamped = Math.max(0, Math.min(1, t));
  return rgba(
    mix(palette.club, palette.clubBusy, clamped),
    0.38 + clamped * 0.26,
  );
}

export function BlocksLayer({ club, own, maxRiders, theme }: Props) {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let layer: any = null;

    import("leaflet").then((L) => {
      if (cancelled) return;
      const palette = readPalette();

      const Blocks = L.GridLayer.extend({
        createTile(coords: { x: number; y: number; z: number }) {
          const canvas = document.createElement("canvas");
          canvas.width = TILE_SIZE;
          canvas.height = TILE_SIZE;
          const ctx = canvas.getContext("2d");
          if (!ctx) return canvas;

          if (coords.z >= BLOCK_ZOOM) {
            // Ingezoomd: deze kaarttegel valt binnen één blok. Vul of laat leeg.
            const shift = coords.z - BLOCK_ZOOM;
            const bx = Math.floor(coords.x / 2 ** shift);
            const by = Math.floor(coords.y / 2 ** shift);
            paint(ctx, bx, by, 0, 0, TILE_SIZE);
          } else {
            // Uitgezoomd: deze kaarttegel bevat 2^shift blokken per as.
            const shift = BLOCK_ZOOM - coords.z;
            const count = 2 ** shift;
            const size = TILE_SIZE / count;
            const originX = coords.x * count;
            const originY = coords.y * count;
            // Bij ver uitzoomen wordt een blok kleiner dan een pixel; dan is
            // per-blok tekenen zinloos en zou de lus 4^shift keer draaien.
            if (size < 0.4) return canvas;
            for (let dx = 0; dx < count; dx++) {
              for (let dy = 0; dy < count; dy++) {
                paint(
                  ctx,
                  originX + dx,
                  originY + dy,
                  dx * size,
                  dy * size,
                  size,
                );
              }
            }
          }
          return canvas;
        },
      });

      function paint(
        ctx: CanvasRenderingContext2D,
        bx: number,
        by: number,
        px: number,
        py: number,
        size: number,
      ) {
        // Een blok is óf van jou (goud) óf alleen van de club (teal), nooit
        // allebei gestapeld: goud over teal wordt een vuile kaki-tint waarin
        // je je eigen gebied niet meer herkent.
        if (own.get(bx)?.has(by)) {
          ctx.fillStyle = rgba(palette.own, 0.5);
          ctx.fillRect(px, py, size, size);
          // Randje alleen als het blok groot genoeg is om het te zien.
          if (size >= 8) {
            ctx.strokeStyle = rgba(palette.own, 0.95);
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
          }
          return;
        }

        const riders = club.get(bx)?.get(by);
        if (riders) {
          ctx.fillStyle = clubStyle(palette, riders, maxRiders);
          ctx.fillRect(px, py, size, size);
        }
      }

      // L.GridLayer.extend() geeft geen getypeerde constructor terug.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      layer = new (Blocks as any)({ tileSize: TILE_SIZE, pane: "overlayPane" });
      layer.addTo(map);
    });

    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, club, own, maxRiders, theme]);

  return null;
}
