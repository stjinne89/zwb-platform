/** 45 -> "45s", 300 -> "5m", 7200 -> "2u". */
export function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const minutes = seconds / 60;
    return Number.isInteger(minutes) ? `${minutes}m` : `${minutes.toFixed(1)}m`;
  }
  const hours = seconds / 3600;
  return Number.isInteger(hours) ? `${hours}u` : `${hours.toFixed(1)}u`;
}

/** Datumsleutel "YYYY-MM-DD" -> "3 mrt". */
export function formatChartDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

export function formatMetric(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
