// Pure rekenregels voor het herstel van het iOS-beeld na het toetsenbord
// (zie `src/components/ios-viewport-herstel.tsx`).

export const VIEWPORT_MARGE = 4;

export type ViewportMeting = {
  innerHeight: number;
  vvHeight?: number;
  vvOffsetTop?: number;
  vvScale?: number;
};

// Ingezoomd is het zichtbare deel terecht kleiner of verschoven.
function zoomVrij(m: ViewportMeting) {
  return m.vvScale === undefined || m.vvScale < 1.01;
}

/** Hangt het beeld nog, gemeten tegen de grootste hoogte bij deze breedte? */
export function blijftHangen(max: number | undefined, m: ViewportMeting) {
  if (!max) return false;
  if (m.innerHeight < max - VIEWPORT_MARGE) return true;
  if (!zoomVrij(m)) return false;
  if (m.vvHeight !== undefined && m.vvHeight < max - VIEWPORT_MARGE) return true;
  return (m.vvOffsetTop ?? 0) > VIEWPORT_MARGE;
}

/** Hoeveel pixels de onderbalk te hoog staat zolang het beeld hangt. */
export function viewportFout(max: number | undefined, m: ViewportMeting) {
  if (!max) return 0;
  const tekort = max - m.innerHeight;
  if (tekort > VIEWPORT_MARGE) return Math.round(tekort);
  const verschoven = zoomVrij(m) ? (m.vvOffsetTop ?? 0) : 0;
  return verschoven > VIEWPORT_MARGE ? Math.round(verschoven) : 0;
}
