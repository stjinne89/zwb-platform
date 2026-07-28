import { describe, expect, it } from "vitest";
import { monthGrid, monthLabel, shiftMonth } from "@/lib/calendar/month";

describe("monthGrid", () => {
  it("levert altijd zes volle weken op", () => {
    const grid = monthGrid(2026, 7);
    expect(grid).toHaveLength(42);
  });

  it("start op maandag", () => {
    // 1 juli 2026 is een woensdag, dus de week begint op maandag 29 juni.
    expect(monthGrid(2026, 7)[0].dateKey).toBe("2026-06-29");
  });

  it("markeert uitlopers buiten de maand", () => {
    const grid = monthGrid(2026, 7);
    expect(grid[0].inMonth).toBe(false);
    expect(grid.find((cell) => cell.dateKey === "2026-07-01")?.inMonth).toBe(true);
    expect(grid.filter((cell) => cell.inMonth)).toHaveLength(31);
  });

  it("klopt op een maand die precies op maandag begint", () => {
    // 1 juni 2026 is een maandag.
    const grid = monthGrid(2026, 6);
    expect(grid[0].dateKey).toBe("2026-06-01");
    expect(grid[0].inMonth).toBe(true);
  });

  it("telt februari in een schrikkeljaar goed", () => {
    expect(monthGrid(2024, 2).filter((cell) => cell.inMonth)).toHaveLength(29);
    expect(monthGrid(2026, 2).filter((cell) => cell.inMonth)).toHaveLength(28);
  });

  it("gaat door de zomertijdwissel heen zonder dagen te missen", () => {
    // Laatste zondag van maart 2026: klok vooruit.
    const grid = monthGrid(2026, 3);
    const keys = grid.map((cell) => cell.dateKey);
    expect(new Set(keys).size).toBe(42);
    expect(keys).toContain("2026-03-29");
    expect(keys).toContain("2026-03-30");
  });
});

describe("shiftMonth", () => {
  it("rolt over jaargrenzen", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 7, 0)).toEqual({ year: 2026, month: 7 });
  });
});

describe("monthLabel", () => {
  it("schrijft de maand voluit", () => {
    expect(monthLabel(2026, 7)).toContain("2026");
  });
});
