import { describe, expect, it } from "vitest";
import { calendarStreams, type CalendarTarget } from "@/lib/youtube-live/calendar-streams";

// De streams per kalenderregel (2026-11-20).

const now = new Date("2026-11-20T19:00:00Z");
const targets = new Map<string, CalendarTarget>([
  ["week", { rowId: "week", startAt: "2026-11-20T18:30:00Z", label: null }],
  ["zrl-a", { rowId: "week", startAt: "2026-11-20T18:30:00Z", label: "ZRL A" }],
  ["zrl-b", { rowId: "week", startAt: "2026-11-20T18:30:00Z", label: "ZRL B" }],
  ["oud", { rowId: "oud", startAt: "2026-11-01T18:30:00Z", label: null }],
  ["later", { rowId: "later", startAt: "2026-11-27T18:30:00Z", label: null }],
]);

describe("calendarStreams", () => {
  it("zet de streams van de teamraces onder de raceweek, wie live is eerst", () => {
    const rows = calendarStreams(
      [
        { id: "s1", eventId: "zrl-a", name: "Stijn", status: "gepland" },
        { id: "s2", eventId: "zrl-b", name: "Kees", status: "live" },
      ],
      targets,
      now,
    );
    const week = rows.get("week");
    expect(week?.state).toBe("live");
    expect(week?.streams.map((s) => s.label)).toEqual(["ZRL B · Kees", "ZRL A · Stijn"]);
    expect(week?.streams[0].href).toBe("/events/zrl-b?stream=s2#stream");
    expect(week?.centerHref).toBe("/events/week/streams");
  });

  it("noemt een voorbije race Terugkijken, ook zonder status van YouTube", () => {
    const rows = calendarStreams([{ id: "s3", eventId: "oud", name: "Stijn", status: "gepland" }], targets, now);
    expect(rows.get("oud")?.state).toBe("afgelopen");
    expect(rows.get("oud")?.streams[0].label).toBe("Stijn");
  });

  it("een stream die nog moet beginnen is gepland", () => {
    const rows = calendarStreams([{ id: "s4", eventId: "later", name: "Stijn", status: "gepland" }], targets, now);
    expect(rows.get("later")?.state).toBe("gepland");
  });

  it("laat streams van races buiten de kalender weg", () => {
    expect(calendarStreams([{ id: "s5", eventId: "elders", name: "X", status: "live" }], targets, now).size).toBe(0);
  });
});
