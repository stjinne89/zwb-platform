"use client";

import Link from "next/link";
import { Popover } from "@base-ui/react/popover";
import { BookOpen, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

export type TileTitleInfo = {
  text: string;
  /** Het kennisbankartikel over dit onderwerp. */
  article?: { href: string; title: string } | null;
  /** De uitleg over Stats op /hulp. */
  helpHref?: string | null;
};

const TITLE = "st-tile-title text-sm font-semibold uppercase tracking-wide text-muted-foreground";

/**
 * De titel van een tegel, met de uitleg erachter (wens eigenaar, 2026-10-18).
 * Op desktop opent die bij hover, op de telefoon met een tik; dezelfde knop,
 * zodat ook toetsenbord en schermlezer erbij kunnen. Geen uitleg in de tegel
 * zelf: die blijft dicht tot je erom vraagt.
 */
export function TileTitle({ title, info }: { title: string; info?: TileTitleInfo | null }) {
  if (!info) return <h2 className={TITLE}>{title}</h2>;
  return (
    <h2 className={TITLE}>
      <Popover.Root>
        <Popover.Trigger
          openOnHover
          delay={200}
          closeDelay={150}
          className={cn(
            // Tikdoel van 44px zonder dat de kop hoger wordt.
            "-my-3 inline-flex min-h-11 cursor-help items-center rounded-sm py-3 text-left uppercase",
            "underline decoration-dotted decoration-1 underline-offset-4 decoration-current/40",
            "hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "data-[popup-open]:text-foreground",
          )}
        >
          {title}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="start" sideOffset={6} collisionPadding={16} className="isolate z-50">
            <Popover.Popup
              className={cn(
                "w-[min(20rem,calc(100vw-2rem))] rounded-lg bg-popover p-3 text-sm normal-case tracking-normal text-popover-foreground",
                "shadow-2xl ring-1 ring-border/70 outline-none",
                "origin-(--transform-origin) duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
                "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none",
              )}
            >
              <Popover.Title className="sr-only">{title}</Popover.Title>
              <Popover.Description className="leading-relaxed">{info.text}</Popover.Description>
              {(info.article || info.helpHref) && (
                <div className="mt-2 flex flex-wrap gap-x-4 border-t pt-1">
                  {info.article && (
                    <Link
                      href={info.article.href}
                      className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary hover:underline md:min-h-8"
                    >
                      <BookOpen className="size-3.5 shrink-0" aria-hidden />
                      {info.article.title}
                    </Link>
                  )}
                  {info.helpHref && (
                    <Link
                      href={info.helpHref}
                      className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary hover:underline md:min-h-8"
                    >
                      <CircleHelp className="size-3.5 shrink-0" aria-hidden />
                      Meer uitleg
                    </Link>
                  )}
                </div>
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </h2>
  );
}
