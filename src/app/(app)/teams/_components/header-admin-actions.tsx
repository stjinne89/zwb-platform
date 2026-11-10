"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * De beheerknoppen in de Teams-kop. Op de telefoon (onder 768px) zitten ze
 * achter één knop "Beheer" die ze openklapt; vanaf 768px staan ze los in de
 * rij, zoals altijd. Openklappen en geen uitklapmenu, omdat de knoppen hun
 * resultaat onder zich tonen en dat moet blijven staan (audit 2026-11-10).
 */
export function HeaderAdminActions({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="md:hidden"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        Beheer
        <ChevronDown
          data-icon="inline-end"
          className={cn("transition-transform", open && "rotate-180")}
        />
      </Button>
      <div
        id={id}
        className={cn(
          "flex basis-full flex-col items-start gap-2 md:contents",
          !open && "max-md:hidden",
        )}
      >
        {children}
      </div>
    </>
  );
}
