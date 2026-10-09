import { describe, expect, it } from "vitest";
import { EVENT_TYPE_COLORS, EVENT_TYPE_VALUES, eventTypeColor } from "@/lib/event-types";
import {
  BIRTHDAY_FILTER,
  calendarHref,
  parseTypeFilter,
  toggleTypeFilter,
} from "@/lib/events/type-filter";

describe("parseTypeFilter", () => {
  it("geeft niets terug zonder parameter", () => {
    expect(parseTypeFilter(undefined)).toEqual([]);
    expect(parseTypeFilter("")).toEqual([]);
  });

  it("laat onbekende waarden vallen en zet de rest in vaste volgorde", () => {
    expect(parseTypeFilter("ladder, bestaat-niet,zrl,zrl")).toEqual(["zrl", "ladder"]);
  });

  it("kent verjaardagen als eigen label", () => {
    expect(parseTypeFilter(`${BIRTHDAY_FILTER},social`)).toEqual(["social", BIRTHDAY_FILTER]);
  });

  it("voegt een herhaalde parameter samen", () => {
    expect(parseTypeFilter(["zwift", "zrl"])).toEqual(["zrl", "zwift"]);
  });
});

describe("toggleTypeFilter", () => {
  it("zet een label aan en weer uit", () => {
    expect(toggleTypeFilter(["zwift"], "zrl")).toEqual(["zrl", "zwift"]);
    expect(toggleTypeFilter(["zrl", "zwift"], "zrl")).toEqual(["zwift"]);
  });
});

describe("calendarHref", () => {
  it("combineert Voor mij met de gekozen labels", () => {
    expect(calendarHref({ onlyForMe: false, types: [] })).toBe("/kalender");
    expect(calendarHref({ onlyForMe: true, types: [] })).toBe("/kalender?voor=mij");
    expect(calendarHref({ onlyForMe: true, types: ["zrl", "ladder"] })).toBe(
      "/kalender?voor=mij&type=zrl,ladder",
    );
  });
});

describe("eventTypeColor", () => {
  it("heeft voor elk eventtype een eigen kleur", () => {
    for (const value of EVENT_TYPE_VALUES) {
      expect(EVENT_TYPE_COLORS[value], value).toBeDefined();
    }
    const dots = EVENT_TYPE_VALUES.map((value) => EVENT_TYPE_COLORS[value].dot);
    expect(new Set(dots).size).toBe(dots.length);
  });

  it("valt terug op Overig bij een onbekend type", () => {
    expect(eventTypeColor("bestaat-niet")).toBe(EVENT_TYPE_COLORS.overig);
    expect(eventTypeColor(null)).toBe(EVENT_TYPE_COLORS.overig);
  });
});
