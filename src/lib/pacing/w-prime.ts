// W′-balans: hoeveel anaerobe reserve er onderweg over is.
//
// Boven CP loopt W′ leeg met (P − CP) joule per seconde. Eronder vult hij weer
// bij, maar niet lineair: hoe dieper je onder CP zit, hoe sneller het herstel.
// Skiba's differentiële model vangt dat met een tijdconstante die van dat
// verschil afhangt:
//
//   W′bal(t+dt) = W′ − (W′ − W′bal(t)) · e^(−dt/τ),  met τ = 546·e^(−0.01·DCP) + 316
//
// waarin DCP = CP − P. Dat is de reden dat dit model bestaat: met een vaste τ
// herstelt een renner die net onder CP rijdt even snel als een die stilstaat, en
// dat klopt niet.
//
// Dit is de harde toets op een pacingplan. Een plan dat de reserve vóór de
// finish leegtrekt is geen plan — of de AI het nu bedacht heeft of het lid zelf.

export type PowerSegment = {
  durationS: number;
  watts: number;
  /** Cumulatieve km aan het einde van dit segment, voor de meldingen. */
  endKm: number;
};

export type WPrimeBalance = {
  /** Balans in joules aan het einde van elk segment. */
  balanceBySegment: number[];
  /** Laagste balans onderweg. */
  minBalanceJ: number;
  /** Km waar de balans voor het eerst op nul stond, of null. */
  depletedAtKm: number | null;
  /** Balans aan de finish. */
  finalBalanceJ: number;
  /** Totaal verzet werk, in kilojoule. */
  totalKj: number;
  /** CP aan de finish; lager dan bij de start als er een duurzaamheidsmodel is. */
  finalCpWatts: number;
};

export type WPrimeOptions = {
  /**
   * CP na een gegeven hoeveelheid verzet werk. Zonder dit blijft CP de hele rit
   * gelijk — dat is de aanname waar het model normaal op draait, en die klopt
   * tot een uur of twee prima.
   */
  cpAfterKj?: (kj: number) => number;
};

/** Skiba's tijdconstante voor het bijvullen van W′, in seconden. */
export function recoveryTau(dcpWatts: number): number {
  return 546 * Math.exp(-0.01 * Math.max(0, dcpWatts)) + 316;
}

/**
 * Rekent de W′-balans door over een reeks segmenten. Segmenten mogen lang zijn
 * (een vlak stuk van tien minuten); het herstel wordt in stappen van hooguit
 * MAX_STEP_S doorgerekend zodat de exponentiële vorm niet wegvalt.
 */
const MAX_STEP_S = 10;

export function wPrimeBalance(
  segments: PowerSegment[],
  cpWatts: number,
  wPrimeJoules: number,
  options: WPrimeOptions = {},
): WPrimeBalance {
  const balanceBySegment: number[] = [];
  let balance = wPrimeJoules;
  let minBalance = wPrimeJoules;
  let depletedAtKm: number | null = null;
  let joules = 0;
  let currentCp = cpWatts;

  for (const segment of segments) {
    const steps = Math.max(1, Math.ceil(segment.durationS / MAX_STEP_S));
    const dt = segment.durationS / steps;

    for (let step = 0; step < steps; step++) {
      // CP zakt met het verzette werk; zonder duurzaamheidsmodel blijft het
      // gelijk en is dit een no-op.
      currentCp = options.cpAfterKj
        ? options.cpAfterKj(joules / 1000)
        : cpWatts;

      if (segment.watts > currentCp) {
        balance -= (segment.watts - currentCp) * dt;
      } else {
        const tau = recoveryTau(currentCp - segment.watts);
        balance = wPrimeJoules - (wPrimeJoules - balance) * Math.exp(-dt / tau);
      }
      joules += segment.watts * dt;
    }

    // De reserve kan niet negatiever dan leeg: wie eronder zit, staat stil.
    // Dat vlaggen we; doorrekenen met een negatief getal zou een plan dat er
    // twee keer doorheen zakt als twee keer zo slecht presenteren, terwijl het
    // in beide gevallen simpelweg niet uitvoerbaar is.
    if (balance <= 0) {
      balance = 0;
      if (depletedAtKm === null) depletedAtKm = segment.endKm;
    }
    if (balance > wPrimeJoules) balance = wPrimeJoules;

    minBalance = Math.min(minBalance, balance);
    balanceBySegment.push(balance);
  }

  return {
    balanceBySegment,
    minBalanceJ: minBalance,
    depletedAtKm,
    finalBalanceJ: balance,
    totalKj: joules / 1000,
    finalCpWatts: currentCp,
  };
}

/**
 * Hoeveel procent van de reserve op het diepste punt verbruikt is. Een plan dat
 * netjes uitkomt eindigt hier rond de 80–95 %: alles gebruiken is precies goed,
 * eroverheen gaan is de finish niet halen.
 */
export function deepestDrawPct(
  balance: WPrimeBalance,
  wPrimeJoules: number,
): number {
  if (wPrimeJoules <= 0) return 0;
  return ((wPrimeJoules - balance.minBalanceJ) / wPrimeJoules) * 100;
}
