import { describe, expect, it } from "vitest";

import { buildClubTexts, fillClubText, neutralModuleNames } from "@/lib/club-texts";
import { EVENT_TYPES, eventLabel } from "@/lib/event-types";
import { NOTICE_INTEGRATIONS, noticeTemplate } from "@/lib/integrations/notices";
import { defaultPacingPrompt } from "@/lib/pacing/prompt";
import { COMMUNITY_PERMISSIONS } from "@/lib/permissions";
import { summaryHeader, unicodeBold, ZWB_SUMMARY_HEADER } from "@/lib/training/strava-summary-header";
import { conciseWorkoutTitle, intervalsWorkoutName } from "@/lib/training/workouts";
import type { ModuleKey } from "@/lib/modules";

// Teksten die als data in de code staan dragen tokens. Een andere club mag na
// het invullen geen ZWB meer zien en geen token laten staan.
const other = buildClubTexts(
  { name: "Testclub Utrecht", shortName: "TCU", memberNoun: "TCU'er", memberNounPlural: "TCU'ers" },
  (key: ModuleKey) => neutralModuleNames()[key],
);

// ZWB met de waarden uit 0313 en 0318.
const ZWB_LABELS: Partial<Record<ModuleKey, string>> = { omnium: "ZWB Omnium", managerspel: "ZWBgame", training: "ZWBeter Worden" };
const zwb = buildClubTexts(
  {
    name: "ZWB Cycling",
    shortName: "ZWB",
    memberNoun: "ZWB'er",
    memberNounPlural: "ZWB'ers",
    appName: "ZWBasis",
    adviceName: "ZWBeterWorden",
    currencyNoun: "ZWBal",
    currencyNounPlural: "ZWBallen",
    cupNoun: "ZWBeker",
    betterWord: "ZWBeter",
  },
  (key: ModuleKey) => ZWB_LABELS[key] ?? neutralModuleNames()[key],
);

const texts = [
  ...NOTICE_INTEGRATIONS.flatMap((i) => [noticeTemplate(i), noticeTemplate(i, { stravaCapFull: true })]).flatMap(
    (t) => [t.title, t.body, t.linkLabel],
  ),
  defaultPacingPrompt(),
  ...EVENT_TYPES.map((t) => t.label),
  ...COMMUNITY_PERMISSIONS.flatMap((p) => [p.label, p.description, p.category]),
];

const TOKEN = /\{([A-Za-z]+|m:[a-z_]+)\}/;

describe("clubtokens in vaste teksten", () => {
  it("laten na invullen geen ZWB en geen token achter", () => {
    for (const text of texts) {
      const filled = fillClubText(text, other);
      expect(filled).not.toMatch(/ZWB/);
      expect(filled).not.toMatch(TOKEN);
    }
  });

  it("noemen de korte naam van de club in de meldingen", () => {
    const body = fillClubText(noticeTemplate("strava").body, other);
    expect(body).toContain("TCU");
  });

  it("geven ZWB de oude labels", () => {
    expect(fillClubText(eventLabel("omnium"), zwb)).toBe("ZWB Omnium");
    const game = COMMUNITY_PERMISSIONS.find((p) => p.id === "zwbgame.manage")!;
    expect(fillClubText(game.label, zwb)).toBe("ZWBgame beheren");
    expect(fillClubText(game.description, zwb)).toBe("Kan renners uit het ZWBgame-peloton halen.");
  });
});

describe("eigen woorden (0318)", () => {
  it("vult de woorden van ZWB in", () => {
    expect(fillClubText("{app} · {adviesnaam} · je {advies} · 1 {bal} · 10 {ballen} · een {beker}", zwb)).toBe(
      "ZWBasis · ZWBeterWorden · je ZWBeterWorden-advies · 1 ZWBal · 10 ZWBallen · een ZWBeker",
    );
  });

  it("valt terug op neutrale woorden", () => {
    expect(fillClubText("{app} · {adviesnaam} · je {advies} · 1 {bal} · 10 {ballen} · een {beker}", other)).toBe(
      "TCU-app · Dagadvies · je dagadvies · 1 bal · 10 ballen · een beker",
    );
  });

  it("zet met een hoofdletter in het token een hoofdletter vooraan", () => {
    expect(fillClubText("{Beker} voordragen", other)).toBe("Beker voordragen");
    expect(fillClubText("{Beker} voordragen", zwb)).toBe("ZWBeker voordragen");
    expect(fillClubText("{Advies}", other)).toBe("Dagadvies");
  });

  it("vult het beter-woord in", () => {
    expect(fillClubText("{beter} racen", zwb)).toBe("ZWBeter racen");
    expect(fillClubText("{beter} racen", other)).toBe("Beter racen");
  });

  it("zet het beter-woord in de kop van het Strava-blok", () => {
    expect(summaryHeader(zwb.words.beter)).toBe(ZWB_SUMMARY_HEADER);
    expect(summaryHeader(other.words.beter)).toBe(unicodeBold("Beter workout-samenvatting"));
  });

  it("laat een onbekend woord staan", () => {
    expect(fillClubText("{iets} en {Iets}", other)).toBe("{iets} en {Iets}");
  });
});

describe("workout-titel met de trainingsmodule", () => {
  it("zet de naam van de club ervoor en haalt hem er weer af", () => {
    expect(intervalsWorkoutName("Sweet spot 2x20", "TCU Training")).toBe("TCU Training - Sweet spot 2x20");
    expect(intervalsWorkoutName("TCU Training - Sweet spot 2x20", "TCU Training")).toBe("TCU Training - Sweet spot 2x20");
    expect(conciseWorkoutTitle("TCU Training - VO2max 5x4", "TCU Training")).toBe("VO2max 5x4");
  });

  it("haalt ook de oude ZWB-naam eraf", () => {
    expect(intervalsWorkoutName("ZWBeter Worden - Tempo 3x15", "TCU Training")).toBe("TCU Training - Tempo 3x15");
  });

  it("blijft voor ZWB gelijk", () => {
    expect(intervalsWorkoutName("Sweet spot 2x20", "ZWBeter Worden")).toBe("ZWBeter Worden - Sweet spot 2x20");
    expect(intervalsWorkoutName("Sweet spot 2x20")).toBe("ZWBeter Worden - Sweet spot 2x20");
  });

  it("neemt een naam met regex-tekens letterlijk", () => {
    expect(intervalsWorkoutName("C++ (beter) - Duur", "C++ (beter)")).toBe("C++ (beter) - Duur");
  });
});
