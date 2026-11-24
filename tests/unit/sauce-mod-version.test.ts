import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isNewer, MOD_VERSION } from "../../sauce-mod/zwb-zrl-live/pages/src/mod-version.mjs";
import { SAUCE_MOD_DOWNLOAD, SAUCE_MOD_VERSION } from "@/lib/sauce-mod";

const manifest = JSON.parse(
  readFileSync(path.join(__dirname, "../../sauce-mod/zwb-zrl-live/manifest.json"), "utf8"),
) as { version: string };

describe("versie van de Sauce-mod", () => {
  it("staat in de mod, het manifest en het platform hetzelfde", () => {
    expect(MOD_VERSION).toBe(manifest.version);
    expect(SAUCE_MOD_VERSION).toBe(manifest.version);
  });

  it("vergelijkt per deel, niet als tekst", () => {
    expect(isNewer("0.10.0", "0.9.1")).toBe(true);
    expect(isNewer("0.4.0", "0.4.0")).toBe(false);
    expect(isNewer("0.3.9", "0.4.0")).toBe(false);
    expect(isNewer("1.0", "0.9.9")).toBe(true);
    expect(isNewer(undefined, "0.4.0")).toBe(false);
  });

  it("biedt een installer die bestaat", () => {
    expect(readFileSync(path.join(__dirname, "../../public", SAUCE_MOD_DOWNLOAD), "utf8")).toContain(
      "sauce-mod/installeren.ps1",
    );
  });
});
