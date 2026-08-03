import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ResponsiveColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  align?: "left" | "right";
  /** Titel van de kaart op mobiel; het kolomlabel vervalt dan. */
  primary?: boolean;
  /** Regel onder de titel op mobiel, bv. een datum. */
  secondary?: boolean;
  /** Laat deze kolom weg uit de kaartweergave. */
  hideOnCard?: boolean;
  headerClassName?: string;
  cellClassName?: string;
};

/**
 * Tabel vanaf `sm`, daaronder gestapelde kaarten met label/waarde-paren.
 *
 * Een `<table className="w-full">` in een `overflow-x-auto` scrollt niet maar
 * pérst zich samen: cellen breken dan midden in een waarde af en de laatste
 * kolommen vallen buiten beeld. Op telefoonbreedte is een kaart per rij
 * leesbaarder dan welke tabel dan ook, dus daar schakelen we van vorm.
 */
export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  minWidth,
  className,
  rowClassName,
}: {
  columns: Array<ResponsiveColumn<T>>;
  rows: T[];
  rowKey: (row: T, index: number) => string;
  /** Wat te tonen als er geen rijen zijn. */
  empty?: ReactNode;
  /** Ondergrens voor de tabel vanaf `sm`; daaronder mag hij scrollen. */
  minWidth?: number;
  className?: string;
  rowClassName?: (row: T, index: number) => string | undefined;
}) {
  if (rows.length === 0) {
    return empty ? <div className="text-sm text-muted-foreground">{empty}</div> : null;
  }

  const primary = columns.find((column) => column.primary);
  const secondary = columns.find((column) => column.secondary);
  const details = columns.filter(
    (column) => !column.primary && !column.secondary && !column.hideOnCard,
  );

  return (
    <div className={className}>
      {/* Kaarten op telefoonbreedte. */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((row, index) => (
          <li
            key={rowKey(row, index)}
            className={cn("rounded-lg border bg-card p-3", rowClassName?.(row, index))}
          >
            {primary ? (
              <p className="font-medium leading-snug">{primary.cell(row, index)}</p>
            ) : null}
            {secondary ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {secondary.cell(row, index)}
              </p>
            ) : null}
            {details.length > 0 ? (
              <dl
                className={cn(
                  "grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm",
                  (primary || secondary) && "mt-2.5 border-t pt-2.5",
                )}
              >
                {details.map((column) => (
                  <div key={column.key} className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted-foreground">{column.header}</dt>
                    <dd className="tabular-nums">{column.cell(row, index)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        ))}
      </ul>

      {/* Tabel zodra er ruimte voor is. */}
      <div className="hidden sm:block sm:overflow-x-auto">
        <table
          className="w-full text-left text-sm"
          style={minWidth ? { minWidth } : undefined}
        >
          <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "py-2 pr-3 font-medium last:pr-0",
                    column.align === "right" && "text-right",
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                className={cn("border-b last:border-0", rowClassName?.(row, index))}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "py-2 pr-3 last:pr-0",
                      column.align === "right" && "text-right tabular-nums",
                      column.cellClassName,
                    )}
                  >
                    {column.cell(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
