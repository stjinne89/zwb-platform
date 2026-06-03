export const EVENT_TYPES = [
  { value: "gran_fondo", label: "Gran Fondo" },
  { value: "toertocht", label: "Toertocht" },
  { value: "gravel_race", label: "Gravel race" },
  { value: "outdoor", label: "Outdoor rit" },
  { value: "zrl", label: "ZRL race" },
  { value: "ladder", label: "Ladder race" },
  { value: "flamme_rouge", label: "Flamme Rouge" },
  { value: "social", label: "Social" },
  { value: "training", label: "Training" },
  { value: "overig", label: "Overig" },
] as const;

export const EVENT_TYPE_VALUES = EVENT_TYPES.map((type) => type.value);

export const EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_TYPES.map((type) => [type.value, type.label]),
);

