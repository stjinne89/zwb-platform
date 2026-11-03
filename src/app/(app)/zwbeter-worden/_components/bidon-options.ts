import { cn } from "@/lib/utils";

// De drie bidons naast elkaar: als knoppen bij Klaarzetten (ride-plan-view.tsx),
// als links in het receptenboek. Geen client-module, zodat de serverpagina deze
// ook kan aanroepen.

export function bidonLabel(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toLocaleString("nl-NL")} l` : `${ml} ml`;
}

export function bidonOptionClass(active: boolean): string {
  return cn(
    "inline-flex min-h-[28px] items-center rounded-full px-2.5 tabular-nums",
    active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
  );
}
