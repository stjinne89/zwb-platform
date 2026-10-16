import { describe, expect, it } from "vitest";
import { defaultPacingPrompt } from "@/lib/pacing/prompt";

// Wetenschappelijke toets fase 5 (2026-10-16): variabel vermogen op een glooiende
// tijdrit is sneller dan constant, en een te harde start kost tijd.
describe("pacingprompt", () => {
  const prompt = defaultPacingPrompt();

  it("laat een tijdrijder op een glooiend parcours variabel vermogen rijden", () => {
    expect(prompt).toContain("variabel vermogen dan met constant vermogen");
    expect(prompt).not.toContain("wint met een vlak tempo");
  });

  it("begrenst de start van een tijdrit", () => {
    expect(prompt).toContain("hooguit ongeveer 5 procent boven je gemiddelde vermogen");
  });

  it("noemt werk boven CP bij het zwaardere eind van een lange rit", () => {
    expect(prompt).toContain("vooral na veel werk boven CP");
  });
});
