import { describe, expect, it } from "vitest";
import { mapSubgroups } from "@/lib/omnium/zwift-mapping";
import { mapZwiftResults } from "@/lib/omnium/zwift-results";
import {
  eligibleResultRows,
  prepareResultInput,
  resultKeyResolver,
} from "@/lib/omnium/result-input";
import { scoreParsedRows } from "@/lib/omnium/import";
import type { ParsedResultRow } from "@/lib/omnium/parse-results";

const event = {
  eventSubgroups: [
    { id: 101, subgroupLabel: "A", name: "A" },
    { id: 102, subgroupLabel: "B", name: "B" },
  ],
};

function row(overrides: Partial<ParsedResultRow>): ParsedResultRow {
  return {
    lineNumber: 1,
    raw: "test",
    name: "Rider",
    teamName: null,
    league: "DIAMOND-RUBY",
    zwiftId: "1",
    position: 1,
    timeText: "1.000s",
    timeSeconds: 1,
    segmentSeconds: null,
    points: null,
    deltaSeconds: null,
    status: "finished",
    block: null,
    ...overrides,
  };
}

describe("Omnium Zwift mapping", () => {
  it("requires an explicit vELO mapping for Zwift A–E groups", () => {
    expect(mapSubgroups(event).map((group) => group.league)).toEqual([null, null]);
    expect(
      mapSubgroups(event, {
        "101": "DIAMOND-RUBY",
        "102": "EMERALD-SAPPHIRE",
      }).map((group) => group.league),
    ).toEqual(["DIAMOND-RUBY", "EMERALD-SAPPHIRE"]);
  });

  it("keeps millisecond precision and surfaces jury flags", () => {
    const mapped = mapZwiftResults(
      [
        {
          profileId: 9001,
          eventSubgroupId: 101,
          rank: 2,
          profileData: { firstName: "Ada", lastName: "Lovelace" },
          activityData: { durationInMilliseconds: 1_904_869 },
          flaggedSandbagging: true,
          qualified: false,
        },
      ],
      event,
      { "101": "DIAMOND-RUBY", "102": "EMERALD-SAPPHIRE" },
    );

    expect(mapped.rows[0]).toMatchObject({
      zwiftId: "9001",
      league: "DIAMOND-RUBY",
      position: 2,
      timeSeconds: 1904.869,
      timeText: "31:44.869",
      status: "finished",
    });
    expect(mapped.warnings).toEqual([
      "Ada Lovelace: sandbagging, niet gekwalificeerd",
    ]);
  });

  it("rejects duplicate profiles in an API result", () => {
    const entry = {
      profileId: 9001,
      eventSubgroupId: 101,
      rank: 1,
      profileData: { firstName: "Ada", lastName: "Lovelace" },
      activityData: { durationInMilliseconds: 1_000 },
    };
    expect(() =>
      mapZwiftResults([entry, { ...entry, rank: 2 }], event, {
        "101": "DIAMOND-RUBY",
        "102": "EMERALD-SAPPHIRE",
      }),
    ).toThrow(/Dubbele renners/);
  });
});

describe("Omnium result sources", () => {
  it("turns a historical Sheet CSV into stored discipline points", () => {
    const prepared = prepareResultInput(
      {
        mode: "sheet_csv",
        raw: "Rider,Team,Cat,Prologue,Scratch,Sprint,Crit,Total\nAda,Analytical,DIAMOND,40,38,20,19,117",
      },
      "scratch",
    );
    expect(prepared.rows).toHaveLength(1);
    expect(prepared.rows[0]).toMatchObject({
      name: "Ada",
      teamName: "Analytical",
      league: "DIAMOND-RUBY",
      points: 38,
    });
    expect(
      scoreParsedRows(prepared.rows, {
        discipline: "scratch",
        mode: "sheet_csv",
      })[0].points,
    ).toBe(38);
  });

  it("accepts the exact weekly Results export shape from the historical Sheets", () => {
    const prepared = prepareResultInput(
      {
        mode: "sheet_csv",
        raw: [
          "Pos,Rider,Team,Cat,Prologue,Sprint,Scratch,Crit,Total",
          '1,"Jesper van Deurzen [Team NL]",,DIAMOND-RUBY,38,20,40,28,126',
          "1,Dennis Leeftink,,EMERALD-SAPPHIRE,38,18,40,28,124",
        ].join("\n"),
      },
      "crit",
    );

    expect(prepared.issues).toEqual([]);
    expect(prepared.rows).toMatchObject([
      { name: "Jesper van Deurzen", teamName: "Team NL", league: "DIAMOND-RUBY", points: 28 },
      { name: "Dennis Leeftink", teamName: null, league: "EMERALD-SAPPHIRE", points: 28 },
    ]);
  });

  it("removes guests before positions and points are calculated", () => {
    const rows = [
      row({ name: "Guest", zwiftId: "99", position: 1 }),
      row({ name: "Entrant", zwiftId: "42", position: 2 }),
    ];
    const filtered = eligibleResultRows(rows, new Set(["42"]), (result) =>
      result.zwiftId ?? "",
    );
    const scored = scoreParsedRows(filtered.eligible, {
      discipline: "scratch",
      mode: "finish",
      idOf: (result) => result.zwiftId ?? "",
    });

    expect(filtered.guests.map((result) => result.name)).toEqual(["Guest"]);
    expect(scored).toHaveLength(1);
    expect(scored[0]).toMatchObject({ riderId: "42", position: 1, points: 40 });
  });

  it("combines a Zwift Crit finish with pasted sprint blocks", () => {
    const prepared = prepareResultInput(
      {
        mode: "crit_detailed",
        parsedRows: [row({ name: "Ada", zwiftId: "9001", position: 1 })],
        raw: "SPRINT 1\nAda DIAMOND 1",
      },
      "crit",
    );
    expect(prepared.rows.map((result) => result.block)).toEqual(["finish", "sprint 1"]);
    const keyOf = resultKeyResolver(prepared.rows);
    expect(prepared.rows.map(keyOf)).toEqual(["zwift:9001", "zwift:9001"]);
    const scored = scoreParsedRows(prepared.rows, {
      discipline: "crit",
      mode: "crit_detailed",
      idOf: keyOf,
    });
    expect(scored).toHaveLength(1);
    expect(scored[0]).toMatchObject({ finishPoints: 20, sprintPoints: 10, points: 30 });
  });
});
