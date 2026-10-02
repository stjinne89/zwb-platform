import { describe, expect, it } from "vitest";
import feed from "../fixtures/src/events-feed.json";
import {
  feedInstant,
  groupSrcFeed,
  isGeneratedSrcTitle,
  parseFeedDate,
  parseFeedTime,
  parseSrcName,
  srcRaceTitle,
  srcSundayTitle,
  type SrcFeedRow,
} from "@/lib/src/feed";
import { evaluateSrcFeed } from "@/lib/health/checks";
import { subEventLabel } from "@/lib/events/sub-events";

const rows = feed.data as SrcFeedRow[];

describe("parseSrcName", () => {
  it("herkent kwalificaties en de finale", () => {
    expect(parseSrcName("Sunday Race Club - Men Qualifier Race 1")).toEqual({
      gender: "men",
      round: 1,
      isFinal: false,
    });
    expect(parseSrcName("Sunday Race Club - Women Qualifier Race 4")?.round).toBe(4);
    expect(parseSrcName("Sunday Race Club - Women Finals")).toEqual({
      gender: "women",
      round: null,
      isFinal: true,
    });
    expect(parseSrcName("Sunday Race Club - Men Final")?.isFinal).toBe(true);
    expect(parseSrcName("Apex Racing")).toBeNull();
  });
});

describe("tijden in de feed (GMT+4)", () => {
  it("leest datums en klokken", () => {
    expect(parseFeedDate("Sunday, 04th Oct 2026")).toBe("2026-10-04");
    expect(parseFeedDate("Sunday, 1st Nov 2026")).toBe("2026-11-01");
    expect(parseFeedDate("2026-10-01")).toBe("2026-10-01");
    expect(parseFeedTime("01:57:30 PM")).toBe("13:57:30");
    expect(parseFeedTime("12:15 AM")).toBe("00:15:00");
    expect(parseFeedTime("07:00")).toBe("07:00:00");
    expect(parseFeedTime("25:00")).toBeNull();
  });

  it("rekent terug naar UTC zoals het roadbook", () => {
    // Cat 6 heren start om 09:45 GMT; de inschrijving sluit donderdag 03:00 GMT.
    expect(feedInstant("Sunday, 04th Oct 2026", "01:45 PM")).toBe("2026-10-04T09:45:00.000Z");
    expect(feedInstant("2026-10-01", "07:00")).toBe("2026-10-01T03:00:00.000Z");
  });
});

describe("groupSrcFeed (feed van 2026-09-30)", () => {
  const grouped = groupSrcFeed(rows);

  it("maakt één zondag met eerst de dames, dan de heren; andere events vallen weg", () => {
    expect(grouped.warnings).toEqual([]);
    expect(grouped.sundays).toHaveLength(1);
    const [sunday] = grouped.sundays;
    expect(sunday).toMatchObject({ sunday: "2026-10-04", round: 1, isFinal: false });
    expect(sunday.races.map((race) => race.gender)).toEqual(["women", "men"]);
  });

  it("neemt starttijden per categorie, deadline en weigh-in over", () => {
    const men = grouped.sundays[0].races.find((race) => race.gender === "men")!;
    // Gelijk aan `starting` uit het detail-endpoint van hetzelfde event.
    expect(men.startAt).toBe("2026-10-04T09:45:00.000Z");
    expect(men.categoryStarts).toMatchObject({
      "1": "2026-10-04T09:57:30.000Z",
      "6": "2026-10-04T09:45:00.000Z",
    });
    expect(Object.keys(men.categoryStarts)).toHaveLength(6);
    expect(men.registrationClosesAt).toBe("2026-10-01T03:00:00.000Z");
    expect(men.preWeightCategories).toEqual([1, 2]);
    expect(men.preWeightOpensAt).toBe("2026-10-04T09:00:00.000Z");
    expect(men.preWeightClosesAt).toBe("2026-10-04T09:32:00.000Z");
    expect(men.distanceKm).toBe(52.3);
    expect(men.elevationM).toBe(506);
    expect(men.externalUrl).toBe(`https://event.mywhoosh.com/event/detail/${men.mywhooshEventId}`);

    const women = grouped.sundays[0].races.find((race) => race.gender === "women")!;
    expect(women.startAt).toBe("2026-10-04T07:25:00.000Z");
  });

  it("slaat een dubbele race op dezelfde zondag over", () => {
    const men = rows.find((row) => row.name?.includes("Men"))!;
    const twice = groupSrcFeed([...rows, { ...men, id: "ander-id" }]);
    expect(twice.sundays[0].races).toHaveLength(2);
    expect(twice.warnings).toEqual(["Dubbele herenrace op 2026-10-04."]);
  });

  it("meldt een SRC-race die niet te lezen is", () => {
    const broken = groupSrcFeed([{ id: "x", name: "Sunday Race Club - Men Sprint", date: "?" }]);
    expect(broken.sundays).toEqual([]);
    expect(broken.warnings).toHaveLength(1);
  });
});

describe("titels", () => {
  const sunday = { sunday: "2026-10-04", round: 1, isFinal: false };
  const final = { sunday: "2026-10-25", round: null, isFinal: true };

  it("noemt maand en ronde; de race krijgt heren of dames erachter", () => {
    expect(srcSundayTitle(sunday)).toBe("SRC oktober · Kwalificatie 1");
    expect(srcSundayTitle(final)).toBe("SRC oktober · Finale");
    expect(srcRaceTitle(final, "women")).toBe("SRC oktober · Finale · Dames");
    expect(subEventLabel(srcRaceTitle(sunday, "men"), srcSundayTitle(sunday))).toBe("Heren");
  });

  it("herkent alleen eigen titels, zodat hernoemde events blijven staan", () => {
    expect(isGeneratedSrcTitle(srcSundayTitle(sunday))).toBe(true);
    expect(isGeneratedSrcTitle(srcRaceTitle(final, "men"))).toBe(true);
    expect(isGeneratedSrcTitle("SRC-finale met de hele club")).toBe(false);
  });
});

describe("evaluateSrcFeed", () => {
  it("is ok met leesbare SRC-races, en ook zonder", () => {
    expect(evaluateSrcFeed(200, feed)).toMatchObject({ ok: true, detail: "2 SRC-races in de feed" });
    expect(evaluateSrcFeed(200, { data: [] }).ok).toBe(true);
  });

  it("faalt bij een andere structuur of een onleesbare SRC-race", () => {
    expect(evaluateSrcFeed(200, { events: [] }).ok).toBe(false);
    expect(evaluateSrcFeed(200, { data: [{ name: "Sunday Race Club - Men Qualifier Race 1" }] }).ok).toBe(
      false,
    );
    expect(evaluateSrcFeed(500, null).ok).toBe(false);
  });
});
