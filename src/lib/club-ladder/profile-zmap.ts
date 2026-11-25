// zMAP van een rennersprofiel op de Club Ladder (/profile/<Zwift-ID>, achter
// login), gezien 2026-11-25. Twee kaarten, met het icoon vóór de tekst (eerst
// verkeerd om aangenomen; de eerste sync gaf daardoor "niet herkend"):
//
//   <div class="card-header" ><i class="ti ti-bolt"></i> zMAP Spread Value</div>
//   <div class="card-body" >
//   <span style="…">4.35</span> …</div>
//   <div class="card-footer small text-muted">
//   zMAP/kg</div>
//
//   <div class="card-header" ><i class="ti ti-eraser"></i> If Reset Today</div>
//   <div class="card-body" ><span style="…">4.30</span><span class="small text-danger" …>-0.05</span></div>
//   <div class="card-footer small text-muted">live from 1d ago</div>
//
// Zonder meting staat er "--" en "no live reading". Spread Value is de hoogste
// sinds de transferperiode (daar rekent de ladder nu mee), If Reset Today de
// laatste meting (die zet de ladder bij een reset, ook bij seizoen 8).

export type LadderProfileZmap = {
  spread: number | null;
  live: number | null;
  /** "live from 1d ago" → 1; null zonder meting. */
  liveAgeDays: number | null;
};

const WINDOW = 1_500;

function card(html: string, header: string): { value: string; footer: string } | null {
  // De tekst ergens in de kop, ook na een icoon, maar niet voorbij het eind van de kop.
  const head = new RegExp(`class="[^"]*\\bcard-header\\b[^"]*"[^>]*>(?:(?!</div>)[\\s\\S]){0,300}?${header}`).exec(html);
  if (!head) return null;
  const rest = html.slice(head.index, head.index + WINDOW);
  const body = /class="[^"]*\bcard-body\b[^"]*"[^>]*>\s*<span[^>]*>\s*([^<]*?)\s*<\/span>/.exec(rest);
  if (!body) return null;
  const footer = /class="[^"]*\bcard-footer\b[^"]*"[^>]*>\s*([^<]*?)\s*</.exec(rest);
  return { value: body[1], footer: footer?.[1] ?? "" };
}

function wkg(raw: string): number | null {
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return null;
  const value = Number(raw);
  return value > 0 && value < 20 ? value : null;
}

/** De twee zMAP-kaarten van een profielpagina; null als de pagina ze niet heeft. */
export function parseLadderProfileZmap(html: string): LadderProfileZmap | null {
  const spread = card(html, "zMAP Spread Value");
  if (!spread) return null;
  const live = card(html, "If Reset Today");
  const age = live ? /live from (\d+)\s*d ago/i.exec(live.footer) : null;
  return {
    spread: wkg(spread.value),
    live: live ? wkg(live.value) : null,
    liveAgeDays: age ? Number(age[1]) : null,
  };
}
