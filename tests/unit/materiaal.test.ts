import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ARTICLE_EVIDENCE, evidenceText } from "@/lib/knowledge/evidence";
import { EVIDENCE_KINDS } from "@/lib/nutrition/library";
import { MATERIAAL_ARTICLES, MATERIAAL_CATEGORIES } from "@/lib/materiaal/library";
import {
  BAND_PRODUCTEN,
  FIETS_PRODUCTEN,
  GROEP_CDA_FACTOR,
  HELM_PRODUCTEN,
  SOK_PRODUCTEN,
  WIEL_PRODUCTEN,
  RUW_CRR,
  SPANNINGEN,
  STANDAARD_OPZET,
  VASTE_ROUTES,
  opzetCda,
  ritSeconden,
  rolweerstand,
  vergelijkOpzet,
  winstPerOnderdeel,
  winstPerProduct,
} from "@/lib/materiaal/rekenaar";
import { AIR_DENSITY, DRIVETRAIN_EFF } from "@/lib/ride-estimate";

// De kennisbank materiaal (2026-10-18). Het niveau per artikel is goedgekeurd in
// docs/beoordelingsbeleid-bewijsniveau.md ("Per artikel"); wijzigt een niveau,
// dan eerst daar.

const doc = readFileSync("docs/beoordelingsbeleid-bewijsniveau.md", "utf8");
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

  it("rekent de helmtest terug naar de gepubliceerde watt", () => {
    // Cyclingnews: 0,0009 m² is 0,74 W bij 40 km/h; de Oakley Velo Mach scheelde 8,11 W.
    const oakley = HELM_PRODUCTEN.find((h) => h.id === "oakley-velo-mach")!;
    const v = 40 / 3.6;
    expect(-oakley.verschil * 0.5 * 1.2 * v ** 3).toBeCloseTo(8.11, 2);
    expect((0.0009 / -oakley.verschil) * 8.11).toBeCloseTo(0.74, 1);
  });

  it("komt met een geteste racefiets uit op het verschil met renner uit de fietstest", () => {
    // Tarmac SL8 280,2 W tegen 304,67 W voor de basisfiets, bij 40 km/h.
    const tarmac = FIETS_PRODUCTEN.find((f) => f.id === "specialized-tarmac-sl8")!;
    const watt = (304.67 / 0.3702) * -tarmac.verschil;
    expect(watt).toBeCloseTo(304.67 - 280.2, 0);
  });

  it("telt wielen niet dubbel bij een geteste racefiets", () => {
    const wielen = WIEL_PRODUCTEN.find((w) => w.id === "hunt-5am-limitless")!.id;
    const fiets = "specialized-tarmac-sl8" as const;
    const zonder = opzetCda({ ...STANDAARD_OPZET, fiets }, false);
    const met = opzetCda({ ...STANDAARD_OPZET, fiets, wielen }, false);
    expect(met).toBe(zonder);
    expect(opzetCda({ ...STANDAARD_OPZET, wielen }, false)).toBeLessThan(opzetCda(STANDAARD_OPZET, false));
  });

  it("rekent de bandentest om naar een verschil in rolweerstand", () => {
    // Crr = P / (v·m·g) bij 28,8 km/h en 42,5 kg.
    const gp = BAND_PRODUCTEN.find((b) => b.id === "conti-gp5000-str-28")!;
    expect(gp.verschil).toBeCloseTo((9.7 - 12.1) / ((28.8 / 3.6) * 42.5 * 9.81), 6);
    expect(rolweerstand("hard", "glad", gp.id)).toBeCloseTo(0.005 + gp.verschil, 6);
    expect(rolweerstand("hard", "glad")).toBe(0.005);
  });

  it("maakt katoenen sokken trager en aerosokken sneller dan gewone fietssokken", () => {
    expect(SOK_PRODUCTEN.find((s) => s.id === "katoen")!.verschil).toBeGreaterThan(0);
    expect(SOK_PRODUCTEN.find((s) => s.id === "acg-v5")!.verschil).toBeLessThan(0);
  });

  it("geeft per product de winst tegen de basis", () => {
    const ids = HELM_PRODUCTEN.map((h) => h.id);
    const winst = winstPerProduct({ route: route("vlak"), rijder, opzet: STANDAARD_OPZET, veld: "helm", ids });
    expect(winst.get("basis")!.winstSeconden).toBeCloseTo(0, 6);
    expect(winst.get("oakley-velo-mach")!.winstSeconden).toBeGreaterThan(winst.get("giro-aries")!.winstSeconden);
    expect(winst.get("lazer-z1")!.winstSeconden).toBeLessThan(0);
  });

  it("maakt een aerohelm en een geteste racefiets sneller", () => {
    const helm = vergelijkOpzet({ route: route("vlak"), rijder, nu: STANDAARD_OPZET, straks: { ...STANDAARD_OPZET, helm: "oakley-velo-mach" } });
    const fiets = vergelijkOpzet({ route: route("vlak"), rijder, nu: STANDAARD_OPZET, straks: { ...STANDAARD_OPZET, fiets: "factor-ostro-vam" } });
    expect(helm.winstSeconden).toBeGreaterThan(0);
    expect(fiets.winstSeconden).toBeGreaterThan(helm.winstSeconden);
  });

  it("geeft per onderdeel alleen winst voor wat verandert", () => {
    const straks = { ...STANDAARD_OPZET, houding: "beugel" as const, spanning: "zacht" as const };
    const los = winstPerOnderdeel({ route: route("vlak"), rijder, nu: STANDAARD_OPZET, straks });
    expect(los.helm).toBe(0);
    expect(los.fiets).toBe(0);
    expect(los.houding).toBeGreaterThan(0);
    expect(los.banden).toBeLessThan(0);
    const totaal = vergelijkOpzet({ route: route("vlak"), rijder, nu: STANDAARD_OPZET, straks }).winstSeconden;
    expect(Math.abs(los.houding + los.banden - totaal)).toBeLessThan(5);
  });

  it("heeft vaste routes van de goede lengte", () => {
    const km = (id: string) => route(id).reduce((sum, s) => sum + s.distanceM, 0) / 1000;
    expect(km("vlak")).toBe(40);
    expect(km("heuvels")).toBe(40);
    expect(km("klim")).toBe(8);
  });
});
