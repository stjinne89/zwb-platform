// Voorlopig klassement van één FRR-klasse (migr. 0215), uit de finishtijden per
// tijdslot. Per etappe en tijdslot zet de eerste renner van de klasse de tijd;
// de rest verliest eGAP op hem. Het klassement is de som over de etappes.
//
// FRR rekent zelf later, met straffen en correcties; dit is dus nooit officieel.
// Puur.

export type ProvisionalResult = {
  stage: number;
  slotId: string;
  zwiftId: string;
  /** Startgroep (A–E) waarin de renner finishte. */
  pen: string | null;
  timeS: number;
};

export type ProvisionalRider = {
  zwiftId: string;
  name: string;
  club: string | null;
  /** Plaats in het voorlopige klassement; null zolang een etappe ontbreekt. */
  position: number | null;
  /** Opgeteld tijdverlies over de gereden etappes, met straf. */
  egapS: number;
  /** Straf die FRR de renner gaf, in seconden. */
  penaltyS: number;
  /** Opgetelde finishtijd over de gereden etappes, zonder straf. */
  timeS: number;
  stagesRidden: number;
  /** Startgroepen waarin hij reed die afwijken van de rest van de klasse. */
  otherPens: string[];
};

export type ProvisionalGc = {
  /** Etappes met een uitslag, oplopend. */
  stages: number[];
  /** Reed elke etappe, op eGAP. */
  ranked: ProvisionalRider[];
  /** Mist een etappe, op eGAP over wat wel gereden is. */
  pending: ProvisionalRider[];
};

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: string | null = null;
  for (const [value, count] of counts) {
    if (best === null || count > counts.get(best)!) best = value;
  }
  return best;
}

export function computeProvisionalGc(input: {
  /** De renners van één klasse. */
  riders: Array<{ zwiftId: string; name: string; club: string | null; penaltyS?: number }>;
  results: ProvisionalResult[];
  /** Renners die niet meetellen, ook niet als snelste van hun slot. */
  excluded?: Set<string>;
}): ProvisionalGc {
  const inClass = new Set(input.riders.map((rider) => rider.zwiftId));
  const ofClass = input.results.filter(
    (row) => inClass.has(row.zwiftId) && Number.isFinite(row.timeS) && row.timeS > 0,
  );

  // De startgroep van de klasse per etappe: waar de meesten reden. Ook
  // verwijderde renners tellen hier mee, anders verschuift de meerderheid.
  const classPen = new Map<number, string | null>();
  for (const stage of new Set(ofClass.map((row) => row.stage))) {
    classPen.set(
      stage,
      mostCommon(
        ofClass.filter((row) => row.stage === stage && row.pen).map((row) => row.pen as string),
      ),
    );
  }

  const counted = ofClass.filter((row) => !input.excluded?.has(row.zwiftId));
  const slotBest = new Map<string, number>();
  for (const row of counted) {
    const key = `${row.stage}|${row.slotId}`;
    slotBest.set(key, Math.min(slotBest.get(key) ?? Infinity, row.timeS));
  }

  // Per renner en etappe één uitslag; wie een etappe twee keer reed, houdt het
  // kleinste verlies.
  const perRider = new Map<
    string,
    Map<number, { gapS: number; timeS: number; pen: string | null }>
  >();
  for (const row of counted) {
    const gapS = row.timeS - slotBest.get(`${row.stage}|${row.slotId}`)!;
    const stages = perRider.get(row.zwiftId) ?? new Map();
    const known = stages.get(row.stage);
    if (!known || gapS < known.gapS) {
      stages.set(row.stage, { gapS, timeS: row.timeS, pen: row.pen });
    }
    perRider.set(row.zwiftId, stages);
  }

  const stages = [...new Set(counted.map((row) => row.stage))].sort((a, b) => a - b);
  const ranked: ProvisionalRider[] = [];
  const pending: ProvisionalRider[] = [];
  for (const rider of input.riders) {
    if (input.excluded?.has(rider.zwiftId)) continue;
    const ridden = perRider.get(rider.zwiftId) ?? new Map();
    const otherPens = new Set<string>();
    const penaltyS = rider.penaltyS ?? 0;
    let egapS = penaltyS;
    let timeS = 0;
    for (const [stage, result] of ridden) {
      egapS += result.gapS;
      timeS += result.timeS;
      const expected = classPen.get(stage);
      if (result.pen && expected && result.pen !== expected) otherPens.add(result.pen);
    }
    const row: ProvisionalRider = {
      zwiftId: rider.zwiftId,
      name: rider.name,
      club: rider.club,
      position: null,
      egapS: Math.round(egapS * 1000) / 1000,
      penaltyS,
      timeS: Math.round(timeS * 1000) / 1000,
      stagesRidden: ridden.size,
      otherPens: [...otherPens].sort(),
    };
    if (stages.length > 0 && ridden.size === stages.length) ranked.push(row);
    else pending.push(row);
  }

  ranked.sort((a, b) => a.egapS - b.egapS || a.name.localeCompare(b.name));
  ranked.forEach((row, index) => {
    row.position = index + 1;
  });
  pending.sort(
    (a, b) =>
      b.stagesRidden - a.stagesRidden || a.egapS - b.egapS || a.name.localeCompare(b.name),
  );
  return { stages, ranked, pending };
}
