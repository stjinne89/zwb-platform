// Onderdelen-bibliotheek met fabrikant-typische richt-kilometers per
// slijtage-range. Indicatief: het lid kan per onderdeel een eigen drempel
// opgeven (custom_threshold). Afstanden zijn in kilometers.
//
// low    = enige slijtage (vroeg vervangen, conservatief)
// normal = normale slijtage
// high   = hoge slijtage (laat vervangen, tot het einde rijden)

export type WearRange = "low" | "normal" | "high";

export type ComponentType = {
  slug: string;
  label: string;
  ranges: Record<WearRange, number>;
};

export const COMPONENT_TYPES: ComponentType[] = [
  { slug: "chain", label: "Ketting", ranges: { low: 2500, normal: 4000, high: 6000 } },
  { slug: "cassette", label: "Cassette", ranges: { low: 8000, normal: 12000, high: 18000 } },
  { slug: "chainrings", label: "Kettingbladen", ranges: { low: 15000, normal: 25000, high: 40000 } },
  { slug: "tire_front", label: "Voorband", ranges: { low: 3000, normal: 5000, high: 8000 } },
  { slug: "tire_rear", label: "Achterband", ranges: { low: 2500, normal: 4000, high: 6000 } },
  { slug: "brake_pads_rim", label: "Remblokken (velg)", ranges: { low: 2000, normal: 4000, high: 7000 } },
  { slug: "brake_pads_disc", label: "Remblokken (schijf)", ranges: { low: 3000, normal: 6000, high: 10000 } },
  { slug: "cables", label: "Kabels/buitenkabels", ranges: { low: 8000, normal: 15000, high: 25000 } },
  { slug: "bottom_bracket", label: "Trapas", ranges: { low: 10000, normal: 20000, high: 35000 } },
  { slug: "bar_tape", label: "Stuurlint", ranges: { low: 5000, normal: 10000, high: 18000 } },
];

export const WEAR_RANGES: WearRange[] = ["low", "normal", "high"];

export function rangeLabel(range: WearRange): string {
  if (range === "low") return "Enige slijtage";
  if (range === "high") return "Hoge slijtage";
  return "Normale slijtage";
}

export function componentType(slug: string): ComponentType | null {
  return COMPONENT_TYPES.find((c) => c.slug === slug) ?? null;
}

export function componentLabel(slug: string): string {
  return componentType(slug)?.label ?? slug;
}

export function resolveThresholdKm(slug: string, range: WearRange): number | null {
  const type = componentType(slug);
  return type ? type.ranges[range] : null;
}

export function isWearRange(value: unknown): value is WearRange {
  return value === "low" || value === "normal" || value === "high";
}
