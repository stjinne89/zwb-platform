import { describe, expect, it } from "vitest";
import { ZWBETER_PILLARS, pillarForPath } from "@/lib/zwbeter-pillars";

describe("pillarForPath", () => {
  it("legt elke route onder zijn eigen pijler", () => {
    for (const pillar of ZWBETER_PILLARS) {
      for (const href of pillar.hrefs) expect(pillarForPath(href)).toBe(pillar.id);
    }
  });

  it("volgt subroutes", () => {
    expect(pillarForPath("/zwbeter-worden/core/fundament")).toBe("kracht");
    expect(pillarForPath("/zwbeter-worden/trainer/beoordelen")).toBe("coachen");
    expect(pillarForPath("/zwbeter-worden/protocollen/hitte-kort")).toBe("trainen");
    expect(pillarForPath("/zwbeter-worden/voeding/protocollen/cafeine")).toBe("voeden");
    expect(pillarForPath("/zwbeter-worden/racen/d132a9c6-d95a-487e-a596-7f863acd9048")).toBe("racen");
  });

  it("valt terug op trainen", () => {
    expect(pillarForPath("/zwbeter-worden/onbekend")).toBe("trainen");
  });

  it("geeft elke route aan precies één pijler", () => {
    const all = ZWBETER_PILLARS.flatMap((pillar) => pillar.hrefs);
    expect(new Set(all).size).toBe(all.length);
  });
});
