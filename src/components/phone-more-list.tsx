"use client";

import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Een lijst die op de telefoon (onder 768px) na `limit` rijen stopt, met een
 * knop om de rest te tonen. Vanaf 768px staat alles er gewoon. Zo wordt een
 * lange lijst op een staande telefoon niet tien schermen scrollen
 * (audit 2026-11-10). De kinderen zijn de `<li>`'s.
 */
export function PhoneMoreList({
  limit,
  className,
  children,
}: {
  limit: number;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const items = Children.toArray(children);
  const rest = items.length - limit;

  return (
    <>
      <ul className={className}>
        {items.map((child, index) =>
          !open && index >= limit && isValidElement(child)
            ? cloneElement(child as ReactElement<{ className?: string }>, {
                className: cn((child as ReactElement<{ className?: string }>).props.className, "max-md:hidden"),
              })
            : child,
        )}
      </ul>
      {!open && rest > 0 && (
        <Button
          type="button"
          variant="outline"
          className="mt-2 h-11 w-full md:hidden"
          onClick={() => setOpen(true)}
        >
          Alle {items.length} tonen
        </Button>
      )}
    </>
  );
}
