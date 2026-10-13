// Tekenkit voor de oefeningfiguren: een silhouet in zijaanzicht.
//
// Een pose is data, geen component. Je geeft op waar heup, schouder, handen en
// voeten zijn; ellebogen en knieën rekent de kit zelf uit met vaste
// segmentlengtes. Daardoor heeft elke figuur dezelfde verhoudingen, en kan de
// lus vloeiend van de ene naar de andere houding zonder dat een arm of been
// onderweg krimpt.
//
// Kleur komt uit de designtokens: het lichaam is `currentColor`, de werkende
// spieren en de aanwijslijn zijn `--figure-hot`. De wrapper zet beide voor licht
// en donker, dus er is geen tweede set beeld nodig. Geen marker-defs, want die
// vragen om unieke id's per SVG; een pijlpunt is gewoon een driehoekje.

import type { ExerciseMuscles, MuscleGroup } from "@/lib/training/muscles";

export type Point = [number, number];

/** Kant waarnaar een gewricht uitwijkt: 1 = naar de voorkant van het lichaam,
 * -1 = naar achteren. Een waarde ertussen tekent het ledemaat verkort: zo ziet
 * een knie of elleboog eruit die naar de kijker toe wijst. */
export type Bend = number;

export type Accent = {
  /** Pad van de aanwijslijn: bewegingsrichting of aandachtspunt. */
  d: string;
  /** Pijlpunt als losse driehoek, zodat we geen marker-id nodig hebben. */
  arrow?: Point[];
  dashed?: boolean;
};

type Anchor = "hand" | "shoulder" | "foot";

/** Materiaal dat aan het lichaam vastzit en dus meebeweegt. */
export type Gear =
  /** Halterschijf van opzij: de stang wijst naar de kijker. */
  | { kind: "schijf"; at: Anchor }
  /** Dumbbell of kettlebell. */
  | { kind: "gewicht"; at: Anchor }
  /** Voetplaat van een leg press, haaks op het been. */
  | { kind: "plaat"; at: "foot" }
  /** Kabel of weerstandsband naar een vast punt. */
  | { kind: "lijn"; from: Anchor; to: Point };

export type Pose = {
  /** Heupgewricht. */
  hip: Point;
  /** Schouder. Alleen de richting vanaf de heup telt; de romplengte ligt vast. */
  shoulder: Point;
  /** Kant waar de borst zit, gezien langs de romp omhoog: 1 = rechtsom. Staand
   * met het gezicht naar rechts is 1, op de rug met het hoofd links ook. */
  facing?: 1 | -1;
  /** Kromming van de rug in pixels: positief bolt naar de rugkant. */
  arch?: number;
  /** Hoofd ten opzichte van de romp, in graden: positief is kin naar de borst. */
  nod?: number;
  /** Pols en enkel van de dichtstbijzijnde arm en het dichtstbijzijnde been. */
  hand: Point;
  foot: Point;
  /** De verre arm en het verre been; lichter, zodat diepte leesbaar blijft. */
  farHand?: Point;
  farFoot?: Point;
  /** Standaard wijkt een knie naar voren uit en een elleboog naar achteren. */
  knee?: Bend;
  farKnee?: Bend;
  elbow?: Bend;
  farElbow?: Bend;
  /** Richting van de voet in graden (0 = naar rechts, 90 = omlaag). Zonder
   * waarde staat de voet haaks op het scheenbeen. */
  toes?: number;
  farToes?: number;
  accent?: Accent;
  /** Sterkte van de aanwijslijn; alleen de overgang tussen poses zet deze. */
  accentOpacity?: number;
  /** Bank, muur, trede: grijze hulplijnen als pad. */
  props?: string[];
  gear?: Gear[];
  /** Grondlijn tonen. Standaard aan. */
  ground?: boolean;
  /** Verkleining rond het midden van de grondlijn, voor een figuur die op een
   * verhoging staat en anders boven het beeld uitkomt. */
  zoom?: number;
};

export const VIEW_WIDTH = 320;
export const VIEW_HEIGHT = 220;
export const GROUND_Y = 192;
/** Hoogte van de enkel boven de grond bij een platte voet. */
export const ANKLE_Y = GROUND_Y - 5;

const TORSO = 54;
const NECK = 7;
const HEAD_RX = 10.5;
const HEAD_RY = 12;
const UPPER_ARM = 29;
const FOREARM = 27;
const THIGH = 43;
const SHANK = 41;
const FOOT = 16;

/** Heuphoogte bij gestrekt staan; handig als ijkpunt voor nieuwe poses. */
export const STAND_HIP_Y = ANKLE_Y - THIGH - SHANK;

// ──────────────────────────────────────────────────────────────────────
// Meetkunde
// ──────────────────────────────────────────────────────────────────────

const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const scale = (a: Point, k: number): Point => [a[0] * k, a[1] * k];
const lerp = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
const length = (a: Point) => Math.hypot(a[0], a[1]);

function unit(a: Point, fallback: Point = [0, -1]): Point {
  const size = length(a);
  return size < 1e-6 ? fallback : [a[0] / size, a[1] / size];
}

/** Voorkant van een ledemaat dat van romp naar uiteinde in richting `d` wijst. */
function frontOf(d: Point, facing: number): Point {
  return [facing * d[1], -facing * d[0]];
}

/**
 * Tussengewricht van een arm of been: twee segmenten van vaste lengte tussen
 * `from` en `to`. Ligt het doel buiten bereik, dan strekt het ledemaat zich en
 * komt het uiteinde korter uit dan gevraagd.
 */
function joint(
  from: Point,
  to: Point,
  first: number,
  second: number,
  facing: number,
  bend: number,
): { mid: Point; end: Point } {
  const direction = unit(sub(to, from), [0, 1]);
  const reach = Math.min(
    Math.max(length(sub(to, from)), Math.abs(first - second) + 0.5),
    first + second - 0.01,
  );
  const along = (first * first - second * second + reach * reach) / (2 * reach);
  const off = Math.sqrt(Math.max(0, first * first - along * along));
  const side = scale(frontOf(direction, facing), off * bend);
  return {
    mid: add(add(from, scale(direction, along)), side),
    end: add(from, scale(direction, reach)),
  };
}

const fmt = (value: number) => (Math.round(value * 10) / 10).toString();
const path = (points: Point[]) =>
  `M ${points.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join(" L ")} Z`;

function normals(points: Point[]): Point[] {
  return points.map((_, index) => {
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(points.length - 1, index + 1)];
    const d = unit(sub(after, before));
    return [d[1], -d[0]] as Point;
  });
}

/** Halve cirkel om `center`, van `side` via `forward` naar de overkant. */
function cap(center: Point, radius: number, side: Point, forward: Point): Point[] {
  const points: Point[] = [];
  for (let step = 1; step < 6; step++) {
    const angle = (Math.PI * step) / 6;
    points.push(
      add(center, add(scale(side, radius * Math.cos(angle)), scale(forward, radius * Math.sin(angle)))),
    );
  }
  return points;
}

/** Omtrek van een lint langs `points` met per punt een eigen halve breedte, en
 * ronde uiteinden. Hiermee is elk lichaamsdeel getekend. */
function ribbon(points: Point[], radii: number[]): string {
  const n = normals(points);
  const left = points.map((p, i) => add(p, scale(n[i], radii[i])));
  const right = points.map((p, i) => sub(p, scale(n[i], radii[i]))).reverse();
  const last = points.length - 1;
  const forward = (i: number): Point => [-n[i][1], n[i][0]];
  return path([
    ...left,
    ...cap(points[last], radii[last], n[last], forward(last)),
    ...right,
    ...cap(points[0], radii[0], scale(n[0], -1), scale(forward(0), -1)),
  ]);
}

/** Eén helft van zo'n lint: de kant waar `side` naartoe wijst. */
function halfRibbon(points: Point[], radii: number[], side: Point): string {
  const n = normals(points);
  const sign = n[0][0] * side[0] + n[0][1] * side[1] >= 0 ? 1 : -1;
  const edge = points.map((p, i) => add(p, scale(n[i], radii[i] * sign)));
  return path([...edge, ...[...points].reverse()]);
}

function between(points: Point[], radii: number[], from: number, to: number) {
  const at = (t: number) => {
    const position = t * (points.length - 1);
    const index = Math.min(points.length - 2, Math.floor(position));
    const local = position - index;
    return {
      point: lerp(points[index], points[index + 1], local),
      radius: radii[index] + (radii[index + 1] - radii[index]) * local,
    };
  };
  const steps = 5;
  const cut = Array.from({ length: steps + 1 }, (_, i) => at(from + ((to - from) * i) / steps));
  return { points: cut.map((c) => c.point), radii: cut.map((c) => c.radius) };
}

// ──────────────────────────────────────────────────────────────────────
// Skelet
// ──────────────────────────────────────────────────────────────────────

type Limb = { root: Point; mid: Point; end: Point };

type Skeleton = {
  facing: number;
  spine: Point[];
  up: Point;
  front: Point;
  head: Point;
  headAngle: number;
  arm: Limb;
  farArm: Limb | null;
  leg: Limb & { toe: Point };
  farLeg: (Limb & { toe: Point }) | null;
};

function toeDirection(shank: Point, facing: number, ankle: Point, angle?: number): Point {
  if (angle != null) {
    const radians = (angle * Math.PI) / 180;
    return [Math.cos(radians), Math.sin(radians)];
  }
  const square = frontOf(shank, facing);
  // Een voet die haaks op het scheenbeen door de vloer zou steken, ligt in
  // werkelijkheid gestrekt: geknield of op de buik.
  if (ankle[1] + square[1] * FOOT > GROUND_Y + 4) return shank;
  return square;
}

function solve(pose: Pose): Skeleton {
  const facing = pose.facing ?? 1;
  const up = unit(sub(pose.shoulder, pose.hip));
  const shoulder = add(pose.hip, scale(up, TORSO));
  const front: Point = [-facing * up[1], facing * up[0]];

  const bow = scale(front, -(pose.arch ?? 0));
  const middle = add(lerp(pose.hip, shoulder, 0.5), bow);
  const spine = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    return lerp(lerp(pose.hip, middle, t), lerp(middle, shoulder, t), t);
  });

  const neckBase = unit(sub(spine[6], spine[5]));
  const nod = ((pose.nod ?? 0) * Math.PI * facing) / 180;
  const neck: Point = [
    neckBase[0] * Math.cos(nod) - neckBase[1] * Math.sin(nod),
    neckBase[0] * Math.sin(nod) + neckBase[1] * Math.cos(nod),
  ];
  const head = add(shoulder, scale(neck, NECK + HEAD_RY));

  const armRoot = sub(shoulder, scale(neckBase, 5));
  const arm = (hand: Point, bend: number): Limb => ({
    root: armRoot,
    ...joint(armRoot, hand, UPPER_ARM, FOREARM, facing, bend),
  });
  const leg = (foot: Point, bend: number, toes?: number) => {
    const limb = joint(pose.hip, foot, THIGH, SHANK, facing, bend);
    const shank = unit(sub(limb.end, limb.mid), [0, 1]);
    return {
      root: pose.hip,
      ...limb,
      toe: toeDirection(shank, facing, limb.end, toes),
    };
  };

  return {
    facing,
    spine,
    up: neckBase,
    front,
    head,
    headAngle: (Math.atan2(neck[1], neck[0]) * 180) / Math.PI + 90,
    arm: arm(pose.hand, pose.elbow ?? -1),
    farArm: pose.farHand ? arm(pose.farHand, pose.farElbow ?? pose.elbow ?? -1) : null,
    leg: leg(pose.foot, pose.knee ?? 1, pose.toes),
    farLeg: pose.farFoot
      ? leg(pose.farFoot, pose.farKnee ?? pose.knee ?? 1, pose.farToes)
      : null,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Tussen twee poses
// ──────────────────────────────────────────────────────────────────────

const mixNumber = (a: number | undefined, b: number | undefined, t: number) =>
  (a ?? 0) + ((b ?? 0) - (a ?? 0)) * t;

/**
 * De houding op `t` tussen `a` (0) en `b` (1). Gemengd worden de punten die je
 * opgeeft, niet de uitgerekende gewrichten: zo houdt elk ledemaat onderweg zijn
 * lengte. De aanwijslijn van de pose waar je vandaan komt dooft uit, die van de
 * pose waar je heen gaat komt op.
 */
export function blendPose(a: Pose, b: Pose, t: number): Pose {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const near = t < 0.5 ? a : b;
  const optional = (from?: Point, to?: Point) =>
    from && to ? lerp(from, to, t) : near === a ? from : to;
  const angle = (from?: number, to?: number) =>
    from != null && to != null ? from + (to - from) * t : undefined;

  return {
    hip: lerp(a.hip, b.hip, t),
    shoulder: lerp(a.shoulder, b.shoulder, t),
    facing: near.facing,
    arch: mixNumber(a.arch, b.arch, t),
    nod: mixNumber(a.nod, b.nod, t),
    hand: lerp(a.hand, b.hand, t),
    foot: lerp(a.foot, b.foot, t),
    farHand: optional(a.farHand, b.farHand),
    farFoot: optional(a.farFoot, b.farFoot),
    knee: mixNumber(a.knee ?? 1, b.knee ?? 1, t),
    farKnee: mixNumber(a.farKnee ?? a.knee ?? 1, b.farKnee ?? b.knee ?? 1, t),
    elbow: mixNumber(a.elbow ?? -1, b.elbow ?? -1, t),
    farElbow: mixNumber(a.farElbow ?? a.elbow ?? -1, b.farElbow ?? b.elbow ?? -1, t),
    toes: angle(a.toes, b.toes),
    farToes: angle(a.farToes, b.farToes),
    accent: near.accent,
    accentOpacity: Math.abs(1 - 2 * t),
    props: near.props,
    gear: near.gear,
    ground: near.ground,
    zoom: near.zoom,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Aanwijslijnen
// ──────────────────────────────────────────────────────────────────────

/** Rechte pijl van `from` naar `to`. */
export function arrow(from: Point, to: Point, dashed = false): Accent {
  const d = unit(sub(to, from));
  const base = sub(to, scale(d, 13));
  const side: Point = [d[1] * 6.5, -d[0] * 6.5];
  return {
    d: `M ${from[0]} ${from[1]} L ${fmt(base[0])} ${fmt(base[1])}`,
    arrow: [to, add(base, side), sub(base, side)],
    dashed,
  };
}

/** Gebogen pijl van `from` naar `to`, met `via` als buigpunt. */
export function swing(from: Point, via: Point, to: Point, dashed = false): Accent {
  const d = unit(sub(to, via));
  const base = sub(to, scale(d, 13));
  const side: Point = [d[1] * 6.5, -d[0] * 6.5];
  return {
    d: `M ${from[0]} ${from[1]} Q ${via[0]} ${via[1]} ${fmt(base[0])} ${fmt(base[1])}`,
    arrow: [to, add(base, side), sub(base, side)],
    dashed,
  };
}

/** Stippellijn: "dit hoort één lijn te zijn". */
export function guide(from: Point, to: Point): Accent {
  return { d: `M ${from[0]} ${from[1]} L ${to[0]} ${to[1]}`, dashed: true };
}

// ──────────────────────────────────────────────────────────────────────
// Tekenen
// ──────────────────────────────────────────────────────────────────────

type Zone =
  | "thighFront"
  | "thighBack"
  | "calf"
  | "glute"
  | "hipFront"
  | "torsoFrontLow"
  | "torsoFrontHigh"
  | "torsoBackLow"
  | "torsoBackHigh"
  | "shoulder"
  | "upperArmFront"
  | "upperArmBack"
  | "forearm";

/** Waar een spiergroep in zijaanzicht te zien is. Adductoren en nek zitten in
 * dit aanzicht achter andere delen; die toont alleen de spierkaart. */
const ZONES: Partial<Record<MuscleGroup, Zone[]>> = {
  quadriceps: ["thighFront"],
  hamstrings: ["thighBack"],
  kuiten: ["calf"],
  bilspieren: ["glute"],
  heupbuigers: ["hipFront"],
  buik: ["torsoFrontLow"],
  schuin: ["torsoFrontLow"],
  borst: ["torsoFrontHigh"],
  onderrug: ["torsoBackLow"],
  bovenrug: ["torsoBackHigh"],
  schouders: ["shoulder"],
  biceps: ["upperArmFront"],
  triceps: ["upperArmBack"],
  onderarmen: ["forearm"],
};

function zoneStrength(muscles?: ExerciseMuscles): Partial<Record<Zone, number>> {
  const strength: Partial<Record<Zone, number>> = {};
  if (!muscles) return strength;
  const mark = (groups: MuscleGroup[], value: number) => {
    for (const group of groups) {
      for (const zone of ZONES[group] ?? []) {
        strength[zone] = Math.max(strength[zone] ?? 0, value);
      }
    }
  };
  mark(muscles.secondary, 0.45);
  mark(muscles.primary, 1);
  return strength;
}

const THIGH_R = [10.5, 7.6];
const SHANK_R = [7.2, 4.8];
const UPPER_ARM_R = [6.8, 5.3];
const FOREARM_R = [5.1, 3.9];
const TORSO_R = [12, 11.4, 11, 11.8, 13, 13.4, 11.6];

const HOT = "var(--figure-hot, var(--accent))";
const HALO = { stroke: "var(--card)", strokeWidth: 3, paintOrder: "stroke" } as const;

function Hot({ d, strength }: { d: string; strength?: number }) {
  if (!strength) return null;
  return <path d={d} fill={HOT} stroke="none" opacity={strength} />;
}

function Leg({
  limb,
  facing,
  zones,
}: {
  limb: Limb & { toe: Point };
  facing: number;
  zones: Partial<Record<Zone, number>>;
}) {
  const thigh = [limb.root, limb.mid];
  const shank = [limb.mid, limb.end];
  const thighFront = frontOf(unit(sub(limb.mid, limb.root)), facing);
  const shankDirection = unit(sub(limb.end, limb.mid), [0, 1]);
  const shankBack = scale(frontOf(shankDirection, facing), -1);
  const sole = add(limb.end, scale(shankDirection, 2));
  const foot = [sub(sole, scale(limb.toe, 3)), add(sole, scale(limb.toe, FOOT))];

  return (
    <>
      <path d={ribbon(foot, [4.6, 3.2])} />
      <path d={ribbon(shank, SHANK_R)} />
      <path d={ribbon(thigh, THIGH_R)} />
      <Hot d={halfRibbon(thigh, THIGH_R, thighFront)} strength={zones.thighFront} />
      <Hot d={halfRibbon(thigh, THIGH_R, scale(thighFront, -1))} strength={zones.thighBack} />
      <Hot
        d={halfRibbon(...slice(shank, SHANK_R, 0, 0.7), shankBack)}
        strength={zones.calf}
      />
    </>
  );
}

function slice(points: Point[], radii: number[], from: number, to: number): [Point[], number[]] {
  const cut = between(points, radii, from, to);
  return [cut.points, cut.radii];
}

function Arm({
  limb,
  facing,
  zones,
}: {
  limb: Limb;
  facing: number;
  zones: Partial<Record<Zone, number>>;
}) {
  const upper = [limb.root, limb.mid];
  const lower = [limb.mid, limb.end];
  const upperFront = frontOf(unit(sub(limb.mid, limb.root)), facing);
  const hand = add(limb.end, scale(unit(sub(limb.end, limb.mid), [0, 1]), 3.5));

  return (
    <>
      <path d={ribbon(lower, FOREARM_R)} />
      <circle cx={fmt(hand[0])} cy={fmt(hand[1])} r={4.8} />
      <path d={ribbon(upper, UPPER_ARM_R)} />
      <Hot d={ribbon(lower, FOREARM_R)} strength={zones.forearm} />
      <Hot d={halfRibbon(upper, UPPER_ARM_R, upperFront)} strength={zones.upperArmFront} />
      <Hot
        d={halfRibbon(upper, UPPER_ARM_R, scale(upperFront, -1))}
        strength={zones.upperArmBack}
      />
      {zones.shoulder ? (
        <circle
          cx={fmt(limb.root[0])}
          cy={fmt(limb.root[1])}
          r={6.6}
          fill={HOT}
          stroke="none"
          opacity={zones.shoulder}
        />
      ) : null}
    </>
  );
}

function GearShape({ item, body }: { item: Gear; body: Skeleton }) {
  const anchor = (at: Anchor): Point => {
    if (at === "hand") {
      return add(body.arm.end, scale(unit(sub(body.arm.end, body.arm.mid), [0, 1]), 3.5));
    }
    if (at === "foot") return body.leg.end;
    // De stang ligt op de bovenrug, net achter de schouder.
    return add(add(body.spine[6], scale(body.front, -9)), scale(body.up, -4));
  };

  if (item.kind === "lijn") {
    const from = anchor(item.from);
    return (
      <line
        x1={fmt(from[0])}
        y1={fmt(from[1])}
        x2={item.to[0]}
        y2={item.to[1]}
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.6}
      />
    );
  }

  if (item.kind === "plaat") {
    const along = unit(sub(body.leg.end, body.leg.root), [1, 0]);
    const center = add(body.leg.end, scale(along, 9));
    const across: Point = [along[1] * 24, -along[0] * 24];
    const a = add(center, across);
    const b = sub(center, across);
    return (
      <line
        x1={fmt(a[0])}
        y1={fmt(a[1])}
        x2={fmt(b[0])}
        y2={fmt(b[1])}
        stroke="var(--border)"
        strokeWidth={6}
        strokeLinecap="round"
      />
    );
  }

  const [x, y] = anchor(item.at);
  if (item.kind === "schijf") {
    return (
      <g>
        <circle cx={fmt(x)} cy={fmt(y)} r={13} fill="var(--card)" stroke="currentColor" strokeWidth={4} />
        <circle cx={fmt(x)} cy={fmt(y)} r={3} fill="currentColor" />
      </g>
    );
  }
  return <circle cx={fmt(x)} cy={fmt(y)} r={8} fill="currentColor" {...HALO} />;
}

/**
 * Eén houding. De viewBox is 320×220 en de kaart is op telefoon ongeveer even
 * breed, dus één SVG-eenheid komt ruwweg op één CSS-pixel uit — de regel uit de
 * mobiele revisie.
 */
export function Figure({
  pose,
  muscles,
  className,
}: {
  pose: Pose;
  muscles?: ExerciseMuscles;
  className?: string;
}) {
  const showGround = pose.ground ?? true;
  const body = solve(pose);
  const zones = zoneStrength(muscles);
  const back = scale(body.front, -1);
  const hip = body.spine[0];
  const shoulder = body.spine[6];
  const glute = add(add(hip, scale(back, 4)), scale(body.up, -1));
  const hipFront = add(add(hip, scale(body.front, 6)), scale(body.up, 4));
  const zoom = pose.zoom
    ? `translate(${VIEW_WIDTH / 2} ${GROUND_Y}) scale(${pose.zoom}) translate(${-VIEW_WIDTH / 2} ${-GROUND_Y})`
    : undefined;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className={`h-auto w-full text-primary [--figure-hot:var(--accent)] dark:text-foreground/85 dark:[--figure-hot:var(--primary)] ${className ?? ""}`}
      role="presentation"
      aria-hidden="true"
    >
      {showGround && (
        <line
          x1={24}
          y1={GROUND_Y}
          x2={VIEW_WIDTH - 24}
          y2={GROUND_Y}
          stroke="var(--border)"
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}

      <g transform={zoom}>
      {pose.props?.map((d, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          stroke="var(--border)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      <g fill="currentColor" strokeLinejoin="round">
        <g opacity={0.4}>
          {body.farArm && <Arm limb={body.farArm} facing={body.facing} zones={{}} />}
          {body.farLeg && <Leg limb={body.farLeg} facing={body.facing} zones={{}} />}
        </g>

        <g {...HALO}>
          <path d={ribbon([shoulder, body.head], [5, 4.6])} />
          <ellipse
            cx={fmt(body.head[0])}
            cy={fmt(body.head[1])}
            rx={HEAD_RX}
            ry={HEAD_RY}
            transform={`rotate(${fmt(body.headAngle)} ${fmt(body.head[0])} ${fmt(body.head[1])})`}
          />
          <path d={ribbon(body.spine, TORSO_R)} />
        </g>
        <Hot
          d={halfRibbon(...slice(body.spine, TORSO_R, 0.08, 0.52), body.front)}
          strength={zones.torsoFrontLow}
        />
        <Hot
          d={halfRibbon(...slice(body.spine, TORSO_R, 0.52, 0.9), body.front)}
          strength={zones.torsoFrontHigh}
        />
        <Hot
          d={halfRibbon(...slice(body.spine, TORSO_R, 0.08, 0.48), back)}
          strength={zones.torsoBackLow}
        />
        <Hot
          d={halfRibbon(...slice(body.spine, TORSO_R, 0.48, 0.92), back)}
          strength={zones.torsoBackHigh}
        />

        <g {...HALO}>
          <Leg limb={body.leg} facing={body.facing} zones={zones} />
        </g>
        {zones.glute ? (
          <circle cx={fmt(glute[0])} cy={fmt(glute[1])} r={7.4} fill={HOT} stroke="none" opacity={zones.glute} />
        ) : null}
        {zones.hipFront ? (
          <circle
            cx={fmt(hipFront[0])}
            cy={fmt(hipFront[1])}
            r={5}
            fill={HOT}
            opacity={zones.hipFront}
          />
        ) : null}

        <g {...HALO}>
          <Arm limb={body.arm} facing={body.facing} zones={zones} />
        </g>
      </g>

      {pose.gear?.map((item, index) => (
        <GearShape key={index} item={item} body={body} />
      ))}

      {pose.accent && (
        <g opacity={pose.accentOpacity ?? 1}>
          <path
            d={pose.accent.d}
            fill="none"
            stroke={HOT}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={pose.accent.dashed ? "8 7" : undefined}
          />
          {pose.accent.arrow && (
            <polygon
              points={pose.accent.arrow.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(" ")}
              fill={HOT}
            />
          )}
        </g>
      )}
      </g>
    </svg>
  );
}
