export const MEDIA_KINDS = [
  { value: "mededeling", label: "Mededeling", icon: "Pin" },
  { value: "nieuwsbrief", label: "Nieuwsbrief", icon: "News" },
  { value: "podcast", label: "Podcast", icon: "Audio" },
  { value: "video", label: "Video", icon: "Video" },
  { value: "instagram", label: "Instagram", icon: "IG" },
  { value: "artikel", label: "Artikel", icon: "Art" },
] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number]["value"];

export const MEDIA_KIND_LABELS: Record<string, string> = Object.fromEntries(
  MEDIA_KINDS.map((k) => [k.value, k.label]),
);

export const MEDIA_KIND_ICONS: Record<string, string> = Object.fromEntries(
  MEDIA_KINDS.map((k) => [k.value, k.icon]),
);
