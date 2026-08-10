import { describe, expect, it } from "vitest";
import {
  clampMinutes,
  loadAvailability,
  mondayKey,
  normalizeMinutesByDay,
  shiftWeeks,
  weekdayOf,
} from "@/lib/training/availability";

/**
 * Minimale supabase-stub: elke keten van .select/.eq/.or/... levert dezelfde
 * builder op, die zowel awaitbaar is als een maybeSingle() heeft.
 */
function fakeAdmin(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      const builder = {
        select: () => builder,
        eq: () => builder,
        or: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => ({ data: rows[0] ?? null }),
        then: (resolve: (value: { data: unknown[] }) => unknown) => resolve({ data: rows }),
      };
      return builder;
    },
  } as never;
}

describe("mondayKey", () => {
  it("trekt een doordeweekse dag naar de maandag ervoor", () => {
    // 2026-08-10 is een maandag, 2026-08-13 de donderdag erna.
    expect(mondayKey("2026-08-13")).toBe("2026-08-10");
  });

  it("laat een maandag staan", () => {
    expect(mondayKey("2026-08-10")).toBe("2026-08-10");
  });

  it("rekent een zondag naar de maandag van diezelfde week, niet de dag erna", () => {
    expect(mondayKey("2026-08-16")).toBe("2026-08-10");
  });

  it("verspringt niet rond de zomertijdgrens", () => {
    // In de nacht van zaterdag 28 op zondag 29 maart 2026 gaat de klok vooruit.
    expect(mondayKey("2026-03-29")).toBe("2026-03-23");
    expect(mondayKey("2026-03-30")).toBe("2026-03-30");
    // En terug, eind oktober 2026.
    expect(mondayKey("2026-10-25")).toBe("2026-10-19");
  });
});

describe("shiftWeeks en weekdayOf", () => {
  it("schuift een week vooruit en terug", () => {
    expect(shiftWeeks("2026-08-10", 1)).toBe("2026-08-17");
    expect(shiftWeeks("2026-08-10", -1)).toBe("2026-08-03");
  });

  it("benoemt de weekdag met maandag als eerste dag", () => {
    expect(weekdayOf("2026-08-10")).toBe("ma");
    expect(weekdayOf("2026-08-16")).toBe("zo");
  });
});

describe("clampMinutes", () => {
  it("rondt af op kwartieren", () => {
    expect(clampMinutes(52)).toBe(45);
    expect(clampMinutes(53)).toBe(60);
  });

  it("houdt de waarde binnen de grenzen van de schuifbalk", () => {
    expect(clampMinutes(-30)).toBe(0);
    expect(clampMinutes(1000)).toBe(360);
  });

  it("leest onzin als nul", () => {
    expect(clampMinutes("geen idee")).toBe(0);
    expect(clampMinutes(null)).toBe(0);
  });
});

describe("normalizeMinutesByDay", () => {
  it("houdt alleen echte weekdagen over", () => {
    expect(normalizeMinutesByDay({ ma: 60, xx: 30 })).toEqual({ ma: 60 });
  });

  it("laat een dag zonder waarde weg in plaats van hem op nul te zetten", () => {
    expect(normalizeMinutesByDay({ ma: 60, di: null })).toEqual({ ma: 60 });
  });
});

describe("loadAvailability", () => {
  const week = "2026-08-10";

  it("pakt de rij van die week als die er is", async () => {
    const admin = fakeAdmin({
      training_availability: [
        { week_start: week, minutes_by_day: { ma: 60 } },
        { week_start: null, minutes_by_day: { ma: 30 } },
      ],
    });
    const result = await loadAvailability(admin, "lid", week);
    expect(result.source).toBe("week");
    expect(result.minutesByDay.ma).toBe(60);
  });

  it("valt terug op de standaardweek als die week niets heeft", async () => {
    const admin = fakeAdmin({
      training_availability: [{ week_start: null, minutes_by_day: { di: 90 } }],
    });
    const result = await loadAvailability(admin, "lid", week);
    expect(result.source).toBe("default");
    expect(result.minutesByDay.di).toBe(90);
    // De week waarvoor het geldt blijft wel de gevraagde week.
    expect(result.weekStart).toBe(week);
  });

  it("valt daarna terug op de beschikbare dagen van het doel", async () => {
    const admin = fakeAdmin({
      training_availability: [],
      training_goals: [{ available_days: ["di", "do"] }],
    });
    const result = await loadAvailability(admin, "lid", week);
    expect(result.source).toBe("goal");
    // Niet-aangevinkte dagen staan expliciet op nul; aangevinkte blijven open.
    expect(result.minutesByDay.ma).toBe(0);
    expect(result.minutesByDay.di).toBeUndefined();
    expect(result.minutesByDay.do).toBeUndefined();
  });

  it("gebruikt zonder week de standaardrij", async () => {
    const admin = fakeAdmin({
      training_availability: [{ week_start: null, minutes_by_day: { zo: 120 } }],
    });
    const result = await loadAvailability(admin, "lid", null);
    expect(result.source).toBe("default");
    expect(result.weekStart).toBeNull();
  });
});
