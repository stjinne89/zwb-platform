// De jaarplanning: mikpunten en rustperiodes boven het trainingsschema.
//
// Alles in dit bestand is pure logica op 'YYYY-MM-DD'-strings, zonder Supabase.
// Dat is een bewuste keuze: de signalering hieronder gaat over harde feiten
// (valt er een geplande training in een vakantie? liggen er twee pieken binnen
// drie weken?) en die horen in een unit-test vast te liggen, niet in een
// promptregel waarvan je maar moet hopen dat het model hem meeweegt.
//
// De AI kent de jaarplanning wél — seasonForAi() levert de vorm die naar de
// planner gaat — maar dat is de sturing. Dit bestand is het vangnet.

export const SEASON_PRIORITIES = ["a", "b", "c"] as const;
export type SeasonPriority = (typeof SEASON_PRIORITIES)[number];

export const SEASON_PERIOD_KINDS = ["rust", "rustig"] as const;
export type SeasonPeriodKind = (typeof SEASON_PERIOD_KINDS)[number];

export const SEASON_PRIORITY_LABELS: Record<SeasonPriority, string> = {
  a: "A-doel",
  b: "B-doel",
  c: "C-doel",
};

export const SEASON_PERIOD_LABELS: Record<SeasonPeriodKind, string> = {
  rust: "Rust",
  rustig: "Rustig",
};

/** Twee pieken dichter op elkaar dan dit zijn er in de praktijk één. */
export const A_TARGET_MIN_GAP_DAYS = 21;
/** Zoveel dagen mag een schema vóór een A-doel eindigen zonder dat het opvalt. */
export const PLAN_TAIL_SLACK_DAYS = 7;
/** Een rustperiode langer dan dit vraagt om heropbouw in plaats van doorgaan. */
export const REBUILD_AFTER_REST_DAYS = 10;
/** Hoeveel losse events we hooguit als aparte waarschuwing tonen. */
const MAX_EVENT_WARNINGS = 3;
/** Vanaf dit aantal dagen venster verwachten we op z'n minst één rustperiode. */
const SEASON_WINDOW_DAYS = 300;

export type SeasonTarget = {
  id: string;
  title: string;
  targetDate: string;
  priority: SeasonPriority;
  eventId: string | null;
  goalId: string | null;
  note: string | null;
};

export type SeasonPeriod = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  kind: SeasonPeriodKind;
  note: string | null;
};

/** Eén schema als balk: een plan-familie samengetrokken tot begin en eind. */
export type SeasonPlanBar = {
  rootId: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  goalId: string | null;
};

export type SeasonEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  rsvp: string | null;
};

// ---------------------------------------------------------------------------
// Datumrekenwerk
// ---------------------------------------------------------------------------

/**
 * Dagnummer sinds epoch. Net als mondayKey() in availability.ts rekenen we op
 * 12:00 UTC: op middernacht schuift een zomertijdgrens de dag een vakje op, en
 * dan staat een vakantie van 14 dagen ineens 13 of 15 dagen breed op de balk.
 */
export function dayIndex(dayKey: string): number {
  return Math.round(new Date(`${dayKey}T12:00:00Z`).getTime() / 86_400_000);
}

/** Aantal dagen van `from` tot `to`; negatief als `to` ervóór ligt. */
export function daysBetween(from: string, to: string): number {
  return dayIndex(to) - dayIndex(from);
}

export function shiftDays(dayKey: string, days: number): string {
  const date = new Date(`${dayKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** Positie van een dag op een tijdlijn van `from` tot en met `to`, in procenten. */
export function dayOffsetPct(dayKey: string, from: string, to: string): number {
  const total = daysBetween(from, to) + 1;
  if (total <= 0) return 0;
  return clampPct((daysBetween(from, dayKey) / total) * 100);
}

/**
 * Breedte van een periode op diezelfde tijdlijn. Een periode die er half buiten
 * valt wordt afgeknipt, niet weggelaten: een vakantie die vorige maand begon
 * loopt nog steeds door het venster heen.
 */
export function spanPct(start: string, end: string, from: string, to: string): number {
  const total = daysBetween(from, to) + 1;
  if (total <= 0) return 0;
  const firstDay = Math.max(0, daysBetween(from, start));
  const lastDay = Math.min(total - 1, daysBetween(from, end));
  if (lastDay < firstDay) return 0;
  return clampPct(((lastDay - firstDay + 1) / total) * 100);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function withinPeriod(dayKey: string, period: SeasonPeriod): boolean {
  return dayKey >= period.startDate && dayKey <= period.endDate;
}

export type SeasonMonth = {
  /** 'YYYY-MM' */
  key: string;
  label: string;
  leftPct: number;
  widthPct: number;
};

/** De maandkoppen boven de tijdlijn, met hun plek en breedte. */
export function monthsInWindow(from: string, to: string): SeasonMonth[] {
  const months: SeasonMonth[] = [];
  if (daysBetween(from, to) < 0) return months;

  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  for (let guard = 0; guard < 400; guard += 1) {
    const first = `${year}-${String(month).padStart(2, "0")}-01`;
    if (first > to) break;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const last = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    if (last >= from) {
      months.push({
        key: first.slice(0, 7),
        label: new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("nl-NL", {
          month: "short",
          timeZone: "UTC",
        }),
        leftPct: dayOffsetPct(first < from ? from : first, from, to),
        widthPct: spanPct(first, last, from, to),
      });
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

// ---------------------------------------------------------------------------
// Wat de planner van de jaarplanning te zien krijgt
// ---------------------------------------------------------------------------

export type SeasonForAi = {
  targets: Array<{ title: string; date: string; priority: SeasonPriority }>;
  periods: Array<{ title: string; from: string; to: string; kind: SeasonPeriodKind }>;
  /**
   * Het eerstvolgende A- of B-mikpunt ná het einde van deze planperiode. Zonder
   * dit plant de AI netjes tot de horizon en weet hij niet dat er drie weken
   * later een piek ligt waar hij nu al naartoe zou moeten werken.
   */
  nextTargetAfterPlan: { title: string; date: string; priority: "a" | "b" } | null;
};

/**
 * De jaarplanning in de vorm die de AI-input verwacht, beperkt tot de
 * planperiode. Geeft null terug als er niets in staat: een leeg object in de
 * prompt is alleen maar ruis.
 */
export function seasonForAi(input: {
  targets: SeasonTarget[];
  periods: SeasonPeriod[];
  from: string;
  to: string;
}): SeasonForAi | null {
  const targets = input.targets
    .filter((target) => target.targetDate >= input.from && target.targetDate <= input.to)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
    .map((target) => ({
      title: target.title,
      date: target.targetDate,
      priority: target.priority,
    }));

  const periods = input.periods
    .filter((period) => overlaps(period.startDate, period.endDate, input.from, input.to))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((period) => ({
      title: period.title,
      from: period.startDate,
      to: period.endDate,
      kind: period.kind,
    }));

  const after = input.targets
    .filter((target) => target.targetDate > input.to && target.priority !== "c")
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];

  const nextTargetAfterPlan = after
    ? { title: after.title, date: after.targetDate, priority: after.priority as "a" | "b" }
    : null;

  if (targets.length === 0 && periods.length === 0 && !nextTargetAfterPlan) return null;
  return { targets, periods, nextTargetAfterPlan };
}

// ---------------------------------------------------------------------------
// Signalering
// ---------------------------------------------------------------------------

export type SeasonAction =
  | { kind: "herzie_schema"; label: string }
  | { kind: "verlaag_prioriteit"; label: string; targetId: string }
  | { kind: "maak_doel"; label: string; targetId: string }
  | { kind: "open_schema"; label: string }
  | { kind: "voeg_mikpunt_toe"; label: string; eventId: string; title: string; date: string }
  | { kind: "open_event"; label: string; eventId: string };

export type SeasonWarningCode =
  | "schema_door_rustperiode"
  | "twee_a_doelen_dicht_bij_elkaar"
  | "a_doel_zonder_schema"
  | "schema_eindigt_voor_a_doel"
  | "toegezegd_event_niet_op_tijdlijn"
  | "rustperiode_botst_met_event"
  | "geen_rustperiode_in_seizoen";

export type SeasonWarning = {
  code: SeasonWarningCode;
  severity: "let_op" | "tip";
  /** Voor React-keys en voor tests: uniek binnen één set waarschuwingen. */
  id: string;
  title: string;
  detail: string;
  action: SeasonAction | null;
};

export type SeasonWarningInput = {
  today: string;
  from: string;
  to: string;
  targets: SeasonTarget[];
  periods: SeasonPeriod[];
  plans: SeasonPlanBar[];
  events: SeasonEvent[];
  /** Dagsleutels van workouts die nog gepland staan en niet vervangen zijn. */
  plannedWorkoutDays: string[];
};

function dagMaand(dayKey: string): string {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/**
 * De knelpunten in een jaarplanning, met per stuk een voorstel dat het oplost.
 *
 * Bewust deterministisch en niet door de AI: dit zijn uitspraken over datums die
 * altijd hetzelfde horen uit te vallen. De planner krijgt dezelfde gegevens mee
 * en hoort er zelf al rekening mee te houden; blijft dat uit, dan ziet het lid
 * het hier alsnog.
 */
export function seasonWarnings(input: SeasonWarningInput): SeasonWarning[] {
  const warnings: SeasonWarning[] = [];
  const { today, targets, periods, plans, events } = input;

  const rustPeriodes = periods
    .filter((period) => period.kind === "rust" && period.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  // 1. Een schema dat dwars door een rustperiode heen plant.
  for (const period of rustPeriodes) {
    const dagen = input.plannedWorkoutDays.filter(
      (day) => day >= period.startDate && day <= period.endDate && day >= today,
    );
    if (dagen.length === 0) continue;
    warnings.push({
      code: "schema_door_rustperiode",
      severity: "let_op",
      id: `schema_door_rustperiode:${period.id}`,
      title: `Je schema traint door "${period.title}" heen`,
      detail: `Er staan ${dagen.length} training${dagen.length === 1 ? "" : "en"} gepland tussen ${dagMaand(period.startDate)} en ${dagMaand(period.endDate)}.`,
      action: { kind: "herzie_schema", label: "Laat je schema herzien" },
    });
  }

  // 2. Twee pieken te dicht op elkaar.
  const aDoelen = targets
    .filter((target) => target.priority === "a" && target.targetDate >= today)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  for (let i = 1; i < aDoelen.length; i += 1) {
    const vorige = aDoelen[i - 1];
    const huidige = aDoelen[i];
    const gat = daysBetween(vorige.targetDate, huidige.targetDate);
    if (gat >= A_TARGET_MIN_GAP_DAYS) continue;
    warnings.push({
      code: "twee_a_doelen_dicht_bij_elkaar",
      severity: "let_op",
      id: `twee_a_doelen_dicht_bij_elkaar:${huidige.id}`,
      title: `"${vorige.title}" en "${huidige.title}" liggen ${gat} dagen uit elkaar`,
      detail:
        "Naar twee pieken tegelijk toewerken lukt niet: de taper van de eerste eet de opbouw van de tweede op.",
      action: {
        kind: "verlaag_prioriteit",
        label: `Zet "${huidige.title}" op B`,
        targetId: huidige.id,
      },
    });
  }

  // 3. Een A-doel waar nog geen schema aan hangt.
  const doelenMetPlan = new Set(
    plans.map((plan) => plan.goalId).filter((goalId): goalId is string => Boolean(goalId)),
  );
  for (const target of aDoelen) {
    const heeftPlan = target.goalId != null && doelenMetPlan.has(target.goalId);
    if (heeftPlan) continue;
    warnings.push({
      code: "a_doel_zonder_schema",
      severity: "let_op",
      id: `a_doel_zonder_schema:${target.id}`,
      title: `"${target.title}" heeft nog geen schema`,
      detail:
        target.goalId == null
          ? `Er is nog geen trainingsdoel voor ${dagMaand(target.targetDate)}.`
          : `Het doel bestaat, maar er is nog geen schema voor gemaakt.`,
      action:
        target.goalId == null
          ? { kind: "maak_doel", label: "Maak hier een doel van", targetId: target.id }
          : { kind: "open_schema", label: "Naar je schema" },
    });
  }

  // 4. Het schema stopt ruim vóór de eerstvolgende piek.
  const eersteADoel = aDoelen[0];
  if (eersteADoel && plans.length > 0) {
    const laatsteEinde = plans
      .map((plan) => plan.endDate)
      .sort((a, b) => a.localeCompare(b))
      .at(-1) as string;
    const gat = daysBetween(laatsteEinde, eersteADoel.targetDate);
    if (gat > PLAN_TAIL_SLACK_DAYS) {
      warnings.push({
        code: "schema_eindigt_voor_a_doel",
        severity: "let_op",
        id: `schema_eindigt_voor_a_doel:${eersteADoel.id}`,
        title: `Je schema stopt ${gat} dagen vóór "${eersteADoel.title}"`,
        detail: `Het loopt tot ${dagMaand(laatsteEinde)}; het mikpunt is ${dagMaand(eersteADoel.targetDate)}.`,
        action: { kind: "open_schema", label: "Werk je schema bij" },
      });
    }
  }

  // 5. Toegezegde events die nog niet op de tijdlijn staan.
  const eventIdsOpTijdlijn = new Set(
    targets.map((target) => target.eventId).filter((id): id is string => Boolean(id)),
  );
  const ontbrekend = events
    .filter(
      (event) =>
        event.rsvp === "yes" && event.date >= today && !eventIdsOpTijdlijn.has(event.id),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const event of ontbrekend.slice(0, MAX_EVENT_WARNINGS)) {
    warnings.push({
      code: "toegezegd_event_niet_op_tijdlijn",
      severity: "let_op",
      id: `toegezegd_event_niet_op_tijdlijn:${event.id}`,
      title: `"${event.title}" staat nog niet in je jaarplan`,
      detail: `Je hebt ja gezegd voor ${dagMaand(event.date)}, maar het is nog geen mikpunt.`,
      action: {
        kind: "voeg_mikpunt_toe",
        label: "Zet op de tijdlijn",
        eventId: event.id,
        title: event.title,
        date: event.date,
      },
    });
  }

  // 6. Een event midden in een rustperiode.
  const botsingen: Array<{ event: SeasonEvent; period: SeasonPeriod }> = [];
  for (const period of rustPeriodes) {
    for (const event of events) {
      if (event.rsvp !== "yes" && event.rsvp !== "maybe") continue;
      if (event.date < today) continue;
      if (!withinPeriod(event.date, period)) continue;
      botsingen.push({ event, period });
    }
  }
  for (const { event, period } of botsingen.slice(0, MAX_EVENT_WARNINGS)) {
    warnings.push({
      code: "rustperiode_botst_met_event",
      severity: "let_op",
      id: `rustperiode_botst_met_event:${period.id}:${event.id}`,
      title: `"${event.title}" valt in "${period.title}"`,
      detail: `Je staat op ${event.rsvp === "yes" ? "ja" : "misschien"} voor een event midden in een periode waarin je niet traint.`,
      action: { kind: "open_event", label: "Bekijk het event", eventId: event.id },
    });
  }

  // 7. Een heel seizoen zonder één rustperiode.
  const heeftRust = periods.some((period) => period.kind === "rust");
  if (!heeftRust && daysBetween(input.from, input.to) >= SEASON_WINDOW_DAYS) {
    warnings.push({
      code: "geen_rustperiode_in_seizoen",
      severity: "tip",
      id: "geen_rustperiode_in_seizoen",
      title: "Er staat geen enkele rustperiode in je jaar",
      detail:
        "Een vakantie of winterstop hoort erbij; zonder die weken plant het schema gewoon door.",
      action: null,
    });
  }

  return warnings.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "let_op" ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}
