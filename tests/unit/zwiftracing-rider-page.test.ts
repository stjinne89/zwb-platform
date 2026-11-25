import { describe, expect, it } from "vitest";
import { highestPower, isRiderNotFound, parseRiderPage, parseRiderPowerCurve, readObject } from "@/lib/zwiftracing/rider-page";

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

describe("parseRiderPowerCurve", () => {
  // Opbouw van `/riders/<id>/power` op 2026-11-23 (ingekort; verzonnen renner).
  const slot = (id: string, live: number, d90: string) =>
    `$R[5]={id:"${id}",label:"x",durationSec:1,live:$R[6]={w:400,wkg:${live},achievedAt:1,eventId:"1",title:"Race"},d90:${d90}}`;
  const d90 = (wkg: number, title = "Race") => `$R[7]={w:300,wkg:${wkg},achievedAt:2,eventId:"2",title:"${title}"}`;
  const powerPage = (slots: string[]) =>
    `<script>$R[0]={riderId:${ID},source:"x",curve:$R[4]=[${slots.join(",")}],efforts:$R[9]=[$R[10]={slots:$R[11]={w1200:$R[12]={w:999,wkg:9.99}}}]};</script>`;

  it("leest per duur de d90 en niet de live-waarde", () => {
    const html = powerPage([slot("w5", 13, d90(12.78)), slot("w15", 10.3, d90(10.08)), slot("w60", 7.3, d90(7.28)), slot("w120", 6.1, d90(6)), slot("w300", 5.7, d90(5.63)), slot("w1200", 5.3, d90(5.23))]);
    expect(parseRiderPowerCurve(html, ID)).toEqual({ s15: 10.08, m1: 7.28, m2: 6, m5: 5.63, m20: 5.23 });
  });

  it("laat een eventnaam met haakjes of veldnamen de curve niet breken", () => {
    const html = powerPage([slot("w300", 5, d90(4.5, 'Cup ]} d90:{wkg:9} \\"finale\\"')), slot("w1200", 4, d90(3.9))]);
    expect(parseRiderPowerCurve(html, ID)).toEqual({ s15: null, m1: null, m2: null, m5: 4.5, m20: 3.9 });
  });

  it("neemt bij een duur zonder d90 niet de waarde van de volgende duur", () => {
    const html = powerPage([slot("w300", 5, "null"), slot("w1200", 4, d90(3.9))]);
    expect(parseRiderPowerCurve(html, ID)).toEqual({ s15: null, m1: null, m2: null, m5: null, m20: 3.9 });
  });

  it("geeft null op een andere renner of zonder curve", () => {
    expect(parseRiderPowerCurve(powerPage([slot("w300", 5, d90(4.5))]), 7654321)).toBeNull();
    expect(parseRiderPowerCurve(`{riderId:${ID},power:{wkg300:5}}`, ID)).toBeNull();
    expect(parseRiderPowerCurve(powerPage([slot("w300", 5, "null")]), ID)).toBeNull();
  });
});

describe("highestPower", () => {
  const summary = { s15: 10.08, m1: 7.12, m2: 6, m5: 5.4, m20: 4.43 };

  it("neemt per duur de hoogste", () => {
    expect(highestPower(summary, { s15: 10, m1: 7.28, m2: 6, m5: 5.63, m20: 5.23 })).toEqual({ s15: 10.08, m1: 7.28, m2: 6, m5: 5.63, m20: 5.23 });
  });

  it("vult een lege duur en werkt met één reeks", () => {
    expect(highestPower({ ...summary, m20: null }, { ...summary, m20: 4 })?.m20).toBe(4);
    expect(highestPower(summary, null)).toEqual(summary);
    expect(highestPower(null, summary)).toEqual(summary);
    expect(highestPower(null, null)).toBeNull();
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

// Opbouw van "Rider not found" zoals de site hem op 2026-11-25 gaf: status 200,
// de loader van de rennerroute geeft null; de delen van de route-ID staan
// tussen NUL-tekens (ingekort).
const notFound = (id: number) =>
  `<!DOCTYPE html><html><head><title>Rider not found · ZwiftRacing.app</title></head><body><script>` +
  `$_TSR.router=($R=>$R[0]={manifest:$R[1]={routes:$R[2]={"/riders/$riderId":$R[11]={preloads:$R[12]=["/assets/riders._riderId.js"]}}},` +
  `matches:$R[15]=[$R[16]={i:"__root__ ",u:1795610704097,s:"success",ssr:!0},` +
  `$R[20]={i:"\0riders\0$riderId\0riders\0${id}",u:1795610704109,s:"success",l:null,ssr:!0},` +
  `$R[21]={i:"\0riders\0$riderId\0\0riders\0${id}\0",u:1795610704113,s:"success",l:null,ssr:!0}]})($R["tsr"]);</script></body></html>`;

describe("isRiderNotFound", () => {
  it("herkent de pagina van een onbekende renner", () => {
    expect(isRiderNotFound(notFound(ID), ID)).toBe(true);
    expect(parseRiderPage(notFound(ID), ID)).toBeNull();
  });

  it("niet bij een gewone rennerpagina", () => {
    expect(isRiderNotFound(FULL, ID)).toBe(false);
  });

  it("niet als de lege loader bij een andere renner hoort", () => {
    expect(isRiderNotFound(notFound(7654321), ID)).toBe(false);
    expect(isRiderNotFound(notFound(12345678), 1234567)).toBe(false);
  });

  it("niet als de loader wel gegevens gaf maar de opbouw onbekend is", () => {
    const html = notFound(ID).replaceAll("l:null", "l:$R[30]={x:1}");
    expect(isRiderNotFound(html, ID)).toBe(false);
  });
});
