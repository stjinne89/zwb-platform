import { describe, expect, it } from "vitest";
import {
  formatPrivacyVersion,
  privacyConsentIsCurrent,
  PRIVACY_STATEMENT_VERSION,
  PRIVACY_VERSIONS,
} from "@/lib/privacy";

describe("privacyConsentIsCurrent", () => {
  it("accepteert alleen de huidige versie", () => {
    expect(privacyConsentIsCurrent(PRIVACY_STATEMENT_VERSION)).toBe(true);
  });

  it("vraagt opnieuw bij een oudere versie", () => {
    // De grootste groep staat nog op de eerste verklaring; die zegt niets over
    // gezondheidsgegevens en dekt de huidige verwerking dus niet.
    expect(privacyConsentIsCurrent("2026-05-31")).toBe(false);
    for (const version of PRIVACY_VERSIONS.slice(0, -1)) {
      expect(privacyConsentIsCurrent(version)).toBe(false);
    }
  });

  it("vraagt opnieuw als er nooit iets is getekend", () => {
    expect(privacyConsentIsCurrent(null)).toBe(false);
    expect(privacyConsentIsCurrent(undefined)).toBe(false);
    expect(privacyConsentIsCurrent("")).toBe(false);
  });

  it("vraagt opnieuw bij een onbekende of teruggedraaide versie", () => {
    // Op gelijkheid en niet op "nieuwer dan": staat er iets anders dan de
    // huidige tekst, dan is de toestemming niet die tekst.
    expect(privacyConsentIsCurrent("2027-01-01")).toBe(false);
    expect(privacyConsentIsCurrent("onzin")).toBe(false);
  });
});

describe("PRIVACY_VERSIONS", () => {
  it("staat oplopend en zonder dubbelen", () => {
    const sorted = [...PRIVACY_VERSIONS].sort();
    expect([...PRIVACY_VERSIONS]).toEqual(sorted);
    expect(new Set(PRIVACY_VERSIONS).size).toBe(PRIVACY_VERSIONS.length);
  });

  it("wijst de laatste aan als huidige", () => {
    expect(PRIVACY_STATEMENT_VERSION).toBe(PRIVACY_VERSIONS[PRIVACY_VERSIONS.length - 1]);
  });
});

describe("formatPrivacyVersion", () => {
  it("schrijft de datum voluit in het Nederlands", () => {
    expect(formatPrivacyVersion("2026-05-31")).toBe("31 mei 2026");
    expect(formatPrivacyVersion("2026-08-18")).toBe("18 augustus 2026");
  });
});
