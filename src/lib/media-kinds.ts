export const MEDIA_KINDS = [
  { value: "mededeling", label: "Mededeling", icon: "📌" },
  { value: "nieuwsbrief", label: "Nieuwsbrief", icon: "📰" },
  { value: "podcast", label: "Podcast", icon: "🎙️" },
  { value: "video", label: "Video", icon: "📺" },
  { value: "artikel", label: "Artikel", icon: "📝" },
] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number]["value"];

export const MEDIA_KIND_LABELS: Record<string, string> = Object.fromEntries(
  MEDIA_KINDS.map((k) => [k.value, k.label]),
);

export const MEDIA_KIND_ICONS: Record<string, string> = Object.fromEntries(
  MEDIA_KINDS.map((k) => [k.value, k.icon]),
);
