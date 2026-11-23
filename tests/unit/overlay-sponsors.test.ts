import { describe, expect, it } from "vitest";
import { splitOverlaySponsors } from "@/lib/youtube-live/overlay-sponsors";

type Sponsor = { name: string; overlayFixed?: boolean };

const a: Sponsor = { name: "A" };
const b: Sponsor = { name: "B", overlayFixed: true };
const c: Sponsor = { name: "C", overlayFixed: false };

describe("splitOverlaySponsors", () => {
  it("zet de vaste sponsor apart en laat de rest in volgorde wisselen", () => {
    expect(splitOverlaySponsors([a, b, c])).toEqual({ fixed: b, rotating: [a, c] });
  });

  it("laat zonder vaste sponsor iedereen wisselen", () => {
    expect(splitOverlaySponsors([a, c])).toEqual({ fixed: null, rotating: [a, c] });
  });

  it("houdt bij meer vinkjes de eerste vast en laat de andere wisselen", () => {
    const d: Sponsor = { name: "D", overlayFixed: true };
    expect(splitOverlaySponsors([b, d])).toEqual({ fixed: b, rotating: [d] });
  });

  it("werkt met alleen een vaste sponsor en zonder sponsors", () => {
    expect(splitOverlaySponsors([b])).toEqual({ fixed: b, rotating: [] });
    expect(splitOverlaySponsors([])).toEqual({ fixed: null, rotating: [] });
  });
});
