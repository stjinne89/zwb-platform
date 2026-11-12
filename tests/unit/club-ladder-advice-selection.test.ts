import { describe, expect, it } from "vitest";
import { adviceSelectionQuery, parseAdviceSelection } from "@/lib/club-ladder/advice-selection";

const a = "profile:11111111-1111-1111-1111-111111111111";
const b = "roster:22222222-2222-2222-2222-222222222222";
const c = "profile:33333333-3333-3333-3333-333333333333";

describe("parseAdviceSelection", () => {
  it("houdt alleen renners van het team, zonder dubbelen, op volgorde van de URL", () => {
    expect(parseAdviceSelection(`${b},${a},${b},profile:44444444-4444-4444-4444-444444444444`, [a, b, c])).toEqual([b, a]);
  });

  it("negeert rommel en een lege parameter", () => {
    expect(parseAdviceSelection(undefined, [a])).toEqual([]);
    expect(parseAdviceSelection("", [a])).toEqual([]);
    expect(parseAdviceSelection("profile:x,team:1,,", [a])).toEqual([]);
  });

  it("leest een herhaalde parameter en hoofdletters", () => {
    expect(parseAdviceSelection([a.toUpperCase().replace("PROFILE", "profile"), ` ${b} `], [a, b])).toEqual([a, b]);
  });
});

describe("adviceSelectionQuery", () => {
  it("geeft niets zonder selectie en een gecodeerde lijst met", () => {
    expect(adviceSelectionQuery([])).toBe("");
    const query = adviceSelectionQuery([a, b]);
    expect(query.startsWith("&met=")).toBe(true);
    expect(decodeURIComponent(query.slice("&met=".length))).toBe(`${a},${b}`);
  });

  it("past bij parseAdviceSelection", () => {
    const params = new URLSearchParams(adviceSelectionQuery([a, c]).slice(1));
    expect(parseAdviceSelection(params.get("met") ?? undefined, [a, b, c])).toEqual([a, c]);
  });
});
