// Een aanpassing is een afgeleid plan: een eigen rij in training_plans met een
// parent_plan_id. Voor de weergave willen we het omgekeerde — één schema met de
// aanpassingen erin verwerkt — en daarvoor moet elk plan terug te leiden zijn
// naar het schema waar de keten begon.
//
// Sinds 0113 staat die wortel als root_plan_id in de database. Deze helpers
// gebruiken die kolom als hij gevuld is en lopen anders de parent-keten omhoog,
// zodat een rij die nog van vóór de migratie komt ook goed terechtkomt.

export type PlanNode = {
  id: string;
  parent_plan_id: string | null;
  root_plan_id?: string | null;
  created_at: string;
  adaptation_kind?: string | null;
};

/**
 * Het schema waar dit plan bij hoort. Onbekende parents en (theoretische)
 * cycli leveren het plan zelf op: liever een eigen kaart dan een oneindige lus
 * of een plan dat uit de lijst verdwijnt.
 */
export function rootIdOf(plans: Map<string, PlanNode> | PlanNode[], planId: string): string {
  const index = plans instanceof Map ? plans : new Map(plans.map((plan) => [plan.id, plan]));

  const seen = new Set<string>();
  let current = index.get(planId);
  if (!current) return planId;

  while (current) {
    if (current.root_plan_id) return current.root_plan_id;
    if (!current.parent_plan_id) return current.id;
    if (seen.has(current.id)) return current.id;
    seen.add(current.id);

    const parent = index.get(current.parent_plan_id);
    if (!parent) return current.id;
    current = parent;
  }

  return planId;
}

/** plan_id → root_plan_id, voor het groeperen van workouts per schema. */
export function planToRoot(plans: PlanNode[]): Map<string, string> {
  const index = new Map(plans.map((plan) => [plan.id, plan]));
  return new Map(plans.map((plan) => [plan.id, rootIdOf(index, plan.id)]));
}

export type PlanFamily<T extends PlanNode> = {
  root: T;
  /** Aanpassingen op dit schema, nieuwste eerst. */
  derived: T[];
};

/**
 * Groepeert plannen per schema, nieuwste schema eerst.
 *
 * Een aanpassing waarvan het basisplan ontbreekt (verwijderd, of buiten het
 * opgevraagde bereik) wordt zijn eigen familie. Dat is lelijker dan hem onder
 * zijn schema hangen, maar wegfilteren zou hem overal onzichtbaar maken en dus
 * onbeheerbaar.
 */
export function groupByRoot<T extends PlanNode>(plans: T[]): Array<PlanFamily<T>> {
  const index = new Map(plans.map((plan) => [plan.id, plan]));
  const families = new Map<string, PlanFamily<T>>();

  for (const plan of plans) {
    const rootId = rootIdOf(index, plan.id);
    const root = index.get(rootId);
    if (!root) continue;
    const family = families.get(rootId) ?? { root, derived: [] };
    if (plan.id !== rootId) family.derived.push(plan);
    families.set(rootId, family);
  }

  return [...families.values()]
    .map((family) => ({
      ...family,
      derived: [...family.derived].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    }))
    .sort((a, b) => b.root.created_at.localeCompare(a.root.created_at));
}

/**
 * Het plan dat de huidige stand van het schema beschrijft: de nieuwste
 * herziening die daadwerkelijk loopt, en anders het basisplan zelf.
 *
 * Nodig omdat de kaart van een schema het basisplan als kop gebruikt, en dat
 * draagt nog de samenvatting van de allereerste generatie. Een lid dat zijn
 * uren van zes naar tien bijstelde bleef daardoor "maximaal 6 uur per week"
 * lezen terwijl de workouts eronder allang op tien uur stonden.
 *
 * Concepten tellen niet mee: een voorstel is nog geen schema.
 */
export function currentPlanOf<T extends PlanNode & { status?: string }>(family: {
  root: T;
  derived: T[];
}): T {
  return (
    family.derived.find(
      (plan) => plan.status === "published" || plan.status === "approved",
    ) ?? family.root
  );
}

const ADAPTATION_LABELS: Record<string, string> = {
  day: "Aangepast",
  plan_update: "Bijgewerkt",
  daily: "Bijgesteld",
};

/** Korte aanduiding bij een workout die uit een aanpassing komt. */
export function adaptationLabel(kind: string | null | undefined): string {
  return (kind && ADAPTATION_LABELS[kind]) || "Aangepast";
}
