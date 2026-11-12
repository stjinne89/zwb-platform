import { describe, expect, it } from "vitest";
import { asNumber, asObject, readTsrLoader, readTsrRouter } from "@/lib/zwiftracing/tsr-data";

// Opbouw zoals zwiftracing.app hem op 2026-11-12 gaf (TanStack Start, ingekort).
const html = (data: string) => `<html><body><script>$_TSR.router=($R=>$R[0]=${data})($R["tsr"]);</script></body></html>`;

describe("readTsrRouter", () => {
  it("leest objecten, lijsten, $R-toewijzingen, booleans en lege waarden", () => {
    const router = readTsrRouter(html(`{a:$R[1]={b:!0,c:!1,d:null,e:void 0},f:$R[2]=[1,-2.5,1e3],"g h":'x\\'y',i:"\\u00e9\\n"}`));
    expect(router).toEqual({ a: { b: true, c: false, d: null, e: null }, f: [1, -2.5, 1000], "g h": "x'y", i: "é\n" });
  });

  it("geeft null op een pagina zonder routerdata of met een onbekende vorm", () => {
    expect(readTsrRouter("<html></html>")).toBeNull();
    expect(readTsrRouter(html(`{a:new Date(0)}`))).toBeNull();
    expect(readTsrRouter(html(`{a:$R[1]}`))).toBeNull();
    expect(readTsrRouter(html(`[1,2]`))).toBeNull();
  });
});

describe("readTsrLoader", () => {
  const page = html(
    `{matches:$R[1]=[$R[2]={i:"__root__",l:$R[3]={x:1}},$R[4]={i:"\\0events\\0events\\0 1234",l:$R[5]={eventId:1234,mode:"signups"}}]}`,
  );

  it("vindt de loader van de match op het eind van zijn id, met nultekens ertussen", () => {
    expect(readTsrLoader(page, "events 1234")).toEqual({ eventId: 1234, mode: "signups" });
  });

  it("geeft null als geen match zo eindigt", () => {
    expect(readTsrLoader(page, "events 9999")).toBeNull();
  });
});

describe("asNumber en asObject", () => {
  it("accepteert alleen eindige getallen en getallen als tekst", () => {
    expect(asNumber(3)).toBe(3);
    expect(asNumber("42")).toBe(42);
    expect(asNumber("4x")).toBeNull();
    expect(asNumber(Number.NaN)).toBeNull();
    expect(asNumber(undefined)).toBeNull();
  });

  it("geeft alleen een gewoon object terug", () => {
    expect(asObject({ a: 1 })).toEqual({ a: 1 });
    expect(asObject([1])).toBeNull();
    expect(asObject(null)).toBeNull();
  });
});
