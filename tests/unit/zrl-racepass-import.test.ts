import { describe, expect, it } from "vitest";
import {
  collectRacepasses,
  hasRacepassSite,
  pageHasPassHeading,
  parseRaceCalendar,
  parseRacePagePasses,
  planRacepassImport,
  teamNameForLabel,
  type ScrapedRacepass,
  type StoredRacepass,
} from "@/lib/events/zrl-racepass-import";

const pass = (id: string) => `https://www.wtrl.racing/RacePass/${id}=`;

describe("hasRacepassSite", () => {
  it("draait alleen voor de club met deze racekalender", () => {
    expect(hasRacepassSite("https://zwbcycling.nl")).toBe(true);
    expect(hasRacepassSite("https://www.zwbcycling.nl/")).toBe(true);
    expect(hasRacepassSite("https://andereclub.nl")).toBe(false);
    expect(hasRacepassSite(null)).toBe(false);
  });
});

describe("parseRaceCalendar", () => {
  it("leest ZRL-races met datum en slaat de rest over", () => {
    const html =
      "<a href='/race-kalender/zwift-racing-league-26-27-|-round-2-|-race-2-a-b/170' >24-11-2026 20:00 - Zwift Racing League 26/27 | Round 2 | Race 2 A/B</a><br/>" +
      "<a href='/race-kalender/clubrit/99' >25-11-2026 19:00 - Clubrit</a>";
    expect(parseRaceCalendar(html)).toEqual([
      {
        pageId: 170,
        slug: "zwift-racing-league-26-27-|-round-2-|-race-2-a-b",
        dateKey: "2026-11-24",
        title: "Zwift Racing League 26/27 | Round 2 | Race 2 A/B",
      },
    ]);
  });
});

describe("parseRacePagePasses", () => {
  it("leest knoppen en zijbalk en laat dubbele weg", () => {
    const html =
      "<h5 class='mb-4'>Racepass</h5>" +
      `<a href='${pass("a")}' target='_blank' class='button gold'>Racepass A</a>` +
      `<a href='${pass("a")}' target='_blank'>Racepass A</a>` +
      `<a href='${pass("a")}' target='_blank'>Racepass A1</a>` +
      "<a href='https://www.zwift.com/x' target='_blank'>Racepass nep</a>";
    expect(parseRacePagePasses(html)).toEqual([
      { label: "Racepass A", url: pass("a") },
      { label: "Racepass A1", url: pass("a") },
    ]);
    expect(pageHasPassHeading(html)).toBe(true);
    expect(pageHasPassHeading("<h5>Race details</h5>")).toBe(false);
  });
});

describe("teamNameForLabel", () => {
  it("koppelt de labels van de site aan de teams", () => {
    expect(teamNameForLabel("Racepass A1")).toBe("ZRL A");
    expect(teamNameForLabel("Racepass B Dev")).toBe("Bdev");
    expect(teamNameForLabel("Racepass ZwiftLadies")).toBe("ZRL Zwiftladies B");
    expect(teamNameForLabel("Racepass ZwiftLadies C")).toBe("ZRL Zwiftladies C");
    expect(teamNameForLabel("Racepass A2")).toBeNull();
  });
});

describe("collectRacepasses", () => {
  const teams = new Map([
    ["ZRL A", "team-a"],
    ["ZRL C", "team-c"],
  ]);

  it("voegt de A/B- en C-pagina van één datum samen", () => {
    const result = collectRacepasses(
      [
        {
          dateKey: "2026-11-24",
          passes: [
            { label: "Racepass A", url: pass("a") },
            { label: "Racepass A1", url: pass("a") },
          ],
        },
        { dateKey: "2026-11-24", passes: [{ label: "Racepass C", url: pass("c") }] },
      ],
      teams,
    );
    expect(result.passes.map((row) => [row.teamId, row.url])).toEqual([
      ["team-a", pass("a")],
      ["team-c", pass("c")],
    ]);
    expect(result.ambiguous).toEqual([]);
  });

  it("gokt niet bij twee verschillende links en meldt onbekende labels", () => {
    const result = collectRacepasses(
      [
        {
          dateKey: "2026-11-24",
          passes: [
            { label: "Racepass A", url: pass("a") },
            { label: "Racepass A1", url: pass("anders") },
            { label: "Racepass A", url: pass("a") },
            { label: "Racepass A2", url: pass("a2") },
          ],
        },
      ],
      teams,
    );
    expect(result.passes).toEqual([]);
    expect(result.ambiguous).toEqual(["ZRL A (2026-11-24)"]);
    expect(result.unknownLabels).toEqual(["Racepass A2"]);
  });
});

describe("planRacepassImport", () => {
  const scraped: ScrapedRacepass = {
    teamId: "t",
    teamName: "ZRL C",
    raceDate: "2026-11-24",
    url: pass("site"),
  };
  const stored = (over: Partial<StoredRacepass>): StoredRacepass => ({
    team_id: "t",
    race_date: "2026-11-24",
    url: pass("site"),
    source: "site",
    site_url: pass("site"),
    ...over,
  });

  it("zet een nieuwe pass als sitepass", () => {
    const plan = planRacepassImport([], [scraped]);
    expect(plan.upserts).toEqual([
      { team_id: "t", race_date: "2026-11-24", url: pass("site"), source: "site", site_url: pass("site") },
    ]);
  });

  it("schrijft niets als alles gelijk is", () => {
    expect(planRacepassImport([stored({})], [scraped])).toEqual({ upserts: [], differs: [] });
  });

  it("volgt de site bij een sitepass", () => {
    const plan = planRacepassImport(
      [stored({ url: pass("oud"), site_url: pass("oud") })],
      [scraped],
    );
    expect(plan.upserts[0].url).toBe(pass("site"));
    expect(plan.differs).toEqual([]);
  });

  it("laat een afwijkende handmatige pass staan en bewaart de sitelink", () => {
    const plan = planRacepassImport(
      [stored({ url: pass("hand"), source: "manual", site_url: null })],
      [scraped],
    );
    expect(plan.upserts).toEqual([
      { team_id: "t", race_date: "2026-11-24", url: pass("hand"), source: "manual", site_url: pass("site") },
    ]);
    expect(plan.differs).toEqual(["ZRL C (2026-11-24)"]);
  });

  it("schrijft een bekende afwijking niet elk uur opnieuw", () => {
    const plan = planRacepassImport(
      [stored({ url: pass("hand"), source: "manual" })],
      [scraped],
    );
    expect(plan.upserts).toEqual([]);
    expect(plan.differs).toEqual(["ZRL C (2026-11-24)"]);
  });

  it("zet een handmatige pass die gelijk is aan de site terug op de site", () => {
    const plan = planRacepassImport([stored({ source: "manual", site_url: null })], [scraped]);
    expect(plan.upserts[0].source).toBe("site");
    expect(plan.differs).toEqual([]);
  });
});
