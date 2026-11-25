import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { latestLadderResults } from "@/lib/club-ladder/dashboard-results";

const since = Date.parse("2026-11-18T00:00:00Z");
const teams = [
  { id: "t-beasts", name: "ZWBeasts", division: "Diamond-Ruby", aliases: ["ZWBeasts"] },
  { id: "t-bullets", name: "ZWBullets", division: null, aliases: ["ZWBullets"] },
  { id: "t-beauties", name: "ZWBeauties", division: null, aliases: ["ZWBeauties"] },
];
const match = (id: number, day: string, time: string, challenger: string, cs: number, opponent: string, os: number) => ({
  result_id: id,
  raced_on: day,
  raced_at: time,
  challenger,
  challenger_score: cs,
  opponent,
  opponent_score: os,
});

describe("latestLadderResults", () => {
  const results = latestLadderResults(
    teams,
    [
      match(1, "2026-11-18", "18:35:00", "ZWBeasts", 29, "Devil Dogs [DBR]", 23),
      match(2, "2026-11-23", "19:00:00", "Vikings Valgrind", 27, "ZWBeasts", 28),
      // Twee keer binnengekomen (als uitdager en als tegenstander opgehaald).
      match(2, "2026-11-23", "19:00:00", "Vikings Valgrind", 27, "ZWBeasts", 28),
      match(3, "2026-11-19", "19:02:00", "ZWBullets", 26, "SZR Rapid Force", 26),
      match(4, "2026-11-10", "19:00:00", "ZWBeauties", 30, "Galaxy Astra", 20),
      match(5, "2026-11-24", "19:00:00", "TBR Outcasts", 30, "Galaxy Astra", 20),
    ],
    [
      { id: "ev-2", team_id: "t-beasts", title: "Club Ladder: Vikings Valgrind – ZWBeasts", start_at: "2026-11-23T19:00:00Z", club_ladder_opponent: "Vikings Valgrind" },
    ],
    since,
  );

  it("geeft per team de nieuwste wedstrijd van de week, nieuwste eerst", () => {
    // ZWBeauties reed alleen vóór de week; wedstrijd 5 is zonder ZWB-team.
    expect(results.map((r) => [r.teamName, r.resultId])).toEqual([
      ["ZWBeasts", 2],
      ["ZWBullets", 3],
    ]);
  });

  it("zet onze score voorop en linkt naar de uitslag op het event", () => {
    expect(results[0]).toMatchObject({
      opponent: "Vikings Valgrind",
      ourScore: 28,
      theirScore: 27,
      won: true,
      racedAt: "2026-11-23T19:00:00.000Z",
      href: "/events/ev-2#uitslag",
    });
  });

  it("valt zonder event terug op de teampagina; gelijk verliest de uitdager", () => {
    expect(results[1]).toMatchObject({ won: false, href: "/teams/club-ladder/t-bullets" });
  });
});
