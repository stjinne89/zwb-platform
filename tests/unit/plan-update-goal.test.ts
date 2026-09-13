import { describe, expect, it } from "vitest";
import {
  applyGoalUpdates,
  changedSinceSchedule,
  goalUpdatesFromForm,
  planUpdateEndDate,
} from "@/lib/training/draft";
import { planUpdatePrompt } from "@/lib/training/workouts";

// Meldingen 2 en 3 (plannenboek, 4 september 2026): onder "Schema bijwerken"
// kwamen een gewijzigd doeltype en een gewijzigde doeldatum niet in het schema.

const goal = {
  max_hours_per_week: 6,
  desired_intensity: "balanced",
  goal_type: "base_fitness",
  target_date: "2026-11-01",
  available_days: ["ma", "wo"],
};

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("goalUpdatesFromForm + applyGoalUpdates", () => {
  it("neemt een ander doeltype en een latere doeldatum over", () => {
    const updates = applyGoalUpdates(
      goal,
      goalUpdatesFromForm(
        form({ goal_type: "gran_fondo", target_date: "2027-07-04", desired_intensity: "balanced" }),
      ),
    );
    expect(updates.goal_type).toBe("gran_fondo");
    expect(updates.target_date).toBe("2027-07-04");
    expect(updates.max_hours_per_week).toBe(6);
  });

  it("neemt een eerdere doeldatum over", () => {
    const updates = applyGoalUpdates(goal, goalUpdatesFromForm(form({ target_date: "2026-10-01" })));
    expect(updates.target_date).toBe("2026-10-01");
  });

  it("wist de doeldatum bij een leeg veld in plaats van de oude te houden", () => {
    const updates = applyGoalUpdates(goal, goalUpdatesFromForm(form({ target_date: "" })));
    expect(updates.target_date).toBeNull();
  });

  it("laat de doeldatum staan als het veld niet is meegestuurd", () => {
    const updates = applyGoalUpdates(goal, goalUpdatesFromForm(form({ goal_type: "ftp" })));
    expect(updates.target_date).toBe("2026-11-01");
  });
});

describe("changedSinceSchedule", () => {
  const builtWith = JSON.stringify({ goal: { type: "base_fitness", targetDate: "2026-11-01" } });

  it("ziet de wijziging ook als het doel al eerder is opgeslagen", () => {
    // Tweede poging na een mislukte generatie: de doelrij staat al op gran fondo,
    // dus de doelrij zelf toont geen verschil meer. Het schema is nog basis.
    expect(
      changedSinceSchedule(builtWith, { goal_type: "gran_fondo", target_date: "2027-07-04" }),
    ).toEqual({
      goalType: ["base_fitness", "gran_fondo"],
      targetDate: ["2026-11-01", "2027-07-04"],
    });
  });

  it("meldt niets als het schema al met deze uitgangspunten is gemaakt", () => {
    expect(
      changedSinceSchedule(builtWith, { goal_type: "base_fitness", target_date: "2026-11-01" }),
    ).toEqual({});
  });

  it("ziet een gewiste doeldatum", () => {
    expect(changedSinceSchedule(builtWith, { goal_type: "base_fitness", target_date: null })).toEqual({
      targetDate: ["2026-11-01", null],
    });
  });

  it("verzint niets zonder leesbare invoer", () => {
    expect(changedSinceSchedule(null, { goal_type: "ftp", target_date: null })).toEqual({});
    expect(changedSinceSchedule("geen json", { goal_type: "ftp", target_date: null })).toEqual({});
  });
});

describe("planUpdateEndDate", () => {
  const summary = JSON.stringify({ planUpdate: { toDate: "2026-12-20" } });

  it("laat een bijgewerkt schema niet eerder eindigen dan de gevraagde periode", () => {
    // De AI eindigt op de naar voren gehaalde doeldatum; zonder dit bleven de oude
    // workouts daarna naast de nieuwe staan.
    expect(planUpdateEndDate("2026-10-01", summary)).toBe("2026-12-20");
  });

  it("houdt een latere einddatum van de AI aan", () => {
    expect(planUpdateEndDate("2026-12-31", summary)).toBe("2026-12-31");
  });

  it("valt terug op de AI-datum zonder leesbare invoer", () => {
    expect(planUpdateEndDate("2026-10-01", null)).toBe("2026-10-01");
  });
});

describe("planUpdatePrompt", () => {
  it("wijst goal.type en goal.targetDate aan als geldend, los van het schema-einde", () => {
    const prompt = planUpdatePrompt();
    expect(prompt).toContain("UITSLUITEND in goal.type");
    expect(prompt).toContain("niet het einde van dit schema");
  });
});
