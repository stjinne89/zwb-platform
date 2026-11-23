// Een blok op ZWBeter Vandaag dat dicht begint: de naam en de kern blijven
// zichtbaar, de rest komt pas als je erom vraagt.

import type { ComponentType, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function TodayFold({
  icon: Icon,
  title,
  summary,
  children,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-lg border bg-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 p-5 transition hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
        <Icon className="size-5 shrink-0 text-primary" aria-hidden />
        <h3 className="font-semibold">{title}</h3>
        <span className="min-w-0 flex-1 truncate text-sm tabular-nums text-muted-foreground">{summary}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" aria-hidden />
      </summary>
      {children}
    </details>
  );
}
