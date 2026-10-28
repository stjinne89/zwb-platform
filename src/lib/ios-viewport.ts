// Pure rekenregels voor het herstel van het iOS-beeld na het toetsenbord
// (zie `src/components/ios-viewport-herstel.tsx`).
//
// Alles gaat per toetsenbordbeurt: de maat van het beeld wordt vastgelegd op
// het moment dat een veld de focus krijgt, vóór het toetsenbord opent, en na
// het sluiten wordt elke meting daarmee vergeleken, innerHeight met
// innerHeight en visualViewport met visualViewport. Zonder beurt is er geen
// maat en hangt er dus nooit iets; zo kan scrollen alleen nooit de balk
// verplaatsen.

export const VIEWPORT_MARGE = 4;
// Kleiner dan dit is geen achtergebleven toetsenbord maar een statusbalk,
// safe area of afronding. Daarvoor schuift de balk nooit.
export const MIN_TOETSENBORD = 150;

export type ViewportMeting = {
  breedte: number;
  innerHeight: number;
  vvHeight?: number;
  vvOffsetTop?: number;
  vvScale?: number;
};

export type ToetsenbordBeurt = {
  breedte: number;
  innerHeight: number;
  // Alleen als er bij de start niet was ingezoomd.
  vvHeight?: number;
  vvOffsetTop?: number;
};

// Ingezoomd is het zichtbare deel terecht kleiner of verschoven.
function zoomVrij(m: ViewportMeting) {
  return m.vvScale === undefined || m.vvScale < 1.01;
}

/** Legt de maat vast als een veld de focus krijgt. Een lopende beurt blijft. */
export function startBeurt(huidig: ToetsenbordBeurt | null, m: ViewportMeting): ToetsenbordBeurt {
  if (huidig && huidig.breedte === m.breedte) return huidig;
  const vv = zoomVrij(m) ? { vvHeight: m.vvHeight, vvOffsetTop: m.vvOffsetTop } : {};
  return { breedte: m.breedte, innerHeight: m.innerHeight, ...vv };
}

export type Oordeel = {
  /** De beurt loopt door zolang het beeld hangt; anders `null`. */
  beurt: ToetsenbordBeurt | null;
  /** Is een sprong van de body nodig? */
  hangt: boolean;
  /** Pixels die de onderbalk omlaag moet; 0 als hij gewoon staat. */
  verschuiving: number;
};

const NIETS: Oordeel = { beurt: null, hangt: false, verschuiving: 0 };

/** Beoordeelt een meting nadat het toetsenbord dicht is (geen veld met focus). */
export function beoordeel(beurt: ToetsenbordBeurt | null, m: ViewportMeting): Oordeel {
  // Gedraaid: de oude maat zegt niets meer.
  if (!beurt || beurt.breedte !== m.breedte) return NIETS;
  const kort = beurt.innerHeight - m.innerHeight;
  let vvKort = 0;
  let verschoven = 0;
  if (zoomVrij(m)) {
    if (beurt.vvHeight !== undefined && m.vvHeight !== undefined) vvKort = beurt.vvHeight - m.vvHeight;
    if (m.vvOffsetTop !== undefined) verschoven = m.vvOffsetTop - (beurt.vvOffsetTop ?? 0);
  }
  if (kort <= VIEWPORT_MARGE && vvKort <= VIEWPORT_MARGE && verschoven <= VIEWPORT_MARGE) return NIETS;
  // De balk plakt aan de onderkant van een te klein of verschoven beeld; het
  // scherm zelf is nog even groot als bij de start.
  const tekort = Math.max(kort, 0) + Math.max(verschoven, 0);
  return { beurt, hangt: true, verschuiving: tekort >= MIN_TOETSENBORD ? Math.round(tekort) : 0 };
}
