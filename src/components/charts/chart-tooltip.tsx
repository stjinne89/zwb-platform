export type TooltipRow = {
  label: string;
  value: string;
  color?: string;
};

const TITLE_Y = 21;
const FIRST_ROW_Y = 43;
const ROW_HEIGHT = 19;
const BOTTOM_PADDING = 11;

/**
 * SVG-tooltip die zelf zijn hoogte bepaalt en bij de rechterrand omklapt.
 * Hoort binnen een <svg> gerenderd te worden.
 */
export function ChartTooltip({
  x,
  y,
  chartWidth,
  title,
  rows,
  width = 214,
}: {
  x: number;
  y: number;
  chartWidth: number;
  title: string;
  rows: TooltipRow[];
  width?: number;
}) {
  const height = FIRST_ROW_Y + Math.max(rows.length - 1, 0) * ROW_HEIGHT + BOTTOM_PADDING;
  const flip = x > chartWidth - (width + 40);
  const offsetX = flip ? x - width - 12 : x + 12;

  return (
    <g transform={`translate(${offsetX}, ${y})`}>
      <rect width={width} height={height} rx="8" fill="var(--popover)" stroke="var(--border)" />
      <text x="12" y={TITLE_Y} fontSize="12" fontWeight="600" fill="var(--popover-foreground)">
        {title}
      </text>
      {rows.map((row, index) => (
        <text
          key={`${row.label}-${index}`}
          x="12"
          y={FIRST_ROW_Y + index * ROW_HEIGHT}
          fontSize="12"
          fill={row.color ?? "var(--popover-foreground)"}
        >
          {row.label} {row.value}
        </text>
      ))}
    </g>
  );
}
