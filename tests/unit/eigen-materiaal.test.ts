import { describe, expect, it } from "vitest";
import {
  invoerVoorOpslag,
  leesInvoer,
  leesNaam,
  schat,
  schatBanden,
  schatFiets,
  schatHelm,
  schatWielen,
} from "@/lib/materiaal/eigen-materiaal";
import { BAND_PRODUCTEN, FIETS_PRODUCTEN, HELM_PRODUCTEN, WIEL_PRODUCTEN, cdaUitWatt } from "@/lib/materiaal/producttests";
import { STANDAARD_OPZET, VASTE_ROUTES, materiaalCda, rolweerstand, vergelijkOpzet } from "@/lib/materiaal/rekenaar";

// Eigen materiaal in de rekenaar (2026-11-27): schattingen uit de geteste
// producten, met een bereik. Zie src/lib/materiaal/eigen-materiaal.ts.

const watt = (cda: number) => cda / cdaUitWatt(1, 40);

describe("schatting van eigen wielen", () => {
  it("rekent ondiepe velgen als de basis", () => {
    expect(schatWielen(25, 25)).toEqual({ verschil: 0, bereik: [0, 0] });
    expect(schatWielen(27, 27).verschil).toBe(0);
  });

  it("neemt bij 60 mm het midden en de spreiding van de geteste wielen rond die hoogte", () => {
    const s = schatWielen(60, 60);
    // Buren binnen 6 mm: van de Farsports (3,72 W) tot de Hunt (6,61 W).
    expect(watt(-s.bereik[1])).toBeCloseTo(3.72, 2);
    expect(watt(-s.bereik[0])).toBeCloseTo(6.61, 2);
    expect(s.bereik[0]).toBeLessThanOrEqual(s.verschil);
    expect(s.verschil).toBeLessThanOrEqual(s.bereik[1]);
  });

  it("loopt onder 48 mm in een rechte lijn naar 0", () => {
    const rand = schatWielen(48, 48).verschil;
    expect(schatWielen(37.5, 37.5).verschil).toBeCloseTo(rand / 2, 6);
    expect(schatWielen(48, 48).verschil).toBeLessThan(0);
  });

  it("rekent dieper dan 65 mm als 65 mm", () => {
    expect(schatWielen(90, 90)).toEqual(schatWielen(65, 65));
  });
});

describe("schatting van een eigen helm", () => {
  it("neemt bij lijkt op de geteste helm over, met de marge van de test", () => {
    const velo = HELM_PRODUCTEN.find((h) => h.id === "oakley-velo-mach")!;
    const s = schatHelm({ lijktOp: "oakley-velo-mach", type: "gaten" });
    expect(s.verschil).toBe(velo.verschil);
    expect(watt(s.bereik[1] - s.verschil)).toBeCloseTo(0.74, 6);
    expect(s.uiterlijk).toEqual(velo.uiterlijk);
  });

  it("neemt bij een type de spreiding van de geteste helmen met dat silhouet", () => {
    const staart = HELM_PRODUCTEN.filter((h) => h.uiterlijk.profiel === "staart").map((h) => h.verschil as number);
    const s = schatHelm({ lijktOp: null, type: "staart" });
    expect(s.bereik).toEqual([Math.min(...staart), Math.max(...staart)]);
    expect(s.uiterlijk.profiel).toBe("staart");
  });
});

describe("schatting van een eigen fiets", () => {
  it("rekent alleen het frame: de winst van de hoge velgen gaat eraf", () => {
    const sl8 = FIETS_PRODUCTEN.find((f) => f.id === "specialized-tarmac-sl8")!;
    const s = schatFiets({ lijktOp: "specialized-tarmac-sl8", type: "aero" });
    expect(s.verschil).toBeCloseTo(sl8.verschil - schatWielen(51, 60).verschil, 10);
    // Het frame alleen wint minder dan de hele fiets met zijn velgen.
    expect(s.verschil).toBeGreaterThan(sl8.verschil);
    expect(s.verschil).toBeLessThan(0);
  });

  it("geeft een gewone fiets de basis, met de marge van de fietstest", () => {
    const s = schatFiets({ lijktOp: null, type: "gewoon" });
    expect(s.verschil).toBe(0);
    expect(s.bereik).toEqual([-0.0047, 0.0047]);
    expect(s.uiterlijk.rem).toBeUndefined();
  });

  it("telt de velgen niet dubbel: een eigen aerofiets krijgt zijn wielen apart", () => {
    const rij = schat({ id: "f1", naam: "Mijn fiets", invoer: { onderdeel: "fiets", kg: 7.8, lijktOp: null, type: "aero" } });
    const wiel = schat({ id: "w1", naam: "Mijn wielen", invoer: { onderdeel: "wielen", velgVoor: 50, velgAchter: 50 } });
    const eigen = [rij, wiel];
    const opzet = { ...STANDAARD_OPZET, fiets: rij.id, wielen: wiel.id };
    expect(materiaalCda(opzet, eigen)).toBeCloseTo(rij.verschil + wiel.verschil, 10);
  });
});

describe("schatting van eigen banden", () => {
  it("rekent een ingevulde BRR-waarde exact, zoals een geteste band", () => {
    const pro = BAND_PRODUCTEN.find((b) => b.id === "vittoria-corsa-pro-speed-28")!;
    const s = schatBanden({ tubeless: true, soort: "allround", watt: 6.7 });
    expect(s.verschil).toBeCloseTo(pro.verschil, 10);
    expect(s.bereik).toEqual([s.verschil, s.verschil]);
  });

  it("is met binnenband langzamer dan tubeless, en anti-lek langzamer dan race", () => {
    const race = schatBanden({ tubeless: true, soort: "race", watt: null });
    expect(schatBanden({ tubeless: false, soort: "race", watt: null }).verschil).toBeGreaterThan(race.verschil);
    expect(schatBanden({ tubeless: true, soort: "antilek", watt: null }).verschil).toBeGreaterThan(race.verschil);
  });

  it("telt in de rolweerstand van de rekenaar", () => {
    const band = schat({ id: "b1", naam: "Mijn band", invoer: { onderdeel: "banden", breedte: 28, tubeless: true, soort: "race", watt: null } });
    expect(rolweerstand("hard", "glad", band.id, [band]) - rolweerstand("hard", "glad")).toBeCloseTo(band.verschil, 10);
  });
});

describe("eigen materiaal in de vergelijking", () => {
  it("maakt een eigen wielset met diepe velgen sneller dan ondiepe", () => {
    const wiel = schat({ id: "w1", naam: "Diep", invoer: { onderdeel: "wielen", velgVoor: 60, velgAchter: 60 } });
    const uit = vergelijkOpzet({
      route: VASTE_ROUTES[0].segments,
      rijder: { watts: 220, gewichtKg: 75, groep: false, wegdek: "glad" },
      nu: STANDAARD_OPZET,
      straks: { ...STANDAARD_OPZET, wielen: wiel.id },
      eigen: [wiel],
    });
    expect(uit.winstSeconden).toBeGreaterThan(0);
  });

  it("negeert een eigen id dat niet in de lijst staat", () => {
    expect(materiaalCda({ ...STANDAARD_OPZET, helm: "eigen:weg" })).toBe(0);
  });

  it("valt de geteste wielen niet buiten de schatting voor hun eigen hoogte", () => {
    for (const w of WIEL_PRODUCTEN.filter((p) => p.id !== "basis")) {
      const s = schatWielen(w.uiterlijk.velg[0], w.uiterlijk.velg[1]);
      expect(w.verschil).toBeGreaterThanOrEqual(s.bereik[0] - 1e-12);
      expect(w.verschil).toBeLessThanOrEqual(s.bereik[1] + 1e-12);
    }
  });
});

describe("invoer van eigen materiaal controleren", () => {
  it("neemt geldige invoer over en rondt af op een decimaal", () => {
    expect(leesInvoer("wielen", { velgVoor: "50,04", velgAchter: 60 })).toEqual({ onderdeel: "wielen", velgVoor: 50, velgAchter: 60 });
    expect(leesInvoer("banden", { breedte: 28, tubeless: false, soort: "race", watt: "" })).toEqual({
      onderdeel: "banden",
      breedte: 28,
      tubeless: false,
      soort: "race",
      watt: null,
    });
  });

  it("weigert onzin", () => {
    expect(leesInvoer("zadel", { type: "x" })).toBeNull();
    expect(leesInvoer("wielen", { velgVoor: 500, velgAchter: 60 })).toBeNull();
    expect(leesInvoer("fiets", { kg: 7, lijktOp: null, type: "ligfiets" })).toBeNull();
    expect(leesInvoer("banden", { breedte: 28, tubeless: "ja", soort: "race" })).toBeNull();
    expect(leesInvoer("banden", { breedte: 28, tubeless: true, soort: "race", watt: "veel" })).toBeNull();
    expect(leesInvoer("helm", ["gaten"])).toBeNull();
  });

  it("neemt bij lijkt op het silhouet van de geteste helm, en negeert een onbekende", () => {
    expect(leesInvoer("helm", { lijktOp: "kask-utopia-y", type: "gaten" })).toEqual({ onderdeel: "helm", lijktOp: "kask-utopia-y", type: "staart" });
    expect(leesInvoer("helm", { lijktOp: "basis", type: "rond" })).toEqual({ onderdeel: "helm", lijktOp: null, type: "rond" });
    expect(leesInvoer("fiets", { kg: 8, lijktOp: "basis", type: "gewoon" })).toEqual({ onderdeel: "fiets", kg: 8, lijktOp: null, type: "gewoon" });
  });

  it("bewaart de invoer zonder het onderdeel en leest hem zo terug", () => {
    const invoer = leesInvoer("fiets", { kg: 7.4, lijktOp: "cervelo-s5", type: "gewoon" })!;
    const opgeslagen = invoerVoorOpslag(invoer);
    expect(opgeslagen).not.toHaveProperty("onderdeel");
    expect(leesInvoer("fiets", opgeslagen)).toEqual(invoer);
  });

  it("knipt de naam niet maar weigert te lang of leeg", () => {
    expect(leesNaam("  Roval   Rapide  ")).toBe("Roval Rapide");
    expect(leesNaam("")).toBeNull();
    expect(leesNaam("x".repeat(61))).toBeNull();
  });
});
