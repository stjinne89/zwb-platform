/** Doorlopende lijn door alle punten. */
export function linePath<T>(
  points: T[],
  xFor: (point: T, index: number) => number,
  yFor: (point: T, index: number) => number,
) {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xFor(point, index).toFixed(1)} ${yFor(point, index).toFixed(1)}`,
    )
    .join(" ");
}

/**
 * Lijn in losse stukken: een ontbrekende waarde breekt de lijn af in plaats van
 * er dwars doorheen te trekken.
 */
export function lineSegments<T>(
  points: T[],
  valueFor: (point: T) => number | null,
  xFor: (index: number) => number,
  yFor: (value: number) => number,
) {
  const segments: string[] = [];
  let current = "";

  points.forEach((point, index) => {
    const value = valueFor(point);
    if (value == null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    const command = current ? "L" : "M";
    current += `${command} ${xFor(index).toFixed(1)} ${yFor(value).toFixed(1)} `;
  });

  if (current) segments.push(current);
  return segments;
}

/** Sluit een lijnpad af tot een vlak op de basislijn. */
export function areaPath(line: string, startX: number, endX: number, baselineY: number) {
  if (!line) return "";
  return `${line} L ${endX.toFixed(1)} ${baselineY.toFixed(1)} L ${startX.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}
