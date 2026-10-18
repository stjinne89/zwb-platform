// Het kenmerk Nieuwe methode bij een workout, protocol of kennisartikel. Neutraal
// van uiterlijk: het oordeel zit in het bewijsniveau ernaast. Uitleg staat op
// /hulp, niet hier.

import { METHOD_LABEL_TEXT, methodLabelOf } from "@/lib/training/method-label";
import { cn } from "@/lib/utils";

export function MethodLabelBadge({ label, className }: { label: unknown; className?: string }) {
  const value = methodLabelOf(label);
  if (!value) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {METHOD_LABEL_TEXT[value]}
    </span>
  );
}
