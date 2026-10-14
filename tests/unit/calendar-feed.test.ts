import { describe, expect, it } from "vitest";
import { buildIcsCalendar, escapeIcsText, foldIcsLine, icsUtc } from "@/lib/calendar/ics";
import { feedItems, type FeedEvent, type FeedWorkout } from "@/lib/calendar/feed";
import { calendarFeedTokenFromPath, newCalendarFeedToken } from "@/lib/calendar/feed-token";
import { calendarFeedUrls } from "@/lib/calendar/feed-urls";

const SITE = "https://zwb.example";

function event(overrides: Partial<FeedEvent> = {}): FeedEvent {
  return {
    id: "e1",
    title: "Clubrit Sallandse Heuvelrug",
    type: "outdoor",
    kind: null,
    start_at: "2026-10-18T07:30:00+00:00",
    end_at: null,
    location: "Holten, Markt",
    distance_km: 80,
    elevation_m: 400,
    ...overrides,
  };
}

function workout(overrides: Partial<FeedWorkout> = {}): FeedWorkout {
  return {
    id: "w1",
    title: "Duur met sweetspot",
    scheduled_at: "2026-10-16T09:00:00+01:00",
    duration_minutes: 90,
    intensity: "tempo",
    event_id: null,
    ...overrides,
  };
}

describe("ICS-opmaak", () => {
  it("escapet tekstwaarden", () => {
    expect(escapeIcsText("a, b; c\\d\ne")).toBe("a\\, b\\; c\\\\d\\ne");
  });

  it("schrijft UTC zonder scheidingstekens", () => {
    expect(icsUtc(new Date("2026-10-18T07:30:00Z"))).toBe("20261018T073000Z");
  });

  it("vouwt lange regels op 75 octets zonder een teken te splitsen", () => {
    const line = `SUMMARY:${"é".repeat(60)}`;
    const folded = foldIcsLine(line);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(parts.map((part, i) => (i === 0 ? part : part.slice(1))).join("")).toBe(line);
  });

  it("bouwt een agenda met CRLF en een hele-dag-item", () => {
    const ics = buildIcsCalendar({
      name: "ZWB",
      now: new Date("2026-10-14T10:00:00Z"),
      items: [{ uid: "x@zwb", summary: "Training", timing: { kind: "date", date: "2026-12-31" } }],
    });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231");
    // DTEND is exclusief en loopt over de jaargrens.
    expect(ics).toContain("DTEND;VALUE=DATE:20270101");
    expect(ics).toContain("DTSTAMP:20261014T100000Z");
    expect(ics.split("\r\n").every((line) => !line.includes("\n"))).toBe(true);
  });
});

describe("feedItems", () => {
  it("zet een event met tijd, duur uit afstand en een link", () => {
    const [item] = feedItems([event()], [], SITE);
    expect(item.uid).toBe("event-e1@zwb");
    expect(item.url).toBe(`${SITE}/events/e1`);
    expect(item.location).toBe("Holten, Markt");
    expect(item.timing.kind).toBe("time");
    if (item.timing.kind !== "time") return;
    expect(item.timing.start.toISOString()).toBe("2026-10-18T07:30:00.000Z");
    expect(item.timing.end.getTime()).toBeGreaterThan(item.timing.start.getTime());
    expect(item.description).toContain("80 km · 400 hm");
  });

  it("neemt de eindtijd van het event als die er is", () => {
    const [item] = feedItems([event({ end_at: "2026-10-18T10:00:00+00:00" })], [], SITE);
    if (item.timing.kind !== "time") throw new Error("verwacht een tijd");
    expect(item.timing.end.toISOString()).toBe("2026-10-18T10:00:00.000Z");
  });

  it("zet een training als hele dag op de Amsterdamse datum", () => {
    // 23:30 UTC is in Amsterdam al de volgende dag.
    const [item] = feedItems([], [workout({ scheduled_at: "2026-10-16T23:30:00Z" })], SITE);
    expect(item.timing).toEqual({ kind: "date", date: "2026-10-17" });
    expect(item.summary).toBe("Training: Duur met sweetspot");
    expect(item.description).toContain("90 min");
  });

  it("slaat een training over die bij een event in de feed hoort", () => {
    const items = feedItems([event()], [workout({ event_id: "e1" }), workout({ id: "w2", event_id: "elders" })], SITE);
    expect(items.map((item) => item.uid)).toEqual(["event-e1@zwb", "workout-w2@zwb"]);
  });
});

describe("token en links", () => {
  it("accepteert een nieuw token, met of zonder .ics", () => {
    const token = newCalendarFeedToken();
    expect(calendarFeedTokenFromPath(token)).toBe(token);
    expect(calendarFeedTokenFromPath(`${token}.ics`)).toBe(token);
  });

  it("weigert alles wat geen token is", () => {
    expect(calendarFeedTokenFromPath("zwbcal_kort")).toBeNull();
    expect(calendarFeedTokenFromPath("' or 1=1")).toBeNull();
  });

  it("maakt https-, webcal-, Google- en Outlook-links", () => {
    const urls = calendarFeedUrls(`${SITE}/`, "zwbcal_abc");
    expect(urls.https).toBe(`${SITE}/api/agenda/zwbcal_abc.ics`);
    expect(urls.webcal).toBe("webcal://zwb.example/api/agenda/zwbcal_abc.ics");
    expect(urls.google).toContain(encodeURIComponent(urls.webcal));
    expect(urls.outlook).toContain(encodeURIComponent(urls.https));
  });
});
