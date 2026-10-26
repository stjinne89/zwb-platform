// Herstel-data (wellness) uit intervals.icu syncen + samenvatten voor de
// AI-trainingsplanning. Strikt opt-in (wellness_opt_in op de koppeling);
// writes via service-role naar profile_wellness.

import { fetchIntervalsWellness, type IntervalsWellness } from "@/lib/intervals/client";

export type WellnessSummary = {
  days: number; // hoeveel dagen met data in het venster
  latestDate: string | null;
  restingHr: number | null; // gemiddelde laatste 7d
  hrv: number | null; // gemiddelde laatste 7d
  sleepHours: number | null; // gemiddelde laatste 7d
  readiness: number | null; // meest recente, mits niet ouder dan 7 dagen
  /**
   * Waar de readiness vandaan komt. Garmin levert er geen aan intervals.icu
   * (Body Battery en Training Readiness blijven in Garmin Connect), dus voor die
   * leden rekenen we er zelf een uit. Dat moet zichtbaar blijven: een afgeleid
   * getal is geen meting.
   */
  readinessSource: "device" | "afgeleid" | null;
  /** Dag van de meting waar de readiness op rust. */
  readinessDate: string | null;
  /**
   * Zegt de readiness iets over vandaag? Een meting van het apparaat alleen als
   * hij van vandaag is: de score van gisteren gaat over de nacht daarvóór. Een
   * afgeleide readiness is een weektrend en telt zolang hij vers genoeg is.
   */
  readinessCurrent: boolean;
  /** Aftrek op de trainingsruimte door korte nachten (0 = genoeg geslapen). */
  sleepPenalty: number;
  /**
   * Waar het weekgemiddelde van ln rMSSD ligt ten opzichte van de eigen
   * normale band; null zonder genoeg metingen. Zie `hrvBand()`.
   */
  hrvBand: "below" | "within" | "above" | null;
  /** Rust-hartslag van deze week boven de eigen band. */
  restingHrRaised: boolean;
  // Trend t.o.v. eigen baseline: 'fresh' | 'normal' | 'fatigued' | 'unknown'.
  state: "fresh" | "normal" | "fatigued" | "unknown";
  note: string;
};

/**
 * Hoe het lid zich zelf voelt: het verslag na een rit en het klachtenlogboek.
 * Weegt mee naast HRV en rust-HR, zoals in Alfonso e.a. 2025 (HRV, rust-HR en
 * welbevinden samen werkten beter dan HRV alleen). Zie
 * docs/wetenschappelijke-toets.md, 1C.
 */
export type SubjectiveRecovery = {
  /** Het lid gaf de laatste dagen aan dat het zwaar ging. */
  heavy: boolean;
  note: string;
};

export type TrainingReadinessSummary = {
  state: "ready" | "caution" | "recovery" | "unknown";
  label: string;
  score: number | null;
  notes: string[];
};

type WellnessRow = {
  date: string;
  resting_hr: number | null;
  hrv: number | null;
  sleep_secs: number | null;
  sleep_score: number | null;
  readiness: number | null;
  fatigue: number | null;
  stress: number | null;
  soreness: number | null;
  mood: number | null;
};

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Hoe oud de opgeslagen kopie mag zijn voordat we opnieuw ophalen. */
export const WELLNESS_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/** Records uit intervals.icu naar rijen; dagen zonder enige waarde vallen af. */
function wellnessRows(profileId: string, records: IntervalsWellness[]) {
  const now = new Date().toISOString();
  return records
    .map((r) => ({
      profile_id: profileId,
      date: r.id, // intervals wellness-id = "YYYY-MM-DD"
      resting_hr: num(r.restingHR),
      // Alleen rMSSD. SDNN is een andere maat met andere getallen; als
      // terugval kwam hij in hetzelfde gemiddelde terecht en vertekende hij de
      // band. Rijen van vóór 2026-10-16 kunnen nog SDNN bevatten.
      hrv: num(r.hrv),
      sleep_secs: num(r.sleepSecs),
      sleep_score: num(r.sleepScore),
      readiness: num(r.readiness),
      fatigue: num(r.fatigue),
      stress: num(r.stress),
      soreness: num(r.soreness),
      mood: num(r.mood),
      synced_at: now,
    }))
    .filter(
      (r) =>
        /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        (r.resting_hr != null ||
          r.hrv != null ||
          r.sleep_secs != null ||
          r.sleep_score != null ||
          r.readiness != null ||
          r.fatigue != null ||
          r.stress != null ||
          r.soreness != null ||
          r.mood != null),
    );
}

/**
 * Schrijft al opgehaalde wellness-records weg. Aparte functie omdat de
 * trainingspagina's die records tóch al ophalen; die hoeven intervals.icu niet
 * een tweede keer te bevragen om de opgeslagen kopie bij te werken.
 */
export async function persistWellnessRecords(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  records: IntervalsWellness[],
): Promise<{ upserted: number }> {
  const rows = wellnessRows(profileId, records);
  if (rows.length === 0) return { upserted: 0 };

  const { error } = await supabase
    .from("profile_wellness")
    .upsert(rows, { onConflict: "profile_id,date" });
  if (error) {
    // Stil falen was precies waardoor een lege kopie maandenlang leeg bleef.
    console.error("[wellness] wegschrijven mislukt", { profileId, error: error.message });
    return { upserted: 0 };
  }
  return { upserted: rows.length };
}

/**
 * Haalt de wellness-records uit intervals.icu en upsert ze in
 * profile_wellness. Schrijft alleen dagen met minstens één herstel-veld.
 */
export async function syncWellnessForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  apiKey: string,
  athleteId: string,
  profileId: string,
  // Even lang als de samenvatting terugkijkt. Tot 2026-10-22 was dit 30: na
  // het uit- en aanzetten van de opt-in ontbrak dan een week baseline.
  days = WELLNESS_SUMMARY_DAYS,
): Promise<{ upserted: number }> {
  const records = await fetchIntervalsWellness(apiKey, athleteId, days);
  return persistWellnessRecords(supabase, profileId, records);
}

/**
 * Wist de opgeslagen herstelwaarden van één lid. Voor ontkoppelen van
 * intervals.icu en het uitzetten van de opt-in: deze gegevens verwerken we op
 * grond van toestemming (AVG art. 9), en die is altijd in te trekken. De
 * trainingsdata (ritten, belasting, zonetijden) blijft staan; zie /privacy.
 *
 * Met de service-role: profile_wellness heeft geen delete-policy voor leden.
 */
export async function purgeWellnessForProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
): Promise<{ error: string | null }> {
  const { error } = await admin.from("profile_wellness").delete().eq("profile_id", profileId);
  return { error: error?.message ?? null };
}

/** Leeftijd van de opgeslagen kopie; null als er nog niets staat. */
export async function wellnessCopyAgeMs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("profile_wellness")
    .select("synced_at")
    .eq("profile_id", profileId)
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.synced_at) return null;
  const ms = new Date(data.synced_at).getTime();
  return Number.isFinite(ms) ? Date.now() - ms : null;
}

/**
 * Zelfherstellend: werkt de opgeslagen kopie bij zodra die ouder is dan
 * `WELLNESS_MAX_AGE_MS` (of nog helemaal ontbreekt). Geef `records` mee als de
 * beller ze al heeft; dan gaat er geen extra call naar intervals.icu.
 *
 * Bewust best-effort: een mislukte verversing mag een pagina nooit breken,
 * maar wordt wel gelogd zodat het niet opnieuw jarenlang onopgemerkt blijft.
 */
export async function refreshWellnessIfStale(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  source: { apiKey: string; athleteId: string; records?: IntervalsWellness[] },
  /** Altijd ophalen, ook bij een verse kopie. */
  options: { force?: boolean } = {},
): Promise<{ refreshed: boolean; upserted: number }> {
  try {
    if (!options.force) {
      const age = await wellnessCopyAgeMs(supabase, profileId);
      if (age != null && age < WELLNESS_MAX_AGE_MS) {
        return { refreshed: false, upserted: 0 };
      }
    }
    const { upserted } = source.records
      ? await persistWellnessRecords(supabase, profileId, source.records)
      : await syncWellnessForUser(supabase, source.apiKey, source.athleteId, profileId);
    return { refreshed: true, upserted };
  } catch (err) {
    console.error("[wellness] verversen mislukt", {
      profileId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { refreshed: false, upserted: 0 };
  }
}

function avg(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Steekproef-standaardafwijking; null bij minder dan twee waarden. */
function sd(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function present(values: (number | null)[]): number[] {
  return values.filter((v): v is number => v != null && Number.isFinite(v));
}

export type HrvBand = {
  /** ln rMSSD van deze week min die van de baseline. */
  delta: number;
  /** Halve breedte van de band, in ln-eenheden. */
  half: number;
  position: "below" | "within" | "above";
};

/**
 * Het weekgemiddelde van ln rMSSD tegenover de normale band van dit lid: het
 * gemiddelde van de 30 dagen ervóór, ± 0,5 × hun standaardafwijking. De
 * logaritme omdat HRV scheef verdeeld is; het weekgemiddelde omdat één ochtend
 * te veel ruis heeft (Plews 2012, 2013; Buchheit 2014).
 *
 * Null zonder genoeg metingen: minstens drie deze week en `MIN_BASELINE_DAYS`
 * in de baseline. Met minder is de band zelf ruis.
 */
export function hrvBand(recent: (number | null)[], baseline: (number | null)[]): HrvBand | null {
  const recentLn = present(recent).filter((v) => v > 0).map(Math.log);
  const baseLn = present(baseline).filter((v) => v > 0).map(Math.log);
  if (recentLn.length < MIN_RECENT_VALUES || baseLn.length < MIN_BASELINE_DAYS) return null;
  const baseSd = sd(baseLn);
  if (baseSd == null) return null;
  const delta = avg(recentLn)! - avg(baseLn)!;
  const half = Math.max(SWC_FACTOR * baseSd, MIN_HRV_HALF_BAND);
  const position = delta < -half ? "below" : delta > half ? "above" : "within";
  return { delta, half, position };
}

/**
 * Hetzelfde voor de rust-hartslag, in slagen. De band is nooit smaller dan
 * ±3 slagen, de vaste regel van vóór 2026-10-16.
 */
export function restingHrBand(
  recent: (number | null)[],
  baseline: (number | null)[],
): { delta: number; half: number; raised: boolean } | null {
  const recentValues = present(recent);
  const baseValues = present(baseline);
  if (recentValues.length < MIN_RECENT_VALUES || baseValues.length < MIN_BASELINE_DAYS) return null;
  const baseSd = sd(baseValues);
  if (baseSd == null) return null;
  const delta = avg(recentValues)! - avg(baseValues)!;
  const half = Math.max(SWC_FACTOR * baseSd, MIN_RHR_HALF_BAND);
  return { delta, half, raised: delta > half };
}

// Het readiness-veld in intervals.icu is één veld waar elke wellness-bron z'n
// eigen schaal in duwt. Garmin (Training Readiness), Oura en Whoop leveren
// 0-100. Polar's Nightly Recharge komt binnen als kleine integer-schaal ("very
// poor → very good"). Zonder correctie leest de app een Polar-"3" (Ok) als
// "3 van de 100 = zwaar overtraind". Het lid kiest z'n apparaat in het profiel
// zodat we de juiste interpretatie kunnen toepassen.
export const WELLNESS_DEVICES = [
  "garmin",
  "polar",
  "oura",
  "whoop",
  "coros",
  "suunto",
  "other",
] as const;
export type WellnessDevice = (typeof WELLNESS_DEVICES)[number];

// Polar Nightly Recharge status is een officiële 6-staps schaal:
// 1 very poor · 2 poor · 3 compromised · 4 OK · 5 good · 6 very good.
// We rekenen die om naar de 0-100 range waarop summarizeTrainingReadiness/ZWB
// rekent (≤50 vermoeid, ≥75 fris), zodat een "OK" (4 → 62) niet langer als
// 4/100 = overtraind leest. Waarden buiten 1..6 worden geclamped.
const POLAR_READINESS_TO_100: Record<number, number> = {
  1: 15,
  2: 30,
  3: 45,
  4: 62,
  5: 78,
  6: 90,
};

/**
 * Venster waarover HRV en rust-HR hun baseline krijgen: de 30 dagen vóór de
 * laatste week. Tot 2026-10-16 telde de laatste week zelf mee, waardoor een
 * vermoeide week zijn eigen maatstaf omlaag trok.
 */
export const BASELINE_DAYS = 30;

/**
 * Zoveel dagen herstel-data heeft de samenvatting nodig: de laatste week plus
 * de baseline ervóór, met wat marge. Elke beller haalt minstens dit op, zodat
 * pagina, AI en coachchat hetzelfde oordeel geven. Tot 2026-10-16 kregen de AI
 * en de chat 21 dagen en de pagina's 30.
 */
export const WELLNESS_SUMMARY_DAYS = 40;

/**
 * Halve breedte van de normale band als deel van de standaardafwijking van de
 * dagwaarden in de baseline: de kleinste relevante verandering (Plews 2012,
 * Vesterinen 2016; docs/wetenschappelijke-toets.md, 1C).
 */
export const SWC_FACTOR = 0.5;

/**
 * Ondergrens voor de halve band van ln rMSSD (~3 %). Eigen keuze: bij een lid
 * met heel stabiele metingen viel de band anders zo smal dat afronding van het
 * horloge al een oordeel gaf.
 */
const MIN_HRV_HALF_BAND = 0.03;

/**
 * Ondergrens voor de halve band van de rust-hartslag. Dat was tot 2026-10-16 de
 * vaste regel (+3 slagen); de band is nu per lid, maar nooit gevoeliger dan dat.
 */
const MIN_RHR_HALF_BAND = 3;

/** Minimaal aantal metingen in de laatste week voor een weekoordeel. */
const MIN_RECENT_VALUES = 3;

/** Ouder dan dit telt readiness niet meer mee en toont de app een streepje. */
export const READINESS_MAX_AGE_DAYS = 7;

/**
 * Gestaffelde slaapaftrek. Alleen structureel korte nachten zetten de status op
 * "fatigued"; daarboven is het een score-aftrek, zodat vijf minuten verschil in
 * het weekgemiddelde niet langer een heel adviesniveau kost.
 */
const SLEEP_STEPS: Array<{ below: number; penalty: number; note: string }> = [
  { below: 5.5, penalty: 22, note: "Structureel weinig slaap" },
  { below: 6.0, penalty: 14, note: "Weinig slaap" },
  { below: 6.5, penalty: 6, note: "Iets weinig slaap" },
];

/**
 * Neutrale start van de afgeleide readiness. 70 is in dit systeem de grens
 * tussen "ok" en "middelmatig": zonder afwijking van de eigen baseline is er
 * niets aan de hand, maar we claimen ook geen topherstel.
 */
const DERIVED_NEUTRAL = 70;

/** Een afgeleid getal mag nooit een 0 of een 100 suggereren. */
const DERIVED_MIN = 5;
const DERIVED_MAX = 95;

/**
 * Zoveel dagen moet de baseline minstens tellen. Daaronder vergelijk je het
 * weekgemiddelde vooral met zichzelf en komt er per definitie "normaal" uit.
 */
export const MIN_BASELINE_DAYS = 14;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Readiness voor leden van wie het apparaat er zelf geen levert — in de praktijk
 * Garmin, Coros en Suunto. Body Battery en Training Readiness komen niet mee in
 * de wellness-API van intervals.icu; wat er wél elke dag binnenkomt is HRV,
 * rust-hartslag en slaap. Precies de bouwstenen van een herstelscore.
 *
 * Slaapduur zit er bewust niet in. Die weegt via `sleepPenalty` als aftrek op
 * de trainingsruimte, net als bij een apparaat dat zelf readiness levert. In
 * dit getal kon zes uur slaap een lid met HRV en rust-HR op baseline onder de
 * 50 duwen, en dan op "herstel voorrang" zetten, terwijl de staffel dat alleen
 * bij structureel minder dan 5,5 uur doet.
 *
 * De schaal volgt de bestaande drempels (≤50 laag, <70 middelmatig, ≥75 goed),
 * zodat een afgeleide waarde net zo leest als die van een Whoop of Polar.
 * Alles wordt afgezet tegen de eigen band, niet tegen een absolute norm: een
 * HRV van 95 zegt niets zonder te weten wat voor dit lid gewoon is, en 5 %
 * minder is bij het ene lid ruis en bij het andere een signaal.
 *
 * Sinds 2026-10-16 telt de afwijking in "banden" (de halve breedte van de
 * normale band, zie `hrvBand()`) in plaats van in procenten. Eén band onder de
 * norm kost 15 punten. Bij een gangbare dagelijkse spreiding is een halve band
 * ~8 %, dus dat kost ongeveer wat 8 % lagere HRV eerder kostte (2 punten per
 * procent). Boven de band levert hooguit 10 punten op: een hoge HRV
 * bij zware belasting kan ook op overbelasting wijzen (Le Meur 2013,
 * Manresa-Rocamora 2021).
 *
 * Geeft null zodra er te weinig grond is voor een oordeel — dat is de normale
 * uitkomst voor een horloge dat geen HRV meet, en beter dan een getal dat het
 * trainingsadvies stuurt op ruis.
 */
export function deriveReadiness(input: {
  /** ln rMSSD van deze week min die van de baseline. */
  hrvDelta: number | null;
  /** Halve breedte van de HRV-band, in ln-eenheden. */
  hrvHalf: number | null;
  /** Rust-hartslag van deze week min die van de baseline, in slagen. */
  rhrDelta: number | null;
  /** Halve breedte van de rust-HR-band, in slagen. */
  rhrHalf: number | null;
  sleepScore: number | null;
  baselineDays: number;
  /** Ouderdom van de nieuwste meting; oude data mag geen vers oordeel opleveren. */
  dataAgeDays: number | null;
}): number | null {
  const { hrvDelta, hrvHalf, rhrDelta, rhrHalf, sleepScore, baselineDays } = input;
  if (baselineDays < MIN_BASELINE_DAYS) return null;

  // Zonder verse meting zegt een herstelgetal niets. Een lid van wie het
  // horloge maanden geleden is gestopt met leveren kreeg anders een keurige
  // score op data van vorig seizoen.
  if (input.dataAgeDays == null || input.dataAgeDays > READINESS_MAX_AGE_DAYS) return null;

  const hasHrv = hrvDelta != null && hrvHalf != null && hrvHalf > 0;
  const hasRhr = rhrDelta != null && rhrHalf != null && rhrHalf > 0;

  // HRV is verplicht. Rust-hartslag alleen is te dun: het verschil tussen een
  // week- en maandgemiddelde is daar vaak twee slagen, en dat is meetruis. Wie
  // daarop een getal baseert, zet leden structureel op "matig" zonder dat er
  // iets aan de hand is. Liever een streepje dan een verzonnen oordeel.
  if (!hasHrv) return null;

  let score = DERIVED_NEUTRAL;

  // HRV onder de eigen band is het sterkste vermoeidheidssignaal, dus die weegt
  // naar beneden zwaarder dan naar boven.
  score += clamp((hrvDelta! / hrvHalf!) * 15, -25, 10);

  // Verhoogde rust-hartslag wijst op onvoltooid herstel. Eén band erboven kost
  // ~18 punten, net als de oude +3 slagen.
  if (hasRhr) score += clamp((-rhrDelta! / rhrHalf!) * 18, -20, 10);

  // Slaapkwaliteit als bijstelling, niet als hoofdmoot: 75 is neutraal.
  if (sleepScore != null) score += clamp((sleepScore - 75) / 3, -8, 8);

  return Math.round(clamp(score, DERIVED_MIN, DERIVED_MAX));
}

/** Hele dagen tussen twee datumsleutels ("YYYY-MM-DD"); null bij onzin. */
function daysBetween(from: string, to: string): number | null {
  const a = new Date(`${from}T12:00:00`).getTime();
  const b = new Date(`${to}T12:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

function normalizeReadiness(
  raw: number,
  device?: WellnessDevice | null,
): number {
  if (device === "polar") {
    const step = Math.min(6, Math.max(1, Math.round(raw)));
    return POLAR_READINESS_TO_100[step];
  }
  return raw; // garmin/oura/whoop/coros/suunto/other/onbekend = al 0-100
}

/** Venster voor de "laatste 7 dagen"-gemiddelden. */
export const RECENT_DAYS = 7;

/**
 * Onder deze TSB verzachten we niet meer, hoe goed de hersteldata ook is. Zo
 * diep in de min is de kans op overreaching te groot om op één goede
 * HRV-week te varen, en past de huisregel "bij twijfel minder belasting".
 */
export const SEVERE_TSB = -40;

/**
 * Vat de laatste 7 dagen herstel samen + bepaalt een grove "state" door de
 * recente HRV/rust-HR te vergelijken met de normale band uit de 30 dagen
 * daarvóór (`hrvBand`, `restingHrBand`).
 * `device` bepaalt hoe de readiness-schaal geïnterpreteerd wordt (zie boven).
 *
 * De vensters lopen op datum, niet op aantal rijen. Dat is het verschil tussen
 * "de laatste zeven dagen" en "de zeven nieuwste rijen die er zijn": bij een
 * horloge dat maanden geleden stopte met leveren was dat laatste een
 * februari-gemiddelde onder het kopje "7d gem.". Oude data hoort niets meer te
 * zeggen over hoe iemand er nu voor staat.
 */
export function summarizeWellness(
  rows: WellnessRow[],
  device?: WellnessDevice | null,
  /**
   * Referentiedag voor de recentheidsgrens; los meegeefbaar zodat dit testbaar
   * blijft. Een Amsterdamse dag, net als de datum van een wellness-rij: met UTC
   * was een meting van vandaag tussen middernacht en twee uur 's nachts een dag
   * uit de toekomst.
   */
  today: string = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" }),
): WellnessSummary | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date)); // nieuwste eerst

  // Een rij uit de toekomst is onzin (tijdzone-artefact) en telt niet mee.
  // Vandaag telt als dag één: met `age <= days` besloeg "7 dagen" er acht en
  // "30 dagen" er eenendertig.
  const withinDays = (row: WellnessRow, days: number) => {
    const age = daysBetween(row.date, today);
    return age != null && age >= 0 && age < days;
  };
  const last7 = sorted.filter((row) => withinDays(row, RECENT_DAYS));

  const restingHr = avg(last7.map((r) => r.resting_hr));
  const hrv = avg(last7.map((r) => r.hrv));
  const sleepSecs = avg(last7.map((r) => r.sleep_secs));
  const sleepScore = avg(last7.map((r) => r.sleep_score));

  // Readiness telt alleen als hij vers is. Zonder deze grens bleef een waarde
  // van maanden geleden meetellen zodra een apparaat stopte met leveren; nu
  // valt hij terug op "-" en is zichtbaar dat er niets is aangeleverd.
  const readinessRow = sorted.find((r) => r.readiness != null) ?? null;
  const readinessAgeDays =
    readinessRow == null ? null : daysBetween(readinessRow.date, today);
  const readinessIsStale =
    readinessAgeDays == null || readinessAgeDays > READINESS_MAX_AGE_DAYS;
  const rawReadiness = readinessIsStale ? null : (readinessRow?.readiness ?? null);
  const deviceReadiness =
    rawReadiness == null ? null : normalizeReadiness(rawReadiness, device);
  const sleepHours = sleepSecs != null ? sleepSecs / 3600 : null;

  // Baseline over de 30 dagen vóór de laatste week. Over het hele venster (tot
  // 2 jaar) moest een weekgemiddelde een tweejaarsgemiddelde verslaan om als
  // "fris" te gelden; dat lukte vrijwel nooit en liet de baseline bovendien
  // meedrijven met seizoen en vormopbouw.
  const freshRows = sorted.filter((row) => withinDays(row, RECENT_DAYS + BASELINE_DAYS));
  const baselineWindow = freshRows.filter((row) => !withinDays(row, RECENT_DAYS));
  const hrvPosition = hrvBand(
    last7.map((r) => r.hrv),
    baselineWindow.map((r) => r.hrv),
  );
  const rhrPosition = restingHrBand(
    last7.map((r) => r.resting_hr),
    baselineWindow.map((r) => r.resting_hr),
  );

  // Levert het apparaat geen readiness, dan rekenen we er zelf een uit de
  // signalen die er wél zijn. Dat gebeurt bewust ná de baseline-berekening en
  // beïnvloedt hieronder de `state` niet: die komt uit dezelfde HRV en rust-HR,
  // en zou anders dubbel meetellen.
  const derivedReadiness =
    deviceReadiness != null
      ? null
      : deriveReadiness({
          hrvDelta: hrvPosition?.delta ?? null,
          hrvHalf: hrvPosition?.half ?? null,
          rhrDelta: rhrPosition?.delta ?? null,
          rhrHalf: rhrPosition?.half ?? null,
          sleepScore,
          baselineDays: baselineWindow.length,
          dataAgeDays: sorted[0] ? daysBetween(sorted[0].date, today) : null,
        });
  const readiness = deviceReadiness ?? derivedReadiness;
  const readinessSource: WellnessSummary["readinessSource"] =
    deviceReadiness != null ? "device" : derivedReadiness != null ? "afgeleid" : null;
  const readinessDate =
    deviceReadiness != null
      ? (readinessRow?.date ?? null)
      : derivedReadiness != null
        ? (sorted[0]?.date ?? null)
        : null;
  // Op 12 september 2026 vroeg een lid 's ochtends om een lange training. De
  // Polar-score van die nacht was nog niet binnen, en de "poor" van de dag
  // ervoor las als readiness van vandaag: de AI gaf een herstelrit van een half
  // uur. Een meting van het apparaat stuurt daarom alleen op de dag zelf.
  const deviceReadinessCurrent = deviceReadiness != null && readinessAgeDays != null && readinessAgeDays <= 0;
  const readinessCurrent = readiness != null && (derivedReadiness != null || deviceReadinessCurrent);

  let state: WellnessSummary["state"] = "unknown";
  const notes: string[] = [];
  if (hrvPosition) {
    if (hrvPosition.position === "below") {
      state = "fatigued";
      notes.push("HRV onder je normale band (mogelijk vermoeid).");
    } else if (hrvPosition.position === "above") {
      // 'fresh' blijft de status, maar de tekst claimt geen herstel: een HRV
      // boven de band komt ook voor bij overbelasting. Bij zware belasting
      // weegt summarizeTrainingReadiness dat mee.
      state = "fresh";
      notes.push("HRV boven je normale band.");
    } else {
      state = "normal";
    }
  }
  if (state !== "fatigued" && rhrPosition?.raised) {
    state = "fatigued";
    notes.push("Rust-hartslag boven je normale band.");
  }
  if (deviceReadiness != null && !deviceReadinessCurrent) {
    // Geen oordeel op een oude meting, wel zichtbaar dat hij er is.
    notes.push(
      `Readiness van vandaag nog niet binnen; laatste meting ${readinessRow?.date} (${Math.round(deviceReadiness)}).`,
    );
  } else if (deviceReadiness != null) {
    if (deviceReadiness <= 50) {
      state = "fatigued";
      notes.push(`Readiness laag (${Math.round(deviceReadiness)}).`);
    } else if (deviceReadiness < 70) {
      if (state === "fresh" || state === "unknown") state = "normal";
      notes.push(`Readiness middelmatig (${Math.round(deviceReadiness)}).`);
    } else if (deviceReadiness >= 75 && state === "unknown") {
      state = "fresh";
    }
    if (device === "polar") {
      notes.push("Readiness omgerekend van Polar's Nightly Recharge-schaal naar 0-100.");
    }
  } else if (derivedReadiness != null) {
    // Bewust géén aanpassing van `state`: die komt uit dezelfde HRV en rust-HR.
    notes.push(
      `Readiness ${derivedReadiness} berekend uit je HRV, rust-hartslag en slaap; je apparaat levert er zelf geen.`,
    );
  } else if (readinessRow) {
    // Er is wél ooit een readiness geweest, maar te oud om nog iets te zeggen.
    notes.push(
      `Geen readiness van de laatste ${READINESS_MAX_AGE_DAYS} dagen; laatste meting ${readinessRow.date}.`,
    );
  }

  // Gestaffeld: alleen de zwaarste stap zet de status om, de lichtere stappen
  // zijn een aftrek op de score.
  let sleepPenalty = 0;
  if (sleepHours != null) {
    const step = SLEEP_STEPS.find((entry) => sleepHours < entry.below);
    if (step) {
      sleepPenalty = step.penalty;
      notes.push(`${step.note} (${sleepHours.toFixed(1)}u gemiddeld).`);
      if (step.below === 5.5 && (state === "unknown" || state === "normal")) {
        state = "fatigued";
      }
    }
  }

  // Alles buiten het venster: er is wél data, maar niets recents. Zonder deze
  // melding zou de app "Herstelwaarden binnen de normale range" tonen op basis
  // van cijfers van maanden geleden.
  if (freshRows.length === 0) {
    state = "unknown";
    const laatste = sorted[0]?.date;
    const span = RECENT_DAYS + BASELINE_DAYS;
    notes.length = 0;
    notes.push(
      laatste
        ? `Geen hersteldata van de laatste ${span} dagen; laatste meting ${laatste}.`
        : `Geen hersteldata van de laatste ${span} dagen.`,
    );
  } else if (last7.length === 0) {
    // Wel een baseline, geen week. Zonder deze tak viel dit in "binnen de
    // normale range": een Garmin-lid van wie de koppeling met intervals.icu
    // stillag, kreeg dat 18 dagen lang te lezen, en de AI ook (2026-10-22).
    state = "unknown";
    notes.length = 0;
    notes.push(
      `Geen hersteldata van de laatste ${RECENT_DAYS} dagen; laatste meting ${sorted[0].date}.`,
    );
  } else if (notes.length === 0) {
    notes.push(
      state === "fresh"
        ? "Herstelwaarden zien er goed uit."
        : "Herstelwaarden binnen de normale range.",
    );
  }

  return {
    // Aantal dagen met verse data, niet het aantal opgeslagen rijen: dat laatste
    // suggereerde een gevuld venster terwijl het maanden oud kon zijn.
    days: freshRows.length,
    latestDate: sorted[0]?.date ?? null,
    restingHr: restingHr != null ? Math.round(restingHr) : null,
    hrv: hrv != null ? Math.round(hrv) : null,
    sleepHours: sleepHours != null ? Math.round(sleepHours * 10) / 10 : null,
    readiness: readiness != null ? Math.round(readiness) : null,
    readinessSource,
    readinessDate,
    readinessCurrent,
    sleepPenalty,
    hrvBand: hrvPosition?.position ?? null,
    restingHrRaised: rhrPosition?.raised ?? false,
    state,
    note: notes.join(" "),
  };
}

export function summarizeTrainingReadiness({
  tsb,
  wellness,
  subjective,
}: {
  tsb: number | null | undefined;
  wellness: WellnessSummary | null | undefined;
  /** Hoe het lid zich voelt; zie `SubjectiveRecovery`. Weglaten = geen signaal. */
  subjective?: SubjectiveRecovery | null;
}): TrainingReadinessSummary {
  const notes: string[] = [];
  let loadState: TrainingReadinessSummary["state"] = "unknown";
  let recoveryState: TrainingReadinessSummary["state"] = "unknown";
  let score = 72;

  // De TSB-grenzen (-25, -10, +8) en SEVERE_TSB zijn conventie, geen
  // fysiologie: de tijdconstanten van het onderliggende Banister-model zijn per
  // sporter erg onzeker (Hellard 2006). Zie docs/wetenschappelijke-toets.md, 1A.
  if (tsb == null || !Number.isFinite(tsb)) {
    notes.push("TSB ontbreekt, dus trainingsbelasting telt niet mee.");
  } else if (tsb <= -25) {
    loadState = "recovery";
    score -= 32;
    notes.push(`TSB ${tsb.toFixed(1)}: hoge trainingsvermoeidheid.`);
  } else if (tsb <= -10) {
    loadState = "caution";
    score -= 18;
    notes.push(`TSB ${tsb.toFixed(1)}: nog duidelijk belast.`);
  } else if (tsb < 8) {
    loadState = "caution";
    score -= 6;
    notes.push(`TSB ${tsb.toFixed(1)}: redelijk in balans.`);
  } else {
    loadState = "ready";
    score += 6;
    notes.push(`TSB ${tsb.toFixed(1)}: belasting is goed gezakt.`);
  }

  if (!wellness) {
    notes.push("Geen gedeelde hersteldata om readiness, slaap, HRV en rust-HR mee te wegen.");
  } else {
    // Een meting van een eerdere dag weegt niet mee; de notitie van de
    // samenvatting noemt hem wel.
    const readiness = wellness.readinessCurrent === false ? null : wellness.readiness;
    if (wellness.state === "fatigued" || (readiness != null && readiness <= 50)) {
      recoveryState = "recovery";
      score -= 28;
    } else if (readiness != null && readiness < 70) {
      recoveryState = "caution";
      score -= 16;
    } else if (wellness.state === "fresh" && (readiness == null || readiness >= 75)) {
      recoveryState = "ready";
      score += 8;
    } else if (wellness.state === "normal" || readiness != null) {
      recoveryState = "caution";
      score -= 4;
    }

    if (readiness != null) {
      notes.push(`Readiness ${Math.round(readiness)}${
        wellness.readinessSource === "afgeleid" ? " (berekend)" : ""
      }: ${
        readiness >= 75 ? "goed" : readiness >= 70 ? "ok" : readiness >= 51 ? "matig" : "laag"
      }.`);
    }

    // Korte nachten drukken de score gestaffeld; de zwaarste stap zit al in
    // `state` verwerkt en telt daar niet nog een keer bovenop. Geldt ook bij een
    // berekende readiness: die rekent zelf geen slaapduur mee.
    if (wellness.sleepPenalty > 0 && wellness.state !== "fatigued") {
      score -= wellness.sleepPenalty;
      if (recoveryState === "ready") recoveryState = "caution";
    }

    notes.push(wellness.note);
  }

  // Het lid zegt zelf dat het zwaar gaat. Dat haalt de ruimte voor kwaliteit
  // weg, maar zet niemand op herstel: één zwaar verslag is geen overbelasting.
  if (subjective?.heavy) {
    score -= 10;
    if (recoveryState === "ready" || recoveryState === "unknown") recoveryState = "caution";
    notes.push(subjective.note);
  }

  const heavyLoad = loadState === "recovery";

  // Een HRV boven de eigen band bij zware belasting is geen geruststelling: in
  // onderzoek steeg het weekgemiddelde juist bij overbelaste sporters (Le Meur
  // 2013; Manresa-Rocamora 2021). Tot 2026-10-16 telde dit hier als bewijs van
  // goede aanpassing.
  if (heavyLoad && wellness?.hrvBand === "above") {
    if (recoveryState === "ready") recoveryState = "caution";
    notes.push(
      "Je HRV ligt boven je normale band terwijl je belasting hoog is. Dat kan goede aanpassing zijn, maar ook overbelasting.",
    );
  }

  // Belastingmodel zegt "herstellen", lichaam zegt "niets aan de hand": HRV en
  // rust-hartslag in de eigen band, genoeg slaap, geen klachten. Dat is het
  // beeld van een renner in een opbouwblok, niet van iemand die overtraind
  // raakt. Zonder deze verzachting kreeg zo iemand "richt op herstel" terwijl
  // al zijn hersteldata het tegendeel liet zien.
  //
  // Bewust eenzijdig: andersom verzachten we nooit. TSB is een schatting uit een
  // model, HRV en slaap zijn metingen aan het lichaam. Zegt de meting dat er
  // vermoeidheid is, dan wint die altijd — ook bij een keurige TSB.
  const currentReadiness =
    wellness && wellness.readinessCurrent !== false ? wellness.readiness : null;
  if (
    heavyLoad &&
    wellness &&
    wellness.hrvBand === "within" &&
    !wellness.restingHrRaised &&
    wellness.state !== "fatigued" &&
    wellness.sleepPenalty === 0 &&
    (currentReadiness == null || currentReadiness >= 70) &&
    !subjective?.heavy &&
    tsb != null &&
    Number.isFinite(tsb) &&
    tsb > SEVERE_TSB
  ) {
    loadState = "caution";
    notes.push(
      "Je belasting is hoog, maar je HRV en rust-hartslag liggen in je normale band: geen herstelrust nodig, wel de scherpte eruit.",
    );
  }

  const states = [loadState, recoveryState];
  const hasUnknown = states.includes("unknown");
  const state: TrainingReadinessSummary["state"] =
    states.includes("recovery")
      ? "recovery"
      : states.includes("caution")
        ? "caution"
        : hasUnknown && states.includes("ready")
          ? "caution"
          : states.includes("ready")
          ? "ready"
          : "unknown";
  const boundedScore =
    state === "ready"
      ? Math.max(75, score)
      : state === "caution"
        ? Math.max(45, Math.min(69, score))
        : state === "recovery"
          ? Math.min(44, score)
          : null;

  return {
    state,
    label:
      state === "ready"
        ? "Ruimte voor kwaliteit"
        : state === "recovery"
          ? "Herstel voorrang"
          : state === "caution"
            ? "Beperkte trainingsruimte"
            : "Te weinig data",
    score: boundedScore == null ? null : Math.max(0, Math.min(100, Math.round(boundedScore))),
    notes,
  };
}

/**
 * Voor de AI-flow: als het lid wellness deelt (opt-in) + intervals gekoppeld
 * is, synct het de verse data (best-effort) en geeft een samenvatting terug.
 * Geeft null als er geen opt-in/koppeling/data is. Gebruik met service-role.
 */
export async function wellnessForAi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
  /**
   * `fresh`: altijd bij intervals.icu ophalen. Voor een aanvraag van het lid
   * zelf: de nacht van vandaag komt vaak pas na de laatste sync binnen, en de
   * kopie mag tot zes uur oud zijn.
   */
  options: { fresh?: boolean } = {},
): Promise<WellnessSummary | null> {
  const { data: conn } = await admin
    .from("intervals_connections")
    .select("api_key, athlete_id, wellness_opt_in")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!conn?.wellness_opt_in || !conn.api_key || !conn.athlete_id) return null;

  // Zelfde staleness-regel als de trainingspagina's: is de kopie vers, dan
  // slaan we de call over; is hij oud of leeg, dan halen we hem eerst in.
  await refreshWellnessIfStale(
    admin,
    profileId,
    { apiKey: conn.api_key, athleteId: conn.athlete_id },
    { force: options.fresh },
  );
  return getWellnessSummary(admin, profileId);
}

/** De herstelvelden zoals de AI ze krijgt; gedeeld door alle generaties. */
export function wellnessInputForAi(wellness: WellnessSummary | null) {
  if (!wellness) return null;
  return {
    days: wellness.days,
    state: wellness.state,
    restingHr: wellness.restingHr,
    hrv: wellness.hrv,
    sleepHours: wellness.sleepHours,
    readiness: wellness.readiness,
    readinessSource: wellness.readinessSource,
    readinessDate: wellness.readinessDate,
    readinessCurrent: wellness.readinessCurrent,
    note: wellness.note,
  };
}

/** Laadt + vat de laatste N dagen profile_wellness samen (service-role). */
export async function getWellnessSummary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  days = WELLNESS_SUMMARY_DAYS,
): Promise<WellnessSummary | null> {
  const oldest = new Date(Date.now() - days * 86400_000)
    .toISOString()
    .slice(0, 10);
  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from("profile_wellness")
      .select(
        "date, resting_hr, hrv, sleep_secs, sleep_score, readiness, fatigue, stress, soreness, mood",
      )
      .eq("profile_id", profileId)
      .gte("date", oldest)
      .order("date", { ascending: false }),
    supabase
      .from("profiles")
      .select("wellness_device")
      .eq("id", profileId)
      .maybeSingle(),
  ]);
  return summarizeWellness(
    (data ?? []) as WellnessRow[],
    (profile?.wellness_device ?? null) as WellnessDevice | null,
  );
}
