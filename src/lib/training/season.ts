// De jaarplanning: mikpunten, rustperiodes en trainingskampen boven het trainingsschema.
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

// 'kamp' is de tegenhanger van 'rust': dagen waarop het lid juist veel meer
// rijdt dan normaal. De planner bouwt daar omheen (zie defaultTrainingPrompt).
export const SEASON_PERIOD_KINDS = ["rust", "rustig", "kamp"] as const;
export type SeasonPeriodKind = (typeof SEASON_PERIOD_KINDS)[number];

export const SEASON_PRIORITY_LABELS: Record<SeasonPriority, string> = {
  a: "A-doel",
  b: "B-doel",
  c: "C-doel",
};

export const SEASON_PERIOD_LABELS: Record<SeasonPeriodKind, string> = {
  rust: "Rust",
  rustig: "Rustig",
  kamp: "Trainingskamp",
};

/** Twee pieken dichter op elkaar dan dit zijn er in de praktijk één. */
export const A_TARGET_MIN_GAP_DAYS = 21;
/**
 * Een schema is een blok van hooguit twaalf weken. Verder vooruit is het jaar
 * een route met mikpunten, geen uitgewerkt schema: wat een amateur over vier
 * maanden kan en wil rijden, is nu niet te plannen. Zie /hulp#blokken.
 */
export const PLAN_BLOCK_WEEKS = 12;
export const PLAN_BLOCK_DAYS = PLAN_BLOCK_WEEKS * 7;
/** Zo kort voor het einde van een blok mag het lid het volgende klaarzetten. */
export const NEXT_BLOCK_LEAD_DAYS = 14;
/** Een rustperiode langer dan dit vraagt om heropbouw in plaats van doorgaan. */
export const REBUILD_AFTER_REST_DAYS = 10;
/**
 * Zoveel dagen moeten er minstens tussen het einde van een trainingskamp en een
 * piek liggen. Een kamp dat een tot twee weken vóór de piek eindigt is juist de
 * gangbare opzet: de dagen erna zijn de taper. Stond tot oktober 2026 op tien,
 * waardoor een kamp acht dagen vóór een A-doel een waarschuwing kreeg. Zie
 * /hulp#jaarplan voor de bronnen.
 */
export const CAMP_BEFORE_A_TARGET_DAYS = 7;
/** Hoeveel losse events we hooguit als aparte waarschuwing tonen. */
const MAX_EVENT_WARNINGS = 3;

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

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function withinPeriod(dayKey: string, period: SeasonPeriod): boolean {
  return dayKey >= period.startDate && dayKey <= period.endDate;
}

/**
 * De laatste dag van een blok dat op `from` begint. Ligt de doeldatum binnen
 * twaalf weken, dan eindigt het blok daar; ligt hij verder weg, in het verleden
 * of is hij er niet, dan na twaalf weken.
 */
export function blockEndDate(from: string, targetDate: string | null | undefined): string {
  const cap = shiftDays(from, PLAN_BLOCK_DAYS);
  const target = targetDate ? String(targetDate).slice(0, 10) : null;
  return target && target >= from && target < cap ? target : cap;
}

/**
 * Mag het volgende blok klaargezet worden? Alleen voor een schema dat loopt en
 * binnen twee weken afloopt. Een concept telt niet: dan ligt er al iets klaar
 * dat eerst beoordeeld moet worden.
 */
export function nextBlockDue(
  today: string,
  plan: Pick<SeasonPlanBar, "endDate" | "status"> | null | undefined,
): boolean {
  if (!plan || (plan.status !== "published" && plan.status !== "approved")) return false;
  const rest = daysBetween(today, plan.endDate);
  return rest >= 0 && rest <= NEXT_BLOCK_LEAD_DAYS;
}

// ---------------------------------------------------------------------------
// Wat de planner van de jaarplanning te zien krijgt
// ---------------------------------------------------------------------------

export type SeasonForAi = {
  targets: Array<{ title: string; date: string; priority: SeasonPriority }>;
  periods: Array<{
    title: string;
    from: string;
    to: string;
    kind: SeasonPeriodKind;
  }>;
  /**
   * Het eerstvolgende A- of B-mikpunt ná het einde van deze planperiode. Zonder
   * dit plant de AI netjes tot de horizon en weet hij niet dat er drie weken
   * later een piek ligt waar hij nu al naartoe zou moeten werken.
   */
  nextTargetAfterPlan: {
    title: string;
    date: string;
    priority: "a" | "b";
  } | null;
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
    ? {
        title: after.title,
        date: after.targetDate,
        priority: after.priority as "a" | "b",
      }
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
  | { kind: "open_event"; label: string; eventId: string };

export type SeasonWarningCode =
  | "schema_door_rustperiode"
  | "twee_a_doelen_dicht_bij_elkaar"
  | "a_doel_zonder_schema"
  | "rustperiode_botst_met_event"
  | "kamp_vlak_voor_a_doel";

/** Waar op de weg een signalering thuishoort: bij de regel waar hij over gaat. */
export type SeasonWarningAnchor = {
  kind: "period" | "target" | "event";
  id: string;
};

export type SeasonWarning = {
  code: SeasonWarningCode;
  severity: "let_op" | "tip";
  /** Voor React-keys en voor tests: uniek binnen één set waarschuwingen. */
  id: string;
  title: string;
  detail: string;
  action: SeasonAction | null;
  anchor: SeasonWarningAnchor;
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
 *
 * Alleen wat nu speelt. Tot oktober 2026 stond hier ook: een schema dat vóór
 * een A-doel stopt, een toegezegd event dat nog geen mikpunt is, en een jaar
 * zonder rustperiode. Met blokken van twaalf weken stopt elk schema vóór een
 * doel dat verder weg ligt, dus die eerste was altijd waar; de tweede ging af
 * op elke clubrit en is nu een knop op de regel zelf; de derde had geen
 * handeling die hem oploste.
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
      anchor: { kind: "period", id: period.id },
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
      anchor: { kind: "target", id: huidige.id },
    });
  }

  // 3. Een A-doel binnen één blok waar nog geen schema aan hangt. Verder weg is
  // dat geen probleem: daar komt het schema vanzelf, blok voor blok.
  const doelenMetPlan = new Set(
    plans.map((plan) => plan.goalId).filter((goalId): goalId is string => Boolean(goalId)),
  );
  for (const target of aDoelen) {
    if (daysBetween(today, target.targetDate) > PLAN_BLOCK_DAYS) continue;
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
          ? {
              kind: "maak_doel",
              label: "Maak hier een doel van",
              targetId: target.id,
            }
          : { kind: "open_schema", label: "Naar je schema" },
      anchor: { kind: "target", id: target.id },
    });
  }

  // 4. Een event midden in een rustperiode.
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
      action: {
        kind: "open_event",
        label: "Bekijk het event",
        eventId: event.id,
      },
      anchor: { kind: "event", id: event.id },
    });
  }

  // 5. Een trainingskamp dat te kort vóór een piek eindigt.
  for (const period of periods) {
    if (period.kind !== "kamp" || period.endDate < today) continue;
    const doel = aDoelen.find((target) => {
      const gat = daysBetween(period.endDate, target.targetDate);
      return gat > 0 && gat < CAMP_BEFORE_A_TARGET_DAYS;
    });
    if (!doel) continue;
    const gat = daysBetween(period.endDate, doel.targetDate);
    warnings.push({
      code: "kamp_vlak_voor_a_doel",
      severity: "let_op",
      id: `kamp_vlak_voor_a_doel:${period.id}`,
      title: `"${period.title}" eindigt ${gat} ${gat === 1 ? "dag" : "dagen"} vóór "${doel.title}"`,
      detail:
        "Minder dan een week is te kort om de vermoeidheid van een kamp kwijt te raken. Een tot twee weken ertussen is ruim genoeg.",
      action: null,
      anchor: { kind: "period", id: period.id },
    });
  }

  return warnings.sort((a, b) => a.id.localeCompare(b.id));
}

// ---------------------------------------------------------------------------
// De weg: het jaarplan van boven naar beneden
// ---------------------------------------------------------------------------

/**
 * Het wegdek op een punt: wat al geweest is, wat als schema is uitgewerkt, en
 * wat verder weg ligt en nog alleen een route is.
 */
export type SeasonRoadSurface = "voorbij" | "schema" | "open";

export type SeasonRoadStop = {
  key: string;
  date: string;
  surface: SeasonRoadSurface;
} & (
  | { kind: "maand"; label: string }
  /** Een of meer maanden waar niets in staat, samengetrokken tot één regel. */
  | { kind: "leeg"; label: string }
  | { kind: "vandaag" }
  | { kind: "mikpunt"; target: SeasonTarget; event: SeasonEvent | null }
  | { kind: "event"; event: SeasonEvent }
  | { kind: "periode"; period: SeasonPeriod; days: number }
  | { kind: "schema_start"; plan: SeasonPlanBar }
  /** Tot hier is het schema uitgewerkt. */
  | { kind: "schema_eind"; plan: SeasonPlanBar; nextBlockDue: boolean }
  /** Twaalf weken vóór een A-doel: hier begint het blok dat ernaartoe werkt. */
  | { kind: "opbouw"; target: SeasonTarget }
);

const ROAD_ORDER: Record<SeasonRoadStop["kind"], number> = {
  maand: 0,
  leeg: 0,
  vandaag: 1,
  schema_start: 2,
  periode: 3,
  event: 4,
  mikpunt: 5,
  opbouw: 6,
  schema_eind: 7,
};

function maandNaam(maandKey: string, jaarErbij: boolean): string {
  return new Date(`${maandKey}-01T12:00:00Z`).toLocaleDateString("nl-NL", {
    month: "long",
    ...(jaarErbij ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

function volgendeMaand(maandKey: string): string {
  const jaar = Number(maandKey.slice(0, 4));
  const maand = Number(maandKey.slice(5, 7));
  return maand === 12 ? `${jaar + 1}-01` : `${jaar}-${String(maand + 1).padStart(2, "0")}`;
}

/**
 * De haltes van de weg, op datum, met de maanden ertussen.
 *
 * Niet op schaal: de afstand tussen twee haltes volgt de inhoud, niet het aantal
 * dagen. Een jaar op schaal past niet op een telefoon, en dat was precies wat de
 * horizontale balk tot oktober 2026 onleesbaar maakte.
 *
 * Een mikpunt op een event en dat event zelf zijn één halte die de prioriteit
 * van het mikpunt draagt. Koppelen gaat op event-id, nooit op datum: de
 * eventdatum is een UTC-dag, de mikpuntdatum een Amsterdamse, en een start
 * tussen middernacht en twee uur valt dan op twee verschillende dagen. De datum
 * van de halte is die van het mikpunt, want daar rekent de rest van de
 * jaarplanning mee. Een mikpunt waarvan het event niet (meer) in de lijst staat
 * blijft een gewoon mikpunt.
 */
export function seasonRoad(input: {
  today: string;
  from: string;
  targets: SeasonTarget[];
  periods: SeasonPeriod[];
  events: SeasonEvent[];
  plans: SeasonPlanBar[];
}): SeasonRoadStop[] {
  const { today, from, targets, periods, events, plans } = input;

  function surfaceAt(day: string): SeasonRoadSurface {
    if (day < today) return "voorbij";
    return plans.some((plan) => day >= plan.startDate && day <= plan.endDate) ? "schema" : "open";
  }

  const haltes: SeasonRoadStop[] = [
    { kind: "vandaag", key: "vandaag", date: today, surface: surfaceAt(today) },
  ];

  const eventById = new Map(events.map((event) => [event.id, event]));
  const eventsMetMikpunt = new Set<string>();
  for (const target of targets) {
    const event = target.eventId ? (eventById.get(target.eventId) ?? null) : null;
    if (event) eventsMetMikpunt.add(event.id);
    haltes.push({
      kind: "mikpunt",
      key: `mikpunt:${target.id}`,
      date: target.targetDate,
      surface: surfaceAt(target.targetDate),
      target,
      event,
    });
  }
  for (const event of events) {
    if (eventsMetMikpunt.has(event.id)) continue;
    haltes.push({
      kind: "event",
      key: `event:${event.id}`,
      date: event.date,
      surface: surfaceAt(event.date),
      event,
    });
  }
  for (const period of periods) {
    haltes.push({
      kind: "periode",
      key: `periode:${period.id}`,
      date: period.startDate < from ? from : period.startDate,
      // Een vakantie die nu loopt is niet voorbij, ook al begon hij vorige week.
      surface: period.endDate < today ? "voorbij" : surfaceAt(period.endDate),
      period,
      days: daysBetween(period.startDate, period.endDate) + 1,
    });
  }

  const laatste = [...plans].sort((a, b) => a.endDate.localeCompare(b.endDate)).at(-1);
  for (const plan of plans) {
    if (plan.startDate >= from) {
      haltes.push({
        kind: "schema_start",
        key: `schema_start:${plan.rootId}`,
        date: plan.startDate,
        surface: surfaceAt(plan.startDate),
        plan,
      });
    }
    if (plan === laatste && plan.endDate >= today) {
      haltes.push({
        kind: "schema_eind",
        key: `schema_eind:${plan.rootId}`,
        date: plan.endDate,
        surface: "schema",
        plan,
        nextBlockDue: nextBlockDue(today, plan),
      });
    }
  }

  for (const target of targets) {
    if (target.priority !== "a") continue;
    const start = shiftDays(target.targetDate, -PLAN_BLOCK_DAYS);
    // Alleen zolang dat blok er nog niet is; anders staat het schema er al.
    if (start <= today || start < from || surfaceAt(start) === "schema") continue;
    haltes.push({
      kind: "opbouw",
      key: `opbouw:${target.id}`,
      date: start,
      surface: "open",
      target,
    });
  }

  haltes.sort((a, b) => a.date.localeCompare(b.date) || ROAD_ORDER[a.kind] - ROAD_ORDER[b.kind]);

  const jaarVanNu = today.slice(0, 4);
  const weg: SeasonRoadStop[] = [];
  let vorigeMaand: string | null = null;
  for (const halte of haltes) {
    const maand = halte.date.slice(0, 7);
    if (maand !== vorigeMaand) {
      // De maanden waar niets in staat, tussen deze halte en de vorige.
      if (vorigeMaand) {
        const leeg: string[] = [];
        for (let m = volgendeMaand(vorigeMaand); m < maand; m = volgendeMaand(m)) leeg.push(m);
        if (leeg.length > 0) {
          const eerste = maandNaam(leeg[0], false);
          const slot = maandNaam(leeg.at(-1) as string, false);
          weg.push({
            kind: "leeg",
            key: `leeg:${leeg[0]}`,
            date: `${leeg[0]}-01`,
            surface: surfaceAt(`${leeg[0]}-01`),
            label:
              leeg.length === 1
                ? eerste
                : leeg.length === 2
                  ? `${eerste} en ${slot}`
                  : `${eerste} t/m ${slot}`,
          });
        }
      }
      weg.push({
        kind: "maand",
        key: `maand:${maand}`,
        date: halte.date,
        surface: surfaceAt(halte.date),
        label: maandNaam(maand, maand.slice(0, 4) !== jaarVanNu),
      });
      vorigeMaand = maand;
    }
    weg.push(halte);
  }
  return weg;
}

/** Waar het lid nu staat: het lopende blok en de eerstvolgende piek. */
export function seasonStand(input: {
  today: string;
  targets: SeasonTarget[];
  plans: SeasonPlanBar[];
}): {
  plan: SeasonPlanBar | null;
  /** Weken die het schema nog vooruit is uitgewerkt, naar boven afgerond. */
  weeksPlanned: number;
  peak: SeasonTarget | null;
  weeksToPeak: number;
} {
  const { today, targets, plans } = input;
  const plan =
    plans
      .filter((bar) => bar.startDate <= today && bar.endDate >= today)
      .sort((a, b) => b.endDate.localeCompare(a.endDate))[0] ?? null;
  const peak =
    targets
      .filter((target) => target.priority === "a" && target.targetDate >= today)
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0] ?? null;
  return {
    plan,
    weeksPlanned: plan ? Math.ceil(daysBetween(today, plan.endDate) / 7) : 0,
    peak,
    weeksToPeak: peak ? Math.round(daysBetween(today, peak.targetDate) / 7) : 0,
  };
}
