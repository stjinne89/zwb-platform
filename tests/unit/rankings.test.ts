import { describe, expect, it } from "vitest";
import { briljantGrowth } from "@/lib/briljant/compare";
import { clubmens, groeibriljant, metronoom, rankBy, weekRankings } from "@/lib/rankings/rankings";

// ZWB Rankings: ranglijsten uit ritten van elke bron, aanmeldingen, live-ritten en
// ZWBriljant-stenen.

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-00000000000c";

function ride(id: number, profile: string, start: string, seconds: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    profile_id: profile,
    start_date: start,
    distance_m: 30_000,
    total_elevation_gain_m: 100,
    moving_time_seconds: seconds,
    trainer: false,
    ...extra,
  };
}

const ranking = (list: ReturnType<typeof weekRankings>, id: string) => list.find((item) => item.id === id)!;

describe("rankBy", () => {
  it("geeft gelijke stand dezelfde plek en laat nul weg", () => {
    const rows = [
      { profileId: A, n: 5 },
      { profileId: B, n: 5 },
      { profileId: C, n: 3 },
      { profileId: "d", n: 0 },
    ];
    expect(rankBy(rows, (row) => row.n, String).map((entry) => entry.rank)).toEqual([1, 1, 3]);
  });
});

describe("weekRankings", () => {
  const week = "2026-10-19";
  const rows = [
    ride(1, A, "2026-10-20T06:00:00Z", 2 * 3600),
    ride(2, A, "2026-10-22T17:00:00Z", 3600, { trainer: true, distance_m: 35_000 }),
    ride(3, B, "2026-10-21T08:00:00Z", 4 * 3600, { distance_m: 120_000, total_elevation_gain_m: 900 }),
    // Dezelfde rit van B nog een keer (via intervals.icu): telt één keer.
    ride(-4, B, "2026-10-21T08:00:30Z", 4 * 3600, { distance_m: 120_000, total_elevation_gain_m: 900 }),
    // Andere week.
    ride(5, C, "2026-10-12T08:00:00Z", 10 * 3600),
  ];
  const list = weekRankings(rows, week);

  it("kent geen kudo-ranglijst meer", () => {
    expect(list.map((item) => item.id)).not.toContain("kudos");
  });

  it("Zitvleeskampioen: de meeste uren, een dubbele rit één keer", () => {
    const zitvlees = ranking(list, "zitvlees");
    expect(zitvlees.title).toBe("Zitvleeskampioen");
    expect(zitvlees.entries.map((entry) => [entry.profileId, entry.label])).toEqual([
      [B, "4 u"],
      [A, "3 u"],
    ]);
  });

  it("Buitenbeentje en Binnenvetter splitsen op de rollenbank, in km en in uren", () => {
    const buiten = ranking(list, "buitenbeentje");
    expect(buiten.views?.map((view) => view.label)).toEqual(["km", "uren"]);
    expect(buiten.entries.map((entry) => [entry.profileId, entry.label])).toEqual([
      [B, "120 km"],
      [A, "30 km"],
    ]);
    expect(buiten.views?.[1].entries.map((entry) => entry.label)).toEqual(["4 u", "2 u"]);

    const binnen = ranking(list, "binnenvetter");
    expect(binnen.views?.map((view) => view.label)).toEqual(["uren", "km"]);
    expect(binnen.entries.map((entry) => [entry.profileId, entry.label])).toEqual([[A, "1 u"]]);
    expect(binnen.views?.[1].entries.map((entry) => entry.label)).toEqual(["35 km"]);
  });

  it("Lange adem: de langste rit, niet de som", () => {
    expect(ranking(list, "lange-adem").entries.map((entry) => entry.label)).toEqual(["4:00 u", "2:00 u"]);
  });
});

describe("metronoom", () => {
  it("telt dagen, niet ritten, in Nederlandse tijd", () => {
    const result = metronoom([
      ride(1, A, "2026-10-20T06:00:00Z", 3600),
      ride(2, A, "2026-10-20T18:00:00Z", 3600),
      // 23:30 UTC is in Nederland al de volgende dag.
      ride(3, A, "2026-10-20T23:30:00Z", 3600),
      ride(4, B, "2026-10-21T08:00:00Z", 3600),
    ]);
    expect(result.entries.map((entry) => [entry.profileId, entry.label])).toEqual([
      [A, "2 dagen"],
      [B, "1 dag"],
    ]);
  });
});

describe("clubmens", () => {
  const now = new Date("2026-10-26T12:00:00Z");

  it("telt events met ja en live-dagen, een live-rit op de eventdag niet dubbel", () => {
    const result = clubmens(
      [
        { profile_id: A, event_id: "e1", start_at: "2026-10-20T17:00:00Z" },
        { profile_id: A, event_id: "e2", start_at: "2026-10-22T17:00:00Z" },
        // Nog niet begonnen.
        { profile_id: B, event_id: "e3", start_at: "2026-10-28T17:00:00Z" },
      ],
      [
        { profile_id: A, started_at: "2026-10-20T17:00:00Z", last_seen_at: "2026-10-20T18:30:00Z", ended_at: null },
        { profile_id: B, started_at: "2026-10-24T09:00:00Z", last_seen_at: null, ended_at: "2026-10-24T11:00:00Z" },
        // Te kort: een test of een vergissing.
        { profile_id: C, started_at: "2026-10-24T09:00:00Z", last_seen_at: "2026-10-24T09:05:00Z", ended_at: null },
      ],
      now,
    );
    expect(result.entries.map((entry) => [entry.profileId, entry.value, entry.detail])).toEqual([
      [A, 2, "2 events"],
      [B, 1, "1× samen fietsen"],
    ]);
  });
});

describe("briljantGrowth", () => {
  const facets = (level: number) => ({
    sprint: level,
    anaeroob: level,
    vo2max: level,
    drempel: level,
    durability: level,
    fitheid: level,
    racen: level,
  });
  const snapshot = (profile: string, week: string, level: number) => ({
    profile_id: profile,
    week,
    facets: facets(level),
    consistency: null,
  });

  it("vergelijkt de steen van de week met die van de week ervoor", () => {
    const growth = briljantGrowth(
      [
        snapshot(A, "2026-10-26", 4.3),
        snapshot(A, "2026-10-19", 4.15),
        // Ouder: telt niet.
        snapshot(A, "2026-09-28", 1),
        snapshot(B, "2026-10-26", 3),
        snapshot(B, "2026-10-19", 3.2),
      ],
      "2026-10-26",
    );
    // Zonder consistentie telt de score voor 0,8 (scoreFor): 4,15 → 3,32 en 4,3 → 3,44.
    expect(growth).toEqual([{ profileId: A, from: 3.32, to: 3.44, growth: 12 }]);
    expect(groeibriljant(growth).entries[0]).toMatchObject({ label: "+12 punten", detail: "332 → 344" });
  });

  it("slaat een lid zonder steen in een van beide weken over", () => {
    expect(
      briljantGrowth(
        [
          snapshot(A, "2026-10-26", 4),
          snapshot(A, "2026-09-28", 3),
          snapshot(B, "2026-10-19", 4),
        ],
        "2026-10-26",
      ),
    ).toEqual([]);
  });
});
