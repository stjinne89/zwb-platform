import { describe, expect, it } from "vitest";
import { parseLadderProfileZmap } from "@/lib/club-ladder/profile-zmap";
import { zValueSourceLabel } from "@/lib/teams/zrl-ranking";

// Opbouw van /profile/<Zwift-ID> op de Club Ladder, zoals de server hem
// stuurt (2026-11-25): icoon vóór de koptekst, regeleinden en commentaar.
function page(spread: string, live: string, footer: string, delta = "") {
  return `<div class="card-body">
<span class='badge bg-success'>PUBLIC</span>
</div>
</div>


<!-- zMAP/kg: value used for spread (HWM since window, or Live when not yet seeded) -->
<div class="card" >
<div class="card-header" ><i class="ti ti-bolt"></i> zMAP Spread Value</div>
<div class="card-body" >

<span style="font-size:1.4rem">${spread}</span>

<i class="ti ti-lock text-warning" title="Locked"></i>


</div>
<div class="card-footer small text-muted">
zMAP/kg

</div>
</div>
<!-- zMAP/kg: what a transfer-window reset would set today (= the latest live value) -->
<div class="card" >
<div class="card-header" ><i class="ti ti-eraser"></i> If Reset Today</div>
<div class="card-body" >

<span style="font-size:1.4rem">${live}</span>

${delta}


</div>
<div class="card-footer small text-muted">

${footer}


</div>
</div>`;
}

describe("parseLadderProfileZmap", () => {
  it("leest Spread Value, live-waarde en hoe oud de meting is", () => {
    const html = page("4.35", "4.30", "live from 1d ago", '<span class="small text-danger" title="Versus spread">-0.05</span>');
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
