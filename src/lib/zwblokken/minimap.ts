// Los van zwift.ts, dat heel zwift-data binnenhaalt: dit draait in de browser.

/**
 * De SVG-`transform` die de minimap binnen een eenheidsvierkant (viewBox
 * 0 0 1 1) noord-boven legt. Tegen de klok in is in SVG een negatieve hoek:
 * wat rechts lag, komt boven. Puur, voor de test.
 */
export function minimapTransform(rotation: number): string | null {
  return rotation ? `rotate(${-rotation} 0.5 0.5)` : null;
}
