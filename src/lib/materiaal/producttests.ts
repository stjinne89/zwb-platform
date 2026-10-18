// Producten uit onafhankelijke tests voor de rekenaar van ZWBeter materiaal
// (2026-10-18). Alleen tests van bladen en labs die zelf niets verkopen; geen
// cijfers van fabrikanten en geen prijzen. Een selectie, niet de hele database
// van de bron.
//
// Elke test meet op een pop, een fiets zonder renner of een testrol, niet op de
// weg. We nemen daarom alleen het verschil met een gewoon product uit dezelfde
// test (de basis) en tellen dat op bij het getoetste rekenmodel. Zo blijft het
// niveau van de weg kloppen en tellen alleen de verschillen tussen producten.

/** Watt bij een testsnelheid omrekenen naar luchtweerstand: P = ½·ρ·CdA·v³. */
function cdaUitWatt(watt: number, kmh: number, rho = 1.2): number {
  const v = kmh / 3.6;
  return watt / (0.5 * rho * v ** 3);
}

export type ProductTest = {
  bron: string;
  datum: string;
  methode: string;
  marge: string;
  url: string;
};

// Het uiterlijk van een product in de renner van de rekenaar (2026-10-18). Alleen
// vorm, geen logo's of merkkleuren: de fiets blijft in de neutrale kleur van de
// tekening. Afgeleid van de foto's in de tests en van de gepubliceerde
// specificaties (velghoogte, aantal spaken); de velgen van de geteste fietsen
// zijn bij benadering, van de testfoto.

/** Silhouet van een helm van opzij. */
export type HelmProfiel = "gaten" | "rond" | "kort" | "staart";
export type HelmUiterlijk = { profiel: HelmProfiel; gaten: number };

export type WielUiterlijk = {
  /** Velghoogte in mm, voor en achter. */
  velg: [number, number];
  /** Golvende velg: de hoogte loopt tussen `velg[0]` en `velg[1]` rond het wiel. */
  golvend?: boolean;
  spaken: [number, number];
  spaak: "staal" | "carbon" | "gekruld";
};

export type FietsUiterlijk = {
  /** Hoogte van de zitknoop: 0 is een vlakke bovenbuis, 1 een sterk aflopende. */
  aflopend: number;
  /** Achterbrug laag op de zitbuis in plaats van bij de zitknoop. */
  staysLaag: boolean;
  buis: "rond" | "aero" | "diep";
  stuur: "los" | "integraal" | "v" | "doorlopend";
  /** Zitbuis die om het achterwiel buigt. */
  zitbuisBocht?: boolean;
  /** Een gat waar bovenbuis en zitbuis samenkomen. */
  gat?: boolean;
  golvendeVork?: boolean;
  hoogBalhoofd?: boolean;
  wielen: WielUiterlijk;
};

export type Product = {
  id: string;
  naam: string;
  /** Verschil met de basis: luchtweerstand in m² of rolweerstand als Crr. */
  verschil: number;
  /** Wat de bron zelf publiceerde, voor de tabel. */
  gemeten: string;
};

export const TEST_HELMEN: ProductTest = {
  bron: "Cyclingnews Labs",
  datum: "juli 2025",
  methode: "windtunnel, pop in de beugel, 40 km/h",
  marge: "±0,74 W",
  url: "https://www.cyclingnews.com/features/wind-tunnel-tested-the-worlds-biggest-aero-helmet-grouptest/",
};

// Watt bespaard bij 40 km/h tegen de Abus Powerdome. De bron zet 0,0009 m² gelijk
// aan 0,74 W, dus ρ ≈ 1,2. Tijdrithelmen zijn weggelaten: de rekenaar is voor
// de racefiets.
// Profiel en aantal openingen van opzij, naar de foto's van de test.
const helm = (id: string, naam: string, bespaard: number, profiel: HelmProfiel, gaten: number) => ({
  id,
  naam,
  uiterlijk: { profiel, gaten } as HelmUiterlijk,
  verschil: -cdaUitWatt(bespaard, 40),
  gemeten: `${bespaard > 0 ? "−" : "+"}${Math.abs(bespaard).toLocaleString("nl-NL", { minimumFractionDigits: 2 })} W`,
});

export const HELM_PRODUCTEN = [
  { ...helm("basis", "Gewone helm met gaten", 0, "gaten", 7), gemeten: "Abus Powerdome" },
  helm("oakley-velo-mach", "Oakley Velo Mach", 8.11, "rond", 3),
  helm("trek-ballista", "Trek Ballista", 7.53, "kort", 2),
  helm("canyon-stingr", "Canyon Stingr", 7.2, "rond", 2),
  helm("specialized-evade-3", "Specialized S-Works Evade 3", 6.99, "rond", 4),
  helm("kask-utopia-y", "Kask Utopia Y", 6.37, "staart", 3),
  helm("van-rysel-rcr-f", "Van Rysel RCR-F", 6.08, "rond", 4),
  helm("poc-procen-air", "POC Procen Air (zonder vizier)", 5.98, "staart", 0),
  helm("scott-cadence", "Scott Cadence", 5.75, "rond", 3),
  helm("specialized-propero-4", "Specialized Propero 4", 4.88, "gaten", 5),
  helm("met-manta", "Met Manta (maat L)", 4.87, "kort", 3),
  helm("abus-gamechanger-2", "Abus Gamechanger 2.0", 4.58, "staart", 3),
  helm("lazer-vento", "Lazer Vento Kineticore", 4.14, "kort", 2),
  helm("kask-protone-icon", "Kask Protone Icon", 3.54, "gaten", 6),
  helm("hjc-ibex-3", "HJC Ibex 3", 3.48, "gaten", 6),
  helm("giro-aries", "Giro Aries", 2.39, "gaten", 7),
  helm("kask-elemento", "Kask Elemento", 1.93, "rond", 5),
  helm("specialized-search", "Specialized Search", 1.57, "gaten", 6),
  helm("van-rysel-rcr", "Van Rysel RCR", 1.31, "gaten", 7),
  helm("poc-cytal", "POC Cytal", 1.17, "gaten", 6),
  helm("specialized-prevail-3", "Specialized S-Works Prevail 3", 1.1, "gaten", 8),
  helm("trek-velocis", "Trek Velocis", 0.51, "gaten", 7),
  helm("smith-trace", "Smith Trace", -0.58, "gaten", 7),
  helm("lazer-z1", "Lazer Z1 Kineticore", -0.74, "gaten", 8),
] as const;

export const TEST_FIETSEN: ProductTest = {
  bron: "Cyclingnews Labs",
  datum: "augustus 2024",
  methode: "windtunnel, met renner, 40 km/h",
  marge: "±0,0047 m²",
  url: "https://www.cyclingnews.com/features/wind-tunnel-tested-11-superbikes-go-head-to-head/",
};

// CdA met renner, gemiddeld over zeven windhoeken. Basis: een aluminium Trek
// Emonda ALR uit 2015 met ondiepe velgen, velgremmen en ronde stuurbuizen.
// De geteste fietsen hebben hun eigen hoge velgen; die zitten in het verschil.
const FIETS_BASIS_CDA = 0.3702;
const fiets = (id: string, naam: string, cda: number, uiterlijk: FietsUiterlijk) => ({
  id,
  naam,
  aero: true,
  uiterlijk,
  verschil: cda - FIETS_BASIS_CDA,
  gemeten: `${cda.toLocaleString("nl-NL", { minimumFractionDigits: 4 })} m²`,
});

export const FIETS_PRODUCTEN = [
  {
    id: "basis",
    naam: "Gewone racefiets",
    aero: false,
    verschil: 0,
    gemeten: "0,3702 m²",
    uiterlijk: {
      aflopend: 0,
      staysLaag: false,
      buis: "rond",
      stuur: "los",
      wielen: { velg: [22, 22], spaken: [20, 24], spaak: "staal" },
    } as FietsUiterlijk,
  },
  fiets("specialized-tarmac-sl8", "Specialized S-Works Tarmac SL8", 0.3404, { aflopend: 0.9, staysLaag: true, buis: "aero", stuur: "integraal", wielen: { velg: [51, 60], spaken: [21, 24], spaak: "carbon" } }),
  fiets("trek-madone-gen8", "Trek Madone SLR 7 Gen 8", 0.3406, { aflopend: 0.7, staysLaag: false, buis: "aero", stuur: "integraal", gat: true, wielen: { velg: [51, 51], spaken: [24, 24], spaak: "staal" } }),
  fiets("factor-ostro-vam", "Factor Ostro VAM", 0.3407, { aflopend: 0.8, staysLaag: true, buis: "aero", stuur: "integraal", wielen: { velg: [48, 58], spaken: [21, 24], spaak: "staal" } }),
  fiets("cervelo-s5", "Cervélo S5", 0.3418, { aflopend: 0.5, staysLaag: true, buis: "diep", stuur: "v", zitbuisBocht: true, wielen: { velg: [52, 63], spaken: [24, 24], spaak: "staal" } }),
  fiets("canyon-aeroad-cfr", "Canyon Aeroad CFR", 0.3428, { aflopend: 0.15, staysLaag: true, buis: "diep", stuur: "integraal", zitbuisBocht: true, hoogBalhoofd: true, wielen: { velg: [62, 62], spaken: [20, 24], spaak: "staal" } }),
  fiets("giant-propel", "Giant Propel Advanced SL 0", 0.3438, { aflopend: 1, staysLaag: true, buis: "aero", stuur: "integraal", zitbuisBocht: true, wielen: { velg: [50, 50], spaken: [21, 24], spaak: "staal" } }),
  fiets("van-rysel-rcr-pro", "Van Rysel RCR Pro", 0.3438, { aflopend: 0.6, staysLaag: true, buis: "aero", stuur: "integraal", zitbuisBocht: true, wielen: { velg: [50, 50], spaken: [20, 24], spaak: "staal" } }),
  fiets("scott-foil", "Scott Foil RC Pro", 0.3441, { aflopend: 0.15, staysLaag: true, buis: "diep", stuur: "integraal", zitbuisBocht: true, hoogBalhoofd: true, wielen: { velg: [60, 60], spaken: [16, 16], spaak: "carbon" } }),
  fiets("cannondale-supersix-evo-4", "Cannondale SuperSix Evo 4", 0.3442, { aflopend: 0.9, staysLaag: true, buis: "aero", stuur: "integraal", wielen: { velg: [55, 55], spaken: [21, 24], spaak: "staal" } }),
  fiets("pinarello-dogma-f", "Pinarello Dogma F", 0.3444, { aflopend: 0.7, staysLaag: true, buis: "aero", stuur: "integraal", golvendeVork: true, wielen: { velg: [50, 50], spaken: [21, 24], spaak: "staal" } }),
  fiets("look-blade-795", "Look Blade 795 RS", 0.3478, { aflopend: 0.1, staysLaag: true, buis: "diep", stuur: "doorlopend", zitbuisBocht: true, wielen: { velg: [47, 47], spaken: [20, 24], spaak: "staal" } }),
] as const;

export const TEST_WIELEN: ProductTest = {
  bron: "Cyclingnews Labs",
  datum: "juli 2026",
  methode: "windtunnel, fiets zonder renner, 40 km/h, banden 28 mm",
  marge: "±0,27 W",
  url: "https://www.cyclingnews.com/cycling-tech-components/wheels-tyres/what-are-the-fastest-uci-legal-road-wheels-wind-tunnel-testing-the-big-name-brands-and-chinese-contenders/",
};

// Watt bespaard bij 40 km/h tegen een ondiepe wielset (Arcaris 8848), met een
// band van 28 mm. De bron rekent met ρ = 1,2.
// Velghoogte en spaken uit de specificaties in dezelfde test.
const wiel = (id: string, naam: string, bespaard: number, uiterlijk: WielUiterlijk) => ({
  id,
  naam,
  diep: true,
  uiterlijk,
  verschil: -cdaUitWatt(bespaard, 40),
  gemeten: `−${bespaard.toLocaleString("nl-NL", { minimumFractionDigits: 2 })} W`,
});

export const WIEL_PRODUCTEN = [
  {
    id: "basis",
    naam: "Ondiepe velgen",
    diep: false,
    verschil: 0,
    gemeten: "Arcaris 8848",
    uiterlijk: { velg: [27, 27], spaken: [16, 18], spaak: "carbon" } as WielUiterlijk,
  },
  wiel("hunt-5am-limitless", "Hunt 5AM Limitless", 6.61, { velg: [58, 55], spaken: [15, 18], spaak: "carbon" }),
  wiel("reserve-57-64", "Reserve 57|64 Turbulent Aero", 6.46, { velg: [57, 64], spaken: [24, 24], spaak: "staal" }),
  wiel("scope-artech-6a", "Scope Artech 6.A", 6.29, { velg: [65, 65], spaken: [18, 24], spaak: "carbon" }),
  wiel("roval-rapide-sprint", "Roval Rapide Sprint CLX", 5.74, { velg: [63, 58], spaken: [18, 24], spaak: "carbon" }),
  wiel("dt-swiss-arc-1100", "DT Swiss ARC 1100 Dicut", 5.26, { velg: [62, 62], spaken: [20, 24], spaak: "staal" }),
  wiel("syncros-capital-sl-aero-60", "Syncros Capital SL Aero 60", 5.12, { velg: [60, 60], spaken: [16, 16], spaak: "carbon" }),
  wiel("roval-rapide-clx-3", "Roval Rapide CLX III", 4.8, { velg: [51, 48], spaken: [18, 24], spaak: "carbon" }),
  wiel("vision-metron-60", "Vision Metron 60 RS", 4.76, { velg: [60, 60], spaken: [21, 24], spaak: "carbon" }),
  wiel("scribe-core-ultra-6", "Scribe Core Ultra 6", 4.67, { velg: [60, 60], spaken: [24, 24], spaak: "staal" }),
  wiel("parcours-chrono-gt", "Parcours Chrono GT", 4.67, { velg: [62, 65], spaken: [21, 24], spaak: "carbon" }),
  wiel("pertual-acme", "Pertual ACME 45/62", 4.63, { velg: [45, 62], golvend: true, spaken: [16, 16], spaak: "carbon" }),
  wiel("scribe-elan-ultra-6", "Scribe Élan Ultra 6", 4.54, { velg: [65, 65], spaken: [20, 20], spaak: "gekruld" }),
  wiel("crw-ultimo-6060", "CRW Works Ultimo 6060", 4.17, { velg: [60, 60], spaken: [16, 20], spaak: "carbon" }),
  wiel("farsports-evo-c6", "Farsports EVO C6", 3.72, { velg: [58, 58], spaken: [21, 24], spaak: "staal" }),
] as const;

export const TEST_BANDEN: ProductTest = {
  bron: "BicycleRollingResistance",
  datum: "opgehaald oktober 2026",
  methode: "testrol, 29 km/h, 42,5 kg per band, hoge spanning",
  marge: "per band",
  url: "https://www.bicyclerollingresistance.com/road-bike-reviews",
};

// Watt per band op de testrol (28,8 km/h, 42,5 kg). Crr = P / (v·m·g). Basis:
// de Continental Grand Prix 5000 met binnenband, een veelgebruikte clubband.
const ROL_V = 28.8 / 3.6;
const ROL_N = 42.5 * 9.81;
const BAND_BASIS_W = 12.1;
const band = (id: string, naam: string, watt: number) => ({
  id,
  naam,
  verschil: (watt - BAND_BASIS_W) / (ROL_V * ROL_N),
  gemeten: `${watt.toLocaleString("nl-NL", { minimumFractionDigits: 1 })} W`,
});

export const BAND_PRODUCTEN = [
  { ...band("basis", "Continental GP 5000, 25 mm, binnenband", BAND_BASIS_W), id: "basis" },
  band("vittoria-corsa-pro-speed-28", "Vittoria Corsa Pro Speed TLR, 28 mm", 6.7),
  band("conti-gp5000-tt-28", "Continental GP 5000 TT TR, 28 mm", 8.3),
  band("pirelli-pzero-race-slr-28", "Pirelli P Zero Race TLR SL-R, 28 mm", 8.4),
  band("conti-gp5000-str-28", "Continental GP 5000 S TR, 28 mm", 9.7),
  band("conti-gp5000-str-30", "Continental GP 5000 S TR, 30 mm", 10.0),
  band("michelin-power-cup-28", "Michelin Power Cup TLR, 28 mm", 10.3),
  band("pirelli-pzero-race-rs-28", "Pirelli P Zero Race TLR RS, 28 mm", 10.5),
  band("vittoria-corsa-pro-28", "Vittoria Corsa Pro TLR, 28 mm", 11.1),
  band("conti-gp5000-as-28", "Continental GP 5000 All Season TR, 28 mm", 12.2),
  band("michelin-pro5-28", "Michelin Pro 5 TLR, 28 mm", 12.5),
  band("specialized-turbo-tlr-28", "Specialized S-Works Turbo TLR, 28 mm", 13.5),
  band("conti-gp-tr-28", "Continental Grand Prix TR, 28 mm", 13.7),
  band("vittoria-corsa-next-28", "Vittoria Corsa N.EXT TLR, 28 mm", 14.1),
  band("conti-gp-4season-25", "Continental Grand Prix 4 Season, 25 mm", 17.6),
  band("vittoria-ridearmor-28", "Vittoria RideArmor TLR, 28 mm", 19.3),
  band("pirelli-cinturato-velo-28", "Pirelli Cinturato Velo TLR, 28 mm", 21.0),
  band("conti-gatorskin-25", "Continental Gatorskin, 25 mm", 22.0),
  band("schwalbe-durano-plus-25", "Schwalbe Durano Plus, 25 mm", 22.9),
] as const;

export const TEST_SOKKEN: ProductTest = {
  bron: "Cyclingnews Labs",
  datum: "oktober 2026",
  methode: "windtunnel, pop met stilstaande benen, 30 km/h",
  marge: "±0,2 W",
  url: "https://www.cyclingnews.com/cycling-kit-accessories/clothing-shoes/most-aero-socks-are-a-waste-of-money-heres-the-wind-tunnel-verified-proof/",
};

// Watt bij 30 km/h. Basis: de Veto 1.0, een gewone fietssok zonder aerostof.
const SOK_BASIS_W = 103.25;
const sok = (id: string, naam: string, watt: number) => ({
  id,
  naam,
  verschil: cdaUitWatt(watt - SOK_BASIS_W, 30),
  gemeten: `${watt.toLocaleString("nl-NL", { minimumFractionDigits: 2 })} W`,
});

export const SOK_PRODUCTEN = [
  { ...sok("basis", "Gewone fietssokken", SOK_BASIS_W), gemeten: "Veto 1.0" },
  sok("acg-v5", "Aero Cycling Gear V5 Hexaflow", 102.07),
  sok("nopinz-sonic", "Nopinz Sonic", 102.36),
  sok("rule28-one", "Rule 28 One Aero Sock", 102.48),
  sok("nopinz-hypersonic-2", "Nopinz Hypersonic Mk2", 102.58),
  sok("santini-madss", "Santini Madss", 102.69),
  sok("castelli-fast-feet-4", "Castelli Fast Feet 4", 102.93),
  sok("rock-bros-grid", "Rock Bros Grid", 103.07),
  sok("kalas-aero", "Kalas Aero Sock", 103.22),
  sok("assos-rsr-speed", "Assos RSR Speed", 103.24),
  sok("rapha-pro-team-tt", "Rapha Pro Team TT Aero", 103.35),
  sok("le-col-pro-aero", "Le Col Pro Aero Sock", 103.65),
  sok("silca-aero-tall", "Silca Aero Socks (hoog)", 103.92),
  sok("wandelsokken", "Wandelsokken", 104.71),
  sok("katoen", "Gewone katoenen sokken", 105.09),
] as const;

export type HelmId = (typeof HELM_PRODUCTEN)[number]["id"];
export type FietsId = (typeof FIETS_PRODUCTEN)[number]["id"];
export type WielId = (typeof WIEL_PRODUCTEN)[number]["id"];
export type BandId = (typeof BAND_PRODUCTEN)[number]["id"];
export type SokId = (typeof SOK_PRODUCTEN)[number]["id"];
