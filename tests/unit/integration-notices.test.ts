import { describe, expect, it } from "vitest";
import {
  cleanNoticeBody,
  isNoticeIntegration,
  NOTICE_BODY_MAX,
  NOTICE_INTEGRATIONS,
  noticeTemplate,
} from "@/lib/integrations/notices";
import { readFile } from "node:fs/promises";

describe("pop-up nog niet gekoppeld", () => {
  it("heeft voor elke koppeling een tekst binnen de grens, en geen voor Zwift", () => {
    for (const integration of NOTICE_INTEGRATIONS) {
      const template = noticeTemplate(integration);
      expect(template.title).toBeTruthy();
      expect(template.href.startsWith("/")).toBe(true);
      expect(cleanNoticeBody(template.body)).toBe(template.body);
    }
    expect(isNoticeIntegration("zwift")).toBe(false);
    expect(isNoticeIntegration("strava")).toBe(true);
  });

  it("wijst bij volle Strava-plekken naar intervals.icu", () => {
    expect(noticeTemplate("strava").href).toBe("/profiel?weergave=bewerken#strava");
    const full = noticeTemplate("strava", { stravaCapFull: true });
    expect(full.href).toBe("/hulp/koppelen#ritten-via-intervals");
    expect(full.body).toMatch(/intervals\.icu/);
  });

  it("schoont de tekst op en weigert leeg of te lang", () => {
    expect(cleanNoticeBody("  hoi\r\n\r\n\r\n\r\ndaar  ")).toBe("hoi\n\ndaar");
    expect(cleanNoticeBody("   ")).toBeNull();
    expect(cleanNoticeBody("x".repeat(NOTICE_BODY_MAX + 1))).toBeNull();
  });

  it("staat in de check van de migratie met precies dezelfde koppelingen", async () => {
    const sql = await readFile("supabase/migrations/0307_integration_notices.sql", "utf8");
    const match = /check \(integration in \(([^)]*)\)\)/.exec(sql);
    expect(match).not.toBeNull();
    const ids = [...match![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(ids.sort()).toEqual([...NOTICE_INTEGRATIONS].sort());
    expect(sql).toContain(`between 1 and ${NOTICE_BODY_MAX}`);
  });
});
