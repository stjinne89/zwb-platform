import { describe, expect, it } from "vitest";
import { edgeTone, formatEdge } from "@/lib/club-ladder/edge-tone";

describe("edgeTone", () => {
  it("noemt binnen 2% gelijk, daarbuiten voor of achter", () => {
    expect(edgeTone(null)).toBeNull();
    expect(edgeTone(undefined)).toBeNull();
    expect(edgeTone(0)).toBe("gelijk");
    expect(edgeTone(1)).toBe("gelijk");
    expect(edgeTone(-1)).toBe("gelijk");
    expect(edgeTone(2)).toBe("voor");
    expect(edgeTone(-2)).toBe("achter");
    expect(edgeTone(-20)).toBe("achter");
  });

  it("zet een plus voor een voordeel", () => {
    expect(formatEdge(5)).toBe("+5%");
    expect(formatEdge(0)).toBe("0%");
    expect(formatEdge(-3)).toBe("-3%");
  });
});
