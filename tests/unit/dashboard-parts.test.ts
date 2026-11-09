import { describe, expect, it } from "vitest";
import {
  DASHBOARD_PARTS,
  offeredDashboardParts,
  parseDashboardHidden,
} from "@/lib/dashboard-parts";
import { isModuleKey, type ModuleKey } from "@/lib/modules";

describe("parseDashboardHidden", () => {
  it("houdt alleen bekende sleutels", () => {
    expect([...parseDashboardHidden(["training", "bestaat_niet", 3, "core"])]).toEqual([
      "training",
      "core",
    ]);
  });

  it("verbergt niets bij een lege of kapotte waarde", () => {
    expect(parseDashboardHidden(null).size).toBe(0);
    expect(parseDashboardHidden("training").size).toBe(0);
    expect(parseDashboardHidden({ training: true }).size).toBe(0);
  });
});

describe("offeredDashboardParts", () => {
  it("biedt alles aan als elke module aan staat", () => {
    expect(offeredDashboardParts(() => true)).toHaveLength(DASHBOARD_PARTS.length);
  });

  it("laat onderdelen van uitgezette modules weg, maar houdt de events", () => {
    const keys = offeredDashboardParts(() => false).map((part) => part.key);
    expect(keys).toEqual(["mijn_events", "overige_events", "club_tegels"]);
  });

  it("biedt een onderdeel met meerdere modules aan zodra er een aan staat", () => {
    const on = new Set<ModuleKey>(["src"]);
    const keys = offeredDashboardParts((key) => on.has(key)).map((part) => part.key);
    expect(keys).toContain("standen");
    expect(keys).not.toContain("training");
  });

  it("noemt alleen bestaande modules", () => {
    for (const part of DASHBOARD_PARTS) {
      for (const key of part.modules) expect(isModuleKey(key)).toBe(true);
      if (typeof part.label !== "string") expect(isModuleKey(part.label.module)).toBe(true);
    }
  });
});
