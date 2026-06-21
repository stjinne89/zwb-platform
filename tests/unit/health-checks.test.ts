import { describe, expect, it } from "vitest";
import {
  evaluateEnvPresent,
  evaluateMyWhoosh,
  evaluateReachable,
  evaluateZwiftFeed,
} from "@/lib/health/checks";

describe("evaluateZwiftFeed", () => {
  it("is ok bij 200 + JSON-array", () => {
    const result = evaluateZwiftFeed(200, [{ id: 1 }, { id: 2 }]);
    expect(result).toMatchObject({ source: "zwift_feed", ok: true });
    expect(result.detail).toContain("2");
  });

  it("faalt bij niet-array payload (structuur gewijzigd)", () => {
    expect(evaluateZwiftFeed(200, { events: [] }).ok).toBe(false);
  });

  it("faalt bij een niet-200 status", () => {
    expect(evaluateZwiftFeed(503, null).ok).toBe(false);
  });
});

describe("evaluateMyWhoosh", () => {
  it("is ok als de event-detaillink in de HTML zit", () => {
    const html = `<a href="https://event.mywhoosh.com/event/detail/abc">x</a>`;
    expect(evaluateMyWhoosh(200, html).ok).toBe(true);
  });

  it("faalt als de markup-marker ontbreekt", () => {
    expect(evaluateMyWhoosh(200, "<html>geen events</html>").ok).toBe(false);
  });

  it("faalt bij een niet-200 status", () => {
    expect(evaluateMyWhoosh(404, "").ok).toBe(false);
  });
});

describe("evaluateReachable", () => {
  it("is ok bij 2xx", () => {
    expect(evaluateReachable("zwiftpower", 200).ok).toBe(true);
  });

  it("faalt bij een redirect of foutstatus", () => {
    expect(evaluateReachable("ladder", 302).ok).toBe(false);
    expect(evaluateReachable("ladder", 403).ok).toBe(false);
  });

  it("telt een niet-geconfigureerde bron niet als storing", () => {
    const result = evaluateReachable("wtrl", 0, false);
    expect(result.ok).toBe(true);
    expect(result.detail).toMatch(/niet geconfigureerd/);
  });
});

describe("evaluateEnvPresent", () => {
  it("is ok als de sleutel aanwezig is", () => {
    expect(evaluateEnvPresent("openai", true).ok).toBe(true);
  });

  it("faalt als de sleutel ontbreekt", () => {
    expect(evaluateEnvPresent("openai", false).ok).toBe(false);
  });
});
