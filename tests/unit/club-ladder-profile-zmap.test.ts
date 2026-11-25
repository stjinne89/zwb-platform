import { describe, expect, it } from "vitest";
import { parseLadderProfileZmap } from "@/lib/club-ladder/profile-zmap";
import { zValueSourceLabel } from "@/lib/teams/zrl-ranking";

// Opbouw van /profile/<Zwift-ID> op de Club Ladder, gezien 2026-11-25.
function page(spread: string, live: string, footer: string, delta = "") {
  return `<div class="mt-2 d-flex flex-row flex-wrap gap-1">
    <div class="card flex-grow-1"><div class="card-header">Activity Save</div>
      <div class="card-body"><span class="badge bg-success">PUBLIC</span></div></div>
    <div class="card"><div class="card-header">zMAP Spread Value <i class="ti ti-bolt"></i></div>
      <div class="card-body"><span>${spread}</span> <i class="ti ti-lock text-warning"></i></div>
      <div class="card-footer small text-muted">zMAP/kg</div></div>
    <div class="card"><div class="card-header">If Reset Today <i class="ti ti-eraser"></i></div>
      <div class="card-body"><span>${live}</span>${delta}</div>
      <div class="card-footer small text-muted">${footer}</div></div>
  </div>`;
}

describe("parseLadderProfileZmap", () => {
  it("leest Spread Value, live-waarde en hoe oud de meting is", () => {
    const html = page("4.35", "4.30", "live from 1d ago", '<span class="small text-danger">-0.05</span>');
    expect(parseLadderProfileZmap(html)).toEqual({ spread: 4.35, live: 4.3, liveAgeDays: 1 });
  });

  it("geeft leeg terug zonder meting", () => {
    expect(parseLadderProfileZmap(page("--", "--", "no live reading"))).toEqual({
      spread: null,
      live: null,
      liveAgeDays: null,
    });
  });

  it("herkent een pagina zonder zMAP-kaarten niet", () => {
    expect(parseLadderProfileZmap("<html><body>Sign in</body></html>")).toBeNull();
  });
});

describe("zValueSourceLabel voor de ladder", () => {
  it("noemt de Spread Value alleen als die anders is", () => {
    expect(zValueSourceLabel({ value: 4.3, source: "ladder", spread: 4.35 })).toBe("Club Ladder, live, telt nu 4,35");
    expect(zValueSourceLabel({ value: 4.37, source: "ladder", spread: 4.37 })).toBe("Club Ladder, live");
  });
});
