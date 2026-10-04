import { cn } from "@/lib/utils";
import { formatFrrDuration } from "@/lib/frr/watch";
import type { FrrStandingRow } from "@/lib/frr/zwb-standings";

/** De ZWB'ers in het FRR-klassement: klasse, plaats, naam, tourtijd en eGAP. */
export function FrrZwbStandingsList({
  standings,
  zwbNames,
  myZwiftId,
  slotText,
}: {
  standings: FrrStandingRow[];
  zwbNames: Map<string, string | null>;
  myZwiftId: string | null;
  /** Het tijdslot van de renner in deze etappe; zonder valt de kolom weg. */
  slotText?: (zwiftId: string) => string | null;
}) {
  return (
    <ul className="divide-y rounded-lg border bg-card text-sm">
      {standings.map((row) => {
        const egap = `eGAP ${formatFrrDuration(row.egap_s === null ? null : Number(row.egap_s))}`;
        const slot = slotText?.(row.zwift_id) ?? null;
        return (
          <li
            key={`${row.gender_class}-${row.zwift_id}`}
            className={cn(
              "flex items-center gap-3 px-3 py-2",
              row.zwift_id === myZwiftId && "bg-primary/5",
            )}
          >
            <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground sm:w-16">
              {row.gender_class}
            </span>
            <span className="w-7 shrink-0 tabular-nums font-semibold sm:w-8">{row.position}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{zwbNames.get(row.zwift_id) ?? row.name}</span>
              <span className="block truncate text-xs text-muted-foreground sm:hidden">
                {[egap, slot].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatFrrDuration(row.tour_time_s === null ? null : Number(row.tour_time_s))}
            </span>
            <span className="hidden w-20 shrink-0 text-right tabular-nums text-muted-foreground sm:block">
              {egap}
            </span>
            {slotText && (
              <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block">
                {slot ?? "—"}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
