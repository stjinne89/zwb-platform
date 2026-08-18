import { describe, expect, it } from "vitest";
import {
  matchAuthor,
  parseWhatsappExport,
  toCandidates,
} from "@/lib/maintenance/whatsapp-export";

const ANDROID = `18-08-2026 09:15 - Berichten en oproepen zijn end-to-end versleuteld.
18-08-2026 09:16 - Stijn Martens: Ketting elke 3000 km vervangen, dan gaat je cassette twee keer zo lang mee.
18-08-2026 09:17 - Bart: <Media weggelaten>
18-08-2026 09:18 - Karen van de Rakt: Na een natte rit altijd even de ketting
drogen en opnieuw smeren, anders zit er zo roest op.
18-08-2026 09:19 - Stijn Martens: kort`;

const IOS = `[18-08-2026 09:16:03] Stijn Martens: Remblokken op tijd vervangen, metaal op metaal kost je een schijf.
[18-08-2026 09:17:11] Bart: Bij mij gaan ze in de winter maar 400 km mee hoor.`;

describe("parseWhatsappExport", () => {
  it("leest het Android-formaat en plakt vervolgregels aan het vorige bericht", () => {
    const messages = parseWhatsappExport(ANDROID);
    expect(messages.map((m) => m.author)).toEqual([
      "Stijn Martens",
      "Karen van de Rakt",
      "Stijn Martens",
    ]);
    expect(messages[1].text).toContain("drogen en opnieuw smeren");
  });

  it("leest het iOS-formaat", () => {
    const messages = parseWhatsappExport(IOS);
    expect(messages).toHaveLength(2);
    expect(messages[0].author).toBe("Stijn Martens");
    expect(messages[1].text).toContain("400 km");
  });

  it("gooit systeemregels en media weg", () => {
    const texts = parseWhatsappExport(ANDROID).map((m) => m.text);
    expect(texts.some((t) => t.includes("end-to-end"))).toBe(false);
    expect(texts.some((t) => t.includes("Media weggelaten"))).toBe(false);
  });
});

describe("matchAuthor", () => {
  const profiles = [
    { id: "a", display_name: "Stijn Martens" },
    { id: "b", display_name: "Karen van de Rakt" },
    { id: "c", display_name: "Karen Jansen" },
  ];

  it("matcht op volledige naam", () => {
    expect(matchAuthor("Stijn Martens", profiles).matchedProfileId).toBe("a");
  });

  it("matcht op voornaam als die uniek is", () => {
    expect(matchAuthor("Stijn", profiles).matchedProfileId).toBe("a");
  });

  it("gokt niet bij twee leden met dezelfde voornaam", () => {
    const result = matchAuthor("Karen", profiles);
    expect(result.matchedProfileId).toBeNull();
    expect(result.possibleProfileIds).toEqual(["b", "c"]);
  });

  it("laat een bijnaam ongekoppeld", () => {
    expect(matchAuthor("De Bergkoning", profiles).matchedProfileId).toBeNull();
  });
});

describe("toCandidates", () => {
  it("laat te korte berichten weg", () => {
    const candidates = toCandidates(parseWhatsappExport(ANDROID), [
      { id: "a", display_name: "Stijn Martens" },
    ]);
    expect(candidates.every((c) => c.text.length >= 20)).toBe(true);
    expect(candidates.some((c) => c.text === "kort")).toBe(false);
  });
});
