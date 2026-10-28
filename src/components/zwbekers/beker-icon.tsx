import { useId } from "react";
import {
  LINT_COLOR,
  MEDAL,
  METAL_COLOR,
  SOKKEL_COLOR,
  SOKKEL_HEIGHT,
  describeDesign,
  handlesPath,
  silhouettePath,
  trophyBounds,
  type BekerDesign,
} from "@/lib/zwbekers/design";

/**
 * De beker als plaatje, uit dezelfde maten als de 3D-beker: voor de plank op het
 * profiel, lijsten en de kast zonder WebGL. Geen three.js, dus licht genoeg om
 * er tientallen van te tonen.
 */
export function BekerIcon({
  design,
  className,
  title,
}: {
  design: BekerDesign;
  className?: string;
  /** Voor schermlezers; zonder titel beschrijft het plaatje het ontwerp, leeg ("") verbergt het. */
  title?: string;
}) {
  const id = useId().replace(/:/g, "");
  const metal = METAL_COLOR[design.metaal];
  const bounds = trophyBounds(design);
  const half = Math.max(bounds.radius, bounds.sokkelWidth / 2) + 0.06;
  const height = bounds.height + 0.08;
  const sokkelTop = -SOKKEL_HEIGHT;
  const sokkelColor = SOKKEL_COLOR[design.sokkel];

  return (
    <svg
      viewBox={`${-half} ${-height} ${half * 2} ${height + 0.02}`}
      className={className}
      // Een lege titel: versiering naast tekst die de beker al noemt.
      {...(title === "" ? { "aria-hidden": true } : { role: "img", "aria-label": title ?? describeDesign(design) })}
    >
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={metal.dark} />
          <stop offset="0.32" stopColor={metal.light} />
          <stop offset="0.55" stopColor={metal.hex} />
          <stop offset="1" stopColor={metal.dark} />
        </linearGradient>
        <linearGradient id={`${id}-sokkel`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={sokkelColor} stopOpacity="0.85" />
          <stop offset="1" stopColor={sokkelColor} />
        </linearGradient>
      </defs>

      {/* De sokkel, met het messing plaatje als er een gravure is. */}
      <rect
        x={-bounds.sokkelWidth / 2}
        y={sokkelTop}
        width={bounds.sokkelWidth}
        height={SOKKEL_HEIGHT}
        rx={0.015}
        fill={`url(#${id}-sokkel)`}
        stroke={design.sokkel === "marmer" ? "#bdb8ad" : "none"}
        strokeWidth={0.01}
      />
      {design.gravure && (
        <rect
          x={-Math.min(bounds.sokkelWidth * 0.84, 1.1) / 2}
          y={sokkelTop + SOKKEL_HEIGHT * 0.3}
          width={Math.min(bounds.sokkelWidth * 0.84, 1.1)}
          height={SOKKEL_HEIGHT * 0.4}
          fill="#c9a45a"
        />
      )}

      <g transform={`translate(0 ${sokkelTop})`}>
        {design.vorm === "medaille" ? (
          <Medal design={design} metal={`url(#${id}-metal)`} />
        ) : (
          <>
            <path
              d={handlesPath(design)}
              fill="none"
              stroke={`url(#${id}-metal)`}
              strokeWidth={design.oren === "vleugel" ? 0.05 : 0.06}
              strokeLinecap="round"
            />
            <path d={silhouettePath(design)} fill={`url(#${id}-metal)`} />
          </>
        )}
      </g>
    </svg>
  );
}

function Medal({ design, metal }: { design: BekerDesign; metal: string }) {
  const { board, disc, ribbon } = MEDAL;
  const discTop = disc.center[1] + disc.radius;
  const strip = (side: number) => {
    const fromX = side * ribbon.spread;
    const toX = side * ribbon.bottomSpread;
    const w = ribbon.width / 2;
    return `M ${fromX - w} ${-ribbon.top} L ${fromX + w} ${-ribbon.top} L ${toX + w} ${-(discTop - 0.04)} L ${toX - w} ${-(discTop - 0.04)} Z`;
  };
  return (
    <>
      <rect x={-board.width / 2 - 0.02} y={-board.height - 0.02} width={board.width + 0.04} height={board.height + 0.04} fill="#c9a45a" />
      <rect x={-board.width / 2} y={-board.height} width={board.width} height={board.height} fill="#0f2f36" />
      <path d={strip(-1)} fill={LINT_COLOR[design.lint]} />
      <path d={strip(1)} fill={LINT_COLOR[design.lint]} opacity={0.88} />
      <circle cx={disc.center[0]} cy={-disc.center[1]} r={disc.radius} fill={metal} />
      <circle cx={disc.center[0]} cy={-disc.center[1]} r={disc.radius * 0.58} fill="none" stroke="rgb(0 0 0 / 0.18)" strokeWidth={0.012} />
    </>
  );
}
