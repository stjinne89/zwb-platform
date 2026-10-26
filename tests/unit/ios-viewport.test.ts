import { describe, expect, it } from "vitest";
import { blijftHangen, viewportFout } from "@/lib/ios-viewport";

describe("blijftHangen", () => {
  it("zonder eerdere meting nooit", () => {
    expect(blijftHangen(undefined, { innerHeight: 400 })).toBe(false);
  });

  it("volle hoogte is in orde", () => {
    expect(blijftHangen(852, { innerHeight: 852, vvHeight: 852, vvOffsetTop: 0, vvScale: 1 })).toBe(false);
  });

  it("een toetsenbordhoogte te klein hangt", () => {
    expect(blijftHangen(852, { innerHeight: 468, vvHeight: 468, vvOffsetTop: 0, vvScale: 1 })).toBe(true);
  });

  it("een blijvende verschuiving hangt", () => {
    expect(blijftHangen(852, { innerHeight: 852, vvHeight: 852, vvOffsetTop: 24, vvScale: 1 })).toBe(true);
  });

  it("ingezoomd is een kleiner zichtbaar deel terecht", () => {
    expect(blijftHangen(852, { innerHeight: 852, vvHeight: 400, vvOffsetTop: 200, vvScale: 2 })).toBe(false);
  });
});

describe("viewportFout", () => {
  it("is het tekort aan hoogte", () => {
    expect(viewportFout(852, { innerHeight: 468, vvHeight: 468, vvOffsetTop: 0, vvScale: 1 })).toBe(384);
  });

  it("valt terug op de verschuiving", () => {
    expect(viewportFout(852, { innerHeight: 852, vvHeight: 852, vvOffsetTop: 24, vvScale: 1 })).toBe(24);
  });

  it("is nul binnen de marge en ingezoomd", () => {
    expect(viewportFout(852, { innerHeight: 850, vvOffsetTop: 2, vvScale: 1 })).toBe(0);
    expect(viewportFout(852, { innerHeight: 852, vvOffsetTop: 200, vvScale: 2 })).toBe(0);
  });
});
