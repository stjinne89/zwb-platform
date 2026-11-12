import { describe, expect, it } from "vitest";
import { parseRiderPage, readObject } from "@/lib/zwiftracing/rider-page";

// Opbouw zoals de rennerpagina van zwiftracing.app hem op 2026-11-11 gaf
// (TanStack Start, ingekort; verzonnen renner en waarden).
const ID = 1234567;
const page = (body: string) =>
  `<!DOCTYPE html><html><head><title>Rider · ZwiftRacing.app</title></head><body><script>` +
  `$R[0]={rider:$R[1]={riderId:${ID},name:"Test",weight:70.5,velo:$R[23]={race:800.34,factors:$R[24]={sprint:983.9}},` +
  body +
  `}};</script></body></html>`;

const FULL = page(
  `power:$R[35]={wkg5:15.48611111111111,wkg15:13.23611111111111,wkg30:10.52,wkg60:7.732394366197183,wkg120:6.263888888888889,wkg300:4.971509971509971,wkg1200:4.277777777777778},` +
    `phenotype:$R[30]={version:4,scores:$R[31]={sprinter:91},label:"sprinter"},` +
    `race:$R[36]={finishes:42},results:$R[40]=[$R[41]={legacy:$R[64]={rating:2282.12,ratingBefore:2278.26}}],` +
    `legacyRatings:$R[1460]={live:2282.123717887329,max30:2282.123717887329,max90:2290.5,max30Expires:1796842860,max90Expires:1802026860}`,
);

describe("parseRiderPage", () => {
  it("leest het beste W/kg over 90 dagen en de legacy vELO", () => {
    expect(parseRiderPage(FULL, ID)).toEqual({
      zwiftId: ID,
      powerWkg: { s15: 13.24, m1: 7.73, m2: 6.26, m5: 4.97, m20: 4.28 },
      legacy: { live: 2282.1, max30: 2282.1, max90: 2290.5 },
      phenotype: "sprinter",
    });
  });

  it("neemt de vELO1 uit legacyRatings, niet de rating van één race", () => {
    expect(parseRiderPage(FULL, ID)?.legacy?.max90).toBe(2290.5);
  });

  it("geeft null op de pagina van een andere renner", () => {
    expect(parseRiderPage(FULL, 7654321)).toBeNull();
    expect(parseRiderPage(FULL, 123456)).toBeNull();
  });

  it("geeft null als het veld power ontbreekt (andere opbouw)", () => {
    expect(parseRiderPage(page(`legacyRatings:$R[9]={live:1000,max30:1000,max90:1000}`), ID)).toBeNull();
  });

  it("zonder races in 90 dagen: geen vermogen en geen vELO1", () => {
    expect(parseRiderPage(page(`power:$R[35]={wkg5:0,wkg15:0,wkg60:null,wkg120:void 0},legacyRatings:$R[9]={live:null,max30:null,max90:null}`), ID)).toEqual({
      zwiftId: ID,
      powerWkg: null,
      legacy: null,
      phenotype: null,
    });
  });

  it("leest ook een object zonder $R-verwijzing en een renner-ID als tekst", () => {
    const html = `{riderId:"${ID}",power:{wkg15:12,wkg60:7,wkg120:6,wkg300:5,wkg1200:4}}`;
    expect(parseRiderPage(html, ID)?.powerWkg).toEqual({ s15: 12, m1: 7, m2: 6, m5: 5, m20: 4 });
    expect(parseRiderPage(html, ID)?.legacy).toBeNull();
  });
});

describe("readObject", () => {
  it("weigert een genest object", () => {
    expect(readObject(`{power:{wkg15:{x:1}}}`, "power")).toBeNull();
  });

  it("matcht geen veld dat alleen op de naam eindigt", () => {
    expect(readObject(`{maxpower:{wkg15:9}}`, "power")).toBeNull();
  });
});
