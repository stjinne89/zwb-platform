import { describe, expect, it } from "vitest";
import { amsterdamHour, greetingFor, greetingWithName } from "@/lib/greeting";

describe("greetingFor", () => {
  it("verdeelt de dag op de gewone Nederlandse grenzen", () => {
    expect(greetingFor(6)).toBe("Goedemorgen");
    expect(greetingFor(11)).toBe("Goedemorgen");
    expect(greetingFor(12)).toBe("Goedemiddag");
    expect(greetingFor(17)).toBe("Goedemiddag");
    expect(greetingFor(18)).toBe("Goedenavond");
    expect(greetingFor(23)).toBe("Goedenavond");
    expect(greetingFor(0)).toBe("Goedenacht");
    expect(greetingFor(5)).toBe("Goedenacht");
  });

  it("valt bij onzin terug op de nacht", () => {
    // "Goedenacht" is nooit ronduit fout; "goedemorgen" om drie uur wel.
    expect(greetingFor(Number.NaN)).toBe("Goedenacht");
    expect(greetingFor(99)).toBe("Goedenacht");
    expect(greetingFor(-1)).toBe("Goedenacht");
  });
});

describe("greetingWithName", () => {
  it("plakt de naam erachter", () => {
    expect(greetingWithName(13, "Bart")).toBe("Goedemiddag, Bart");
  });

  it("laat de komma weg als er geen naam is", () => {
    expect(greetingWithName(13, null)).toBe("Goedemiddag");
    expect(greetingWithName(13, "   ")).toBe("Goedemiddag");
  });
});

describe("amsterdamHour", () => {
  it("rekent UTC om naar de Nederlandse klok", () => {
    // Zomertijd: 10:30 UTC is 12:30 in Amsterdam.
    expect(amsterdamHour(new Date("2026-08-20T10:30:00Z"))).toBe(12);
    // Wintertijd: één uur verschil.
    expect(amsterdamHour(new Date("2026-01-20T10:30:00Z"))).toBe(11);
  });

  it("laat middernacht niet naar 24 doorlopen", () => {
    // 23:10 UTC in de zomer is 01:10 de volgende dag in Amsterdam.
    expect(amsterdamHour(new Date("2026-08-20T23:10:00Z"))).toBe(1);
  });
});
