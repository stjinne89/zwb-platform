"use client";

// Een begrip met uitleg erachter: tik op het woord en een kaartje opent onderin
// het scherm (popover van de browser, sluit bij tikken ernaast of Esc).

import { useId, type ReactNode } from "react";
import { RACE_TERMS, type RaceTermKey } from "@/lib/zrl-analysis/terms";

export function Term({ id, children }: { id: RaceTermKey; children?: ReactNode }) {
  const popoverId = `term-${id}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const term = RACE_TERMS[id];
  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        className="cursor-help rounded-sm underline decoration-dotted decoration-1 underline-offset-2 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`${typeof children === "string" ? children : term.label}: uitleg`}
      >
        {children ?? term.label}
      </button>
      {/* Een span: het begrip staat ook binnen een alinea, waar geen div mag. Geen
          display-klasse: dan blijft de popover dicht tot je tikt. */}
      <span
        id={popoverId}
        popover="auto"
        className="fixed inset-x-4 bottom-4 top-auto m-0 mx-auto max-w-md rounded-lg border bg-popover p-4 text-left text-sm font-normal text-popover-foreground shadow-lg"
      >
        <span className="block font-semibold">{term.title}</span>
        <span className="mt-1 block text-muted-foreground">{term.text}</span>
      </span>
    </>
  );
}
