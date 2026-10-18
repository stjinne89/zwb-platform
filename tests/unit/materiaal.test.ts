import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ARTICLE_EVIDENCE_LABELS } from "@/lib/knowledge/evidence";
import { EVIDENCE_KINDS } from "@/lib/nutrition/library";
import { MATERIAAL_ARTICLES, MATERIAAL_CATEGORIES } from "@/lib/materiaal/library";
import {
  FIETSEN,
  GROEP_CDA_FACTOR,
  RUW_CRR,
  SPANNINGEN,
  STANDAARD_OPZET,
  VASTE_ROUTES,
  opzetCda,
  ritSeconden,
  vergelijkOpzet,
  winstPerOnderdeel,
} from "@/lib/materiaal/rekenaar";
import { AIR_DENSITY, DRIVETRAIN_EFF } from "@/lib/ride-estimate";

// De kennisbank materiaal (2026-10-18). Het niveau per artikel is goedgekeurd in
// docs/materiaal-onderzoek-2026-10-17.md ("Artikelen en niveaus"); wijzigt een
// niveau, dan eerst daar.

const doc = readFileSync("docs/materiaal-onderzoek-2026-10-17.md", "utf8");
const route = (id: string) => VASTE_ROUTES.find((r) => r.id === id)!.segments;
const rijder = { watts: 200, gewichtKg: 75, groep: false, wegdek: "glad" as const };

describe("kennisbank materiaal", () => {
  it("heeft unieke artikelen met bron, beperking, plank en geldig niveau", () => {
    const slugs = MATERIAAL_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const article of MATERIAAL_ARTICLES) {
      expect(article.sources.length, article.slug).toBeGreaterThan(0);
      expect(article.limits.length, article.slug).toBeGreaterThan(0);
      expect(MATERIAAL_CATEGORIES).toContain(article.category);
      // Geen "afgeraden" bij materiaal (besluit eigenaar, 2026-10-18).
      expect(["sterk", "matig", "beperkt"]).toContain(article.evidence);
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
      expect(row, article.title).toContain(`| **${ARTICLE_EVIDENCE_LABELS[article.evidence].replace(" bewijs", "")}** |`);
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
    expect(4.215 / (85 * 9.81)).toBeCloseTo(SPANNINGEN[0].crr, 3);
    expect(5.575 / (85 * 9.81)).toBeCloseTo(SPANNINGEN[1].crr, 2);
    const hard = ritSeconden(route("vlak"), rijder, { ...STANDAARD_OPZET, spanning: "hard" });
    const zacht = ritSeconden(route("vlak"), rijder, { ...STANDAARD_OPZET, spanning: "zacht" });
    expect(zacht).toBeGreaterThan(hard);
  });

  it("laat de spanning op een ruw wegdek niets uitmaken", () => {
    const ruw = { ...rijder, wegdek: "ruw" as const };
    const hard = ritSeconden(route("vlak"), ruw, { ...STANDAARD_OPZET, spanning: "hard" });
    const zacht = ritSeconden(route("vlak"), ruw, { ...STANDAARD_OPZET, spanning: "zacht" });
    expect(hard).toBe(zacht);
    expect(RUW_CRR).toBe(SPANNINGEN[1].crr);
  });

  it("leidt de aerofiets af uit Jeukendrup & Martin 2001", () => {
    // Een aeroframe scheelde op 40 km solo 1:17 tot 1:44, aerowielen 60 tot 82 s.
    // Terugrekenen met hetzelfde model moet op die tijden uitkomen.
    const tt = { segments: route("vlak"), cda: 0.25 };
    const frame = FIETSEN.find((f) => f.id === "aero")!.cdaVerschil - FIETSEN.find((f) => f.id === "aerowielen")!.cdaVerschil;
    const wielen = FIETSEN.find((f) => f.id === "aerowielen")!.cdaVerschil;
    const tijd = (watts: number, cda: number) =>
      ritSeconden(tt.segments, { ...rijder, watts, gewichtKg: 71 }, { ...STANDAARD_OPZET, aeroPct: (cda / 0.32 - 1) * 100 });
    const winstFrame = tijd(417, tt.cda) - tijd(417, tt.cda + frame);
    const winstWielen = tijd(417, tt.cda) - tijd(417, tt.cda + wielen);
    expect(winstFrame).toBeGreaterThan(70);
    expect(winstFrame).toBeLessThan(110);
    expect(winstWielen).toBeGreaterThan(55);
    expect(winstWielen).toBeLessThan(85);
  });

  it("maakt een dichte helm en een aerofiets sneller", () => {
    const helm = vergelijkOpzet({ route: route("vlak"), rijder, nu: STANDAARD_OPZET, straks: { ...STANDAARD_OPZET, helm: "aero" } });
    const fiets = vergelijkOpzet({ route: route("vlak"), rijder, nu: STANDAARD_OPZET, straks: { ...STANDAARD_OPZET, fiets: "aero" } });
    expect(helm.winstSeconden).toBeGreaterThan(0);
    expect(fiets.winstSeconden).toBeGreaterThan(helm.winstSeconden);
  });

  it("geeft per onderdeel alleen winst voor wat verandert", () => {
    const straks = { ...STANDAARD_OPZET, houding: "beugel" as const, spanning: "zacht" as const };
    const los = winstPerOnderdeel({ route: route("vlak"), rijder, nu: STANDAARD_OPZET, straks });
    expect(los.helm).toBe(0);
    expect(los.fiets).toBe(0);
    expect(los.houding).toBeGreaterThan(0);
    expect(los.spanning).toBeLessThan(0);
    const totaal = vergelijkOpzet({ route: route("vlak"), rijder, nu: STANDAARD_OPZET, straks }).winstSeconden;
    expect(Math.abs(los.houding + los.spanning - totaal)).toBeLessThan(5);
  });

  it("heeft vaste routes van de goede lengte", () => {
    const km = (id: string) => route(id).reduce((sum, s) => sum + s.distanceM, 0) / 1000;
    expect(km("vlak")).toBe(40);
    expect(km("heuvels")).toBe(40);
    expect(km("klim")).toBe(8);
  });
});
