export const MEDIA_KINDS = [
  { value: "mededeling", label: "Mededeling" },
  { value: "nieuwsbrief", label: "Nieuwsbrief" },
  { value: "podcast", label: "Podcast" },
  { value: "video", label: "Video" },
  { value: "instagram", label: "Instagram" },
  { value: "artikel", label: "Artikel" },
] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number]["value"];

export const MEDIA_KIND_LABELS: Record<string, string> = Object.fromEntries(
  MEDIA_KINDS.map((k) => [k.value, k.label]),
);
