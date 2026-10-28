import { describe, expect, it } from "vitest";
import { beoordeel, startBeurt, type ViewportMeting } from "@/lib/ios-viewport";

// iPhone in de beginscherm-app, 393×852 pt.
const vol: ViewportMeting = { breedte: 393, innerHeight: 852, vvHeight: 852, vvOffsetTop: 0, vvScale: 1 };

describe("zonder toetsenbordbeurt", () => {
  it("verschuift nooit, ook niet bij een klein beeld tijdens het scrollen", () => {
    expect(beoordeel(null, { ...vol, innerHeight: 468, vvHeight: 468 })).toEqual({
      beurt: null,
      hangt: false,
      verschuiving: 0,
    });
    expect(beoordeel(null, { ...vol, vvOffsetTop: 300 }).verschuiving).toBe(0);
  });
});

describe("startBeurt", () => {
  it("legt de maat van vóór het toetsenbord vast", () => {
    expect(startBeurt(null, vol)).toEqual({ breedte: 393, innerHeight: 852, vvHeight: 852, vvOffsetTop: 0 });
  });

  it("houdt de maat van een lopende beurt, ook als het beeld nu klein is", () => {
    const beurt = startBeurt(null, vol);
    expect(startBeurt(beurt, { ...vol, innerHeight: 468, vvHeight: 468 })).toBe(beurt);
  });

  it("negeert visualViewport als er bij de start was ingezoomd", () => {
    expect(startBeurt(null, { ...vol, vvHeight: 400, vvScale: 2 })).toEqual({ breedte: 393, innerHeight: 852 });
  });
});

describe("beoordeel", () => {
  const beurt = startBeurt(null, vol);

  it("beeld weer heel: beurt voorbij", () => {
    expect(beoordeel(beurt, vol)).toEqual({ beurt: null, hangt: false, verschuiving: 0 });
  });

  it("toetsenbordhoogte blijft hangen: sprong en de balk 384 omlaag", () => {
    expect(beoordeel(beurt, { ...vol, innerHeight: 468, vvHeight: 468 })).toEqual({
      beurt,
      hangt: true,
      verschuiving: 384,
    });
  });

  it("iOS 26: blijvende offsetTop schuift de balk mee", () => {
    expect(beoordeel(beurt, { ...vol, vvOffsetTop: 336 }).verschuiving).toBe(336);
  });

  it("klein verschil zoals een statusbalk: wel een sprong, de balk blijft staan", () => {
    const oordeel = beoordeel(beurt, { ...vol, innerHeight: 798 });
    expect(oordeel.hangt).toBe(true);
    expect(oordeel.verschuiving).toBe(0);
  });

  it("vergelijkt innerHeight en visualViewport elk met zichzelf", () => {
    // visualViewport was bij de start al groter dan innerHeight; dat is geen tekort.
    const scheef = startBeurt(null, { ...vol, innerHeight: 818 });
    expect(beoordeel(scheef, { ...vol, innerHeight: 818 }).hangt).toBe(false);
  });

  it("ingezoomd is een kleiner zichtbaar deel terecht", () => {
    expect(beoordeel(beurt, { ...vol, vvHeight: 400, vvOffsetTop: 200, vvScale: 2 }).hangt).toBe(false);
  });

  it("gedraaid: de beurt vervalt", () => {
    expect(beoordeel(beurt, { breedte: 852, innerHeight: 393, vvHeight: 393, vvOffsetTop: 0, vvScale: 1 })).toEqual({
      beurt: null,
      hangt: false,
      verschuiving: 0,
    });
  });

  it("afronding binnen de marge telt niet", () => {
    expect(beoordeel(beurt, { ...vol, innerHeight: 850, vvOffsetTop: 2 }).hangt).toBe(false);
  });
});
