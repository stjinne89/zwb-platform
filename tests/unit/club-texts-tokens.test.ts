import { describe, expect, it } from "vitest";

import { buildClubTexts, fillClubText, neutralModuleNames } from "@/lib/club-texts";
import { NOTICE_INTEGRATIONS, noticeTemplate } from "@/lib/integrations/notices";
import { defaultPacingPrompt } from "@/lib/pacing/prompt";
import type { ModuleKey } from "@/lib/modules";

// Teksten die als data in de code staan dragen tokens. Een andere club mag na
// het invullen geen ZWB meer zien en geen token laten staan.
const other = buildClubTexts(
  { name: "Testclub Utrecht", shortName: "TCU", memberNoun: "TCU'er", memberNounPlural: "TCU'ers" },
  (key: ModuleKey) => neutralModuleNames()[key],
);

const texts = [
  ...NOTICE_INTEGRATIONS.flatMap((i) => [noticeTemplate(i), noticeTemplate(i, { stravaCapFull: true })]).flatMap(
    (t) => [t.title, t.body, t.linkLabel],
  ),
  defaultPacingPrompt(),
];

describe("clubtokens in vaste teksten", () => {
  it("laten na invullen geen ZWB en geen token achter", () => {
    for (const text of texts) {
      const filled = fillClubText(text, other);
      expect(filled).not.toMatch(/ZWB/);
      expect(filled).not.toMatch(/\{(club|kort|lid|leden|m:[a-z_]+)\}/);
    }
  });

  it("noemen de korte naam van de club in de meldingen", () => {
    const body = fillClubText(noticeTemplate("strava").body, other);
    expect(body).toContain("TCU");
  });
});
