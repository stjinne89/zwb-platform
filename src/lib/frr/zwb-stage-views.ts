// De ZWB'ers in het klassement per etappe (migr. 0218), voor de tourpagina:
// definitief zoals FRR het na die etappe had, en voorlopig uit de finishtijden
// van Zwift tot en met die etappe.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isFrrTimeTrial } from "@/lib/frr/feed";
import {
  computeProvisionalGc,
  type OfficialStage,
  type ProvisionalResult,
} from "@/lib/frr/provisional";
import { compareFrrClass } from "@/lib/frr/watch";
import {
  frrPenaltyS,
  loadFrrStandingRows,
  type ZwbFrrStandings,
} from "@/lib/frr/zwb-standings";

export type ZwbStageRow = {
  genderClass: string;
  classCode: string;
  zwiftId: string;
  name: string;
  /** null: mist een etappe in het voorlopige klassement. */
  position: number | null;
  egapS: number | null;
  tourTimeS: number | null;
  penaltyS: number;
};

export type ZwbStageView = {
  stage: number;
  /** Er moet nog een tijdslot gereden worden. */
  open: boolean;
  /** Van de FRR-site; null als FRR de etappe nog niet heeft. */
  official: ZwbStageRow[] | null;
  /** Uit Zwift; null zonder finishtijden voor deze etappe. */
  provisional: ZwbStageRow[] | null;
};

export type ClassRider = {
  zwiftId: string;
  name: string;
  club: string | null;
  genderClass: string;
  classCode: string;
  penaltyS: number;
};

/**
 * Per renner de klasse van de laatste etappe waarin hij bij FRR staat. FRR
 * verwerkt een etappe per tijdslot, dus het laatste klassement mist wie later
 * reed; zijn klasse uit de etappe ervoor geldt dan nog.
 */
export function latestClasses(
  history: Array<{ afterStage: number; zwiftId: string; genderClass: string }>,
): Map<string, string> {
  const latest = new Map<string, { afterStage: number; genderClass: string }>();
  for (const row of history) {
    const known = latest.get(row.zwiftId);
    if (!known || row.afterStage > known.afterStage) latest.set(row.zwiftId, row);
  }
  return new Map([...latest].map(([zwiftId, row]) => [zwiftId, row.genderClass]));
}

function sortRows(rows: ZwbStageRow[]) {
  return rows.sort(
    (a, b) =>
      compareFrrClass(a.classCode, b.classCode) ||
      a.genderClass.localeCompare(b.genderClass) ||
      (a.position ?? Infinity) - (b.position ?? Infinity) ||
      a.name.localeCompare(b.name),
  );
}

export function buildZwbStageViews(input: {
  /** Zwift-ID → naam bij ZWB. */
  zwbNames: Map<string, string | null>;
  /** Alle renners van de klassen waarin een ZWB'er rijdt, uit het laatste klassement. */
  classRiders: ClassRider[];
  results: ProvisionalResult[];
  /** Het tijdverlies per etappe dat FRR al rekende, voor dezelfde renners. */
  officialStages?: OfficialStage[];
  /** De ZWB'ers in het klassement van FRR, per etappe. */
  history: Array<ZwbStageRow & { afterStage: number }>;
  excluded?: Set<string>;
  ttStages?: Set<number>;
  openStages?: Set<number>;
}): ZwbStageView[] {
  const byClass = new Map<string, ClassRider[]>();
  for (const rider of input.classRiders) {
    byClass.set(rider.genderClass, [...(byClass.get(rider.genderClass) ?? []), rider]);
  }
  const resultStages = new Set(input.results.map((row) => row.stage));
  const stages = [
    ...new Set([...resultStages, ...input.history.map((row) => row.afterStage)]),
  ].sort((a, b) => a - b);

  return stages.map((stage) => {
    const official = input.history.filter((row) => row.afterStage === stage);

    let provisional: ZwbStageRow[] | null = null;
    if (resultStages.has(stage)) {
      const upTo = input.results.filter((row) => row.stage <= stage);
      const officialUpTo = (input.officialStages ?? []).filter((row) => row.stage <= stage);
      provisional = [];
      for (const [genderClass, riders] of byClass) {
        const gc = computeProvisionalGc({
          riders,
          results: upTo,
          official: officialUpTo,
          excluded: input.excluded,
          ttStages: input.ttStages,
        });
        for (const rider of [...gc.ranked, ...gc.pending]) {
          if (!input.zwbNames.has(rider.zwiftId) || rider.stagesRidden === 0) continue;
          provisional.push({
            genderClass,
            classCode: riders[0].classCode,
            zwiftId: rider.zwiftId,
            name: input.zwbNames.get(rider.zwiftId) ?? rider.name,
            position: rider.position,
            egapS: rider.egapS,
            tourTimeS: rider.timeS,
            penaltyS: rider.penaltyS,
          });
        }
      }
      sortRows(provisional);
    }

    return {
      stage,
      open: input.openStages?.has(stage) ?? false,
      official:
        official.length > 0
          ? sortRows(
              official.map((row) => ({
                genderClass: row.genderClass,
                classCode: row.classCode,
                zwiftId: row.zwiftId,
                name: input.zwbNames.get(row.zwiftId) ?? row.name,
                position: row.position,
                egapS: row.egapS,
                tourTimeS: row.tourTimeS,
                penaltyS: row.penaltyS,
              })),
            )
          : null,
      provisional: provisional && provisional.length > 0 ? provisional : null,
    };
  });
}

type HistoryRow = {
  after_stage: number;
  gender_class: string;
  class_code: string;
  zwift_id: string;
  name: string;
  position: number;
  egap_s: number | string | null;
  tour_time_s: number | string | null;
  penalty_s: number | string | null;
};

type ResultRow = {
  slot_event_id: string;
  zwift_id: string;
  stage: number;
  pen: string | null;
  time_s: number | string;
};

const numberOrNull = (value: number | string | null) => (value === null ? null : Number(value));

type ClassRiderRow = {
  zwift_id: string;
  gender_class: string;
  class_code: string;
  name: string;
  club: string | null;
  penalty_s?: number | string | null;
};

/**
 * De renners van een of meer klassen, elk met zijn laatste klasse en straf
 * (migr. 0219). Zonder die functie of zonder historie: het laatste klassement.
 */
export async function loadClassRiders(
  supabase: SupabaseClient,
  tourId: string,
  genderClasses: string[],
): Promise<ClassRider[]> {
  if (genderClasses.length === 0) return [];
  const rows: ClassRiderRow[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase
      .rpc("frr_class_riders", { p_tour_id: tourId, p_gender_classes: genderClasses })
      .range(from, from + 999);
    if (error) {
      rows.length = 0;
      break;
    }
    const page = (data ?? []) as ClassRiderRow[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const source: ClassRiderRow[] =
    rows.length > 0 ? rows : await loadFrrStandingRows(supabase, tourId, { genderClasses });
  return source.map((row) => ({
    zwiftId: row.zwift_id,
    name: row.name,
    club: row.club,
    genderClass: row.gender_class,
    classCode: row.class_code,
    penaltyS: frrPenaltyS(row),
  }));
}

/** Zo lang na de start van het laatste tijdslot is een etappe nog bezig. */
const STAGE_OPEN_AFTER_START_MS = 4 * 3600_000;

export type FrrStageInfo = {
  /** Etappes die een individuele tijdrit zijn. */
  ttStages: Set<number>;
  /** Etappes waarvan nog een tijdslot gereden moet worden of net gestart is. */
  openStages: Set<number>;
  /** Tijdslot → start in ms. */
  slotStarts: Map<string, number>;
};

/** Wat het voorlopige klassement over de etappes van de tour moet weten. */
export async function loadFrrStageInfo(
  supabase: SupabaseClient,
  tourId: string,
  nowMs = Date.now(),
): Promise<FrrStageInfo> {
  const { data } = await supabase
    .from("events")
    .select("id, frr_stage, title, zwift_event_type, zwift_event_id, start_at")
    .eq("frr_tour_id", tourId)
    .not("frr_stage", "is", null);
  const info: FrrStageInfo = {
    ttStages: new Set(),
    openStages: new Set(),
    slotStarts: new Map(),
  };
  for (const row of (data ?? []) as Array<{
    id: string;
    frr_stage: number;
    title: string | null;
    zwift_event_type: string | null;
    zwift_event_id: number | string | null;
    start_at: string;
  }>) {
    if (isFrrTimeTrial({ title: row.title, zwiftEventType: row.zwift_event_type })) {
      info.ttStages.add(row.frr_stage);
    }
    if (row.zwift_event_id === null) continue;
    const startMs = Date.parse(row.start_at);
    info.slotStarts.set(row.id, startMs);
    if (startMs + STAGE_OPEN_AFTER_START_MS > nowMs) info.openStages.add(row.frr_stage);
  }
  return info;
}

/**
 * Het tijdverlies per etappe dat FRR voor de renners van deze klassen al
 * rekende (migr. 0222). Zonder die kolommen is de lijst leeg en rekent het
 * voorlopige klassement alles zelf.
 */
export async function loadOfficialStages(
  supabase: SupabaseClient,
  tourId: string,
  genderClasses: string[],
): Promise<OfficialStage[]> {
  const stages: OfficialStage[] = [];
  for (let from = 0; genderClasses.length > 0 && from < 50000; from += 1000) {
    const { data, error } = await supabase
      .from("frr_gc_history")
      .select("zwift_id, after_stage, stage_time_s, stage_egap_s")
      .eq("tour_id", tourId)
      .in("gender_class", genderClasses)
      .not("stage_egap_s", "is", null)
      .order("after_stage")
      .order("zwift_id")
      .range(from, from + 999);
    if (error) return [];
    const rows = (data ?? []) as Array<{
      zwift_id: string;
      after_stage: number;
      stage_time_s: number | string | null;
      stage_egap_s: number | string;
    }>;
    for (const row of rows) {
      stages.push({
        stage: row.after_stage,
        zwiftId: row.zwift_id,
        gapS: Number(row.stage_egap_s),
        timeS: numberOrNull(row.stage_time_s),
      });
    }
    if (rows.length < 1000) break;
  }
  return stages;
}

/** De klasse van één renner uit de laatste etappe waarin hij bij FRR staat. */
export async function loadLatestClass(
  supabase: SupabaseClient,
  tourId: string,
  zwiftId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("frr_gc_history")
    .select("gender_class")
    .eq("tour_id", tourId)
    .eq("zwift_id", zwiftId)
    .order("after_stage", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.gender_class as string | undefined) ?? null;
}

/**
 * Leest wat de tourpagina nodig heeft. Vóór migratie 0218 geven de tabel en de
 * functie een fout; dan is de lijst leeg en toont de pagina het gewone
 * klassement.
 */
export async function loadZwbStageViews(
  supabase: SupabaseClient,
  tourId: string,
  zwb: ZwbFrrStandings,
  excluded: Set<string>,
  info: FrrStageInfo,
): Promise<ZwbStageView[]> {
  const zwbIds = [...zwb.zwbNames.keys()];
  if (zwbIds.length === 0) return [];
  const { data: historyRows } = await supabase
    .from("frr_gc_history")
    .select(
      "after_stage, gender_class, class_code, zwift_id, name, position, egap_s, tour_time_s, penalty_s",
    )
    .eq("tour_id", tourId)
    .in("zwift_id", zwbIds);
  const history = (historyRows ?? []) as HistoryRow[];
  // Ook de klassen van ZWB'ers die FRR voor de laatste etappe nog niet verwerkte.
  const genderClasses = [
    ...new Set([
      ...zwb.standings.map((row) => row.gender_class),
      ...latestClasses(
        history.map((row) => ({
          afterStage: row.after_stage,
          zwiftId: row.zwift_id,
          genderClass: row.gender_class,
        })),
      ).values(),
    ]),
  ];
  const [classRiders, officialStages] = await Promise.all([
    loadClassRiders(supabase, tourId, genderClasses),
    loadOfficialStages(supabase, tourId, genderClasses),
  ]);

  // Per 1000, want PostgREST kapt af.
  const results: ProvisionalResult[] = [];
  for (let from = 0; genderClasses.length > 0 && from < 50000; from += 1000) {
    const { data, error } = await supabase
      .rpc("frr_class_stage_results", { p_tour_id: tourId, p_gender_classes: genderClasses })
      .range(from, from + 999);
    if (error) break;
    const rows = (data ?? []) as ResultRow[];
    for (const row of rows) {
      results.push({
        stage: row.stage,
        slotId: row.slot_event_id,
        zwiftId: row.zwift_id,
        pen: row.pen,
        timeS: Number(row.time_s),
        startMs: info.slotStarts.get(row.slot_event_id),
      });
    }
    if (rows.length < 1000) break;
  }

  return buildZwbStageViews({
    zwbNames: zwb.zwbNames,
    classRiders,
    results,
    officialStages,
    history: history.map((row) => ({
      afterStage: row.after_stage,
      genderClass: row.gender_class,
      classCode: row.class_code,
      zwiftId: row.zwift_id,
      name: row.name,
      position: row.position,
      egapS: numberOrNull(row.egap_s),
      tourTimeS: numberOrNull(row.tour_time_s),
      penaltyS: frrPenaltyS(row),
    })),
    excluded,
    ttStages: info.ttStages,
    openStages: info.openStages,
  });
}
