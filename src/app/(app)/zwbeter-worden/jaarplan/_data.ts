// Wat de jaarplanning-pagina laat zien: mikpunten, rustperiodes, de schema's als
// balk, en de clubevents waar het lid ja of misschien op heeft gezegd.

import { groupByRoot } from "@/lib/training/plan-tree";
import { loadScheduleEvents } from "@/lib/training/events";
import { loadSeasonPeriods, loadSeasonTargets } from "@/lib/training/season-data";
import {
  seasonWarnings,
  shiftDays,
  type SeasonEvent,
  type SeasonPeriod,
  type SeasonPlanBar,
  type SeasonTarget,
  type SeasonWarning,
} from "@/lib/training/season";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Het venster loopt van een maand terug tot elf maanden vooruit. */
export const SEASON_LOOKBACK_DAYS = 31;
export const SEASON_LOOKAHEAD_DAYS = 334;

/**
 * Twaalf maanden clubevents passen niet in de standaardlimiet van
 * loadScheduleEvents (50), die op een schemaperiode van een paar maanden is
 * gezet. Vandaar een ruimere waarde hier.
 */
const EVENT_LIMIT = 400;

export type SeasonData = {
  from: string;
  to: string;
  today: string;
  targets: SeasonTarget[];
  periods: SeasonPeriod[];
  plans: SeasonPlanBar[];
  events: SeasonEvent[];
  warnings: SeasonWarning[];
};

export function seasonWindow(today: string) {
  return {
    from: shiftDays(today, -SEASON_LOOKBACK_DAYS),
    to: shiftDays(today, SEASON_LOOKAHEAD_DAYS),
  };
}

type PlanRow = {
  id: string;
  parent_plan_id: string | null;
  root_plan_id: string | null;
  goal_id: string | null;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  created_at: string | null;
};

/**
 * Eén balk per schema, niet per plan-rij. Een aanpassing is in dit datamodel een
 * nieuw plan met een parent; zonder groeperen zou een lid dat drie keer zijn
 * schema liet bijwerken vier balken over elkaar heen zien staan.
 */
function planBars(rows: PlanRow[]): SeasonPlanBar[] {
  const families = groupByRoot(
    rows.map((row) => ({
      id: row.id,
      parent_plan_id: row.parent_plan_id,
      root_plan_id: row.root_plan_id,
      created_at: row.created_at ?? "",
      row,
    })),
  );

  const bars: SeasonPlanBar[] = [];
  for (const family of families) {
    const leden = [family.root, ...family.derived].map((plan) => plan.row);
    const starts = leden.map((plan) => plan.start_date).filter(Boolean) as string[];
    const ends = leden.map((plan) => plan.end_date).filter(Boolean) as string[];
    if (starts.length === 0 || ends.length === 0) continue;

    // Het bereik komt uit de hele familie, maar titel, doel en status uit de
    // nieuwste rij: die beschrijft de huidige stand van het schema. Zie
    // currentPlanOf() in plan-tree.ts, dat op de schemapagina hetzelfde doet.
    const nieuwste = family.derived[0]?.row ?? family.root.row;
    bars.push({
      rootId: family.root.id,
      title: nieuwste.title ?? "Schema",
      startDate: [...starts].sort((a, b) => a.localeCompare(b))[0].slice(0, 10),
      endDate: ([...ends].sort((a, b) => a.localeCompare(b)).at(-1) as string).slice(0, 10),
      status: nieuwste.status ?? "draft",
      goalId: nieuwste.goal_id,
    });
  }
  return bars.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function loadSeason(
  admin: Admin,
  profileId: string,
  today: string,
): Promise<SeasonData> {
  const { from, to } = seasonWindow(today);

  const [targets, periods, { data: planRows }, scheduleEvents, { data: workoutRows }] =
    await Promise.all([
      loadSeasonTargets(admin, profileId, from, to),
      loadSeasonPeriods(admin, profileId, from, to),
      admin
        .from("training_plans")
        .select(
          "id, parent_plan_id, root_plan_id, goal_id, title, start_date, end_date, status, created_at",
        )
        .eq("profile_id", profileId)
        .lte("start_date", to)
        .gte("end_date", from)
        .not("status", "eq", "archived")
        .order("created_at", { ascending: true }),
      loadScheduleEvents(admin, profileId, from, to, EVENT_LIMIT).catch(() => []),
      admin
        .from("training_workouts")
        .select("scheduled_at")
        .eq("profile_id", profileId)
        .eq("status", "planned")
        .is("superseded_at", null)
        .gte("scheduled_at", `${today}T00:00:00`)
        .lte("scheduled_at", `${to}T23:59:59`),
    ]);

  const events: SeasonEvent[] = scheduleEvents
    .filter((event) => event.rsvp === "yes" || event.rsvp === "maybe")
    .map((event) => ({
      id: event.id,
      title: event.title,
      type: event.type,
      date: String(event.start_at).slice(0, 10),
      rsvp: event.rsvp,
    }));

  const plans = planBars((planRows ?? []) as PlanRow[]);
  const plannedWorkoutDays = (workoutRows ?? []).map((row) =>
    String(row.scheduled_at).slice(0, 10),
  );

  return {
    from,
    to,
    today,
    targets,
    periods,
    plans,
    events,
    warnings: seasonWarnings({
      today,
      from,
      to,
      targets,
      periods,
      plans,
      events,
      plannedWorkoutDays,
    }),
  };
}
