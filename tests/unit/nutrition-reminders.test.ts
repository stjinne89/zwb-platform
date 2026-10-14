import { describe, expect, it } from "vitest";
import { nutritionReminderDue, remindersFor } from "@/lib/nutrition/reminders";

describe("voedingsherinneringen, wanneer", () => {
  it("verstuurt tussen 19:00 en 21:00 Nederlandse tijd", () => {
    // Oktober: zomertijd, UTC+2.
    expect(nutritionReminderDue(new Date("2026-10-14T16:59:00Z"))).toBe(false);
    expect(nutritionReminderDue(new Date("2026-10-14T17:00:00Z"))).toBe(true);
    expect(nutritionReminderDue(new Date("2026-10-14T18:59:00Z"))).toBe(true);
    expect(nutritionReminderDue(new Date("2026-10-14T19:00:00Z"))).toBe(false);
    // December: wintertijd, UTC+1.
    expect(nutritionReminderDue(new Date("2026-12-01T18:05:00Z"))).toBe(true);
  });
});

describe("voedingsherinneringen, welke", () => {
  it("waarschuwt de avond voor een zware, lange of wedstrijddag", () => {
    for (const tomorrowType of ["zwaar", "lang", "wedstrijd"] as const) {
      expect(remindersFor({ tomorrowType, rodeMinutesToday: 0, recoveryLogged: false }).map((r) => r.kind)).toEqual([
        "morgen_zwaar",
      ]);
    }
    expect(remindersFor({ tomorrowType: "matig", rodeMinutesToday: 0, recoveryLogged: false })).toEqual([]);
  });

  it("vraagt naar de herstelmaaltijd na een rit van een uur of langer", () => {
    expect(remindersFor({ tomorrowType: "rust", rodeMinutesToday: 75, recoveryLogged: false }).map((r) => r.kind)).toEqual([
      "herstel",
    ]);
    expect(remindersFor({ tomorrowType: "rust", rodeMinutesToday: 75, recoveryLogged: true })).toEqual([]);
    expect(remindersFor({ tomorrowType: "rust", rodeMinutesToday: 45, recoveryLogged: false })).toEqual([]);
  });

  it("vraagt nooit om minder te eten", () => {
    const all = remindersFor({ tomorrowType: "lang", rodeMinutesToday: 120, recoveryLogged: false });
    for (const reminder of all) {
      expect(`${reminder.title} ${reminder.body}`).not.toMatch(/minder|te veel|calorie|afval|gewicht/i);
    }
  });
});
