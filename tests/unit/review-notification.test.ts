import { describe, expect, it } from "vitest";
import { reviewNotificationBody } from "@/lib/training/completion";

/** Zoals de momentopname in metrics_json staat na een gekoppelde rit. */
const metrics = {
  verdict: "te_zwaar" as const,
  loadPct: 143,
  tss: 86,
  movingMinutes: 60,
};

describe("reviewNotificationBody", () => {
  it("zet naleving, zone en belasting in het bericht", () => {
    expect(reviewNotificationBody(metrics, null, null)).toBe(
      "Te zwaar · 143% · Drempel · 86 TSS",
    );
  });

  it("voegt toe wat het lid zelf invulde", () => {
    expect(reviewNotificationBody(metrics, 8, "zwaar")).toBe(
      "Te zwaar · 143% · Drempel · 86 TSS · RPE 8 · voelde zwaar",
    );
  });

  it("laat het percentage weg als er niets te vergelijken viel", () => {
    // Geen geplande blokken, dus geen loadPct — het oordeel blijft wel staan.
    expect(reviewNotificationBody({ ...metrics, loadPct: null }, null, null)).toBe(
      "Te zwaar · Drempel · 86 TSS",
    );
  });

  it("valt terug op een korte tekst zonder momentopname", () => {
    // metrics_json staat in de database op {} tot er een rit is gekoppeld.
    expect(reviewNotificationBody({}, null, null)).toBe("Training bevestigd.");
    expect(reviewNotificationBody(null, null, null)).toBe("Training bevestigd.");
  });

  it("geeft ook zonder cijfers nog RPE en gevoel door", () => {
    expect(reviewNotificationBody({}, 6, "goed")).toBe("RPE 6 · voelde goed");
  });

  it("begrenst een onmogelijke RPE", () => {
    expect(reviewNotificationBody({}, 44, null)).toBe("RPE 10");
  });
});
