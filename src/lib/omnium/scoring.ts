// De puntenmotor van het Omnium: puur, zonder Supabase en zonder netwerk.
//
// Dit is het enige deel van de module dat lokaal hard te bewijzen is, dus het
// draagt de volledige regel. De belangrijkste daarvan is subtiel: een positie
// is altijd de positie *binnen de league*. Categorieen mogen op de startlijst
// worden samengevoegd als de opkomst laag is, zonder dat dat het klassement
// raakt. De import levert dus de volgorde van het hele veld plus een league per
// renner, en de motor leidt daar de positie uit af. Dit verkeerd doen levert
// stilzwijgend een fout klassement op.

import {
  DEFAULT_SCORING,
  type EditionTiebreak,
  type OmniumScoring,
  type PointsScale,
  type SeasonTiebreak,
  type TiePolicy,
} from "@/lib/omnium/scales";

export type Discipline = "prologue" | "scratch" | "sprint" | "crit";

export const DISCIPLINES: Discipline[] = [
  "prologue",
  "scratch",
  "sprint",
  "crit",
];

/**
 * DNS telt niet als gereden. DNF wel: die renner stond aan de start, maar
 * scoort niets omdat je moet finishen om punten te pakken. DSQ scoort niets
 * en telt ook niet als gereden.
 */
export type ResultStatus = "finished" | "dnf" | "dns" | "dsq";

export type FinishEntry = {
  riderId: string;
  league: string;
  status?: ResultStatus;
  /** Klassering in het hele veld, als de bron die geeft. */
  overallPosition?: number | null;
  timeSeconds?: number | null;
  /** De tijd zoals de bron hem toont; blijft leidend voor de weergave. */
  timeText?: string | null;
  /** Fastest Time on Segment, voor de Sprint Quali. */
  segmentSeconds?: number | null;
};

export type CritDirectEntry = {
  riderId: string;
  league: string;
  status?: ResultStatus;
  /** Punten zoals de bron ze al heeft uitgerekend. */
  points: number;
  overallPosition?: number | null;
};

/**
 * Twee invoervormen voor de Crit Royale. "detailed" is transparanter — de motor
 * deelt de FAL-punten zelf uit en de uitsplitsing is na te rekenen — maar
 * "direct" moet blijven bestaan, want dat is wat ZwiftPower kant-en-klaar toont
 * en dus de route die onder tijdsdruk altijd werkt.
 */
export type CritScoringInput =
  | { mode: "direct"; entries: CritDirectEntry[] }
  | { mode: "detailed"; finish: FinishEntry[]; sprints: FinishEntry[][] };

export type ScoredResult = {
  riderId: string;
  discipline: Discipline;
  league: string;
  status: ResultStatus;
  /** Positie binnen de league; null bij DNF/DNS/DSQ. */
  position: number | null;
  overallPosition: number | null;
  timeSeconds: number | null;
  timeText: string | null;
  segmentSeconds: number | null;
  finishPoints: number;
  sprintPoints: number;
  /** Wat er meetelt na alle regels. */
  points: number;
  /** Wat er verdiend was voor de crit-nulregel. */
  pointsRaw: number;
  voidedReason: string | null;
  raced: boolean;
};

export type EditionStanding = {
  riderId: string;
  league: string;
  prologuePoints: number;
  scratchPoints: number;
  sprintPoints: number;
  critPoints: number;
  totalPoints: number;
  rank: number;
  rankShared: boolean;
  wins: number;
  /** Alle klasseringen, oplopend, voor de countback. */
  positions: number[];
  isProvisional: boolean;
};

export type EditionScore = {
  results: ScoredResult[];
  standings: EditionStanding[];
  disciplines: Discipline[];
  /** Zolang niet alle vier de onderdelen binnen zijn is dit een tussenstand. */
  isProvisional: boolean;
};

export type EditionScoringInput = {
  scoring?: OmniumScoring;
  prologue?: FinishEntry[];
  scratch?: FinishEntry[];
  sprint?: FinishEntry[];
  crit?: CritScoringInput;
};

const CENTS = 100;

/** numeric(7,2) in de database; afronden voorkomt drijvende-komma-artefacten. */
function round2(value: number): number {
  return Math.round(value * CENTS) / CENTS;
}

/** Positie is 1-based. Buiten de tabel geldt de staart van de schaal. */
export function pointsForPosition(scale: PointsScale, position: number): number {
  if (!Number.isFinite(position) || position < 1) return 0;
  const index = Math.floor(position) - 1;
  return index < scale.table.length ? scale.table[index] : scale.tail;
}

/**
 * De punten voor een groep renners die dezelfde plaats deelt. Bij "high" krijgt
 * iedereen de punten van de hoogste bezette plaats; bij "share" worden de
 * punten van alle bezette plaatsen gelijk verdeeld.
 */
function pointsForSharedPosition(
  scale: PointsScale,
  position: number,
  count: number,
  tiePolicy: TiePolicy,
): number {
  if (count <= 1 || tiePolicy === "high") {
    return pointsForPosition(scale, position);
  }
  let sum = 0;
  for (let offset = 0; offset < count; offset++) {
    sum += pointsForPosition(scale, position + offset);
  }
  return round2(sum / count);
}

export type RankBy = "position" | "time" | "segment";

function orderKey(entry: FinishEntry, rankBy: RankBy): number | null {
  if (rankBy === "segment") return entry.segmentSeconds ?? null;
  if (rankBy === "time") return entry.timeSeconds ?? entry.overallPosition ?? null;
  return entry.overallPosition ?? entry.timeSeconds ?? null;
}

export type RankedEntry = {
  entry: FinishEntry;
  position: number;
  /** Aantal renners dat deze plaats deelt. */
  sharedWith: number;
};

/**
 * Deelt posities uit binnen een league. Gelijke sleutels delen een plaats en de
 * volgende plaats wordt overgeslagen (1, 2, 2, 4). Renners zonder sleutel
 * houden de volgorde waarin ze zijn aangeleverd — bij een geplakte uitslag is
 * de regelvolgorde immers de uitslag.
 */
export function rankWithinLeague(
  entries: FinishEntry[],
  rankBy: RankBy = "position",
): RankedEntry[] {
  const indexed = entries.map((entry, index) => ({ entry, index }));
  indexed.sort((a, b) => {
    const keyA = orderKey(a.entry, rankBy);
    const keyB = orderKey(b.entry, rankBy);
    if (keyA === null && keyB === null) return a.index - b.index;
    if (keyA === null) return 1;
    if (keyB === null) return -1;
    if (keyA !== keyB) return keyA - keyB;
    return a.index - b.index;
  });

  const ranked: RankedEntry[] = [];
  let cursor = 0;
  while (cursor < indexed.length) {
    const key = orderKey(indexed[cursor].entry, rankBy);
    let end = cursor + 1;
    // Alleen een echte gelijke sleutel is een gedeelde plaats; renners zonder
    // sleutel delen niets, die volgen gewoon de aangeleverde volgorde.
    if (key !== null) {
      while (end < indexed.length && orderKey(indexed[end].entry, rankBy) === key) {
        end += 1;
      }
    }
    const position = cursor + 1;
    const sharedWith = end - cursor;
    for (let i = cursor; i < end; i++) {
      ranked.push({ entry: indexed[i].entry, position, sharedWith });
    }
    cursor = end;
  }
  return ranked;
}

function statusOf(entry: { status?: ResultStatus }): ResultStatus {
  return entry.status ?? "finished";
}

function racedWith(status: ResultStatus): boolean {
  return status === "finished" || status === "dnf";
}

function groupByLeague<T extends { league: string }>(rows: T[]): Map<string, T[]> {
  const byLeague = new Map<string, T[]>();
  for (const row of rows) {
    const list = byLeague.get(row.league);
    if (list) list.push(row);
    else byLeague.set(row.league, [row]);
  }
  return byLeague;
}

function emptyResult(
  entry: { riderId: string; league: string },
  discipline: Discipline,
  status: ResultStatus,
): ScoredResult {
  return {
    riderId: entry.riderId,
    discipline,
    league: entry.league,
    status,
    position: null,
    overallPosition: null,
    timeSeconds: null,
    timeText: null,
    segmentSeconds: null,
    finishPoints: 0,
    sprintPoints: 0,
    points: 0,
    pointsRaw: 0,
    voidedReason: null,
    raced: racedWith(status),
  };
}

/**
 * Scoort een onderdeel op finishvolgorde (Prologue, Spicy Scratch) of op
 * segmenttijd (Sprint Quali).
 */
export function scoreFinishOrder(
  entries: FinishEntry[],
  scale: PointsScale,
  options: {
    discipline: Discipline;
    tiePolicy?: TiePolicy;
    rankBy?: RankBy;
  },
): ScoredResult[] {
  const tiePolicy = options.tiePolicy ?? "high";
  const rankBy = options.rankBy ?? "position";
  const results: ScoredResult[] = [];

  const finishers = entries.filter((entry) => statusOf(entry) === "finished");
  for (const entry of entries) {
    const status = statusOf(entry);
    if (status === "finished") continue;
    results.push(emptyResult(entry, options.discipline, status));
  }

  for (const [, leagueEntries] of groupByLeague(finishers)) {
    for (const ranked of rankWithinLeague(leagueEntries, rankBy)) {
      const points = pointsForSharedPosition(
        scale,
        ranked.position,
        ranked.sharedWith,
        tiePolicy,
      );
      results.push({
        riderId: ranked.entry.riderId,
        discipline: options.discipline,
        league: ranked.entry.league,
        status: "finished",
        position: ranked.position,
        overallPosition: ranked.entry.overallPosition ?? null,
        timeSeconds: ranked.entry.timeSeconds ?? null,
        timeText: ranked.entry.timeText ?? null,
        segmentSeconds: ranked.entry.segmentSeconds ?? null,
        finishPoints: points,
        sprintPoints: 0,
        points,
        pointsRaw: points,
        voidedReason: null,
        raced: true,
      });
    }
  }

  return results;
}

/**
 * De Crit Royale: punten uit de tussensprints plus de finish. In "detailed"
 * deelt de motor de FAL-punten zelf uit; in "direct" neemt hij het totaal over
 * dat de bron al berekend heeft.
 */
export function scoreCritRoyale(
  input: CritScoringInput,
  scales: { critSprint: PointsScale; critFinish: PointsScale },
  options: { tiePolicy?: TiePolicy } = {},
): ScoredResult[] {
  const tiePolicy = options.tiePolicy ?? "high";

  if (input.mode === "direct") {
    return input.entries.map((entry) => {
      const status = statusOf(entry);
      const points = racedWith(status) ? entry.points : 0;
      return {
        riderId: entry.riderId,
        discipline: "crit" as const,
        league: entry.league,
        status,
        position: null,
        overallPosition: entry.overallPosition ?? null,
        timeSeconds: null,
        timeText: null,
        segmentSeconds: null,
        finishPoints: 0,
        sprintPoints: 0,
        points: round2(points),
        pointsRaw: round2(points),
        voidedReason: null,
        raced: racedWith(status),
      };
    });
  }

  const byRider = new Map<string, ScoredResult>();

  const ensure = (entry: FinishEntry): ScoredResult => {
    const existing = byRider.get(entry.riderId);
    if (existing) return existing;
    const created = emptyResult(entry, "crit", statusOf(entry));
    byRider.set(entry.riderId, created);
    return created;
  };

  // Tussensprints eerst: ook wie later uitvalt houdt de punten die hij al pakte.
  for (const sprint of input.sprints) {
    const finishers = sprint.filter((entry) => statusOf(entry) === "finished");
    for (const [, leagueEntries] of groupByLeague(finishers)) {
      for (const ranked of rankWithinLeague(leagueEntries, "position")) {
        const row = ensure(ranked.entry);
        row.sprintPoints = round2(
          row.sprintPoints +
            pointsForSharedPosition(
              scales.critSprint,
              ranked.position,
              ranked.sharedWith,
              tiePolicy,
            ),
        );
      }
    }
  }

  for (const entry of input.finish) {
    const row = ensure(entry);
    row.status = statusOf(entry);
    row.raced = racedWith(row.status);
    row.overallPosition = entry.overallPosition ?? row.overallPosition;
    row.timeSeconds = entry.timeSeconds ?? row.timeSeconds;
    row.timeText = entry.timeText ?? row.timeText;
  }

  const finishers = input.finish.filter((entry) => statusOf(entry) === "finished");
  for (const [, leagueEntries] of groupByLeague(finishers)) {
    for (const ranked of rankWithinLeague(leagueEntries, "position")) {
      const row = ensure(ranked.entry);
      row.position = ranked.position;
      row.finishPoints = pointsForSharedPosition(
        scales.critFinish,
        ranked.position,
        ranked.sharedWith,
        tiePolicy,
      );
    }
  }

  for (const row of byRider.values()) {
    const total = round2(row.finishPoints + row.sprintPoints);
    row.points = total;
    row.pointsRaw = total;
  }

  return [...byRider.values()];
}

function disciplineTotal(
  results: ScoredResult[],
  discipline: Discipline,
): number {
  let sum = 0;
  for (const row of results) {
    if (row.discipline === discipline) sum += row.points;
  }
  return round2(sum);
}

/**
 * "Geen punten als je geen enkele andere race hebt gereden." Die regel werkt
 * over onderdelen heen en hoort dus hier en niet in scoreCritRoyale.
 *
 * De regel wordt overgeslagen als de Crit Royale het enige onderdeel is dat
 * binnen is — dan zou hij iedereen op nul zetten, en dat is geen tussenstand
 * maar een fout.
 */
function applyCritZeroRule(
  results: ScoredResult[],
  disciplines: Discipline[],
): void {
  if (!disciplines.includes("crit")) return;
  const others = disciplines.filter((discipline) => discipline !== "crit");
  if (others.length === 0) return;

  const racedElsewhere = new Set<string>();
  for (const row of results) {
    if (row.discipline === "crit") continue;
    if (row.raced) racedElsewhere.add(row.riderId);
  }

  for (const row of results) {
    if (row.discipline !== "crit") continue;
    if (racedElsewhere.has(row.riderId)) continue;
    if (row.pointsRaw === 0) continue;
    row.points = 0;
    row.voidedReason = "no_other_race";
  }
}

/** Countback: beste klassering eerst, dan de op een na beste, enzovoort. */
function compareCountback(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const left = a[i] ?? Number.POSITIVE_INFINITY;
    const right = b[i] ?? Number.POSITIVE_INFINITY;
    if (left !== right) return left - right;
  }
  return 0;
}

export function compareEdition(
  a: EditionStanding,
  b: EditionStanding,
  tiebreaks: EditionTiebreak[],
): number {
  if (a.totalPoints !== b.totalPoints) return b.totalPoints - a.totalPoints;
  for (const tiebreak of tiebreaks) {
    if (tiebreak === "crit_points" && a.critPoints !== b.critPoints) {
      return b.critPoints - a.critPoints;
    }
    if (tiebreak === "wins" && a.wins !== b.wins) return b.wins - a.wins;
    if (tiebreak === "countback") {
      const countback = compareCountback(a.positions, b.positions);
      if (countback !== 0) return countback;
    }
  }
  return 0;
}

/**
 * Zet rangnummers per league. Renners die na alle tiebreaks gelijk blijven
 * delen een plaats en de volgende rang wordt overgeslagen. Nooit alfabetisch
 * of willekeurig breken: een gedeelde eerste plaats is een geldige uitkomst.
 */
function assignRanks<
  T extends { league: string; rank: number; rankShared: boolean },
>(rows: T[], compare: (a: T, b: T) => number): T[] {
  for (const [, leagueRows] of groupByLeague(rows)) {
    leagueRows.sort(compare);
    let cursor = 0;
    while (cursor < leagueRows.length) {
      let end = cursor + 1;
      while (
        end < leagueRows.length &&
        compare(leagueRows[cursor], leagueRows[end]) === 0
      ) {
        end += 1;
      }
      const shared = end - cursor > 1;
      for (let i = cursor; i < end; i++) {
        leagueRows[i].rank = cursor + 1;
        leagueRows[i].rankShared = shared;
      }
      cursor = end;
    }
  }
  return rows;
}

function buildEditionStandings(
  results: ScoredResult[],
  options: { tiebreaks: EditionTiebreak[]; isProvisional: boolean },
): EditionStanding[] {
  const byRider = new Map<string, ScoredResult[]>();
  for (const row of results) {
    const list = byRider.get(row.riderId);
    if (list) list.push(row);
    else byRider.set(row.riderId, [row]);
  }

  const standings: EditionStanding[] = [];
  for (const [riderId, rows] of byRider) {
    // De league van de laatste rij wint; binnen een editie zijn ze in de
    // praktijk gelijk, maar een correctie op een onderdeel mag geen tweede
    // klassementsrij opleveren.
    const league = rows[rows.length - 1].league;
    const positions = rows
      .map((row) => row.position)
      .filter((position): position is number => position !== null)
      .sort((a, b) => a - b);
    const prologuePoints = disciplineTotal(rows, "prologue");
    const scratchPoints = disciplineTotal(rows, "scratch");
    const sprintPoints = disciplineTotal(rows, "sprint");
    const critPoints = disciplineTotal(rows, "crit");
    standings.push({
      riderId,
      league,
      prologuePoints,
      scratchPoints,
      sprintPoints,
      critPoints,
      totalPoints: round2(
        prologuePoints + scratchPoints + sprintPoints + critPoints,
      ),
      rank: 0,
      rankShared: false,
      wins: positions.filter((position) => position === 1).length,
      positions,
      isProvisional: options.isProvisional,
    });
  }

  return assignRanks(standings, (a, b) =>
    compareEdition(a, b, options.tiebreaks),
  );
}

/**
 * Scoort een hele editie. Werkt bewust ook met twee van de vier onderdelen: dat
 * is de basis onder de tussenstand die tijdens de uitzending meeloopt.
 */
export function scoreEdition(input: EditionScoringInput): EditionScore {
  const scoring = input.scoring ?? DEFAULT_SCORING;
  const { scales, tiePolicy } = scoring;
  const results: ScoredResult[] = [];
  const disciplines: Discipline[] = [];

  if (input.prologue) {
    disciplines.push("prologue");
    results.push(
      ...scoreFinishOrder(input.prologue, scales.prologue, {
        discipline: "prologue",
        tiePolicy,
        rankBy: "time",
      }),
    );
  }
  if (input.scratch) {
    disciplines.push("scratch");
    results.push(
      ...scoreFinishOrder(input.scratch, scales.scratch, {
        discipline: "scratch",
        tiePolicy,
        rankBy: "position",
      }),
    );
  }
  if (input.sprint) {
    disciplines.push("sprint");
    results.push(
      ...scoreFinishOrder(input.sprint, scales.sprint, {
        discipline: "sprint",
        tiePolicy,
        rankBy: "segment",
      }),
    );
  }
  if (input.crit) {
    disciplines.push("crit");
    results.push(...scoreCritRoyale(input.crit, scales, { tiePolicy }));
  }

  applyCritZeroRule(results, disciplines);

  const isProvisional = disciplines.length < DISCIPLINES.length;
  const standings = buildEditionStandings(results, {
    tiebreaks: scoring.editionTiebreaks,
    isProvisional,
  });

  return { results, standings, disciplines, isProvisional };
}

/**
 * Herberekent de editiestand uit al opgeslagen resultaten. Nodig omdat de
 * onderdelen los binnenkomen: bij het importeren van de Crit Royale is nog
 * niet te overzien wie er verderop in de avond alsnog een prologue-uitslag
 * krijgt toegevoegd.
 *
 * De crit-nulregel wordt eerst teruggedraaid en dan opnieuw toegepast, zodat
 * herberekenen idempotent is. Zonder die reset zou een renner die eenmaal op
 * nul is gezet daar blijven staan, ook nadat zijn ontbrekende uitslag alsnog
 * is ingevoerd.
 */
export function scoreStoredEdition(
  results: ScoredResult[],
  disciplines: Discipline[],
  scoring: OmniumScoring = DEFAULT_SCORING,
): EditionScore {
  for (const row of results) {
    if (row.discipline !== "crit") continue;
    row.points = row.pointsRaw;
    row.voidedReason = null;
  }
  applyCritZeroRule(results, disciplines);

  const isProvisional = disciplines.length < DISCIPLINES.length;
  const standings = buildEditionStandings(results, {
    tiebreaks: scoring.editionTiebreaks,
    isProvisional,
  });
  return { results, standings, disciplines, isProvisional };
}

export type SeasonEditionInput = {
  /** Volgnummer binnen het seizoen; bepaalt de kolomvolgorde en "laatste editie". */
  number: number;
  standings: EditionStanding[];
};

export type SeasonStanding = {
  riderId: string;
  league: string;
  /** Punten per editienummer, voor de kolommen "per race". */
  pointsByEdition: Record<string, number>;
  prologuePoints: number;
  scratchPoints: number;
  sprintPoints: number;
  critPoints: number;
  totalPoints: number;
  editionsRaced: number;
  wins: number;
  positions: number[];
  lastEditionPoints: number;
  rank: number;
  rankShared: boolean;
};

export function compareSeason(
  a: SeasonStanding,
  b: SeasonStanding,
  tiebreaks: SeasonTiebreak[],
): number {
  if (a.totalPoints !== b.totalPoints) return b.totalPoints - a.totalPoints;
  for (const tiebreak of tiebreaks) {
    if (tiebreak === "editions_raced" && a.editionsRaced !== b.editionsRaced) {
      return b.editionsRaced - a.editionsRaced;
    }
    if (tiebreak === "wins" && a.wins !== b.wins) return b.wins - a.wins;
    if (tiebreak === "countback") {
      const countback = compareCountback(a.positions, b.positions);
      if (countback !== 0) return countback;
    }
    if (
      tiebreak === "last_edition" &&
      a.lastEditionPoints !== b.lastEditionPoints
    ) {
      return b.lastEditionPoints - a.lastEditionPoints;
    }
  }
  return 0;
}

/** Telt de editiestanden op tot het seizoensklassement. */
export function scoreSeason(
  editions: SeasonEditionInput[],
  scoring: OmniumScoring = DEFAULT_SCORING,
): SeasonStanding[] {
  const ordered = [...editions].sort((a, b) => a.number - b.number);
  const lastNumber = ordered.length ? ordered[ordered.length - 1].number : null;
  const byRider = new Map<string, SeasonStanding>();

  for (const edition of ordered) {
    for (const standing of edition.standings) {
      let row = byRider.get(standing.riderId);
      if (!row) {
        row = {
          riderId: standing.riderId,
          league: standing.league,
          pointsByEdition: {},
          prologuePoints: 0,
          scratchPoints: 0,
          sprintPoints: 0,
          critPoints: 0,
          totalPoints: 0,
          editionsRaced: 0,
          wins: 0,
          positions: [],
          lastEditionPoints: 0,
          rank: 0,
          rankShared: false,
        };
        byRider.set(standing.riderId, row);
      }
      // Een renner kan tussen edities van league wisselen; de meest recente telt.
      row.league = standing.league;
      row.pointsByEdition[String(edition.number)] = standing.totalPoints;
      row.prologuePoints = round2(row.prologuePoints + standing.prologuePoints);
      row.scratchPoints = round2(row.scratchPoints + standing.scratchPoints);
      row.sprintPoints = round2(row.sprintPoints + standing.sprintPoints);
      row.critPoints = round2(row.critPoints + standing.critPoints);
      row.totalPoints = round2(row.totalPoints + standing.totalPoints);
      row.editionsRaced += 1;
      row.wins += standing.wins;
      row.positions.push(...standing.positions);
      if (lastNumber !== null && edition.number === lastNumber) {
        row.lastEditionPoints = standing.totalPoints;
      }
    }
  }

  const rows = [...byRider.values()];
  for (const row of rows) row.positions.sort((a, b) => a - b);
  return assignRanks(rows, (a, b) =>
    compareSeason(a, b, scoring.seasonTiebreaks),
  );
}
