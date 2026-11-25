import { describe, expect, it } from "vitest";
import { compareLadderTeams } from "@/lib/club-ladder/team-order";

describe("compareLadderTeams", () => {
  it("zet positie voor naam, zonder positie daarna en archief achteraan", () => {
    const teams = [
      { name: "Archief", archived: true, position: 1 },
      { name: "Bravo", position: null },
      { name: "Delta", position: 12 },
      { name: "Alfa", position: undefined },
      { name: "Charlie", position: 3 },
      { name: "Echo", position: 3 },
    ];
    expect([...teams].sort(compareLadderTeams).map((team) => team.name)).toEqual([
      "Charlie",
      "Echo",
      "Delta",
      "Alfa",
      "Bravo",
      "Archief",
    ]);
  });
});
