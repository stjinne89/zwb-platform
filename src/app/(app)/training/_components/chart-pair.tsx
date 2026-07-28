import type { ReactNode } from "react";

/**
 * Twee grafieken naast elkaar op breed scherm, onder elkaar op mobiel. Elke
 * grafiek moet een eigen `idSuffix` krijgen, anders botsen hun <defs>-id's.
 */
export function ChartPair({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0">{left}</div>
      <div className="min-w-0">{right}</div>
    </div>
  );
}
