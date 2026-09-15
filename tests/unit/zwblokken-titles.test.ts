import { describe, expect, it } from "vitest";
import { PRIVACY_VERSIONS } from "@/lib/privacy";
import {
  TITLE_SEX_CONSENT_VERSION,
  addBlock,
  countryOfProvince,
  pickRulers,
  rulerTitle,
  sexForTitle,
  type RegionStandings,
} from "@/lib/zwblokken/titles";

function standingsFrom(
  rows: [profile: string, country: string | null, province: string | null, seen: string][],
): RegionStandings {
  const standings: RegionStandings = new Map();
  for (const [profile_id, country, province, first_seen_at] of rows) {
    addBlock(standings, { profile_id, country, province, first_seen_at });
  }
  return standings;
}

const ALL = new Set(["anna", "bram", "cor"]);

describe("pickRulers", () => {
  it("geeft de titel aan wie de meeste blokken heeft", () => {
    const standings = standingsFrom([
      ["anna", "NL", "NL-UT", "2026-01-01T10:00:00Z"],
      ["bram", "NL", "NL-UT", "2026-01-02T10:00:00Z"],
      ["bram", "NL", "NL-GE", "2026-01-03T10:00:00Z"],
    ]);
    const rulers = pickRulers(standings, ALL);
    expect(rulers.get("NL")).toEqual({ profileId: "bram", blocks: 2 });
    expect(rulers.get("NL-GE")).toEqual({ profileId: "bram", blocks: 1 });
  });

  it("laat de titel bij gelijkspel bij wie het aantal het eerst bereikte", () => {
    const standings = standingsFrom([
      ["anna", "BE", "BE-VLI", "2026-03-01T10:00:00Z"],
      ["anna", "BE", "BE-VLI", "2026-05-01T10:00:00Z"],
      ["bram", "BE", "BE-VLI", "2026-02-01T10:00:00Z"],
      ["bram", "BE", "BE-VLI", "2026-04-01T10:00:00Z"],
    ]);
    // Beide twee blokken; Bram had er twee op 1 april, Anna pas op 1 mei.
    expect(pickRulers(standings, ALL).get("BE-VLI")?.profileId).toBe("bram");
  });

  it("neemt de titel pas over bij strikt meer blokken", () => {
    const standings = standingsFrom([
      ["anna", "DE", null, "2026-01-01T10:00:00Z"],
      ["bram", "DE", null, "2026-06-01T10:00:00Z"],
      ["bram", "DE", null, "2026-06-02T10:00:00Z"],
    ]);
    expect(pickRulers(standings, ALL).get("DE")?.profileId).toBe("bram");
  });

  it("laat leden buiten `eligible` niet meedingen", () => {
    const standings = standingsFrom([
      ["anna", "FR", "FR-IDF", "2026-01-01T10:00:00Z"],
      ["weg", "FR", "FR-IDF", "2026-01-01T10:00:00Z"],
      ["weg", "FR", "FR-IDF", "2026-01-02T10:00:00Z"],
    ]);
    const rulers = pickRulers(standings, ALL);
    expect(rulers.get("FR-IDF")?.profileId).toBe("anna");
  });

  it("geeft geen titel als niemand mag meedingen", () => {
    const standings = standingsFrom([["weg", "LU", "LU-L", "2026-01-01T10:00:00Z"]]);
    expect(pickRulers(standings, ALL).size).toBe(0);
  });

  it("slaat blokken zonder regio over", () => {
    const standings = standingsFrom([["anna", null, null, "2026-01-01T10:00:00Z"]]);
    expect(standings.size).toBe(0);
  });
});

describe("rulerTitle", () => {
  it("volgt het opgegeven geslacht voor een land", () => {
    expect(rulerTitle("country", "man")).toBe("Koning");
    expect(rulerTitle("country", "vrouw")).toBe("Koningin");
    expect(rulerTitle("country", "zeg_ik_liever_niet")).toBe("Vorst");
    expect(rulerTitle("country", null)).toBe("Vorst");
  });

  it("maakt van elke provinciehouder een Gouverneur", () => {
    expect(rulerTitle("province", "man")).toBe("Gouverneur");
    expect(rulerTitle("province", "vrouw")).toBe("Gouverneur");
    expect(rulerTitle("province", null)).toBe("Gouverneur");
  });
});

describe("sexForTitle", () => {
  it("gebruikt het geslacht pas na de privacyversie die dat noemt", () => {
    expect(sexForTitle("vrouw", "2026-09-15")).toBe("vrouw");
    expect(sexForTitle("man", "2026-12-01")).toBe("man");
    expect(sexForTitle("vrouw", "2026-09-13")).toBeNull();
    expect(sexForTitle("man", null)).toBeNull();
  });

  it("hoort bij een bestaande privacyversie", () => {
    expect(PRIVACY_VERSIONS).toContain(TITLE_SEX_CONSENT_VERSION);
  });
});

describe("countryOfProvince", () => {
  it("haalt de landcode uit de provinciecode", () => {
    expect(countryOfProvince("NL-LI")).toBe("NL");
    expect(countryOfProvince("FR-IDF")).toBe("FR");
  });
});
