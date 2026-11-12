// De eventpagina van zwiftracing.app uitlezen. Puur: geen I/O.
//
// `zwiftracing.app/events/<zwift-event-id>` (gemeten 2026-11-12): vóór de race
// (`mode: "signups"`) per pen de aangemelde renners met `eventRating` (vELO2 ×
// de routeweging van ZwiftRacing) en `expectedPosition`; na de race
// (`mode: "results"`) per renner ook `position`. Let op: in de uitslag van een
// ladderrace staat de `eventRating` bovenaan op de schaal van vELO1; de vELO2-
// versie staat dan in `velo.seed`. We lezen de `eventRating` daarom alleen vóór
// de race; na de race alleen de plekken.
//
// Een ladderevent kende ZwiftRacing vooraf niet (404 op 2026-11-12); een ZRL-race
// vooraf is nog niet gezien.
//
// Alleen getallen die de verwachting nodig heeft: geen namen, geen gewicht,
// lengte, leeftijd of zFTP (keuze eigenaar bij de racebriefing, 2026-10-20).

import { asNumber, asObject, readTsrLoader, type TsrValue } from "./tsr-data";

export type ZrPower = { s15: number | null; m1: number | null; m2: number | null; m5: number | null; m20: number | null };

export type ZrEventRider = {
  zwiftId: number;
  /** Alleen vóór de race: sterkte op dit parcours (vELO2 × routeweging). */
  eventRating: number | null;
  /** Verwachte plek in de pen, zoals ZwiftRacing hem toont. */
  expectedPosition: number | null;
  /** Alleen na de race; null bij een DNF of zonder uitslag. */
  position: number | null;
  /** Beste W/kg over 90 dagen. */
  power: ZrPower | null;
  phenotype: string | null;
};

/** Een pen: een subgroep of startvak; `label` is de naam ervan ("A", "B" …), geen persoon. */
export type ZrEventPen = { id: string; label: string | null; riders: ZrEventRider[] };

export type ZrEvent = {
  zwiftEventId: number;
  mode: "signups" | "results" | "other";
  finalized: boolean;
  pens: ZrEventPen[];
};

const round = (value: number | null, digits: number) => (value == null || !(value > 0) ? null : Math.round(value * 10 ** digits) / 10 ** digits);
const positiveInt = (value: TsrValue | undefined) => {
  const n = asNumber(value);
  return n != null && Number.isSafeInteger(n) && n > 0 ? n : null;
};

function readPower(value: TsrValue | undefined): ZrPower | null {
  const p = asObject(value);
  if (!p) return null;
  const power = {
    s15: round(asNumber(p.wkg15), 2),
    m1: round(asNumber(p.wkg60), 2),
    m2: round(asNumber(p.wkg120), 2),
    m5: round(asNumber(p.wkg300), 2),
    m20: round(asNumber(p.wkg1200), 2),
  };
  return Object.values(power).some((v) => v != null) ? power : null;
}

function readRider(value: TsrValue, signups: boolean): ZrEventRider | null {
  const rider = asObject(value);
  const zwiftId = positiveInt(rider?.riderId);
  if (!rider || !zwiftId) return null;
  // Bij de aanmeldingen zit het rennerdocument soms een laag dieper.
  const doc = asObject(asObject(rider.points)?.$__parent);
  const label = (asObject(rider.phenotype) ?? asObject(doc?.phenotype))?.label;
  return {
    zwiftId,
    eventRating: signups ? round(asNumber(rider.eventRating), 1) : null,
    expectedPosition: positiveInt(rider.expectedPosition),
    position: positiveInt(rider.position),
    power: readPower(rider.power) ?? readPower(doc?.power),
    phenotype: typeof label === "string" ? label : null,
  };
}

/** Het event, of null als dit niet de pagina van dit event is of de opbouw anders is. */
export function parseEventPage(html: string, zwiftEventId: number): ZrEvent | null {
  const loader = readTsrLoader(html, `events ${zwiftEventId}`);
  if (!loader || positiveInt(loader.eventId) !== zwiftEventId) return null;
  const mode = loader.mode === "signups" || loader.mode === "results" ? loader.mode : "other";
  const pens: ZrEventPen[] = [];
  for (const pen of Array.isArray(loader.pens) ? loader.pens : []) {
    const p = asObject(pen);
    if (!p) continue;
    const riders = (Array.isArray(p.riders) ? p.riders : [])
      .map((r) => readRider(r, mode === "signups"))
      .filter((r): r is ZrEventRider => r !== null);
    const label = typeof p.name === "string" && p.name.trim().length > 0 && p.name.length <= 20 ? p.name.trim() : null;
    pens.push({ id: String(p.id ?? ""), label, riders });
  }
  return { zwiftEventId, mode, finalized: loader.resultsFinalized === true, pens };
}

/** Per renner zijn pen en hoeveel renners erin staan (na de race: wie finishte). */
export function penOf(event: ZrEvent, zwiftId: number): { pen: ZrEventPen; rider: ZrEventRider; size: number } | null {
  for (const pen of event.pens) {
    const rider = pen.riders.find((r) => r.zwiftId === zwiftId);
    if (!rider) continue;
    const size = event.mode === "results" ? pen.riders.filter((r) => r.position != null).length : pen.riders.length;
    return { pen, rider, size };
  }
  return null;
}
