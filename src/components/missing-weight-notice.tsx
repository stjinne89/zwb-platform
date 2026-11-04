import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { WEIGHT_FIELD_HREF } from "@/lib/teams/missing-weight";

/** Blijft staan tot het gewicht bekend is, net als de melding voor het Zwift-ID. */
export function MissingWeightNotice() {
  return (
    <Link
      href={WEIGHT_FIELD_HREF}
      className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 transition hover:border-amber-500/70 dark:text-amber-300"
    >
      <AlertTriangle className="size-4 shrink-0" />
      Je gewicht ontbreekt. Vul het in op je profiel, anders staan er geen W/kg bij je in de teams.
    </Link>
  );
}
