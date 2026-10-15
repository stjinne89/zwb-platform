// Notatie voor ZWBeter racen: Nederlandse komma's, racetijden en verschillen.

const nl1 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nl2 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Racetijd vanaf de eigen start: "43:18,7", of "1:02:05,3" boven het uur. */
export function raceTime(ms: number | null): string {
  if (ms === null) return "—";
  const tenths = Math.round(ms / 100);
  const hours = Math.floor(tenths / 36000);
  const minutes = Math.floor((tenths % 36000) / 600);
  const seconds = ((tenths % 600) / 10).toFixed(1).replace(".", ",").padStart(4, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** Verschil in seconden met teken: "+18,1 s", "−5,3 s". */
export function signedSeconds(ms: number): string {
  const sign = ms > 0 ? "+" : ms < 0 ? "−" : "";
  return `${sign}${nl1.format(Math.abs(ms) / 1000)} s`;
}

export function wkg(value: number | null): string {
  return value === null ? "—" : nl2.format(value);
}

/** "1 min", "40 min", "45 s". */
export function durationLabel(seconds: number): string {
  return seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds} s`;
}

/** Klok binnen de race: "27:22". */
export function raceClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function decimal(value: number | null, digits = 2): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("nl-NL", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}
