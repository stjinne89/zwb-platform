// Het racebriefje: de briefing als handgeschreven spiekbriefje, zoals in de TTT
// Planner. Een getekend profiel met de beslissende stukken, de momenten per
// kilometer, wat je onthoudt, het plan van de captain, de rollen en wie je volgt.
// Papier heeft geen links; het werkmateriaal staat onder het briefje.

import { Gauge, Mountain, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GREEN, HAND_TEXT, HIGHLIGHT, INK, PaperTitle as Title, PENCIL, RED, RULE, SpiekPaper, TEAL } from "@/components/spiekbriefje/paper";
import type { BriefingView, OwnBriefingRider } from "@/lib/race-briefing/load";
import { cheatRules, FORMAT_LABELS } from "@/lib/race-briefing/rules";
import { cleanRiderName, ROLE_LABELS } from "@/lib/race-briefing/field";
import { briefingMoments, km } from "@/lib/race-briefing/tips";
import type { PacingSegment } from "@/lib/pacing/route-profile";
import { profilePoints, type BriefingClimb, type Point, type RouteKeyPoints } from "@/lib/race-briefing/route";

const dateLabel = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
const nl = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
const nl2 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortClimb = (climb: BriefingClimb) => (climb.name ?? "klim").replace(/\s+(KOM|QOM)$/i, "");

// ── Het getekende profiel ──────────────────────────────────────────────────

const W = 600;
const H = 178;
const PAD_X = 10;
const TOP = 40;
const BASE = 128;

/** Hooguit ±140 punten: genoeg voor de vorm, en een pen trekt geen 300 lijntjes. */
function sketchPoints(segments: PacingSegment[]): Point[] {
  const pts = profilePoints(segments);
  const step = Math.max(1, Math.floor(pts.length / 140));
  return pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
}

function RouteSketch({ segments, keyPoints }: { segments: PacingSegment[]; keyPoints: RouteKeyPoints }) {
  const pts = sketchPoints(segments);
  if (pts.length < 3) return null;
  const totalKm = pts.at(-1)!.km;
  const lo = Math.min(...pts.map((p) => p.m));
  const hi = Math.max(...pts.map((p) => p.m), lo + 40);
  const x = (kmValue: number) => PAD_X + (kmValue / totalKm) * (W - 2 * PAD_X);
  // Een vaste, kleine trilling: met de hand getrokken, maar elke keer hetzelfde.
  const y = (m: number, i = 0) => BASE - ((m - lo) / (hi - lo)) * (BASE - TOP) + Math.sin(i * 1.7) * 0.7;
  const yAt = (kmValue: number) => {
    const next = pts.findIndex((p) => p.km >= kmValue);
    if (next <= 0) return y(pts[0].m);
    const a = pts[next - 1];
    const b = pts[next];
    const t = (kmValue - a.km) / Math.max(1e-6, b.km - a.km);
    return y(a.m + t * (b.m - a.m));
  };
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.km).toFixed(1)} ${y(p.m, i).toFixed(1)}`).join(" ");
  const stretch = (from: number, to: number) =>
    pts
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.km >= from - 0.05 && p.km <= to + 0.05)
      .map(({ p, i }, n) => `${n ? "L" : "M"}${x(p.km).toFixed(1)} ${y(p.m, i).toFixed(1)}`)
      .join(" ");

  const lint = keyPoints.descentsIntoClimbs;
  const finale = keyPoints.finale.kind === "climb" ? keyPoints.finale.climb : null;
  const arch = keyPoints.lastArchKm;
  const marked = new Set<BriefingClimb>([...lint.map((d) => d.climb), ...(finale ? [finale] : [])]);
  const others = keyPoints.climbs.filter((c) => !marked.has(c) && c.name);

  const label = `Profiel: ${keyPoints.climbs.map((c) => `${shortClimb(c)} op ${km(c.startKm)}`).join(", ")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label={label}>
      {/* Markeerstift onder de klimmen die het verschil maken. */}
      {[...lint.map((d) => d.climb), ...(finale ? [finale] : [])].map((climb) => (
        <path key={`m-${climb.startKm}`} d={stretch(climb.startKm, climb.endKm)} stroke="rgba(232,190,90,0.55)" strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {lint.map(({ descent }) => (
        <path key={`d-${descent.startKm}`} d={stretch(descent.startKm, descent.endKm)} stroke="rgba(93,202,165,0.45)" strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <path d={line} stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${PAD_X} ${BASE + 9} C ${W * 0.3} ${BASE + 8}, ${W * 0.62} ${BASE + 10.5}, ${W - PAD_X} ${BASE + 8.5}`} stroke={PENCIL} strokeWidth={1} fill="none" strokeLinecap="round" />

      {lint.map(({ descent, climb }) => {
        // Links van de top, zodat er rechts ruimte blijft voor de finale.
        const top = Math.min(yAt(climb.endKm), yAt(descent.startKm)) - 14;
        return (
          <g key={`l-${climb.startKm}`}>
            <text x={x(climb.endKm) - 8} y={top} fontSize={17} fontWeight={700} fill={TEAL} textAnchor="end">
              lint → {shortClimb(climb)}
            </text>
          </g>
        );
      })}

      {others.map((climb) => (
        <text key={`o-${climb.startKm}`} x={x((climb.startKm + climb.endKm) / 2)} y={yAt(climb.endKm) - 9} fontSize={15} fill={PENCIL} textAnchor="middle">
          {shortClimb(climb)}
        </text>
      ))}

      {arch !== null && (
        <g>
          <path d={`M${x(arch)} ${yAt(arch) - 5} L${x(arch) + 0.6} ${BASE + 14}`} stroke={PENCIL} strokeWidth={1.2} strokeDasharray="3 3" strokeLinecap="round" />
          <text x={x(arch) - 5} y={BASE + 32} fontSize={15} fill={PENCIL} textAnchor="end">
            laatste boog
          </text>
        </g>
      )}

      {finale && (
        <g>
          <ellipse
            cx={x((finale.startKm + finale.endKm) / 2)}
            cy={(yAt(finale.startKm) + yAt(finale.endKm)) / 2}
            rx={Math.max(16, (x(finale.endKm) - x(finale.startKm)) / 2 + 9)}
            ry={(Math.abs(yAt(finale.startKm) - yAt(finale.endKm)) / 2 || 6) + 9}
            stroke={RED}
            strokeWidth={1.8}
            fill="none"
            transform={`rotate(-8 ${x((finale.startKm + finale.endKm) / 2)} ${(yAt(finale.startKm) + yAt(finale.endKm)) / 2})`}
          />
          <text x={x(finale.startKm) - 6} y={Math.min(yAt(finale.startKm), yAt(finale.endKm)) - 18} fontSize={17} fontWeight={700} fill={RED} textAnchor="end">
            voluit!
          </text>
        </g>
      )}

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

function Moments({ view }: { view: BriefingView }) {
  const moments = briefingMoments({
    format: view.format,
    category: view.division?.category ?? null,
    route: view.route?.keyPoints ?? null,
    powerups: view.powerups,
    own: view.own.filter((r) => r.inPen).map((r) => ({ zwiftId: r.zwiftId, name: r.name, role: r.role, limits: r.limits })),
  });
  if (moments.length === 0) return null;
  return (
    <dl className="mt-1">
      {moments.map((moment) => (
        <div key={`${moment.km}-${moment.what}`} className={cn("grid grid-cols-[4.25rem_minmax(0,1fr)] gap-2 border-b py-1 leading-snug", RULE)}>
          <dt className="whitespace-nowrap font-bold tabular-nums">{nl.format(moment.km)} km</dt>
          <dd>
            <span className={cn(moment.key && "font-bold")}>{moment.what}</span> <span style={{ color: PENCIL }}>→</span>{" "}
            <span className={cn(moment.key && HIGHLIGHT)}>{moment.todo}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Rules({ view }: { view: BriefingView }) {
  const rules = cheatRules(view.format, view.own.filter((r) => r.inPen).length);
  return (
    <div>
      <Title>Onthouden</Title>
      <dl>
        {rules.map((rule) => (
          <div key={rule.value} className={cn("flex gap-3 border-b py-1 leading-snug", RULE)}>
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
  if (view.watch.length === 0) return null;
  const wonAt = (zwiftId: number) => {
    const rider = view.field.find((r) => r.zwiftId === zwiftId);
    const index = rider?.history.indexOf(1) ?? -1;
    return index >= 0 ? view.historyLabels[index] : null;
  };
  return (
    <div className="mt-4">
      <Title>Volgen</Title>
      <ul>
        {view.watch.map((w) => (
          <li key={w.zwiftId} className={cn("border-b py-1 leading-snug", RULE)}>
            <span className="font-bold">{cleanRiderName(w.name)}</span>
            {w.teamLabel && <span style={{ color: PENCIL }}> {w.teamLabel}</span>}
            {w.reason === "won" && wonAt(w.zwiftId) && <span style={{ color: GREEN }}> · won {wonAt(w.zwiftId)}</span>}
            {w.reason === "podium" && <span style={{ color: PENCIL }}> · podium eerder</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Warnings({ view }: { view: BriefingView }) {
  // Grenzen staan al bij de rollen.
  const warnings = view.warnings.filter((w) => w.kind !== "limits");
  if (warnings.length === 0) return null;
  return (
    <div className="mt-4">
      <Title>Let op</Title>
      <ul>
        {warnings.map((w) => (
          <li key={w.text} className={cn("flex gap-1.5 border-b py-1 leading-snug", RULE)} style={{ color: RED }}>
            <X aria-hidden strokeWidth={2.5} className="mt-1 size-4 shrink-0" />
            <span>{w.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RaceSheet({ view }: { view: BriefingView }) {
  const loaded = view.route?.loaded ?? null;
  const meta = [
    view.event.teamName,
    FORMAT_LABELS[view.format].toLowerCase(),
    loaded?.routeName,
    dateLabel.format(new Date(view.event.startAt)),
  ].filter(Boolean);
  return (
    <SpiekPaper id="racebriefje" title="Racebriefje">
      <p className="mt-2 text-sm" style={{ color: PENCIL }}>
        {meta.join(" · ")}
      </p>
      {view.route && loaded && (
        <div className="mt-3">
          <Title>De route</Title>
          <RouteSketch segments={loaded.route.segments} keyPoints={view.route.keyPoints} />
        </div>
      )}
      <div className="mt-3 grid gap-x-10 md:grid-cols-2">
        <div>
          <Moments view={view} />
          {view.plan?.text && (
            <div className="mt-4">
              <Title>Plan</Title>
              <p className={cn("mt-1 whitespace-pre-line leading-snug", HAND_TEXT)}>{view.plan.text}</p>
            </div>
          )}
        </div>
        <div className="mt-4 md:mt-0">
          <Rules view={view} />
          <Roles view={view} />
          <Watch view={view} />
          <Warnings view={view} />
        </div>
      </div>
    </SpiekPaper>
  );
}
