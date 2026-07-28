type CurvePoint = { seconds: number; watts: number };

/**
 * Waarde op een willekeurige duur, log-geïnterpoleerd tussen de twee
 * omliggende punten. Buiten het bereik van de curve: null.
 */
export function valueAt<T extends CurvePoint>(points: T[], seconds: number) {
  if (points.length === 0) return null;
  if (seconds < points[0].seconds || seconds > points[points.length - 1].seconds) return null;
  if (seconds === points[0].seconds) return points[0].watts;
  if (seconds === points[points.length - 1].seconds) return points[points.length - 1].watts;

  let low = 1;
  let high = points.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].seconds < seconds) low = middle + 1;
    else high = middle;
  }
  const right = points[low];
  const left = points[low - 1];
  const span = Math.log(right.seconds) - Math.log(left.seconds);
  const ratio = span === 0 ? 0 : (Math.log(seconds) - Math.log(left.seconds)) / span;
  return left.watts + (right.watts - left.watts) * ratio;
}

export function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
