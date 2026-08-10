import { describe, expect, it } from "vitest";
import {
  adaptationLabel,
  currentPlanOf,
  groupByRoot,
  planToRoot,
  rootIdOf,
  type PlanNode,
} from "@/lib/training/plan-tree";

function plan(
  id: string,
  parent: string | null = null,
  extra: Partial<PlanNode> = {},
): PlanNode {
  return {
    id,
    parent_plan_id: parent,
    created_at: `2026-08-${id.padStart(2, "0")}T09:00:00Z`,
    ...extra,
  };
}

describe("rootIdOf", () => {
  it("geeft het plan zelf terug als het geen parent heeft", () => {
    expect(rootIdOf([plan("01")], "01")).toBe("01");
  });

  it("loopt een keten van drie helemaal terug naar het basisplan", () => {
    const plans = [plan("01"), plan("02", "01"), plan("03", "02")];
    expect(rootIdOf(plans, "03")).toBe("01");
    expect(rootIdOf(plans, "02")).toBe("01");
  });

  it("gebruikt root_plan_id als die gevuld is, zonder de keten te lopen", () => {
    const plans = [plan("02", "01", { root_plan_id: "01" })];
    expect(rootIdOf(plans, "02")).toBe("01");
  });

  it("stopt bij een cyclus in plaats van eeuwig door te lopen", () => {
    const plans = [plan("01", "02"), plan("02", "01")];
    expect(["01", "02"]).toContain(rootIdOf(plans, "01"));
  });

  it("valt terug op het laatst bekende plan als de parent ontbreekt", () => {
    expect(rootIdOf([plan("02", "99")], "02")).toBe("02");
  });

  it("geeft het gevraagde id terug als het plan niet bestaat", () => {
    expect(rootIdOf([plan("01")], "42")).toBe("42");
  });
});

describe("planToRoot", () => {
  it("wijst elk plan uit de keten naar hetzelfde basisplan", () => {
    const map = planToRoot([plan("01"), plan("02", "01"), plan("03", "02")]);
    expect([...map.values()]).toEqual(["01", "01", "01"]);
  });
});

describe("groupByRoot", () => {
  it("groepeert door elkaar lopende families en sorteert nieuwste schema eerst", () => {
    const families = groupByRoot([
      plan("01"),
      plan("04", "01"),
      plan("02"),
      plan("05", "02"),
      plan("06", "04"),
    ]);

    expect(families.map((family) => family.root.id)).toEqual(["02", "01"]);
    expect(families[0].derived.map((row) => row.id)).toEqual(["05"]);
    // Nieuwste aanpassing bovenaan.
    expect(families[1].derived.map((row) => row.id)).toEqual(["06", "04"]);
  });

  it("toont een aanpassing met een ontbrekend basisplan als eigen familie", () => {
    // Wegfilteren zou hem overal onzichtbaar en dus onbeheerbaar maken.
    const families = groupByRoot([plan("07", "99")]);
    expect(families).toHaveLength(1);
    expect(families[0].root.id).toBe("07");
    expect(families[0].derived).toEqual([]);
  });

  it("houdt een basisplan zonder aanpassingen als eigen familie", () => {
    const families = groupByRoot([plan("01")]);
    expect(families).toHaveLength(1);
    expect(families[0].derived).toEqual([]);
  });
});

describe("currentPlanOf", () => {
  function withStatus(id: string, parent: string | null, status: string, day: string) {
    return { ...plan(id, parent), status, created_at: `2026-08-${day}T09:00:00Z` };
  }

  it("pakt de nieuwste lopende herziening", () => {
    const root = withStatus("01", null, "published", "01");
    const family = {
      root,
      derived: [
        withStatus("03", "01", "published", "03"),
        withStatus("02", "01", "published", "02"),
      ],
    };
    expect(currentPlanOf(family).id).toBe("03");
  });

  it("slaat een voorstel over: een concept is nog geen schema", () => {
    const root = withStatus("01", null, "published", "01");
    const family = {
      root,
      derived: [withStatus("03", "01", "draft", "03"), withStatus("02", "01", "published", "02")],
    };
    expect(currentPlanOf(family).id).toBe("02");
  });

  it("valt terug op het basisplan als er nog geen herziening loopt", () => {
    const root = withStatus("01", null, "published", "01");
    expect(currentPlanOf({ root, derived: [] }).id).toBe("01");
    expect(currentPlanOf({ root, derived: [withStatus("02", "01", "draft", "02")] }).id).toBe("01");
  });
});

describe("adaptationLabel", () => {
  it("benoemt de bekende soorten aanpassing", () => {
    expect(adaptationLabel("plan_update")).toBe("Bijgewerkt");
    expect(adaptationLabel("daily")).toBe("Bijgesteld");
    expect(adaptationLabel("day")).toBe("Aangepast");
  });

  it("valt terug op een neutraal label bij een onbekende of lege soort", () => {
    expect(adaptationLabel(null)).toBe("Aangepast");
    expect(adaptationLabel("iets-nieuws")).toBe("Aangepast");
  });
});
