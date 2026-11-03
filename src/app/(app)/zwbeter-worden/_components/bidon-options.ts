import { cn } from "@/lib/utils";

// De drie bidons naast elkaar: als knoppen bij Klaarzetten (ride-plan-view.tsx),
// als links in het receptenboek. Gebouwd als segmentschakelaar (een omlijnde
// houder met een gevulde gekozen knop), zodat het design "tegels" er vlakken in
// de kleur van de plek van maakt (globals.css). Geen client-module, zodat de
// serverpagina deze ook kan aanroepen.

export function bidonLabel(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toLocaleString("nl-NL")} l` : `${ml} ml`;
}

/** Drie gelijke kolommen, zodat alleen de bidon zelf in hoogte verschilt. */
export const bidonGroupClass = "grid w-full max-w-sm grid-cols-3 rounded-md border p-0.5";

export function bidonOptionClass(active: boolean): string {
  return cn(
    "flex min-h-11 items-center justify-center rounded-sm px-2 py-1.5 text-sm tabular-nums",
    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
  );
}
