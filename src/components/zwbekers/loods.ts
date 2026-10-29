// Kleine aanvullingen op de galerij van ZWBriljant (briljant/gallery.ts) voor de
// prijzenkast.

import * as THREE from "three";

/**
 * De lichtvlek van een spot op de wand, die naar alle kanten wegloopt.
 * `wash` uit gallery.ts loopt aan de bovenkant niet helemaal uit; in ZWBriljant
 * valt die rand buiten beeld, maar een telefoon kijkt in de kast hoger de wand
 * op en zag hem als harde streep. Het vlak staat rechtop en kijkt naar +z; het
 * felste licht zit op een derde van boven.
 */
export function softWash(width: number, height: number, opacity: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;
  context.translate(64, 96);
  context.scale(1, 2.4);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 62);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,.5)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  // Alleen binnen de ovaal; daarbuiten blijft het doek leeg.
  context.beginPath();
  context.arc(0, 0, 62, 0, Math.PI * 2);
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, color: 0xffe9c8, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
}
