import { describe, expect, it } from "vitest";
import { availabilityNeedsReplan, loadPendingReplan } from "@/lib/training/replan";

/** Minimale supabase-stub: elke keten levert dezelfde builder op. */
function fakeAdmin(rows: unknown[]) {
  return {
    from() {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({ data: rows[0] ?? null }),
      };
      return builder;
    },
  } as never;
}

const planCreated = "2026-08-01T10:00:00+00:00";

describe("availabilityNeedsReplan", () => {
  it("pakt een wijziging op die na de laatste herziening kwam", () => {
    // Klassiek cooldown-geval: eerst een herziening, drie minuten later nog een
    // draai aan de schuifbalken die is overgeslagen.
    expect(
      availabilityNeedsReplan(
        "2026-08-19T19:03:00+00:00",
        planCreated,
        "2026-08-19T19:00:00+00:00",
      ),
    ).toBe(true);
  });

  it("laat een wijziging liggen die al herzien is", () => {
    expect(
      availabilityNeedsReplan(
        "2026-08-19T19:00:00+00:00",
        planCreated,
        "2026-08-19T19:05:00+00:00",
      ),
    ).toBe(false);
  });

  it("telt het aanmaken van het schema zelf ook als verwerkt", () => {
    // Nooit een herziening gehad, maar het schema is ná de beschikbaarheid
    // gemaakt: dan zat die er bij de generatie al in.
    expect(availabilityNeedsReplan("2026-07-20T08:00:00+00:00", planCreated, null)).toBe(false);
    expect(availabilityNeedsReplan("2026-08-05T08:00:00+00:00", planCreated, null)).toBe(true);
  });

  it("vergelijkt op tijdstip en niet op tekst", () => {
    // Dezelfde seconde, andere offset: als tekst zou 'changed' hier later lijken.
    expect(
      availabilityNeedsReplan(
        "2026-08-19T21:00:00+02:00",
        planCreated,
        "2026-08-19T19:00:00+00:00",
      ),
    ).toBe(false);
  });

  it("doet niets zonder bruikbare wijzigingsdatum", () => {
    expect(availabilityNeedsReplan(null, planCreated, null)).toBe(false);
    expect(availabilityNeedsReplan(undefined, planCreated, null)).toBe(false);
    expect(availabilityNeedsReplan("ooit", planCreated, null)).toBe(false);
  });
});

describe("loadPendingReplan", () => {
  it("geeft het openstaande verzoek terug", async () => {
    const admin = fakeAdmin([
      { reason: "Clubrit ingepland op 2026-08-22.", requested_at: "2026-08-20T19:03:00+00:00" },
    ]);
    expect(await loadPendingReplan(admin, "lid")).toEqual({
      reason: "Clubrit ingepland op 2026-08-22.",
      requestedAt: "2026-08-20T19:03:00+00:00",
    });
  });

  it("geeft niets terug als er niets ligt", async () => {
    expect(await loadPendingReplan(fakeAdmin([]), "lid")).toBeNull();
  });
});
