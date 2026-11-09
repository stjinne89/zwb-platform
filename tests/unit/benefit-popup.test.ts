import { describe, expect, it } from "vitest";
import { currentBenefits, parseSeenIds, unseenBenefits } from "@/lib/benefits/popup";

const row = (id: string, extra: Partial<Parameters<typeof currentBenefits>[0][number]> = {}) => ({
  id,
  title: `Voordeel ${id}`,
  discount_code: null,
  valid_from: null,
  valid_until: null,
  sponsors: null,
  ...extra,
});

describe("currentBenefits", () => {
  it("laat alleen voordelen door die vandaag gelden", () => {
    const rows = [
      row("a"),
      row("b", { valid_from: "2026-11-10" }),
      row("c", { valid_until: "2026-11-08" }),
      row("d", { valid_from: "2026-11-09", valid_until: "2026-11-09" }),
    ];
    expect(currentBenefits(rows, "2026-11-09").map((b) => b.id)).toEqual(["a", "d"]);
  });

  it("neemt de sponsornaam mee, ook als de relatie een lijst is", () => {
    const [one, two] = currentBenefits(
      [row("a", { sponsors: { name: "Kalas" } }), row("b", { sponsors: [{ name: "SPOTR" }] })],
      "2026-11-09",
    );
    expect(one.sponsorName).toBe("Kalas");
    expect(two.sponsorName).toBe("SPOTR");
  });
});

describe("unseenBenefits", () => {
  const benefits = currentBenefits([row("a"), row("b"), row("c")], "2026-11-09");

  it("is alles voor wie nog niets zag", () => {
    expect(unseenBenefits(benefits, []).map((b) => b.id)).toEqual(["a", "b", "c"]);
  });

  it("is alleen wat er bijkwam", () => {
    expect(unseenBenefits(benefits, ["a", "c"]).map((b) => b.id)).toEqual(["b"]);
  });
});

describe("parseSeenIds", () => {
  it("leest een lijst en negeert al het andere", () => {
    expect(parseSeenIds('["a","b"]')).toEqual(["a", "b"]);
    expect(parseSeenIds('["a",3]')).toEqual(["a"]);
    expect(parseSeenIds("{}")).toEqual([]);
    expect(parseSeenIds("kapot")).toEqual([]);
    expect(parseSeenIds(null)).toEqual([]);
  });
});
