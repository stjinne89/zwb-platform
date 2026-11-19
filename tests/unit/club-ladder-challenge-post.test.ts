import { describe, expect, it } from "vitest";
import {
  amsterdamZone,
  buildChallengePost,
  CLUB_LADDER_DISCORD_SERVER_URL,
  formatChallengeDays,
  parseDirectoryCaptains,
  raceOrganisationUrl,
} from "@/lib/club-ladder/challenge-post";
import { challengeableTeams, challengerTeams } from "@/lib/club-ladder/rules";

// Vorm van /directory/search?q= (november 2026), ingekort tot wat telt.
const DIRECTORY = [
  { discordName: "elliott0969", firstname: "Elliott", lastname: "Ward", role: "Captain", team: { id: 606, name: "CLS Chasers" } },
  { discordName: "shaunbuk66", firstname: "Shaun", lastname: "Breen", role: "Vice-Captain", team: { id: 606, name: "CLS Chasers" } },
  { discordName: "other", firstname: "Ander", lastname: "Team", role: "Captain", team: { id: 700, name: "CLS Chasers B" } },
];

describe("parseDirectoryCaptains", () => {
  it("neemt alleen de ploeg met hetzelfde ladder-ID, captain eerst", () => {
    const captains = parseDirectoryCaptains([...DIRECTORY].reverse(), { name: "CLS Chasers", ladderTeamId: 606 });
    expect(captains).toEqual([
      { name: "Elliott Ward", role: "captain", discordName: "elliott0969" },
      { name: "Shaun Breen", role: "vice-captain", discordName: "shaunbuk66" },
    ]);
  });

  it("valt zonder ID terug op de teamnaam", () => {
    const captains = parseDirectoryCaptains(DIRECTORY, { name: "cls chasers b", ladderTeamId: null });
    expect(captains.map((c) => c.discordName)).toEqual(["other"]);
  });

  it("geeft niets bij een onverwacht antwoord", () => {
    expect(parseDirectoryCaptains({ error: "x" }, { name: "CLS Chasers", ladderTeamId: 606 })).toEqual([]);
  });
});

describe("formatChallengeDays", () => {
  it("schrijft dagen in één maand als rangtelwoorden", () => {
    expect(formatChallengeDays(["2026-11-19", "2026-11-18"])).toBe("the 18th or 19th");
    expect(formatChallengeDays(["2026-11-01", "2026-11-02", "2026-11-03"])).toBe("the 1st, 2nd or 3rd");
    expect(formatChallengeDays(["2026-11-11", "2026-11-12", "2026-11-13"])).toBe("the 11th, 12th or 13th");
  });

  it("zet de maand erbij over een maandgrens", () => {
    expect(formatChallengeDays(["2026-11-30", "2026-12-01"])).toBe("30 Nov or 1 Dec");
  });

  it("negeert lege velden", () => {
    expect(formatChallengeDays(["", ""])).toBe("??");
    expect(formatChallengeDays(["2026-11-18", ""])).toBe("the 18th");
  });
});

describe("amsterdamZone", () => {
  it("kent winter- en zomertijd", () => {
    expect(amsterdamZone("2026-11-18", "20:00")).toBe("CET");
    expect(amsterdamZone("2026-07-01", "20:00")).toBe("CEST");
  });
});

describe("buildChallengePost", () => {
  it("bouwt titel en tekst zoals in het race-organisation-kanaal", () => {
    const post = buildChallengePost({
      teamName: "ZWBandits",
      dates: ["2026-11-18", "2026-11-19"],
      time: "20:00",
      opponents: [
        {
          name: "CLS Chasers",
          ladderTeamId: 606,
          position: 12,
          captains: parseDirectoryCaptains(DIRECTORY, { name: "CLS Chasers", ladderTeamId: 606 }),
        },
        {
          name: "BAKPDL C",
          ladderTeamId: 9,
          position: 14,
          captains: [
            { name: "Ian B", role: "captain", discordName: null },
            { name: "Vice", role: "vice-captain", discordName: "vice_bak" },
          ],
        },
        { name: "Geen Captain", ladderTeamId: 10, position: 15, captains: [] },
      ],
    });
    expect(post.title).toBe("ZWBandits vs ?? On the 18th or 19th");
    expect(post.body).toBe(
      [
        "We are looking for a race on the 18th or 19th approx 20:00 CET",
        "@elliott0969 (CLS Chasers)",
        "@vice_bak (BAKPDL C)",
        "Geen Captain",
      ].join("\n"),
    );
  });
});

describe("raceOrganisationUrl", () => {
  it("opent emea-race-organisation voor EMEA", () => {
    expect(raceOrganisationUrl("EMEA")).toBe("https://discord.com/channels/928942633844355122/1075443165928103966");
  });

  it("opent de server zolang het kanaal onbekend is", () => {
    expect(raceOrganisationUrl("WOMENS")).toBe(CLUB_LADDER_DISCORD_SERVER_URL);
  });
});

describe("uitdagers zoeken", () => {
  const row = (position: number, name: string, region = "EMEA") => ({
    position,
    name,
    ladderTeamId: position,
    region,
    form: [],
    move: null,
  });
  const standings = [
    ...Array.from({ length: 20 }, (_, i) => row(i + 1, `Ploeg ${i + 1}`)),
    row(13, "Andere regio", "AMER"),
  ];

  it("neemt de zeven ploegen onder ons in dezelfde regio", () => {
    expect(challengerTeams(standings, standings[9]).map((r) => r.position)).toEqual([11, 12, 13, 14, 15, 16, 17]);
    expect(challengeableTeams(standings, standings[9]).map((r) => r.position)).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });

  it("stopt onderaan de ladder", () => {
    expect(challengerTeams(standings, standings[17]).map((r) => r.position)).toEqual([19, 20]);
  });

  it("vraagt om een uitdager", () => {
    const post = buildChallengePost({
      teamName: "ZWBandits",
      direction: "down",
      dates: ["2026-11-25"],
      time: "20:00",
      opponents: [
        { name: "Ploeg 11", ladderTeamId: 11, position: 11, captains: [{ name: "A B", role: "captain", discordName: "ab" }] },
      ],
    });
    expect(post.title).toBe("ZWBandits vs ?? On the 25th");
    expect(post.body).toBe("Looking for a challenger on the 25th approx 20:00 CET\n@ab (Ploeg 11)");
  });
});
