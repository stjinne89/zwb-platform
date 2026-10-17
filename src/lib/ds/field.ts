// ZWB DS: van losse spelersstatussen naar een raceoverzicht op één moment.
//
// Puur, zonder Zwift of database. Zwift geeft de status per renner, en door de
// limiet van ~45 per minuut is een status in een veld van 25 al gauw een halve
// minuut oud (docs/zwb-ds-spike.md). Daarom schatten we iedereen door naar
// hetzelfde moment met zijn laatste snelheid, en pas dan delen we in groepen.

/** Een status ouder dan dit schatten we niet verder door: bergop, bergaf of een aanval maakt het gokken. */
export const MAX_EXTRAPOLATE_MS = 60 * 1000;
/** Ouder dan dit telt een renner niet meer mee in het veld. */
export const STALE_MS = 3 * 60 * 1000;
/**
 * Meer dan zoveel seconden tussen twee renners is een nieuwe groep. Ruimer dan
 * in Zwift zelf (1 à 2 s): een halve minuut doorschatten met een snelheid die 2
 * km/u afwijkt, scheelt al 2 s.
 */
export const GROUP_GAP_S = 5;
/** Ondergrens voor de snelheid in een tijdsverschil, zodat een stilstaande renner geen oneindig gat geeft. */
const MIN_SPEED_MS = 3;

export type DsSample = {
  /** Unix-ms van de status volgens Zwift. */
  stateAt: number;
  eventDistanceM: number;
  speedKmh: number;
  power: number | null;
};

export type DsEntrant = {
  zwiftId: string;
  name: string;
  zwb: boolean;
  weightKg: number | null;
  sample: DsSample | null;
};

/** Een sprint of KOM, gemeten vanaf de start van het event. */
export type DsMark = { name: string; atM: number };

export type DsRider = {
  zwiftId: string;
  name: string;
  zwb: boolean;
  /** Geschat op het moment van het overzicht. */
  distanceM: number;
  speedKmh: number;
  watts: number | null;
  wkg: number | null;
  /** Leeftijd van de status in seconden. */
  ageS: number;
  finished: boolean;
  /** Plek in het veld; binnengekomen renners eerst, onderling zonder volgorde. */
  position: number;
  /** Seconden achter de eerste renner die nog rijdt; null als binnen. */
  gapS: number | null;
  /** Index in `groups`; null als binnen. */
  group: number | null;
  next: { name: string; inM: number } | null;
};

export type DsGroup = {
  riders: DsRider[];
  gapS: number;
  speedKmh: number;
};

export type DsField = {
  /** Binnengekomen renners, dan de rest van voor naar achter. */
  riders: DsRider[];
  groups: DsGroup[];
  finished: DsRider[];
  /** Ingeschreven, maar zonder (verse) status: nog niet gestart, uitgestapt of nog niet gemeten. */
  unseen: DsEntrant[];
  routeM: number | null;
  /** Sprints en KOM's op volgorde. */
  marks: DsMark[];
  /** Afstand van de eerste renner die nog rijdt. */
  leaderM: number | null;
};

function nextMark(marks: DsMark[], distanceM: number): DsRider["next"] {
  const mark = marks.find((m) => m.atM > distanceM);
  return mark ? { name: mark.name, inM: mark.atM - distanceM } : null;
}

export function buildField(
  entrants: DsEntrant[],
  options: { now: number; routeM: number | null; marks?: DsMark[] },
): DsField {
  const { now, routeM } = options;
  const marks = [...(options.marks ?? [])].sort((a, b) => a.atM - b.atM);
  const unseen: DsEntrant[] = [];
  const placed: DsRider[] = [];

  for (const entrant of entrants) {
    const sample = entrant.sample;
    if (!sample || now - sample.stateAt > STALE_MS) {
      unseen.push(entrant);
      continue;
    }
    const finished = routeM !== null && sample.eventDistanceM >= routeM;
    const ahead = Math.min(Math.max(now - sample.stateAt, 0), MAX_EXTRAPOLATE_MS);
    let distanceM = sample.eventDistanceM + ((sample.speedKmh / 3.6) * ahead) / 1000;
    if (routeM !== null) distanceM = Math.min(distanceM, routeM);
    placed.push({
      zwiftId: entrant.zwiftId,
      name: entrant.name,
      zwb: entrant.zwb,
      distanceM,
      speedKmh: sample.speedKmh,
      watts: sample.power,
      wkg: sample.power !== null && entrant.weightKg ? sample.power / entrant.weightKg : null,
      ageS: Math.max(0, Math.round((now - sample.stateAt) / 1000)),
      finished,
      position: 0,
      gapS: null,
      group: null,
      next: finished ? null : nextMark(marks, distanceM),
    });
  }

  const finished = placed.filter((r) => r.finished).sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const racing = placed.filter((r) => !r.finished).sort((a, b) => b.distanceM - a.distanceM);
  const leader = racing[0];
  const groups: DsGroup[] = [];

  racing.forEach((rider, i) => {
    const speed = Math.max(rider.speedKmh / 3.6, MIN_SPEED_MS);
    rider.position = finished.length + i + 1;
    rider.gapS = (leader.distanceM - rider.distanceM) / speed;
    const previous = racing[i - 1];
    if (!previous || (previous.distanceM - rider.distanceM) / speed > GROUP_GAP_S) {
      groups.push({ riders: [], gapS: rider.gapS, speedKmh: 0 });
    }
    const group = groups[groups.length - 1];
    rider.group = groups.length - 1;
    group.riders.push(rider);
  });
  for (const group of groups) {
    group.speedKmh = group.riders.reduce((sum, r) => sum + r.speedKmh, 0) / group.riders.length;
  }
  finished.forEach((rider, i) => {
    rider.position = i + 1;
  });

  return {
    riders: [...finished, ...racing],
    groups,
    finished,
    unseen,
    routeM,
    marks,
    leaderM: leader ? leader.distanceM : null,
  };
}
