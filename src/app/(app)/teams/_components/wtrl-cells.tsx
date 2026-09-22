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

export function StatusNote({ status }: { status: WtrlRiderSummary["zftpStatus"] }) {
  if (status === "over") return <span className="font-medium text-destructive"> · Te sterk</span>;
  if (status === "danger") {
    return <span className="font-medium text-amber-600 dark:text-amber-400"> · Bijna te sterk</span>;
  }
  return null;
}

