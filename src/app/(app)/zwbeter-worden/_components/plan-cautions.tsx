// De "Let op"-regels van het schema waar de eerstvolgende workout bij hoort.
//
// Ze stonden alleen in de samenvatting van het schema, en daar kijkt een lid niet
// als het zich afvraagt waarom er vandaag negentig minuten staat terwijl er twee
// uur beschikbaar is. De redenering hoort naast de training te staan waar hij
// over gaat.
//
// Bewust tijdelijk: zolang we nog leren hoe streng die regels in de praktijk
// uitpakken, is dit de goedkoopste manier om mee te kijken. Zit de opbouw straks
// goed, dan kan dit blok er in één keer uit.

import { Info } from "lucide-react";

export function PlanCautions({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4 border-t pt-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Info className="size-3.5" />
        Let op bij dit schema
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
