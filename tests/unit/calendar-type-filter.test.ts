import { describe, expect, it } from "vitest";
import {
  EVENT_TYPE_VALUES,
  eventColorStyle,
  eventLabel,
  eventTypeColor,
} from "@/lib/event-types";
import {
  BIRTHDAY_FILTER,
  birthdaysMatchFilter,
  calendarHref,
  eventMatchesFilter,
  parseTypeFilter,
  splitTypeFilter,
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
    expect(parseTypeFilter(`${BIRTHDAY_FILTER},social,zwift`)).toEqual([
      "zwift",
      "social",
      BIRTHDAY_FILTER,
    ]);
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

describe("categorie en soort samen", () => {
  const zwiftTraining = { type: "zwift", kind: "training" };
  const zwiftRace = { type: "zwift", kind: null };
  const outdoorSocial = { type: "outdoor", kind: "social" };
  const match = (event: { type: string; kind: string | null }, param: string) =>
    eventMatchesFilter(event, splitTypeFilter(parseTypeFilter(param)));

  it("toont alles zonder keuze", () => {
    expect(match(zwiftRace, "")).toBe(true);
    expect(birthdaysMatchFilter(splitTypeFilter([]))).toBe(true);
  });

  it("is 'of' binnen een as en 'en' tussen de assen", () => {
    expect(match(zwiftRace, "zwift,outdoor")).toBe(true);
    expect(match(outdoorSocial, "zwift,outdoor")).toBe(true);
    expect(match(zwiftTraining, "zwift,training")).toBe(true);
    expect(match(zwiftRace, "zwift,training")).toBe(false);
    expect(match(outdoorSocial, "zwift,training")).toBe(false);
  });

  it("toont met alleen een soort elke categorie van die soort", () => {
    expect(match(zwiftTraining, "training")).toBe(true);
    expect(match(outdoorSocial, "training")).toBe(false);
    expect(match(outdoorSocial, "training,social")).toBe(true);
  });

  it("toont verjaardagen alleen zonder keuze of met hun eigen label", () => {
    expect(birthdaysMatchFilter(splitTypeFilter(["zwift"]))).toBe(false);
    expect(birthdaysMatchFilter(splitTypeFilter(["training"]))).toBe(false);
    expect(birthdaysMatchFilter(splitTypeFilter(["zwift", BIRTHDAY_FILTER]))).toBe(true);
    expect(match(zwiftRace, BIRTHDAY_FILTER)).toBe(false);
    expect(match(zwiftTraining, `training,${BIRTHDAY_FILTER}`)).toBe(true);
  });
});

describe("kleur en label", () => {
  it("heeft voor elke categorie een eigen kleur", () => {
    const colors = EVENT_TYPE_VALUES.map((value) => eventTypeColor(value));
    expect(new Set(colors).size).toBe(colors.length);
    expect(eventTypeColor("bestaat-niet")).toBe(eventTypeColor("overig"));
    expect(eventTypeColor(null)).toBe(eventTypeColor("overig"));
  });

  it("maakt een training feller en een social pastel", () => {
    const plain = eventColorStyle("zwift", null);
    const training = eventColorStyle("zwift", "training");
    const social = eventColorStyle("zwift", "social");
    expect(plain.bar).toBe(eventTypeColor("zwift"));
    expect(training.wideBar).toBe(true);
    expect(training.badge.backgroundColor).toBe(eventTypeColor("zwift"));
    expect(social.bar).toContain("white");
    expect(social.wideBar).toBe(false);
  });

  it("zet het soort achter de categorie, behalve bij Overig", () => {
    expect(eventLabel("zwift", null)).toBe("Zwift");
    expect(eventLabel("zwift", "training")).toBe("Zwift · Training");
    expect(eventLabel("overig", "social")).toBe("Social");
  });

  it("kent Social en Training niet meer als categorie", () => {
    expect(EVENT_TYPE_VALUES).not.toContain("social");
    expect(EVENT_TYPE_VALUES).not.toContain("training");
  });
});
