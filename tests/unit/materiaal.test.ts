import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ARTICLE_EVIDENCE, evidenceText } from "@/lib/knowledge/evidence";
import { EVIDENCE_KINDS } from "@/lib/nutrition/library";
import { MATERIAAL_ARTICLES, MATERIAAL_CATEGORIES } from "@/lib/materiaal/library";
import {
  GROEP_CDA_FACTOR,
  ROLWEERSTANDEN,
  STANDAARD_OPZET,
  VASTE_ROUTES,
  opzetCda,
  ritSeconden,
  vergelijkOpzet,
} from "@/lib/materiaal/rekenaar";
import { AIR_DENSITY, DRIVETRAIN_EFF } from "@/lib/ride-estimate";

// De kennisbank materiaal (2026-10-18). Het niveau per artikel is goedgekeurd in
// docs/beoordelingsbeleid-bewijsniveau.md ("Per artikel"); wijzigt een niveau,
// dan eerst daar.

const doc = readFileSync("docs/beoordelingsbeleid-bewijsniveau.md", "utf8");
const route = (id: string) => VASTE_ROUTES.find((r) => r.id === id)!.segments;
const rijder = { watts: 200, gewichtKg: 75, groep: false };

describe("kennisbank materiaal", () => {
  it("heeft unieke artikelen met bron, beperking, plank en geldig niveau", () => {
    const slugs = MATERIAAL_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const article of MATERIAAL_ARTICLES) {
      expect(article.sources.length, article.slug).toBeGreaterThan(0);
      expect(article.limits.length, article.slug).toBeGreaterThan(0);
      expect(MATERIAAL_CATEGORIES).toContain(article.category);
      expect(ARTICLE_EVIDENCE).toContain(article.evidence);
      for (const source of article.sources) {
        expect(EVIDENCE_KINDS).toContain(source.kind);
        expect(source.url).toMatch(/^https:\/\/doi\.org\/10\./);
      }
    }
  });

  it("heeft het niveau uit de goedgekeurde tabel", () => {
    const rows = doc.split("\n");
    for (const article of MATERIAAL_ARTICLES) {
      const row = rows.find((line) => line.includes(`| ${article.title} |`));
      expect(row, `${article.title} staat niet in de tabel`).toBeDefined();
      expect(row, article.title).toContain(`| **${evidenceText(article.evidence, article.conclusion)}** |`);
    }
  });
});

describe("rekenaar", () => {
  it("vindt geen verschil als er niets verandert", () => {
    const v = vergelijkOpzet({ route: route("vlak"), rijder, nu: STANDAARD_OPZET, straks: STANDAARD_OPZET });
    expect(v.winstSeconden).toBeCloseTo(0, 6);
    expect(Math.abs(v.wattWaarde)).toBeLessThan(0.5);
  });

  it("komt op het vlak uit op de handberekening voor 5 % minder luchtweerstand", () => {
    const straks = { ...STANDAARD_OPZET, aeroPct: -5 };
    const v = vergelijkOpzet({ route: route("vlak"), rijder, nu: STANDAARD_OPZET, straks });
    // Snelheid uit de straks-rit; het luchtdeel van het vermogen bij die snelheid.
    const speed = 40000 / v.straksSeconden;
    const cda = opzetCda(STANDAARD_OPZET, false);
    const aeroWatts = (0.5 * AIR_DENSITY * cda * speed ** 3) / DRIVETRAIN_EFF;
    expect(v.winstSeconden).toBeGreaterThan(0);
    expect(v.wattWaarde).toBeGreaterThan(0.05 * aeroWatts * 0.85);
    expect(v.wattWaarde).toBeLessThan(0.05 * aeroWatts * 1.15);
  });

  it("laat een kilo minder bergop meer opleveren dan op het vlak", () => {
    const straks = { ...STANDAARD_OPZET, uitrustingKg: STANDAARD_OPZET.uitrustingKg - 1 };
    const klim = vergelijkOpzet({ route: route("klim"), rijder, nu: STANDAARD_OPZET, straks });
    const vlak = vergelijkOpzet({ route: route("vlak"), rijder, nu: STANDAARD_OPZET, straks });
    expect(klim.winstSeconden).toBeGreaterThan(vlak.winstSeconden);
    expect(klim.wattWaarde).toBeGreaterThan(vlak.wattWaarde);
  });

  it("geeft in een groep minder winst van aero", () => {
    const straks = { ...STANDAARD_OPZET, houding: "onderarmen" as const };
    const alleen = vergelijkOpzet({ route: route("vlak"), rijder, nu: STANDAARD_OPZET, straks });
    const groep = vergelijkOpzet({ route: route("vlak"), rijder: { ...rijder, groep: true }, nu: STANDAARD_OPZET, straks });
    expect(GROEP_CDA_FACTOR).toBeLessThan(1);
    expect(groep.wattWaarde).toBeLessThan(alleen.wattWaarde);
  });

  it("rekent de rolweerstand uit Lim 2011 na", () => {
    // 4,2 N en 5,6 N bij ongeveer 85 kg renner en fiets.
    expect(4.215 / (85 * 9.81)).toBeCloseTo(ROLWEERSTANDEN[0].crr, 3);
    expect(5.575 / (85 * 9.81)).toBeCloseTo(ROLWEERSTANDEN[1].crr, 2);
    const hard = ritSeconden(route("vlak"), rijder, { ...STANDAARD_OPZET, crr: ROLWEERSTANDEN[0].crr });
    const zacht = ritSeconden(route("vlak"), rijder, { ...STANDAARD_OPZET, crr: ROLWEERSTANDEN[1].crr });
    expect(zacht).toBeGreaterThan(hard);
  });

  it("heeft vaste routes van de goede lengte", () => {
    const km = (id: string) => route(id).reduce((sum, s) => sum + s.distanceM, 0) / 1000;
    expect(km("vlak")).toBe(40);
    expect(km("heuvels")).toBe(40);
    expect(km("klim")).toBe(8);
  });
});
