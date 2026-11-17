import { describe, expect, it } from "vitest";
import { lineupShareText } from "@/lib/teams/lineup-share";

describe("lineupShareText", () => {
  it("zet per team de namen en de racepass onder elkaar", () => {
    const text = lineupShareText({
      title: "18 nov · ZRL 2026/27 · R2 · W3",
      teams: [
        { name: "ZWB A1", riders: ["Jan de Vries", "Piet Jansen"], racepass: "https://www.wtrl.racing/pass/a1" },
        { name: "ZWB B1", riders: ["Klaas Bakker"], racepass: null },
      ],
    });
    expect(text).toBe(
      [
        "Teamindeling 18 nov · ZRL 2026/27 · R2 · W3",
        "",
        "*ZWB A1*",
        "Jan de Vries",
        "Piet Jansen",
        "Racepass: https://www.wtrl.racing/pass/a1",
        "",
        "*ZWB B1*",
        "Klaas Bakker",
      ].join("\n"),
    );
  });

  it("laat teams zonder renners weg en zet geen @ voor de namen", () => {
    const text = lineupShareText({
      title: "W1",
      teams: [
        { name: "ZWB A1", riders: [], racepass: "https://www.wtrl.racing/pass/a1" },
        { name: "ZWB B1", riders: ["Klaas"], racepass: null },
      ],
    });
    expect(text).not.toContain("A1");
    expect(text).not.toContain("@");
  });

  it("haalt opmaaktekens uit namen zodat het vet niet breekt", () => {
    const text = lineupShareText({ title: "W1", teams: [{ name: "ZWB *A1*", riders: ["Jan_*"], racepass: null }] });
    expect(text).toBe("Teamindeling W1\n\n*ZWB A1*\nJan");
  });
});
