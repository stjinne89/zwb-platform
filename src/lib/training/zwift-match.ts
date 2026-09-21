// "Welk Zwift-event past bij deze geplande training?"
//
// Zelfde soort logica als eventFitsMember in lib/events/fit.ts en
// suggestSegmentsForBlock in lib/training/segment-suggestions.ts: puur,
// deterministisch, zonder netwerk of database, met een Nederlands label bij elke
// uitkomst. Alles wat hier staat is los te testen.
//
// Twee lagen, en ze doen bewust iets anders:
//
// - **Harde filters** gooien een event weg. Dat is geen lage score maar een nee:
//   een hardloopevent, een race bij een hersteltraining, een event dat langer
//   duurt dan het lid die dag heeft. Elk filter heeft één reden, en de hardste
//   reden wint. De redenen zijn (nog) nergens zichtbaar voor het lid — een
//   afgewezen event verdwijnt gewoon uit de lijst — maar ze staan als code in de
//   uitkomst, zodat een latere beheerdiagnose kan laten zien wáárom er niets
//   voorgesteld werd.
// - **Deelscores** wegen wat overblijft. Elke dimensie levert 0-100 óf `null` als
//   we het simpelweg niet weten, en het gewogen gemiddelde gaat alleen over de
//   dimensies die we kennen.
//
// Die hernormalisatie is geen detail. De publieke Zwift-API geeft van een group
// workout geen vermogensband en geen blokkenschema. Zonder hernormalisatie zou
// elk group workout stil 30 punten verliezen puur omdat Zwift dat veld niet
// meestuurt — dan verdwijnt precies de eventsoort die qua vorm het dichtst bij
// een geplande training ligt. Onbekend verlaagt hier dus de dekking, niet de
// score. Dezelfde regel als "onbekend telt nooit als 'past niet'" in fit.ts.

import { rideSeconds } from "@/lib/training/ride-physics";
import {
  estimateTrainingLoad,
  INTENSITY_FTP_RANGE,
  type WorkoutBlock,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

// --- Invoer ---------------------------------------------------------------

/** Eén startgroep binnen een event, met de W/kg-band waar je in moet vallen. */
export type ZwiftSubgroup = {
  /** "A", "B", "C", "D", "E" — of iets anders dat de organisator verzon. */
  label: string | null;
  /** Uit rangeAccessLabel, of afgeleid uit het label. Null = geen grens. */
  minWkg: number | null;
  maxWkg: number | null;
  startAt: string | null;
  distanceM: number | null;
  signups: number | null;
};

/** Wat we van een route weten; komt uit het `zwift-data`-pakket, niet uit de API. */
export type ZwiftRouteFacts = {
  name: string;
  world: string;
  /** Eén ronde, zonder lead-in. */
  distanceKm: number;
  elevationM: number;
  leadInKm: number;
  leadInElevationM: number;
};

export type ZwiftEventCandidate = {
  eventId: number;
  name: string;
  /** ISO-tijdstip. */
  startAt: string;
  eventType: string | null;
  sport: string | null;
  durationSeconds: number | null;
  distanceM: number | null;
  laps: number | null;
  subgroups: ZwiftSubgroup[];
  seriesName: string | null;
  description: string | null;
  totalSignups: number | null;
  zwbSignups: number | null;
  externalUrl: string;
  /** Null als Zwift geen routeId gaf of `zwift-data` de route niet kent. */
  route: ZwiftRouteFacts | null;
};

export type PlannedSession = {
  /** ISO-tijdstip waarop de training staat gepland. */
  scheduledAt: string;
  durationMinutes: number;
  intensity: WorkoutIntensity;
  blocks: WorkoutBlock[];
};

export type MatchAthlete = {
  ftpWatts: number | null;
  weightKg: number | null;
  /** Beschikbare minuten op die dag; null = geen grens opgegeven. */
  availableMinutes: number | null;
};

// --- Uitkomsten -----------------------------------------------------------

export type ZwiftRejectReason =
  | "sport"
  | "gestart"
  | "andere_dag"
  | "te_lang"
  | "categorie"
  | "verkeerde_soort";

export type MatchDimension =
  | "duur"
  | "intensiteit"
  | "belasting"
  | "terrein"
  | "starttijd"
  | "populariteit";

/**
 * Duur en intensiteit dragen samen 70 van de 100 punten, en dat is met opzet:
 * een event van het juiste uur op de juiste hardheid is een bruikbaar voorstel,
 * ook als het op een saaie route ligt en er niemand anders rijdt. Populariteit
 * weegt het lichtst — een drukke race maakt een duurtraining niet beter.
 */
export const MATCH_WEIGHTS: Record<MatchDimension, number> = {
  duur: 40,
  intensiteit: 30,
  belasting: 10,
  terrein: 8,
  starttijd: 7,
  populariteit: 5,
};

export type MatchScore = {
  dimension: MatchDimension;
  scorePct: number;
  /** Korte Nederlandse toelichting, bedoeld om in de kaart te tonen. */
  note: string;
};

export type ZwiftEventMatch = {
  event: ZwiftEventCandidate;
  /** 0-100, het gewogen gemiddelde over de bekende dimensies. */
  scorePct: number;
  /** De startgroep waarop we matchten; null bij een event zonder subgroepen. */
  subgroup: ZwiftSubgroup | null;
  /** Geschatte rijtijd van het lid in dit event. */
  estimatedMinutes: number | null;
  scores: MatchScore[];
  strongest: MatchScore | null;
  weakest: MatchScore | null;
};

// --- Constanten, allemaal met een reden -----------------------------------

/** Onder deze score tonen we niets: een slecht voorstel is erger dan geen voorstel. */
export const MATCH_FLOOR_PCT = 55;

/** Je moet nog op tijd in Zwift kunnen komen; een event dat over 5 min start niet. */
const MIN_LEAD_MINUTES = 15;

/** Vanaf dit gemiddelde stijgingspercentage noemen we een route klimwerk. */
const CLIMB_GRADE_PCT = 1.5;
/** Daaronder, maar boven dit percentage, is een route golvend in plaats van vlak. */
const ROLLING_GRADE_PCT = 0.8;

/** De ramp waarop we twee intensiteiten met elkaar vergelijken. */
const INTENSITY_RAMP: WorkoutIntensity[] = [
  "recovery",
  "endurance",
  "tempo",
  "threshold",
  "vo2max",
  "anaerobic",
];

/** Eventsoorten die we als wedstrijd behandelen. */
const RACE_TYPES = new Set(["RACE", "TIME_TRIAL", "TEAM_TIME_TRIAL"]);

/** Bij deze geplande intensiteiten is een wedstrijd nooit een passend voorstel. */
const NO_RACE_INTENSITIES = new Set<WorkoutIntensity>(["recovery", "endurance", "rest"]);

/**
 * De gepubliceerde Zwift-categoriebanden, als terugval wanneer een subgroep geen
 * rangeAccessLabel meestuurt. E is bewust open: dat is in Zwift de groep zonder
 * categorie-eis.
 */
const CATEGORY_BANDS: Record<string, { minWkg: number | null; maxWkg: number | null }> = {
  A: { minWkg: 4.0, maxWkg: null },
  B: { minWkg: 3.2, maxWkg: 3.99 },
  C: { minWkg: 2.5, maxWkg: 3.19 },
  D: { minWkg: null, maxWkg: 2.49 },
  E: { minWkg: null, maxWkg: null },
};

/**
 * Trefwoorden waarmee we de intensiteit van een group workout uit zijn naam
 * proberen te lezen. De publieke API geeft het blokkenschema niet mee, dus dit
 * is de enige aanwijzing die er is. Herkennen we niets, dan scoren we de
 * dimensie `null` in plaats van te gokken.
 */
const INTENSITY_KEYWORDS: Array<[WorkoutIntensity, RegExp]> = [
  ["recovery", /\b(recovery|herstel|easy|active recovery)\b/i],
  ["endurance", /\b(endurance|duur|base|aerobic|z2|zone 2)\b/i],
  ["tempo", /\b(tempo|sweet ?spot|sst)\b/i],
  ["threshold", /\b(threshold|drempel|ftp|lactate|over-?under)\b/i],
  ["vo2max", /\b(vo2|v02|anaerobic capacity|max aerobic)\b/i],
  ["anaerobic", /\b(anaerob|sprint|neuromuscular)\b/i],
];

// --- Kleine hulpjes -------------------------------------------------------

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function amsterdamDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

/**
 * Leest een W/kg-band uit een rangeAccessLabel. Zwift schrijft die op meerdere
 * manieren ("3.2-3.9 w/kg", "< 2.5 WKG", "4.0+"), dus alle drie de vormen.
 */
export function parseWkgRange(
  label: string | null | undefined,
): { minWkg: number | null; maxWkg: number | null } | null {
  if (!label) return null;
  const text = label.replace(",", ".");

  const range = text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to|tot)\s*(\d+(?:\.\d+)?)/);
  if (range) {
    const low = Number(range[1]);
    const high = Number(range[2]);
    if (Number.isFinite(low) && Number.isFinite(high)) {
      return { minWkg: Math.min(low, high), maxWkg: Math.max(low, high) };
    }
  }

  const below = text.match(/[<≤]\s*(\d+(?:\.\d+)?)/);
  if (below && Number.isFinite(Number(below[1]))) {
    return { minWkg: null, maxWkg: Number(below[1]) };
  }

  const above = text.match(/(?:[>≥]\s*)?(\d+(?:\.\d+)?)\s*\+/);
  if (above && Number.isFinite(Number(above[1]))) {
    return { minWkg: Number(above[1]), maxWkg: null };
  }

  const atLeast = text.match(/[>≥]\s*(\d+(?:\.\d+)?)/);
  if (atLeast && Number.isFinite(Number(atLeast[1]))) {
    return { minWkg: Number(atLeast[1]), maxWkg: null };
  }

  return null;
}

/** De band van een subgroep: eerst wat het event zelf zegt, anders de A-E-terugval. */
export function subgroupBand(subgroup: ZwiftSubgroup) {
  if (subgroup.minWkg !== null || subgroup.maxWkg !== null) {
    return { minWkg: subgroup.minWkg, maxWkg: subgroup.maxWkg };
  }
  const letter = (subgroup.label ?? "").trim().toUpperCase().charAt(0);
  return CATEGORY_BANDS[letter] ?? { minWkg: null, maxWkg: null };
}

function fitsBand(wkg: number, band: { minWkg: number | null; maxWkg: number | null }) {
  if (band.minWkg !== null && wkg < band.minWkg) return false;
  if (band.maxWkg !== null && wkg > band.maxWkg) return false;
  return true;
}

/** Het midden van een band; open aan één kant betekent een halve stap erbuiten. */
function bandCenterWkg(band: { minWkg: number | null; maxWkg: number | null }) {
  if (band.minWkg !== null && band.maxWkg !== null) return (band.minWkg + band.maxWkg) / 2;
  if (band.minWkg !== null) return band.minWkg + 0.4;
  if (band.maxWkg !== null) return Math.max(0.5, band.maxWkg - 0.4);
  return null;
}

// --- Duurschatting --------------------------------------------------------

/**
 * Geschatte rijtijd in minuten. Zwift geeft óf een duur (dan is het klaar), óf
 * een afstand met een rondental — dan moeten we het zelf uitrekenen.
 *
 * Het model staat in ride-physics.ts en wordt gedeeld met het routevoorstel voor
 * buitenritten, dat dezelfde som in de omgekeerde richting maakt. Twee kopieën
 * zouden na de eerste bijstelling uit elkaar lopen, en dan stelt ZWB een rit voor
 * die hij daarna zelf anders inschat.
 */
export function estimateEventMinutes(
  event: ZwiftEventCandidate,
  wattsAtEffort: number | null,
  weightKg: number | null,
): number | null {
  if (event.durationSeconds && event.durationSeconds > 0) {
    return Math.round(event.durationSeconds / 60);
  }

  const totals = eventTotals(event);
  if (!totals || totals.distanceKm <= 0) return null;

  // Zwift, dus zonder de buitenstraf: geen kruisingen en geen verkeerslichten.
  const seconds = rideSeconds(totals.distanceKm, totals.elevationM, wattsAtEffort, weightKg);
  return seconds === null ? null : Math.round(seconds / 60);
}

/**
 * Totale afstand en hoogtemeters van het event: lead-in plus zoveel ronden als
 * er gereden worden. Zonder rondental leiden we dat af uit de afstand die het
 * event zelf opgeeft — gelijk aan eventRouteTotals in lib/events/zwift-route.ts,
 * maar op de kandidaatvorm en zonder die module te hoeven importeren.
 */
export function eventTotals(
  event: ZwiftEventCandidate,
): { distanceKm: number; elevationM: number } | null {
  const eventKm = event.distanceM && event.distanceM > 0 ? event.distanceM / 1000 : null;
  const route = event.route;

  if (!route || route.distanceKm <= 0) {
    return eventKm === null ? null : { distanceKm: eventKm, elevationM: 0 };
  }

  const laps =
    event.laps && event.laps > 0
      ? event.laps
      : eventKm !== null
        ? Math.max(1, Math.round((eventKm - route.leadInKm) / route.distanceKm))
        : 1;

  return {
    distanceKm: route.leadInKm + laps * route.distanceKm,
    elevationM: Math.round(route.leadInElevationM + laps * route.elevationM),
  };
}

// --- Intensiteit van een event -------------------------------------------

/**
 * Op welke intensiteit rijdt dít lid dit event? Een W/kg-band is om te rekenen
 * naar %FTP zodra we gewicht en FTP kennen, en dat is verreweg het hardste
 * signaal dat de publieke API geeft. Zonder band vallen we terug op de soort
 * (race) of op trefwoorden, en anders op `null`.
 */
export function eventIntensity(
  event: ZwiftEventCandidate,
  subgroup: ZwiftSubgroup | null,
  athlete: MatchAthlete,
): { intensity: WorkoutIntensity; pctFtp: number | null; source: "band" | "soort" | "naam" } | null {
  // De soort gaat vóór de band, en dat is geen detail. Bij een race betekent
  // "B, 3.2-3.9 W/kg" dat jouw FTP in die band moet vallen -- het zegt niets
  // over hoe hard er gereden wordt. Bij een groepsrit betekent dezelfde notatie
  // juist wél het tempo. Ze door elkaar halen levert onzin op: een renner van
  // 3,3 W/kg zou een B-race als "anaeroob" gescoord krijgen puur omdat het
  // midden van de toelatingsband boven zijn FTP ligt.
  if (isRace(event)) return { intensity: "race", pctFtp: null, source: "soort" };

  const band = subgroup ? subgroupBand(subgroup) : null;
  const centerWkg = band ? bandCenterWkg(band) : null;

  if (centerWkg !== null && athlete.ftpWatts && athlete.weightKg) {
    const pctFtp = ((centerWkg * athlete.weightKg) / athlete.ftpWatts) * 100;
    return { intensity: intensityForPct(pctFtp), pctFtp, source: "band" };
  }

  const haystack = [event.name, event.seriesName, event.description].filter(Boolean).join(" ");
  for (const [intensity, pattern] of INTENSITY_KEYWORDS) {
    if (pattern.test(haystack)) return { intensity, pctFtp: null, source: "naam" };
  }

  return null;
}

/**
 * %FTP naar intensiteit. Bewust niet intensityFromPct uit workouts.ts: die
 * classificeert één blok binnen een workout, waar 70% duur is. Een groepsrit van
 * anderhalf uur op 70% van je FTP is geen duurrit maar tempo — over een hele rit
 * liggen de grenzen lager. Vandaar een eigen schaal, op het gemiddelde van de rit.
 */
export function intensityForPct(pctFtp: number): WorkoutIntensity {
  if (pctFtp < 50) return "recovery";
  if (pctFtp < 66) return "endurance";
  if (pctFtp < 78) return "tempo";
  if (pctFtp < 92) return "threshold";
  if (pctFtp < 105) return "vo2max";
  return "anaerobic";
}

export function isRace(event: ZwiftEventCandidate) {
  return RACE_TYPES.has((event.eventType ?? "").toUpperCase());
}

/**
 * Het vermogen waarop het lid dit event naar verwachting rijdt. In een race is
 * dat je eigen racevermogen -- de toelatingsband van je categorie is geen tempo,
 * zie eventIntensity. In een groepsrit is de band wél het tempo.
 */
function wattsForEvent(
  event: ZwiftEventCandidate,
  subgroup: ZwiftSubgroup | null,
  athlete: MatchAthlete,
): number | null {
  if (!isRace(event)) {
    const band = subgroup ? subgroupBand(subgroup) : null;
    const centerWkg = band ? bandCenterWkg(band) : null;
    if (centerWkg !== null && athlete.weightKg) return centerWkg * athlete.weightKg;
  }

  if (!athlete.ftpWatts) return null;
  const range = INTENSITY_FTP_RANGE[isRace(event) ? "race" : "endurance"];
  return (athlete.ftpWatts * (range[0] + range[1])) / 200;
}

// --- Populariteit ---------------------------------------------------------

/**
 * Populariteit per uur van de dag. Zonder die bucket zou populariteit vooral
 * "Europese primetime" meten: een event om 20:00 heeft altijd meer
 * inschrijvingen dan hetzelfde event om 04:00, ongeacht hoe goed het is.
 */
export type PopularityIndex = {
  percentileFor: (startAtIso: string, signups: number) => number | null;
};

export function buildPopularityIndex(events: ZwiftEventCandidate[]): PopularityIndex {
  const buckets = new Map<number, number[]>();
  for (const event of events) {
    if (event.totalSignups === null || event.totalSignups === undefined) continue;
    const hour = new Date(event.startAt).getUTCHours();
    buckets.set(hour, [...(buckets.get(hour) ?? []), event.totalSignups]);
  }
  for (const [hour, counts] of buckets) {
    buckets.set(
      hour,
      [...counts].sort((a, b) => a - b),
    );
  }

  return {
    percentileFor(startAtIso, signups) {
      const counts = buckets.get(new Date(startAtIso).getUTCHours());
      // Onder de drie events zegt een percentiel niets; dan liever niets zeggen.
      if (!counts || counts.length < 3) return null;
      const below = counts.filter((count) => count < signups).length;
      return clampPct((below / counts.length) * 100);
    },
  };
}

// --- Harde filters --------------------------------------------------------

/**
 * Volgorde is niet willekeurig, net als in fit.ts: eerst wat onomstotelijk is
 * (verkeerde sport, verkeerde dag, al begonnen), dan wat van het lid afhangt.
 */
export function rejectReason(
  event: ZwiftEventCandidate,
  session: PlannedSession,
  athlete: MatchAthlete,
  now: Date,
  estimatedMinutes: number | null,
): ZwiftRejectReason | null {
  const sport = (event.sport ?? "").toUpperCase();
  if (sport && sport !== "CYCLING") return "sport";

  if (amsterdamDay(event.startAt) !== amsterdamDay(session.scheduledAt)) return "andere_dag";

  const startsInMinutes = (new Date(event.startAt).getTime() - now.getTime()) / 60000;
  if (startsInMinutes < MIN_LEAD_MINUTES) return "gestart";

  if (isRace(event) && NO_RACE_INTENSITIES.has(session.intensity)) return "verkeerde_soort";

  if (
    athlete.availableMinutes !== null &&
    estimatedMinutes !== null &&
    estimatedMinutes > athlete.availableMinutes
  ) {
    return "te_lang";
  }

  // Alleen bij een race is de band een toelatingseis. Bij een groepsrit is het
  // een tempo-advies, en daar mag je altijd in een rustigere groep meerijden --
  // dat is juist de bedoeling van zo'n rit.
  const wkg = riderWkg(athlete);
  if (isRace(event) && wkg !== null && event.subgroups.length > 0) {
    const anyFits = event.subgroups.some((subgroup) => fitsBand(wkg, subgroupBand(subgroup)));
    if (!anyFits) return "categorie";
  }

  return null;
}

export function riderWkg(athlete: MatchAthlete): number | null {
  if (!athlete.ftpWatts || !athlete.weightKg || athlete.weightKg <= 0) return null;
  return athlete.ftpWatts / athlete.weightKg;
}

/**
 * In welke startgroep rijdt dit lid?
 *
 * Twee verschillende vragen, om dezelfde reden als in eventIntensity:
 *
 * - **Race of tijdrit**: de groep waar je in mág. Dat is de band die je eigen
 *   W/kg bevat; daar valt niets te kiezen.
 * - **Groepsrit, fondo of workout**: de groep die het tempo rijdt dat bij je
 *   training hoort. Een lid van 3,3 W/kg dat een duurtraining gepland heeft
 *   hoort bij de 2.0-2.5-groep, niet bij de snelste groep waar het in past. Dit
 *   is precies wat de feature moet doen: niet de rit weggooien omdat er een
 *   harde groep bij zit, maar de passende groep aanwijzen.
 */
export function chooseSubgroup(
  event: ZwiftEventCandidate,
  athlete: MatchAthlete,
  session?: PlannedSession,
): ZwiftSubgroup | null {
  if (event.subgroups.length === 0) return null;

  if (isRace(event)) {
    const wkg = riderWkg(athlete);
    if (wkg === null) return event.subgroups[0];
    return event.subgroups.find((subgroup) => fitsBand(wkg, subgroupBand(subgroup))) ?? null;
  }

  const targetWkg = targetPaceWkg(session, athlete);
  if (targetWkg === null) return event.subgroups[0];

  let best: ZwiftSubgroup | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const subgroup of event.subgroups) {
    const center = bandCenterWkg(subgroupBand(subgroup));
    // Een groep zonder band (bijvoorbeeld E) is altijd een geldige keuze, maar
    // nooit een betere dan een groep waarvan het tempo wél bekend is.
    const distance = center === null ? 99 : Math.abs(center - targetWkg);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = subgroup;
    }
  }
  return best;
}

/** Het tempo in W/kg dat bij de geplande training hoort. */
function targetPaceWkg(
  session: PlannedSession | undefined,
  athlete: MatchAthlete,
): number | null {
  if (!session || !athlete.ftpWatts || !athlete.weightKg || athlete.weightKg <= 0) return null;
  const range = INTENSITY_FTP_RANGE[session.intensity];
  const pct = (range[0] + range[1]) / 2;
  return (athlete.ftpWatts * (pct / 100)) / athlete.weightKg;
}

// --- Scoren ---------------------------------------------------------------

function durationScore(estimatedMinutes: number, plannedMinutes: number): MatchScore {
  const drift = Math.abs(estimatedMinutes - plannedMinutes) / plannedMinutes;
  const diff = estimatedMinutes - plannedMinutes;
  const note =
    Math.abs(diff) < 3
      ? `${estimatedMinutes} min, gelijk aan gepland`
      : `${estimatedMinutes} min, ${Math.abs(diff)} min ${diff > 0 ? "langer" : "korter"} dan gepland`;
  return { dimension: "duur", scorePct: clampPct(100 - drift * 200), note };
}

function intensityScore(
  eventIntensityName: WorkoutIntensity,
  plannedIntensity: WorkoutIntensity,
): MatchScore {
  // Race ligt niet op de ramp: hij loopt over meerdere zones heen. Hij past goed
  // bij een geplande race en redelijk bij een harde sessie; de rest is al door
  // het harde filter gegaan.
  if (eventIntensityName === "race" || plannedIntensity === "race") {
    const both = eventIntensityName === plannedIntensity;
    const hard = plannedIntensity === "vo2max" || plannedIntensity === "anaerobic";
    return {
      dimension: "intensiteit",
      scorePct: both ? 100 : hard ? 70 : 40,
      note: both ? "Wedstrijd, zoals gepland" : "Wedstrijd in plaats van een gestuurde sessie",
    };
  }

  // 'rest' staat ook niet op de ramp: een rustdag krijgt geen eventvoorstel.
  const eventIndex = INTENSITY_RAMP.indexOf(eventIntensityName);
  const plannedIndex = INTENSITY_RAMP.indexOf(plannedIntensity);
  if (eventIndex < 0 || plannedIndex < 0) {
    return { dimension: "intensiteit", scorePct: 50, note: "Intensiteit lastig te plaatsen" };
  }

  const steps = Math.abs(eventIndex - plannedIndex);
  const scorePct = steps === 0 ? 100 : steps === 1 ? 60 : steps === 2 ? 25 : 0;
  const note =
    steps === 0
      ? "Op de geplande intensiteit"
      : `${steps === 1 ? "Net" : "Duidelijk"} ${eventIndex > plannedIndex ? "harder" : "rustiger"} dan gepland`;
  return { dimension: "intensiteit", scorePct, note };
}

function loadScore(estimatedLoad: number, plannedLoad: number): MatchScore {
  const drift = Math.abs(estimatedLoad - plannedLoad) / plannedLoad;
  return {
    dimension: "belasting",
    scorePct: clampPct(100 - drift * 150),
    note: `Ongeveer ${Math.round(estimatedLoad)} belasting, gepland ${Math.round(plannedLoad)}`,
  };
}

function terrainScore(event: ZwiftEventCandidate, plannedIntensity: WorkoutIntensity): MatchScore | null {
  const totals = eventTotals(event);
  if (!totals || totals.distanceKm <= 0 || !event.route) return null;

  const gradePct = (totals.elevationM / (totals.distanceKm * 1000)) * 100;
  // Dezelfde gedachte als prefersClimb() in segment-suggestions.ts: bergop is
  // zinnig bij lange, zware blokken en vlak bij rustig of explosief werk.
  const wantsClimb =
    plannedIntensity === "tempo" ||
    plannedIntensity === "threshold" ||
    plannedIntensity === "vo2max";

  const isClimb = gradePct >= CLIMB_GRADE_PCT;
  const isRolling = gradePct >= ROLLING_GRADE_PCT;
  const scorePct = wantsClimb
    ? isClimb
      ? 100
      : isRolling
        ? 60
        : 25
    : isRolling
      ? isClimb
        ? 25
        : 60
      : 100;

  const shape = isClimb ? "klimwerk" : isRolling ? "golvend" : "vlak";
  return {
    dimension: "terrein",
    scorePct,
    note: `${event.route.name}: ${shape}, ${totals.elevationM} hm over ${totals.distanceKm.toFixed(1)} km`,
  };
}

function startScore(event: ZwiftEventCandidate, session: PlannedSession): MatchScore {
  const diffMinutes =
    Math.abs(new Date(event.startAt).getTime() - new Date(session.scheduledAt).getTime()) / 60000;
  const time = new Date(event.startAt).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Amsterdam",
  });
  return {
    dimension: "starttijd",
    // Drie uur naast je geplande moment is geen voorstel meer maar een andere dagindeling.
    scorePct: clampPct(100 - (diffMinutes / 180) * 100),
    note: `Start om ${time}`,
  };
}

function popularityScore(
  event: ZwiftEventCandidate,
  popularity: PopularityIndex | null,
): MatchScore | null {
  if (event.zwbSignups && event.zwbSignups > 0) {
    return {
      dimension: "populariteit",
      scorePct: 100,
      note: `${event.zwbSignups} ZWB'er${event.zwbSignups === 1 ? " rijdt" : "s rijden"} mee`,
    };
  }
  if (!popularity || event.totalSignups === null || event.totalSignups === undefined) return null;
  const percentile = popularity.percentileFor(event.startAt, event.totalSignups);
  if (percentile === null) return null;
  return {
    dimension: "populariteit",
    scorePct: percentile,
    note: `${event.totalSignups} inschrijvingen`,
  };
}

/**
 * Één event scoren. `null` als een hard filter het wegstuurt of als er te weinig
 * te vergelijken valt — zonder duurschatting is elk oordeel een gok.
 */
export function scoreEvent(
  event: ZwiftEventCandidate,
  session: PlannedSession,
  athlete: MatchAthlete,
  options: { now?: Date; popularity?: PopularityIndex | null } = {},
): ZwiftEventMatch | null {
  const now = options.now ?? new Date();
  const subgroup = chooseSubgroup(event, athlete, session);
  const watts = wattsForEvent(event, subgroup, athlete);
  const estimatedMinutes = estimateEventMinutes(event, watts, athlete.weightKg);

  if (rejectReason(event, session, athlete, now, estimatedMinutes) !== null) return null;
  if (estimatedMinutes === null || estimatedMinutes <= 0) return null;
  if (session.durationMinutes <= 0) return null;

  const scores: MatchScore[] = [durationScore(estimatedMinutes, session.durationMinutes)];

  const intensity = eventIntensity(event, subgroup, athlete);
  if (intensity) scores.push(intensityScore(intensity.intensity, session.intensity));

  // Belasting kan alleen als we weten hoe hard het event gereden wordt; anders
  // zou de IF een aanname zijn en meet de score onze eigen aanname.
  const plannedLoad = estimateTrainingLoad(session.blocks, athlete.ftpWatts);
  if (intensity?.pctFtp && plannedLoad > 0) {
    const factor = intensity.pctFtp / 100;
    const estimatedLoad = (estimatedMinutes / 60) * factor * factor * 100;
    scores.push(loadScore(estimatedLoad, plannedLoad));
  }

  const terrain = terrainScore(event, session.intensity);
  if (terrain) scores.push(terrain);

  scores.push(startScore(event, session));

  const popularity = popularityScore(event, options.popularity ?? null);
  if (popularity) scores.push(popularity);

  // Hernormaliseren over de bekende dimensies: een veld dat Zwift niet meestuurt
  // mag de score niet drukken. Zie de kop van dit bestand.
  const totalWeight = scores.reduce((sum, score) => sum + MATCH_WEIGHTS[score.dimension], 0);
  if (totalWeight <= 0) return null;
  const scorePct = clampPct(
    scores.reduce((sum, score) => sum + score.scorePct * MATCH_WEIGHTS[score.dimension], 0) /
      totalWeight,
  );

  const ranked = [...scores].sort((a, b) => b.scorePct - a.scorePct);
  const weakest = ranked[ranked.length - 1];

  return {
    event,
    scorePct,
    subgroup,
    estimatedMinutes,
    scores,
    strongest: ranked[0] ?? null,
    // Een zwakste punt dat zelf goed scoort is geen waarschuwing waard.
    weakest: weakest && weakest.scorePct < 70 ? weakest : null,
  };
}

/**
 * De beste voorstellen voor één geplande training. Sorteert op score, en toont
 * niets onder MATCH_FLOOR_PCT — dezelfde afweging als fitIsInformative() in
 * fit.ts: liever geen knop dan een knop die niets betekent.
 */
export function suggestZwiftEvents(
  events: ZwiftEventCandidate[],
  session: PlannedSession,
  athlete: MatchAthlete,
  options: { now?: Date; limit?: number } = {},
): ZwiftEventMatch[] {
  const popularity = buildPopularityIndex(events);
  return events
    .flatMap((event) => {
      const match = scoreEvent(event, session, athlete, { now: options.now, popularity });
      return match && match.scorePct >= MATCH_FLOOR_PCT ? [match] : [];
    })
    .sort(
      (a, b) =>
        b.scorePct - a.scorePct ||
        // Gelijke score: de vroegste start wint, dan is de keuze tenminste stabiel.
        a.event.startAt.localeCompare(b.event.startAt),
    )
    .slice(0, options.limit ?? 3);
}
