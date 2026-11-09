import { describe, expect, it, vi } from "vitest";

// club.ts importeert server-only en next/cache; voor buildClub zijn die niet nodig.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

const { buildClub, EMPTY_CLUB_SETTINGS } = await import("@/lib/club");

describe("buildClub", () => {
  it("zet alles aan zonder rijen, met neutrale instellingen", () => {
    const club = buildClub(null);
    expect(club.settings).toEqual(EMPTY_CLUB_SETTINGS);
    expect(club.disabled.size).toBe(0);
    expect(club.isEnabled("teams")).toBe(true);
    expect(club.allowsPath("/zwbgame")).toBe(true);
    expect(club.moduleLabel("training")).toBe("Training");
  });

  it("volgt de eigen naam en de aan/uit-stand", () => {
    const club = buildClub({
      settings: { ...EMPTY_CLUB_SETTINGS, name: "Testclub", shortName: "TC" },
      modules: [
        { key: "training", enabled: true, label: "ZWBeter Worden" },
        { key: "teams", enabled: false, label: null },
        { key: "bibliotheek", enabled: true, label: "  " },
        { key: "onbekend", enabled: false, label: "X" },
      ],
    });
    expect(club.settings.name).toBe("Testclub");
    expect(club.moduleLabel("training")).toBe("ZWBeter Worden");
    expect(club.moduleLabel("bibliotheek")).toBe("Bibliotheek");
    expect([...club.switchedOff]).toEqual(["teams"]);
    // Live race en het managerspel vereisen Teams.
    expect(club.isEnabled("live_race")).toBe(false);
    expect(club.isEnabled("managerspel")).toBe(false);
    expect(club.allowsPath("/teams/club-ladder")).toBe(false);
    expect(club.allowsPath("/leden")).toBe(true);
  });
});
