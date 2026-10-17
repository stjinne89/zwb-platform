import { describe, expect, it } from "vitest";
import { trainingSuggestions } from "@/lib/training/training-advice";
import { trainingArticleBySlug } from "@/lib/training/training-library";
import type { ZoneTimes } from "@/lib/training/zone-times";

// 90 minuten duur, de helft in zone 3 of hoger, op een FTP van 260 W.
const crept: ZoneTimes = {
  source: "intervals",
  intervalsId: "i1",
  ftpWatts: 260,
  seconds: [600, 2100, 1800, 900, 0, 0],
};

describe("trainingSuggestions", () => {
  it("geeft een duurrit die tempo werd een plafond in watt en een kennisbankartikel", () => {
    const [tip] = trainingSuggestions({ intensity: "endurance", zoneTimes: crept, athleteRpe: 5 });
    expect(tip.finding).toBe("50% van deze duurrit lag in zone 3 of hoger.");
    expect(tip.tip).toContain("Houd rustige ritten rustig");
    expect(tip.tip).toContain("onder 195 W");
    expect(tip.article).toBe("/zwbeter-worden/kennis/rustige-ritten");
    expect(trainingArticleBySlug("rustige-ritten")).not.toBeNull();
  });

  it("sluit aan op een lid dat het zelf al merkte en zich sterk voelde", () => {
    const [tip] = trainingSuggestions({
      intensity: "endurance",
      zoneTimes: crept,
      athleteRpe: 5,
      athleteFeel: "goed",
      athleteReport: "Voel me sterk en kon me moeilijk aan de rustige duur houden binnen",
    });
    expect(tip.tip).toMatch(/^Je merkte het zelf al, en op een dag dat het goed voelt/);
    expect(tip.tip).toContain("Bewaar dat voor de volgende harde training");
    expect(tip.tip).not.toContain("Houd rustige ritten rustig");
  });

  it("leest 'niet sterk' niet als sterk", () => {
    const [tip] = trainingSuggestions({
      intensity: "endurance",
      zoneTimes: crept,
      athleteRpe: 5,
      athleteFeel: "neutraal",
      athleteReport: "Voelde me niet sterk vandaag",
    });
    expect(tip.tip).toContain("Houd rustige ritten rustig");
  });

  it("vraagt niet naar slaap als het lid die zelf noemde", () => {
    const [tip] = trainingSuggestions({
      intensity: "endurance",
      athleteRpe: 8,
      athleteReport: "Slecht geslapen en veel stress op werk",
    });
    expect(tip.tip).toMatch(/^Je noemde zelf slaap en stress/);
    const [plain] = trainingSuggestions({ intensity: "endurance", athleteRpe: 8 });
    expect(plain.tip).toMatch(/^Vraag naar slaap/);
  });
});
