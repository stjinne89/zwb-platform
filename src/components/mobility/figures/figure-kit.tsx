// Tekenkit voor de oefeningfiguren: silhouet met accentlijn.
//
// Een pose is data, geen component — een handvol gewrichtscoördinaten. Dat houdt
// achttien oefeningen behapbaar én consistent: elke figuur krijgt dezelfde
// lijndikte, dezelfde kleuren en dezelfde grondlijn.
//
// Kleur komt uit de designtokens: het silhouet is `currentColor` (de wrapper zet
// text-primary), het accent is var(--accent). Daardoor klopt licht én donker
// zonder tweede set beeld. Geen marker-defs, want die vragen om unieke id's per
// SVG; een pijlpunt is gewoon een driehoekje in de pose.

export type Point = [number, number];

export type Accent = {
  /** Pad van de gouden lijn: bewegingsrichting of aandachtspunt. */
  d: string;
  /** Pijlpunt als losse driehoek, zodat we geen marker-id nodig hebben. */
  arrow?: Point[];
  dashed?: boolean;
};

export type Pose = {
  /** Middelpunt van het hoofd. */
  head: Point;
  /** Nek: begin van de romp en van de arm. */
  neck: Point;
  /** Heup: eind van de romp en begin van het been. */
  hip: Point;
  /** Gebogen romp als pad, in plaats van de rechte lijn nek→heup. */
  torsoPath?: string;
  /** Arm vanaf de nek: elleboog, hand. */
  arm: Point[];
  /** Been vanaf de heup: knie, enkel. */
  leg: Point[];
  /** De verre arm en het verre been; lichter, zodat diepte leesbaar blijft. */
  farArm?: Point[];
  farLeg?: Point[];
  accent?: Accent;
  /** Bank, muur, stok: grijze hulplijnen als pad. */
  props?: string[];
  /** Grondlijn tonen. Uit bij staande oefeningen tegen een muur. */
  ground?: boolean;
};

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 220;
const GROUND_Y = 192;

function line(points: Point[]) {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

/**
 * Eén pose. De viewBox is 320×220 en de kaart is op telefoon ongeveer even
 * breed, dus één SVG-eenheid komt ruwweg op één CSS-pixel uit — de regel uit de
 * mobiele revisie.
 */
export function Figure({ pose, className }: { pose: Pose; className?: string }) {
  const showGround = pose.ground ?? true;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className={`h-auto w-full text-primary ${className ?? ""}`}
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

      {pose.props?.map((d, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          stroke="var(--border)"
          strokeWidth={6}
          strokeLinecap="round"
        />
      ))}

      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {pose.farArm && (
          <polyline points={line([pose.neck, ...pose.farArm])} strokeWidth={12} opacity={0.4} />
        )}
        {pose.farLeg && (
          <polyline points={line([pose.hip, ...pose.farLeg])} strokeWidth={12} opacity={0.4} />
        )}

        <polyline points={line([pose.neck, ...pose.arm])} strokeWidth={14} />
        {pose.torsoPath ? (
          <path d={pose.torsoPath} strokeWidth={22} />
        ) : (
          <polyline points={line([pose.neck, pose.hip])} strokeWidth={22} />
        )}
        <polyline points={line([pose.hip, ...pose.leg])} strokeWidth={16} />

        <circle cx={pose.head[0]} cy={pose.head[1]} r={14} fill="currentColor" stroke="none" />
      </g>

      {pose.accent && (
        <>
          <path
            d={pose.accent.d}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={pose.accent.dashed ? "8 7" : undefined}
          />
          {pose.accent.arrow && (
            <polygon points={line(pose.accent.arrow)} fill="var(--accent)" />
          )}
        </>
      )}
    </svg>
  );
}
