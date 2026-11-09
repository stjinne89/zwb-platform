// Het verhaal van de eigen rit, per seconde: klimmen uit het hoogteprofiel,
// de W′-rekening, versnellingen, hart, cadans en durability. Puur: geen I/O.
// ride.ts roept dit aan met de rit al uitgelijnd op racetijd (index = seconde).
//
// Doorgerekend op Stage 5 van Tour of Watopia 2026 (event 5752884) op
// 2026-11-09; de drempels hieronder komen uit dat onderzoek.

export type TerrainClimb = { from: number; to: number; gain: number; distance: number };

/** Hoogte over 15 s gladgestreken, gaten opgevuld met de vorige waarde. */
function smoothAltitude(altitude: Array<number | null>): number[] | null {
  const known = altitude.filter((a): a is number => a != null);
  if (known.length < 60) return null;
  let last = known[0];
  const filled = altitude.map((a) => (a == null ? last : (last = a)));
  const half = 7;
  return filled.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - half); k <= Math.min(filled.length - 1, i + half); k++) {
      sum += filled[k];
      n += 1;
    }
    return sum / n;
  });
}

function filledDistance(distance: Array<number | null>): number[] | null {
  if (distance.filter((d) => d != null).length < 60) return null;
  let last = distance.find((d) => d != null) ?? 0;
  return distance.map((d) => (d == null ? last : (last = d)));
}

/** Een klim: minstens 12 m stijgen over meer dan 200 m. */
const CLIMB_MIN_GAIN_M = 12;
const CLIMB_MIN_DISTANCE_M = 200;

/**
 * Klimmen uit het eigen hoogteprofiel, voor routes waar Zwift geen
 * klimsegmenten geeft. Begin: de hoogte stijgt over 30 s minstens 3 m. Einde:
 * over de volgende 20 s geen halve meter meer stijging.
 */
export function terrainClimbs(altitude: Array<number | null>, distance: Array<number | null>): TerrainClimb[] {
  const alt = smoothAltitude(altitude);
  const dist = filledDistance(distance);
  if (!alt || !dist) return [];
  const n = alt.length;
  const climbs: TerrainClimb[] = [];
  let i = 0;
  while (i < n - 30) {
    if (alt[i + 30] - alt[i] >= 3) {
      let j = i + 30;
      while (j < n - 10 && alt[Math.min(j + 20, n - 1)] - alt[j] > 0.5) j += 5;
      j = Math.min(j, n - 1);
      // Het begin naar voren schuiven tot de weg echt gaat stijgen.
      let start = i;
      while (start < j - 10 && alt[start + 5] - alt[start] < 0.5) start += 1;
      const gain = alt[j] - alt[start];
      const length = dist[j] - dist[start];
      if (gain >= CLIMB_MIN_GAIN_M && length > CLIMB_MIN_DISTANCE_M) {
        climbs.push({ from: start, to: j, gain: Math.round(gain), distance: Math.round(length) });
      }
      i = j + 1;
    } else {
      i += 5;
    }
  }
  return climbs;
}

/** Afdalingen: dezelfde regel als een klim, met de hoogte omgekeerd. */
export function terrainDescents(altitude: Array<number | null>, distance: Array<number | null>): TerrainClimb[] {
  return terrainClimbs(
    altitude.map((a) => (a == null ? null : -a)),
    distance,
  ).map((d) => ({ ...d, gain: -d.gain }));
}

/** Netto hoogteverschil en afstand tussen twee seconden, of null zonder hoogte. */
export function terrainBetween(altitude: Array<number | null>, distance: Array<number | null>, from: number, to: number) {
  const alt = smoothAltitude(altitude);
  const dist = filledDistance(distance);
  if (!alt || !dist) return null;
  const a = Math.max(0, Math.min(alt.length - 1, Math.round(from)));
  const b = Math.max(0, Math.min(alt.length - 1, Math.round(to)));
  const length = dist[b] - dist[a];
  return { gain: Math.round(alt[b] - alt[a]), distance: Math.round(length), grade: length > 50 ? Math.round((1000 * (alt[b] - alt[a])) / length) / 10 : null };
}

/** Meters klimmen (alleen stijgen) tussen twee seconden. */
export function climbingMeters(altitude: Array<number | null>, from: number, to: number): number | null {
  const alt = smoothAltitude(altitude);
  if (!alt) return null;
  let up = 0;
  for (let i = Math.max(1, Math.round(from)); i < Math.min(alt.length, Math.round(to)); i++) {
    const step = alt[i] - alt[i - 1];
    if (step > 0) up += step;
  }
  return Math.round(up);
}

// ---------------------------------------------------------------------------
// W′-rekening

export type WbalDip = {
  /** Racetijd van het laagste punt. */
  at: number;
  /** Laagste W′-balans, in %. */
  low: number;
  /** Gemiddeld vermogen in de minuut ervoor. */
  minuteBefore: number;
  /** Seconden tot de W′ weer op 50% stond, of null als dat niet meer gebeurde. */
  recovery: number | null;
};

export type WbalAccount = {
  /** Seconden onder 25%. */
  below25: number;
  /** Seconden onder nul: dan past het model niet helemaal bij deze race. */
  below0: number;
  dips: WbalDip[];
  /** W′ vijf minuten voor de finish, in %. */
  finale: { at: number; share: number } | null;
  /** W′ aan de finish, in %. */
  atFinish: number | null;
};

/** Een dip telt vanaf 30%; hersteld vanaf 50%. */
const DIP_SHARE = 30;
const DIP_RECOVERED = 50;
const FINALE_S = 300;

export function wbalAccount(shares: number[], watts: Array<number | null>, first: number): WbalAccount {
  const dips: WbalDip[] = [];
  let below25 = 0;
  let below0 = 0;
  for (let i = first; i < shares.length; i++) {
    if (shares[i] < 25) below25 += 1;
    if (shares[i] < 0) below0 += 1;
  }
  let k = first;
  while (k < shares.length) {
    if (shares[k] >= DIP_SHARE) {
      k += 1;
      continue;
    }
    let end = k;
    while (end < shares.length && shares[end] < DIP_RECOVERED) end += 1;
    let low = k;
    for (let r = k; r < end; r++) if (shares[r] < shares[low]) low = r;
    const before = watts.slice(Math.max(first, low - 60), low).map((w) => w ?? 0);
    dips.push({
      at: low,
      low: shares[low],
      minuteBefore: before.length ? Math.round(before.reduce((s, w) => s + w, 0) / before.length) : 0,
      recovery: end < shares.length ? end - low : null,
    });
    k = end + 1;
  }
  const finaleAt = shares.length - 1 - FINALE_S;
  return {
    below25,
    below0,
    dips,
    finale: finaleAt > first ? { at: finaleAt, share: shares[finaleAt] } : null,
    atFinish: shares.length > first ? shares[shares.length - 1] : null,
  };
}

// ---------------------------------------------------------------------------
// Versnellingen

export type Effort = { from: number; seconds: number; watts: number };

/** Een versnelling: minstens 5 s boven 150% van je FTP; een gat tot 2 s telt mee. */
export const EFFORT_SHARE = 1.5;
const EFFORT_MIN_S = 5;

export function efforts(watts: Array<number | null>, threshold: number): Effort[] {
  const list: Effort[] = [];
  const above = watts.map((w) => (w ?? 0) > threshold);
  let k = 0;
  while (k < above.length) {
    if (!above[k]) {
      k += 1;
      continue;
    }
    let e = k;
    while (e < above.length && (above[e] || above[e + 1] || above[e + 2])) e += 1;
    // Het einde ligt op de laatste seconde boven de drempel.
    while (e > k && !above[e - 1]) e -= 1;
    if (e - k >= EFFORT_MIN_S) {
      const part = watts.slice(k, e).map((w) => w ?? 0);
      list.push({ from: k, seconds: e - k, watts: Math.round(part.reduce((s, w) => s + w, 0) / part.length) });
    }
    k = e + 1;
  }
  return list;
}

// ---------------------------------------------------------------------------
// Hart en cadans

export type HeartStats = {
  /** Watt per hartslag in de eerste en de tweede helft. */
  wPerBeat: { first: number; second: number } | null;
  /** Seconden boven de drempelhartslag. */
  aboveLthr: number | null;
};

export function heartStats(watts: Array<number | null>, heart: Array<number | null>, first: number, lthr: number | null): HeartStats {
  const middle = Math.round((first + watts.length) / 2);
  const ratio = (a: number, b: number) => {
    let w = 0;
    let h = 0;
    let n = 0;
    for (let i = a; i < b; i++) {
      const hr = heart[i];
      if (!hr || hr <= 0 || watts[i] == null) continue;
      w += watts[i] as number;
      h += hr;
      n += 1;
    }
    return n >= 60 ? Math.round((100 * w) / h) / 100 : null;
  };
  const firstHalf = ratio(first, middle);
  const secondHalf = ratio(middle, watts.length);
  const hasHeart = heart.some((h) => h && h > 0);
  return {
    wPerBeat: firstHalf !== null && secondHalf !== null ? { first: firstHalf, second: secondHalf } : null,
    aboveLthr: lthr && hasHeart ? heart.slice(first).filter((h) => h && h > lthr).length : null,
  };
}

export type CadenceStats = {
  /** Gemiddelde cadans boven je FTP. */
  aboveFtp: number | null;
  /** Seconden onder 70 rpm op meer dan 120% van je FTP. */
  grinding: number | null;
  /** Hoogste koppel, in Nm. */
  maxTorque: number | null;
};

export function cadenceStats(watts: Array<number | null>, cadence: Array<number | null>, torque: Array<number | null>, ftp: number | null): CadenceStats {
  let sum = 0;
  let n = 0;
  let grinding = 0;
  watts.forEach((w, i) => {
    const c = cadence[i];
    if (!ftp || w == null || !c || c <= 0) return;
    if (w > ftp) {
      sum += c;
      n += 1;
    }
    if (w > 1.2 * ftp && c < 70) grinding += 1;
  });
  const torques = torque.filter((t): t is number => t != null && t > 0);
  return {
    aboveFtp: n >= 30 ? Math.round(sum / n) : null,
    grinding: ftp && cadence.some((c) => c && c > 0) ? grinding : null,
    maxTorque: torques.length ? Math.round(Math.max(...torques)) : null,
  };
}

// ---------------------------------------------------------------------------
// Durability: vermogen na veel arbeid tegenover de vermoeide curve.

export type FatigueCurve = { afterKj: number; points: Array<{ seconds: number; watts: number }> };

export type DurabilityRow = {
  afterKj: number;
  /** Racetijd waarop je die arbeid bereikte (de rit voor de start telt mee). */
  reachedAt: number;
  best: Array<{ seconds: number; watts: number; fatigued: number | null; fresh: number | null }>;
};

const DURABILITY_DURATIONS = [60, 300, 1200];

export function durability(
  watts: Array<number | null>,
  kjBeforeStart: number,
  fatigue: FatigueCurve[],
  fresh: Array<{ seconds: number; watts: number }>,
): DurabilityRow[] {
  const rows: DurabilityRow[] = [];
  for (const curve of fatigue) {
    let joules = kjBeforeStart * 1000;
    let reached = -1;
    for (let i = 0; i < watts.length; i++) {
      joules += watts[i] ?? 0;
      if (joules >= curve.afterKj * 1000) {
        reached = i;
        break;
      }
    }
    if (reached < 0) continue;
    const after = watts.slice(reached);
    const best = bestsOver(after, DURABILITY_DURATIONS).map(({ seconds, watts: w }) => ({
      seconds,
      watts: w,
      fatigued: curve.points.find((p) => p.seconds === seconds)?.watts ?? null,
      fresh: fresh.find((p) => p.seconds === seconds)?.watts ?? null,
    }));
    if (best.length) rows.push({ afterKj: curve.afterKj, reachedAt: reached, best });
  }
  return rows;
}

/** Beste gemiddelde vermogen per duur. */
function bestsOver(watts: Array<number | null>, durations: number[]) {
  return durations.flatMap((seconds) => {
    if (watts.length < seconds) return [];
    let sum = 0;
    for (let i = 0; i < seconds; i++) sum += watts[i] ?? 0;
    let best = sum;
    for (let i = seconds; i < watts.length; i++) {
      sum += (watts[i] ?? 0) - (watts[i - seconds] ?? 0);
      if (sum > best) best = sum;
    }
    return [{ seconds, watts: Math.round(best / seconds) }];
  });
}

// ---------------------------------------------------------------------------
// Waar de race beslist werd: de groepjes aan de finish.

export type FinishGroup = { firstRank: number; lastRank: number; size: number; behindWinner: number; own: boolean };

/** Renners die binnen 2 s van de vorige finishten, horen bij hetzelfde groepje. */
const GROUP_GAP_MS = 2000;

export function finishGroups(results: Array<{ profileId: number; rank: number; durationMs: number | null }>, ownId: number): FinishGroup[] {
  const done = results.filter((r) => r.durationMs != null).sort((a, b) => (a.durationMs as number) - (b.durationMs as number));
  if (done.length === 0) return [];
  const win = done[0].durationMs as number;
  const groups: Array<typeof done> = [[done[0]]];
  for (const r of done.slice(1)) {
    const current = groups[groups.length - 1];
    if ((r.durationMs as number) - (current[current.length - 1].durationMs as number) <= GROUP_GAP_MS) current.push(r);
    else groups.push([r]);
  }
  return groups.map((g) => ({
    firstRank: Math.min(...g.map((r) => r.rank)),
    lastRank: Math.max(...g.map((r) => r.rank)),
    size: g.length,
    behindWinner: Math.round(((g[0].durationMs as number) - win) / 1000),
    own: g.some((r) => r.profileId === ownId),
  }));
}
