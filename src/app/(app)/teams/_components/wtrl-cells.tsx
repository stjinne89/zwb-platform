// zFTP/zMAP-weergave uit de WTRL-import, gedeeld door de rennerslijst en de
// selectiemaker per event.

import type { WtrlRiderSummary } from "@/lib/teams/wtrl-roster";
import type { PowerUnit } from "@/lib/training/power-unit";

function fmt(value: number | null | undefined, digits = 0) {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return Number(value).toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// Rood: te sterk voor de divisie van zijn team. Oranje: binnen 5% van de grens.
export const STATUS_CLASS = {
  over: "text-destructive",
  danger: "text-amber-600 dark:text-amber-400",
  ok: "",
} as const;
export const STATUS_TITLE = {
  over: "Te sterk voor de divisie",
  danger: "Binnen 5% van de grens van de divisie",
  ok: undefined,
} as const;

/** zMAP in watt via het gewicht dat uit zFTP W en zFTP W/kg volgt. */
export function zmapWatts(wtrl: WtrlRiderSummary) {
  if (wtrl.zmapWkg == null || !wtrl.zftpW || !wtrl.zftpWkg) return null;
  return (wtrl.zmapWkg * wtrl.zftpW) / wtrl.zftpWkg;
}

export function zftpText(wtrl: WtrlRiderSummary, unit: PowerUnit) {
  return unit === "wkg" ? fmt(wtrl.zftpWkg, 2) : `${fmt(wtrl.zftpW)}w`;
}

export function zmapText(wtrl: WtrlRiderSummary, unit: PowerUnit) {
  return unit === "wkg" ? fmt(wtrl.zmapWkg, 2) : `${fmt(zmapWatts(wtrl))}w`;
}

/**
 * "Bijna te sterk" / "Te sterk" voor één waarde, per niveau. Heeft de pagina teams
 * op meer niveaus (paraplu met B en C), dan staat het niveau erbij.
 */
export function StatusNote({ wtrl, metric }: { wtrl: WtrlRiderSummary; metric: "zftp" | "zmap" }) {
  const levels = wtrl.levels.filter((level) => level[metric] !== "ok");
  if (levels.length === 0) return null;
  const withLabel = wtrl.levelsVary;
  return (
    <>
      {levels.map((level) => (
        <span
          key={level.label}
          className={`font-medium ${
            level[metric] === "over" ? "text-destructive" : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {" · "}
          {level[metric] === "over" ? "Te sterk" : "Bijna te sterk"}
          {withLabel ? ` (${level.label})` : ""}
        </span>
      ))}
    </>
  );
}
