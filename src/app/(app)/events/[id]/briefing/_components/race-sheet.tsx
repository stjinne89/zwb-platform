// Het racebriefje: de briefing als handgeschreven spiekbriefje, zoals in de TTT
// Planner. Eerst wat vóór de start telt (Let op, het profiel met powerups en de
// fiets), dan de belangrijke punten per kilometer en de segmenten, en daarnaast
// het plan, wat je onthoudt, de rollen en wie je volgt. Papier heeft geen links;
// het werkmateriaal staat onder het briefje. De fiets uit je eigen garage staat
// alleen in de app: het gedeelde plaatje is voor iedereen hetzelfde
// (data-share-hide, zie share-sheet.tsx).

import { Gauge, Mountain, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GREEN, HAND_TEXT, HIGHLIGHT, INK, PaperTitle as Title, PENCIL, RED, RULE, SpiekPaper, TEAL } from "@/components/spiekbriefje/paper";
import type { BriefingView, OwnBriefingRider } from "@/lib/race-briefing/load";
import { FORMAT_LABELS } from "@/lib/race-briefing/rules";
import { cleanRiderName, ROLE_LABELS, shortRiderName } from "@/lib/race-briefing/field";
import { km } from "@/lib/race-briefing/tips";
import type { SketchMark } from "@/lib/race-briefing/sheet";
import type { SegmentRecord } from "@/lib/race-briefing/segment-records";
import type { ArchPowerup, PowerupOdds } from "@/lib/race-briefing/arches";
import { ZWIFT_POWERUP_ICONS, ZWIFT_POWERUP_LABELS, type ArchReward } from "@/lib/zwift/powerups";
import type { PacingSegment } from "@/lib/pacing/route-profile";
import { profilePoints, type Point } from "@/lib/race-briefing/route";
import type { BikeChoice } from "@/lib/pacing/bike-advice";
import { gap } from "../../_components/bike-advice-list";

const dateLabel = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
const nl = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
const nl2 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Het getekende profiel ──────────────────────────────────────────────────

const W = 600;
const H = 178;
const PAD_X = 10;
const TOP = 40;
const BASE = 128;
/** De haak van een rondesegment, onder de potloodlijn van de basis. */
const BRACKET_Y = BASE + 17;

type Box = { x0: number; x1: number; y0: number; y1: number };

type Anchor = "start" | "middle" | "end";

/** Breedte per teken als deel van de lettergrootte; ruim voor Shantell Sans, vet nog ruimer. */
const charWidth = (bold: boolean) => (bold ? 0.62 : 0.55);

/** Het vak van een tekst rond de basislijn, geschat uit het aantal tekens. */
function textBox(px: number, baseline: number, text: string, size: number, anchor: Anchor, bold = false): Box {
  const width = text.length * size * charWidth(bold);
  const x0 = anchor === "middle" ? px - width / 2 : anchor === "end" ? px - width : px;
  return { x0, x1: x0 + width, y0: baseline - size * 0.8, y1: baseline + size * 0.25 };
}

const overlap = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

const TEXT_LOOK: Record<SketchMark["style"], { fontSize: number; fontWeight?: number; fill: string; textAnchor: Anchor }> = {
  markeer: { fontSize: 17, fontWeight: 700, fill: TEAL, textAnchor: "end" },
  cirkel: { fontSize: 17, fontWeight: 700, fill: RED, textAnchor: "end" },
  boog: { fontSize: 15, fill: PENCIL, textAnchor: "end" },
  sprint: { fontSize: 14, fill: GREEN, textAnchor: "middle" },
  ronde: { fontSize: 14, fill: GREEN, textAnchor: "middle" },
  label: { fontSize: 15, fill: PENCIL, textAnchor: "middle" },
};

/** Hooguit ±140 punten: genoeg voor de vorm, en een pen trekt geen 300 lijntjes. */
function sketchPoints(segments: PacingSegment[]): Point[] {
  const pts = profilePoints(segments);
  const step = Math.max(1, Math.floor(pts.length / 140));
  return pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
}

/** Hoogtemeters van de route, zonder tunnelsprongen; op 10 m. */
function ascentM(segments: PacingSegment[]): number {
  const pts = profilePoints(segments);
  let up = 0;
  for (let i = 1; i < pts.length; i++) up += Math.max(0, pts[i].m - pts[i - 1].m);
  return Math.round(up / 10) * 10;
}

function RouteSketch({ segments, marks }: { segments: PacingSegment[]; marks: SketchMark[] }) {
  const pts = sketchPoints(segments);
  if (pts.length < 3) return null;
  const totalKm = pts.at(-1)!.km;
  const lo = Math.min(...pts.map((p) => p.m));
  const hi = Math.max(...pts.map((p) => p.m), lo + 40);
  const clampKm = (kmValue: number) => Math.min(totalKm, Math.max(0, kmValue));
  const x = (kmValue: number) => PAD_X + (clampKm(kmValue) / totalKm) * (W - 2 * PAD_X);
  // Een vaste, kleine trilling: met de hand getrokken, maar elke keer hetzelfde.
  const y = (m: number, i = 0) => BASE - ((m - lo) / (hi - lo)) * (BASE - TOP) + Math.sin(i * 1.7) * 0.7;
  const yAt = (kmValue: number) => {
    const next = pts.findIndex((p) => p.km >= clampKm(kmValue));
    if (next <= 0) return y(pts[0].m);
    const a = pts[next - 1];
    const b = pts[next];
    const t = (clampKm(kmValue) - a.km) / Math.max(1e-6, b.km - a.km);
    return y(a.m + t * (b.m - a.m));
  };
  /** Het hoogste punt van de lijn tussen twee kilometers (kleinste y). */
  const topY = (from: number, to: number) => Math.min(yAt(from), yAt(to), ...pts.filter((p) => p.km >= from && p.km <= to).map((p) => y(p.m)));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.km).toFixed(1)} ${y(p.m, i).toFixed(1)}`).join(" ");
  const stretch = (from: number, to: number) =>
    pts
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.km >= from - 0.05 && p.km <= to + 0.05)
      .map(({ p, i }, n) => `${n ? "L" : "M"}${x(p.km).toFixed(1)} ${y(p.m, i).toFixed(1)}`)
      .join(" ");

  const ellipseOf = (m: SketchMark) => {
    const cx = x((m.fromKm + m.toKm) / 2);
    const cy = (yAt(m.fromKm) + yAt(m.toKm)) / 2;
    return { cx, cy, rx: Math.max(16, (x(m.toKm) - x(m.fromKm)) / 2 + 9), ry: (Math.abs(yAt(m.fromKm) - yAt(m.toKm)) / 2 || 6) + 9 };
  };
  const lineYs = (box: Box) => {
    const ys: number[] = [];
    for (let px = Math.max(PAD_X, box.x0 - 3); px <= Math.min(W - PAD_X, box.x1 + 3); px += 1.5) ys.push(yAt(((px - PAD_X) / (W - 2 * PAD_X)) * totalKm));
    return ys;
  };

  // Elke tekst krijgt een plek waar hij vrij staat van de lijn, van de andere
  // teksten, van de rode cirkel, de stippellijn van de boog en de vlag: eerst de
  // eigen plek, dan een rij hoger (of lager) en wat opzij. Past een tekst nergens
  // en staat dezelfde tekst er al (een volgende ronde), dan valt hij weg.
  const taken: Box[] = [
    { x0: W - PAD_X - 2, x1: W - PAD_X + 16, y0: yAt(totalKm) - 26, y1: yAt(totalKm) },
    textBox(PAD_X, BASE + 32, "0", 15, "start"),
    textBox(W - PAD_X, BASE + 32, `${nl.format(totalKm)} km`, 15, "end"),
  ];
  for (const m of marks) {
    if (m.style === "cirkel") {
      const e = ellipseOf(m);
      // De ellips staat 8° scheef: een paar eenheden ruimer.
      taken.push({ x0: e.cx - e.rx - 4, x1: e.cx + e.rx + 4, y0: e.cy - e.ry - 4, y1: e.cy + e.ry + 4 });
    }
    if (m.style === "boog") taken.push({ x0: x(m.fromKm) - 2, x1: x(m.fromKm) + 2, y0: yAt(m.fromKm) - 5, y1: BASE + 14 });
    if (m.style === "ronde") taken.push({ x0: x(m.fromKm) - 1, x1: x(m.toKm) + 1, y0: BRACKET_Y - 5, y1: BRACKET_Y + 1 });
  }
  type Spec = { size: number; bold: boolean; anchor: Anchor; px: number; ys: number[]; shifts: number[]; bottom: number };
  const specOf = (m: SketchMark): Spec => {
    if (m.style === "cirkel") {
      const py = topY(m.fromKm, m.toKm) - 18;
      return { size: 17, bold: true, anchor: "end", px: x(m.fromKm) - 6, ys: [py, py - 18, py + 18], shifts: [0, -0.5], bottom: BASE + 6 };
    }
    if (m.style === "markeer") {
      // Links van het eind, zodat er rechts ruimte blijft voor de finale.
      const py = topY(m.fromKm, m.toKm) - 14;
      return { size: 17, bold: true, anchor: "end", px: x(m.toKm) - 8, ys: [py, py - 18, py - 36], shifts: [0, -0.5, 0.5], bottom: BASE + 6 };
    }
    if (m.style === "boog") return { size: 15, bold: false, anchor: "end", px: x(m.fromKm) - 5, ys: [BASE + 32], shifts: [0, -0.5, 1, -1], bottom: H };
    if (m.style === "ronde") return { size: 14, bold: false, anchor: "middle", px: x((m.fromKm + m.toKm) / 2), ys: [BRACKET_Y + 14, BRACKET_Y + 28], shifts: [0, -0.4, 0.4], bottom: H };
    const size = m.style === "sprint" ? 14 : 15;
    const width = m.text.length * size * charWidth(false);
    const px = Math.min(W - 2 - width / 2, Math.max(2 + width / 2, x((m.fromKm + m.toKm) / 2)));
    const span = [...lineYs(textBox(px, 0, m.text, size, "middle")), yAt(m.fromKm)];
    const above = Math.min(...span) - 7;
    const below = Math.max(...span) + size * 0.8 + 5;
    // Een sprint ligt meestal vlak: liefst eronder, de klimlabels staan erboven.
    const ys = m.style === "sprint" ? [below, above, above - 16, above - 32] : [above, above - 16, above - 32, below];
    return { size, bold: false, anchor: "middle", px, ys, shifts: [0, -0.6, 0.6], bottom: BASE + 6 };
  };
  const ORDER: SketchMark["style"][] = ["cirkel", "markeer", "boog", "ronde", "label", "sprint"];
  const placed = new Map<SketchMark, { x: number; y: number }>();
  const scoredFor = (m: SketchMark) => {
    const spec = specOf(m);
    const width = m.text.length * spec.size * charWidth(spec.bold);
    const candidates = spec.shifts.flatMap((shift) => spec.ys.map((py) => ({ px: spec.px + shift * width, py })));
    return candidates.map(({ px, py }) => {
      const box = textBox(px, py, m.text, spec.size, spec.anchor, spec.bold);
      const outside = box.x0 < 0 || box.x1 > W || box.y0 < 0 || box.y1 > spec.bottom;
      const crossesLine = lineYs(box).some((ly) => ly >= box.y0 - 3 && ly <= box.y1 + 3);
      return { px, py, box, cost: (outside ? 10 : 0) + (crossesLine ? 5 : 0) + taken.filter((t) => overlap(t, box)).length };
    });
  };
  const place = (m: SketchMark, spot: { px: number; py: number; box: Box }) => {
    taken.push(spot.box);
    placed.set(m, { x: spot.px, y: spot.py });
  };
  // Eerst alles wat vrij past; daarna de rest op de minst slechte plek, behalve
  // een tekst die er al staat.
  const deferred: SketchMark[] = [];
  for (const m of [...marks].sort((a, b) => ORDER.indexOf(a.style) - ORDER.indexOf(b.style) || a.fromKm - b.fromKm)) {
    const free = scoredFor(m).find((c) => c.cost === 0);
    if (free) place(m, free);
    else deferred.push(m);
  }
  for (const m of deferred) {
    if ([...placed.keys()].some((other) => other.text === m.text)) continue;
    place(m, scoredFor(m).reduce((a, b) => (b.cost < a.cost ? b : a)));
  }

  const label = marks.length ? `Profiel: ${marks.map((m) => `${m.text} op ${km(m.fromKm)}`).join(", ")}` : "Profiel van de route";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label={label}>
      {/* Markeerstift onder de stukken die het verschil maken. */}
      {marks
        .filter((m) => m.style === "markeer" && m.toKm > m.fromKm)
        .map((m) => (
          <path key={`m-${m.fromKm}-${m.text}`} d={stretch(m.fromKm, m.toKm)} stroke="rgba(232,190,90,0.55)" strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      {/* Sprints: groen over het stuk, smaller dan de markeerstift. */}
      {marks
        .filter((m) => m.style === "sprint")
        .map((m) => (
          <path key={`s-${m.fromKm}-${m.text}`} d={stretch(m.fromKm, Math.max(m.toKm, m.fromKm + 0.1))} stroke={GREEN} strokeOpacity={0.6} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      <path d={line} stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Rondesegmenten: een groene haak onder het stuk, van boog tot boog. */}
      {marks
        .filter((m) => m.style === "ronde")
        .map((m) => (
          <path
            key={`r-${m.fromKm}-${m.text}`}
            d={`M${x(m.fromKm)} ${BRACKET_Y - 5} L${x(m.fromKm) + 0.5} ${BRACKET_Y} L${x(m.toKm) - 0.5} ${BRACKET_Y + 0.6} L${x(m.toKm)} ${BRACKET_Y - 5}`}
            stroke={GREEN}
            strokeOpacity={0.8}
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      <path d={`M${PAD_X} ${BASE + 9} C ${W * 0.3} ${BASE + 8}, ${W * 0.62} ${BASE + 10.5}, ${W - PAD_X} ${BASE + 8.5}`} stroke={PENCIL} strokeWidth={1} fill="none" strokeLinecap="round" />

      {marks
        .filter((m) => m.style === "cirkel")
        .map((m) => {
          const { cx, cy, rx, ry } = ellipseOf(m);
          return <ellipse key={`c-${m.fromKm}-${m.text}`} cx={cx} cy={cy} rx={rx} ry={ry} stroke={RED} strokeWidth={1.8} fill="none" transform={`rotate(-8 ${cx} ${cy})`} />;
        })}
      {marks
        .filter((m) => m.style === "boog")
        .map((m) => (
          <path key={`b-${m.fromKm}-${m.text}`} d={`M${x(m.fromKm)} ${yAt(m.fromKm) - 5} L${x(m.fromKm) + 0.6} ${BASE + 14}`} stroke={PENCIL} strokeWidth={1.2} strokeDasharray="3 3" strokeLinecap="round" />
        ))}
      {/* Een sprintlabel dat ver van zijn streep staat, krijgt een stippellijn erheen. */}
      {marks.map((m) => {
        const at = placed.get(m);
        const mid = (m.fromKm + m.toKm) / 2;
        if (m.style !== "sprint" || !at || Math.abs(at.y - yAt(mid)) < 24) return null;
        const fromY = at.y < yAt(mid) ? at.y + 4 : at.y - 14;
        const toY = at.y < yAt(mid) ? yAt(mid) - 5 : yAt(mid) + 5;
        return <path key={`l-${m.fromKm}-${m.text}`} d={`M${at.x} ${fromY} L${x(mid)} ${toY}`} stroke={GREEN} strokeOpacity={0.7} strokeWidth={1} strokeDasharray="2 3" strokeLinecap="round" />;
      })}
      {marks.map((m) => {
        const at = placed.get(m);
        if (!at) return null;
        return (
          <text key={`${m.style}-${m.fromKm}-${m.text}`} x={at.x} y={at.y} {...TEXT_LOOK[m.style]}>
            {m.text}
          </text>
        );
      })}

      {/* Finishvlag. */}
      <g transform={`translate(${W - PAD_X} ${yAt(totalKm)})`}>
        <path d="M0 0 L0.4 -24" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
        <path d="M0.4 -24 C 6 -26, 9 -20, 15 -22 L14 -14 C 9 -12, 6 -18, 0.3 -16 Z" fill={INK} opacity={0.85} />
      </g>

      <text x={PAD_X} y={BASE + 32} fontSize={15} fill={PENCIL}>
        0
      </text>
      <text x={W - PAD_X} y={BASE + 32} fontSize={15} fill={PENCIL} textAnchor="end">
        {nl.format(totalKm)} km
      </text>
    </svg>
  );
}

// ── De blokken op het briefje ─────────────────────────────────────────────

/** Een powerup met Zwifts eigen icoon; XP als getekend rondje. */
function RewardIcon({ reward }: { reward: ArchReward }) {
  if (reward === "xp") {
    return (
      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold" style={{ borderColor: PENCIL, color: PENCIL }}>
        XP
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={ZWIFT_POWERUP_ICONS[reward]} alt={ZWIFT_POWERUP_LABELS[reward]} width={20} height={20} className="size-5 shrink-0 rounded-full object-cover" />;
}

/** Naam naast het icoon; XP staat al in het icoon. */
function rewardName(reward: ArchReward): string | null {
  return reward === "xp" ? null : ZWIFT_POWERUP_LABELS[reward].toLowerCase();
}

function FixedArches({ arches }: { arches: Array<ArchPowerup & { reward: ArchReward }> }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Powerups per boog">
      {arches.map((arch) => (
        <li key={`${arch.km}-${arch.label}`} className="inline-flex items-center gap-1.5">
          <RewardIcon reward={arch.reward} />
          <span>
            {arch.km > 0 && <span className="tabular-nums" style={{ color: PENCIL }}>{km(arch.km)} </span>}
            {arch.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Onder de route: elke boog met een vaste powerup (ZRL) met zijn icoon. Kiest
 * een boog uit de kansverdeling (ladder), dan één keer die verdeling en de
 * bogen waar dat zeker is, zodat de lijst kort blijft.
 */
function ArchPowerups({ arches, odds }: { arches: ArchPowerup[]; odds: PowerupOdds[] }) {
  const fixed = arches.filter((arch): arch is ArchPowerup & { reward: ArchReward } => arch.reward !== null);
  if (odds.length === 0) return fixed.length > 0 ? <FixedArches arches={fixed} /> : null;
  const start = fixed.find((arch) => arch.km === 0);
  const fixedArches = fixed.filter((arch) => arch.km > 0);
  const open = arches.filter((arch) => arch.reward === null);
  const row = "grid grid-cols-[4.25rem_minmax(0,1fr)] gap-2 py-0.5 leading-snug";
  return (
    <>
      {fixedArches.length > 0 && <FixedArches arches={fixedArches} />}
      <dl className="mt-1 text-sm" aria-label="Powerups">
        {start && (
          <div className={row}>
            <dt className="font-bold">start</dt>
            <dd className="inline-flex items-center gap-1.5">
              <RewardIcon reward={start.reward} />
              {rewardName(start.reward)}
            </dd>
          </div>
        )}
        <div className={row}>
          <dt className="font-bold">bogen</dt>
          <dd>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {odds.map((item) => (
                <span key={item.powerup} className="inline-flex items-center gap-1.5">
                  <RewardIcon reward={item.powerup} />
                  <span>
                    {rewardName(item.powerup)}
                    {item.percent !== null && <span className="tabular-nums" style={{ color: PENCIL }}> {item.percent} %</span>}
                  </span>
                </span>
              ))}
            </span>
            {open.length > 0 && (
              <span className="mt-0.5 block">
                {open.map((arch, i) => (
                  <span key={`${arch.km}-${arch.label}`}>
                    {i > 0 && <span style={{ color: PENCIL }}> · </span>}
                    <span className="whitespace-nowrap tabular-nums" style={{ color: PENCIL }}>{km(arch.km)}</span> {arch.label}
                  </span>
                ))}
              </span>
            )}
          </dd>
        </div>
      </dl>
    </>
  );
}

const bikeName = (bike: BikeChoice) => [bike.frame, bike.wheels].filter(Boolean).join(" · ");

/**
 * Onder de powerups: de snelste fiets voor de ploeg (op de middelste zFTP, stage 0)
 * en, als je je garage hebt ingevuld, de snelste die jij hebt. Die tweede regel
 * valt weg uit het gedeelde plaatje.
 */
function Bikes({ view }: { view: BriefingView }) {
  if (!view.bikes) return null;
  const { advice, own } = view.bikes;
  const best = advice.best[0];
  const sameAsReference = best.frame === advice.current.frame && best.wheels === advice.current.wheels;
  const toReference = Math.round(best.seconds - advice.current.seconds);
  const toBest = own ? Math.round(own.seconds - best.seconds) : 0;
  const row = "grid grid-cols-[4.25rem_minmax(0,1fr)] gap-2 py-0.5 leading-snug";
  return (
    <dl className="mt-1 text-sm" aria-label="Fiets">
      <div className={row}>
        <dt className="font-bold">fiets</dt>
        <dd>
          {bikeName(best)}
          {!sameAsReference && toReference < 0 && (
            <span className="tabular-nums" style={{ color: PENCIL }}>
              {" "}
              {gap(toReference)} op de {advice.current.frame}
            </span>
          )}
        </dd>
      </div>
      {own && (
        <div className={row} data-share-hide="">
          <dt className="font-bold">garage</dt>
          <dd>
            {bikeName(own)}
            {toBest > 0 && (
              <span className="tabular-nums" style={{ color: PENCIL }}>
                {" "}
                {gap(toBest)}
              </span>
            )}
          </dd>
        </div>
      )}
    </dl>
  );
}

function Moments({ view }: { view: BriefingView }) {
  const moments = view.sheet.moments;
  if (moments.length === 0) return null;
  return (
    <div>
      <Title>Belangrijke punten</Title>
      <dl className="mt-1">
        {moments.map((moment) => (
          <div key={`${moment.km}-${moment.what}-${moment.todo}`} className={cn("grid grid-cols-[4.25rem_minmax(0,1fr)] gap-2 border-b py-1 leading-snug", RULE)}>
            <dt className="whitespace-nowrap font-bold tabular-nums">{nl.format(moment.km)} km</dt>
            <dd>
              {moment.what && <span className={cn(moment.key && "font-bold")}>{moment.what}</span>}
              {moment.what && moment.todo && (
                <>
                  {" "}
                  <span style={{ color: PENCIL }}>→</span>{" "}
                </>
              )}
              {moment.todo && <span className={cn(moment.key && HIGHLIGHT)}>{moment.todo}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Rules({ view }: { view: BriefingView }) {
  const rules = view.sheet.rules;
  if (rules.length === 0) return null;
  return (
    <div>
      <Title>Onthouden</Title>
      <dl>
        {rules.map((rule) => (
          <div key={`${rule.value}-${rule.text}`} className={cn("flex gap-3 border-b py-1 leading-snug", RULE)}>
            <dt className="w-[8.5rem] shrink-0 font-bold tabular-nums">
              {rule.key ? (
                <span className="-ml-1.5 inline-block -rotate-2 rounded-[50%] border-2 px-2.5 py-0.5" style={{ borderColor: TEAL }}>
                  {rule.value}
                </span>
              ) : (
                rule.value
              )}
            </dt>
            <dd>{rule.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RoleLine({ rider, limitLabel }: { rider: OwnBriefingRider; limitLabel: string | null }) {
  const role = rider.captainRole ?? ROLE_LABELS[rider.role].toLowerCase();
  return (
    <li className={cn("space-y-0.5 border-b py-1.5 leading-snug", RULE)}>
      <p>
        <span className="font-bold">{cleanRiderName(rider.name)}</span> <span style={{ color: PENCIL }}>→</span> {role}
      </p>
      {rider.limitWatts && (rider.limitWatts.zftp !== null || rider.limitWatts.zmap !== null) && (
        <p className="tabular-nums" style={{ color: PENCIL }}>
          blijf onder{" "}
          {[
            rider.limitWatts.zftp !== null ? `zFTP ${rider.limitWatts.zftp} W` : null,
            rider.limitWatts.zmap !== null ? `zMAP ${rider.limitWatts.zmap} W` : null,
          ]
            .filter(Boolean)
            .map((part, i) => (
              <span key={part}>
                {i > 0 && " · "}
                <span className="font-bold" style={{ color: INK }}>
                  {part}
                </span>
              </span>
            ))}
        </p>
      )}
      {rider.targets && (rider.targets.ahead || rider.targets.behind) && (
        <p style={{ color: PENCIL }}>
          {[
            rider.targets.ahead ? (
              <span key="ahead">
                pak{" "}
                <span className="font-bold" style={{ color: INK }}>
                  {rider.targets.ahead}
                </span>
              </span>
            ) : null,
            rider.targets.behind ? (
              <span key="behind">
                houd{" "}
                <span className="font-bold" style={{ color: INK }}>
                  {rider.targets.behind}
                </span>{" "}
                achter je
              </span>
            ) : null,
          ]
            .filter(Boolean)
            .map((part, i) => (
              <span key={i}>
                {i > 0 && " · "}
                {part}
              </span>
            ))}
        </p>
      )}
      {rider.role === "positie" && !rider.captainRole && (
        <p className="inline-flex items-center gap-1" style={{ color: INK }}>
          <Mountain aria-hidden strokeWidth={2.4} className="size-4 shrink-0" />
          vóór de klim vooraan zitten
        </p>
      )}
      {limitLabel && (
        <p>
          <span className={cn("inline-flex items-center gap-1", HIGHLIGHT)} style={{ color: rider.limits.status === "over" ? RED : INK }}>
            <Gauge aria-hidden strokeWidth={2.4} className="size-4 shrink-0" />
            {limitLabel}
          </span>{" "}
          <span style={{ color: PENCIL }}>→</span> geen lange stukken boven je drempel
        </p>
      )}
    </li>
  );
}

function Roles({ view }: { view: BriefingView }) {
  const riders = view.own.filter((r) => r.inPen);
  if (riders.length === 0) return null;
  const limitLabel = (rider: OwnBriefingRider) => {
    if (rider.limits.status === "ok") return null;
    const zftp = rider.limits.zftpShare ?? 0;
    const zmap = rider.limits.zmapShare ?? 0;
    return zftp >= zmap && rider.zftpWkg !== null
      ? `zFTP ${nl2.format(rider.zftpWkg)} · ${Math.round(zftp * 100)}% van de grens`
      : rider.zmapWkg !== null
        ? `zMAP ${nl2.format(rider.zmapWkg)} · ${Math.round(zmap * 100)}% van de grens`
        : "dicht bij de grens";
  };
  return (
    <div className="mt-4">
      <Title>Rollen</Title>
      <ul>
        {riders.map((rider) => (
          <RoleLine key={rider.zwiftId} rider={rider} limitLabel={limitLabel(rider)} />
        ))}
      </ul>
    </div>
  );
}

function Watch({ view }: { view: BriefingView }) {
  const lines = view.sheet.watch;
  if (lines.length === 0) return null;
  return (
    <div className="mt-4">
      <Title>Volgen</Title>
      <ul>
        {lines.map((line) => (
          <li key={`${line.name}-${line.note}`} className={cn("border-b py-1 leading-snug", RULE)}>
            <span className="font-bold">{line.name}</span>
            {line.note && <span style={{ color: line.note.includes("won ") ? GREEN : PENCIL }}> {line.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Notes({ view }: { view: BriefingView }) {
  const notes = view.sheet.notes;
  if (notes.length === 0) return null;
  return (
    <div className="mt-3">
      <Title>Let op</Title>
      <ul>
        {notes.map((note) => (
          <li key={note} className={cn("flex gap-1.5 border-b py-1 leading-snug", RULE)} style={{ color: RED }}>
            <X aria-hidden strokeWidth={2.5} className="mt-1 size-4 shrink-0" />
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const wkg1 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 17,9 s; vanaf een minuut 1:02. */
function segmentTime(seconds: number): string {
  if (seconds < 60) return `${nl.format(Math.round(seconds * 10) / 10)} s`;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function SegmentRecordBlock({ record }: { record: SegmentRecord }) {
  const target = record.target;
  return (
    <div className={cn("border-b py-1.5 leading-snug", RULE)}>
      <p>
        <span className="font-bold">{record.label}</span>
        <span style={{ color: PENCIL }}>
          {" "}
          · {nl.format(record.firstKm)} km{record.passes > 1 ? ` · ${record.passes}×` : ""}
        </span>
      </p>
      {target && (
        <p>
          {target.scope === "veld" ? "richttijd" : "snelste van ons"} <span className={cn("font-bold tabular-nums", HIGHLIGHT)}>{segmentTime(target.seconds)}</span>
          <span style={{ color: PENCIL }}>
            {" "}
            {target.name}
            {target.wkg !== null && ` · ${wkg1.format(target.wkg)} w/kg`}
          </span>
        </p>
      )}
      <ul className="mt-0.5">
        {record.riders.map((rider) => (
          <li key={rider.zwiftId} className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)] gap-2">
            <span className="truncate font-bold">{shortRiderName(rider.name)}</span>
            <span className="tabular-nums">
              {rider.pr ? (
                <>
                  PR {segmentTime(rider.pr.seconds)}
                  {rider.pr.watts !== null && (
                    <span style={{ color: PENCIL }}>
                      {" "}
                      · {rider.pr.watts} W{rider.pr.wkg !== null && ` · ${wkg1.format(rider.pr.wkg)} w/kg`}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: PENCIL }}>{rider.fetched ? "geen PR in 90 dagen" : "PR volgt"}</span>
              )}
              {rider.holder ? (
                <span style={{ color: GREEN }}> · richttijd</span>
              ) : (
                rider.neededWatts !== null && (
                  <>
                    {" "}
                    <span style={{ color: PENCIL }}>→</span> <span className="font-bold">{rider.neededWatts} W</span>
                  </>
                )
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SegmentRecords({ view }: { view: BriefingView }) {
  if (view.segmentRecords.length === 0) return null;
  return (
    <div className="mt-4">
      <Title>Segmenten</Title>
      {view.segmentRecords.map((record) => (
        <SegmentRecordBlock key={record.segmentId} record={record} />
      ))}
    </div>
  );
}

export function RaceSheet({ view }: { view: BriefingView }) {
  const loaded = view.route?.loaded ?? null;
  const meta = [
    view.event.teamName,
    view.ladder ? `club ladder tegen ${view.ladder.opponent}` : FORMAT_LABELS[view.format].toLowerCase(),
    loaded?.routeName,
    dateLabel.format(new Date(view.event.startAt)),
  ].filter(Boolean);
  return (
    <SpiekPaper id="racebriefje" title="Racebriefje">
      <p className="mt-2 text-sm" style={{ color: PENCIL }}>
        {meta.join(" · ")}
      </p>
      <Notes view={view} />
      {view.route && loaded && (
        <div className="mt-3">
          <Title>
            Profiel{" "}
            <span className="text-sm font-normal tabular-nums" style={{ color: PENCIL }}>
              {nl.format(Math.round(loaded.route.totalKm * 10) / 10)} km · {ascentM(loaded.route.segments)} hm
            </span>
          </Title>
          <RouteSketch segments={loaded.route.segments} marks={view.sheet.sketch} />
          <ArchPowerups arches={view.archPowerups} odds={view.powerupOdds} />
          <Bikes view={view} />
        </div>
      )}
      <div className="mt-4 grid gap-x-10 md:grid-cols-2">
        <div>
          <Moments view={view} />
          <SegmentRecords view={view} />
        </div>
        <div className="mt-4 md:mt-0">
          {view.plan?.text && (
            <div className="mb-4">
              <Title>Plan</Title>
              <p className={cn("mt-1 whitespace-pre-line leading-snug", HAND_TEXT)}>{view.plan.text}</p>
            </div>
          )}
          <Rules view={view} />
          <Roles view={view} />
          <Watch view={view} />
        </div>
      </div>
    </SpiekPaper>
  );
}
