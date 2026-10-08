// Voorlopig klassement van één FRR-klasse (migr. 0215), uit de finishtijden per
// tijdslot. Het klassement is de som van het tijdverlies (eGAP) per etappe.
//
// De rekenregels komen uit de Tour Rules van FRR (nagelopen op 2026-10-08 tegen
// de tabel van Ignite, etappe 1 t/m 5):
// - Per etappe en tijdslot zet de winnaar van de klasse de tijd, mits hij een
//   full tourist is: hij reed elke etappe tot dan toe. Is de winnaar dat niet,
//   dan krijgt de eerste full tourist 1 seconde en rekent de rest vanaf hem.
// - Een tijdrit gaat op individuele tijd: één snelste per klasse over alle
//   tijdsloten heen, met dezelfde voorwaarde.
// - Wie een etappe vaker rijdt, telt met zijn eerste rit.
//
// Heeft FRR een etappe van een renner al verwerkt (migr. 0222), dan gaat dat
// verlies voor: daarin zitten promoties en tijdstraffen die uit Zwift niet te
// halen zijn. Wat overblijft is nooit officieel. Puur.

export type ProvisionalResult = {
  stage: number;
  slotId: string;
  zwiftId: string;
  /** Startgroep (A–E) waarin de renner finishte. */
  pen: string | null;
  timeS: number;
  /** Start van het tijdslot, in ms; bepaalt welke rit de eerste was. */
  startMs?: number;
};

/** Wat FRR zelf voor een renner in een etappe rekende. */
export type OfficialStage = {
  stage: number;
  zwiftId: string;
  gapS: number;
  /** Etappetijd bij FRR, met tijdstraf; null als FRR hem niet gaf. */
  timeS: number | null;
};

export type ProvisionalRider = {
  zwiftId: string;
  name: string;
  club: string | null;
  /** Plaats in het voorlopige klassement; null zolang een etappe ontbreekt. */
  position: number | null;
  /**
   * Met een plaats: achterstand op de leider, met straf, zoals FRR hem toont.
   * Zonder plaats: het opgetelde tijdverlies over wat wel gereden is.
   */
  egapS: number;
  /** Straf die FRR de renner gaf, in seconden. */
  penaltyS: number;
  /** Opgetelde finishtijd over de gereden etappes, zonder straf. */
  timeS: number;
  stagesRidden: number;
  /** Etappes met een uitslag die hij niet reed, oplopend. */
  missingStages: number[];
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

const round = (value: number) => Math.round(value * 1000) / 1000;

export function computeProvisionalGc(input: {
  /** De renners van één klasse. */
  riders: Array<{ zwiftId: string; name: string; club: string | null; penaltyS?: number }>;
  results: ProvisionalResult[];
  /** Etappes die FRR al verwerkte, per renner; gaan voor op de eigen rekensom. */
  official?: OfficialStage[];
  /** Renners die niet meetellen, ook niet als snelste van hun slot. */
  excluded?: Set<string>;
  /** Tijdritten: één snelste tijd per klasse, over alle tijdsloten. */
  ttStages?: Set<number>;
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

  // Per renner en etappe één rit: de eerste.
  const rides = new Map<string, ProvisionalResult>();
  for (const row of ofClass) {
    if (input.excluded?.has(row.zwiftId)) continue;
    const key = `${row.zwiftId}|${row.stage}`;
    const known = rides.get(key);
    if (!known || (row.startMs ?? Infinity) < (known.startMs ?? Infinity)) rides.set(key, row);
  }
  const counted = [...rides.values()];

  const official = new Map<string, OfficialStage>();
  for (const row of input.official ?? []) {
    if (!inClass.has(row.zwiftId) || input.excluded?.has(row.zwiftId)) continue;
    if (!Number.isFinite(row.gapS) || row.gapS < 0) continue;
    official.set(`${row.zwiftId}|${row.stage}`, row);
  }

  const stages = [
    ...new Set([...counted.map((row) => row.stage), ...[...official.values()].map((row) => row.stage)]),
  ].sort((a, b) => a - b);
  const rode = (zwiftId: string, stage: number) =>
    rides.has(`${zwiftId}|${stage}`) || official.has(`${zwiftId}|${stage}`);
  const fullTourist = (zwiftId: string, stage: number) =>
    stages.every((earlier) => earlier > stage || rode(zwiftId, earlier));

  const groupKey = (row: ProvisionalResult) =>
    input.ttStages?.has(row.stage) ? `${row.stage}` : `${row.stage}|${row.slotId}`;
  const groups = new Map<string, ProvisionalResult[]>();
  for (const row of counted) {
    const key = groupKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const reference = new Map<string, number>();
  for (const [key, rows] of groups) {
    const fastest = Math.min(...rows.map((row) => row.timeS));
    const tourists = rows.filter((row) => fullTourist(row.zwiftId, row.stage));
    const firstTourist = tourists.length > 0 ? Math.min(...tourists.map((row) => row.timeS)) : null;
    reference.set(
      key,
      firstTourist === null || firstTourist === fastest ? fastest : firstTourist - 1,
    );
  }

  const ranked: ProvisionalRider[] = [];
  const pending: ProvisionalRider[] = [];
  for (const rider of input.riders) {
    if (input.excluded?.has(rider.zwiftId)) continue;
    const otherPens = new Set<string>();
    const penaltyS = rider.penaltyS ?? 0;
    let egapS = penaltyS;
    let timeS = 0;
    let stagesRidden = 0;
    const missingStages: number[] = [];
    for (const stage of stages) {
      const ride = rides.get(`${rider.zwiftId}|${stage}`);
      const known = official.get(`${rider.zwiftId}|${stage}`);
      if (!ride && !known) {
        missingStages.push(stage);
        continue;
      }
      stagesRidden += 1;
      egapS += known ? known.gapS : Math.max(0, ride!.timeS - reference.get(groupKey(ride!))!);
      timeS += known?.timeS ?? ride?.timeS ?? 0;
      const expected = classPen.get(stage);
      if (ride?.pen && expected && ride.pen !== expected) otherPens.add(ride.pen);
    }
    const row: ProvisionalRider = {
      zwiftId: rider.zwiftId,
      name: rider.name,
      club: rider.club,
      position: null,
      egapS: round(egapS),
      penaltyS,
      timeS: round(timeS),
      stagesRidden,
      missingStages,
      otherPens: [...otherPens].sort(),
    };
    if (stages.length > 0 && stagesRidden === stages.length) ranked.push(row);
    else pending.push(row);
  }

  ranked.sort((a, b) => a.egapS - b.egapS || a.name.localeCompare(b.name));
  const leaderS = ranked[0]?.egapS ?? 0;
  ranked.forEach((row, index) => {
    row.position = index + 1;
    row.egapS = round(row.egapS - leaderS);
  });
  pending.sort(
    (a, b) =>
      b.stagesRidden - a.stagesRidden || a.egapS - b.egapS || a.name.localeCompare(b.name),
  );
  return { stages, ranked, pending };
}
