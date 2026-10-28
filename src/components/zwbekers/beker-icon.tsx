import { useId } from "react";
import {
  BELT,
  BELT_PLATE,
  LINT_COLOR,
  MEDAL,
  METAL_COLOR,
  NIVEAU_COLOR,
  SOKKEL_COLOR,
  SOKKEL_HEIGHT,
  describeDesign,
  gravureLines,
  handlesPath,
  sidePlateOutline,
  silhouettePath,
  trophyBounds,
  type BekerDesign,
  type Point,
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
  const plateHeight = SOKKEL_HEIGHT * (gravureLines(design).length > 1 ? 0.6 : 0.4);

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
      {gravureLines(design).length > 0 && (
        <rect
          x={-Math.min(bounds.sokkelWidth * 0.84, 1.1) / 2}
          y={sokkelTop + (SOKKEL_HEIGHT - plateHeight) / 2}
          width={Math.min(bounds.sokkelWidth * 0.84, 1.1)}
          height={plateHeight}
          fill="#c9a45a"
        />
      )}

      <g transform={`translate(0 ${sokkelTop})`}>
        {design.vorm === "medaille" ? (
          <Medal design={design} metal={`url(#${id}-metal)`} />
        ) : design.vorm === "riem" ? (
          <Belt design={design} metal={`url(#${id}-metal)`} shade={`${id}-shade`} />
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

/** Een omtrek om (cx, cy) als SVG-pad, met y omhoog; `squeeze` maakt hem smaller (een plaat opzij). */
function outlinePath(outline: readonly Point[], cx: number, cy: number, squeeze = 1): string {
  return `M ${outline.map(([x, y]) => `${(cx + x * squeeze).toFixed(3)} ${(-(cy + y)).toFixed(3)}`).join(" L ")} Z`;
}

/** De kampioensriem van voren: het leer, de zijplaten, het schild met emaille en steen. */
function Belt({ design, metal, shade }: { design: BekerDesign; metal: string; shade: string }) {
  const { radius, center, height } = BELT;
  const stone = NIVEAU_COLOR[design.niveau];
  return (
    <>
      {/* De fluwelen standaard, onder de riem zichtbaar. */}
      <rect x={-(radius - BELT.thickness)} y={-(center + height / 2)} width={(radius - BELT.thickness) * 2} height={center + height / 2} fill="#0f2f36" />
      <rect x={-radius} y={-(center + height / 2)} width={radius * 2} height={height} rx={0.03} fill={LINT_COLOR[design.lint]} />
      {/* Naar de zijkanten loopt de riem weg: daar donkerder. */}
      <rect x={-radius} y={-(center + height / 2)} width={radius * 2} height={height} rx={0.03} fill={`url(#${shade})`} />
      <defs>
        <linearGradient id={shade} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.45" />
          <stop offset="0.3" stopColor="#000" stopOpacity="0" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      {[center - height / 2 + 0.025, center + height / 2 - 0.025].map((y) => (
        <line key={y} x1={-radius + 0.02} x2={radius - 0.02} y1={-y} y2={-y} stroke="#d9cfb8" strokeWidth={0.008} strokeDasharray="0.025 0.015" />
      ))}
      {BELT.sides.flatMap((side) =>
        [-1, 1].map((sign) => {
          const x = radius * Math.sin(side.angle) * sign;
          const squeeze = Math.cos(side.angle);
          return (
            <g key={`${side.angle}-${sign}`}>
              <path d={outlinePath(sidePlateOutline(side.width, side.height), x, center, squeeze)} fill={metal} />
              <circle cx={x} cy={-center} r={side.width * 0.18 * squeeze} fill={stone} />
            </g>
          );
        }),
      )}
      <path d={outlinePath(BELT_PLATE, 0, center)} fill={metal} />
      <circle cx={0} cy={-center} r={BELT.enamel + 0.008} fill="none" stroke="rgb(0 0 0 / 0.25)" strokeWidth={0.026} />
      <circle cx={0} cy={-center} r={BELT.enamel} fill={stone} />
      <circle cx={0} cy={-center} r={BELT.enamel} fill="rgb(0 0 0 / 0.45)" />
      <circle cx={0} cy={-center} r={BELT.gem} fill={stone} />
      <circle cx={-BELT.gem * 0.3} cy={-center - BELT.gem * 0.3} r={BELT.gem * 0.28} fill="#fff" opacity={0.45} />
    </>
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
