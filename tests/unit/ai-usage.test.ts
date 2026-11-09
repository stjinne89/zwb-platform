import { describe, expect, it } from "vitest";
import { costUsd, summarizeUsage, tokensFromUsage, usageMonth, type AiUsageRow } from "@/lib/ai/usage";

describe("tokensFromUsage", () => {
  it("leest de vier tellers uit het usage-object van Claude", () => {
    expect(
      tokensFromUsage({
        input_tokens: 23153,
        output_tokens: 7657,
        cache_creation_input_tokens: 100,
        cache_read_input_tokens: 281,
      }),
    ).toEqual({ input: 23153, output: 7657, cacheWrite: 100, cacheRead: 281 });
  });

  it("maakt van ontbrekende of rare waarden nul", () => {
    expect(tokensFromUsage(null)).toEqual({ input: 0, output: 0, cacheWrite: 0, cacheRead: 0 });
    expect(tokensFromUsage({ input_tokens: "x", output_tokens: -3 })).toEqual({
      input: 0,
      output: 0,
      cacheWrite: 0,
      cacheRead: 0,
    });
  });
});

describe("costUsd", () => {
  it("rekent een schema op Opus 5.5 tegen de lijstprijs", () => {
    // 23.153 × $4 + 7.657 × $20 per miljoen = $0,0926 + $0,1531
    expect(costUsd("claude-opus-5-5", { input: 23153, output: 7657, cacheWrite: 0, cacheRead: 0 })).toBeCloseTo(0.24575, 5);
  });

  it("telt cache-schrijven als 1,25 keer invoer en cache-lezen tegen de leesprijs", () => {
    expect(costUsd("claude-opus-5-5", { input: 0, output: 0, cacheWrite: 1_000_000, cacheRead: 1_000_000 })).toBeCloseTo(5.2, 5);
  });

  it("geeft null bij een model zonder prijs", () => {
    expect(costUsd("gpt-5.5", { input: 10, output: 10, cacheWrite: 0, cacheRead: 0 })).toBeNull();
  });
});

describe("summarizeUsage", () => {
  const rows: AiUsageRow[] = [
    { profileId: "a", feature: "training", kind: "nieuw_schema", trigger: "member", costUsd: 0.6 },
    { profileId: "a", feature: "training", kind: "daily", trigger: "automatic", costUsd: 0.1 },
    { profileId: "b", feature: "training", kind: "plan_update", trigger: "follow_up", costUsd: 0.35 },
    { profileId: "b", feature: "coach", kind: "coach", trigger: "member", costUsd: 0.02 },
    { profileId: "b", feature: "coach", kind: "coach", trigger: "member", costUsd: null },
    { profileId: null, feature: "app_updates", kind: "app_updates", trigger: "automatic", costUsd: 0.38 },
  ];
  const summary = summarizeUsage(rows);

  it("telt totalen en herkomst", () => {
    expect(summary.total.calls).toBe(6);
    expect(summary.total.costUsd).toBeCloseTo(1.45, 5);
    expect(summary.total.unpriced).toBe(1);
    expect(summary.byTrigger.member.calls).toBe(3);
    expect(summary.byTrigger.follow_up.costUsd).toBeCloseTo(0.35, 5);
    expect(summary.byTrigger.automatic.costUsd).toBeCloseTo(0.48, 5);
  });

  it("zet leden en soorten op kosten, duurste eerst, en houdt clubbrede aanroepen apart", () => {
    expect(summary.byMember.map((m) => m.profileId)).toEqual(["a", "b"]);
    expect(summary.byMember[1].byTrigger.member.calls).toBe(2);
    expect(summary.byKind[0]).toMatchObject({ kind: "nieuw_schema", trigger: "member" });
    expect(summary.byKind.find((k) => k.kind === "coach")?.total.calls).toBe(2);
    expect(summary.club).toEqual({ calls: 1, costUsd: 0.38, unpriced: 0 });
  });
});

describe("usageMonth", () => {
  const now = new Date("2026-11-09T12:00:00Z");

  it("neemt de lopende maand zonder of bij een ongeldige waarde", () => {
    for (const value of [undefined, "", "2026-13", "nov", "2027-01"]) {
      expect(usageMonth(value, now)).toEqual({
        month: "2026-11",
        from: "2026-11-01T00:00:00.000Z",
        to: "2026-12-01T00:00:00.000Z",
        previous: "2026-10",
        next: null,
      });
    }
  });

  it("geeft een eerdere maand met buren, ook over de jaargrens", () => {
    expect(usageMonth("2026-01", now)).toEqual({
      month: "2026-01",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-02-01T00:00:00.000Z",
      previous: "2025-12",
      next: "2026-02",
    });
  });
});
