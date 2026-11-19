"use client";

// Alles of indoor voor de vermogensweergaves (zie lib/teams/power-scope.ts).
// De keuze gaat in een cookie en de pagina rekent opnieuw op de server, want de
// paren, het advies en de indeling volgen allemaal uit de gekozen curve.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { POWER_SCOPE_COOKIE, type PowerScope } from "@/lib/teams/power-scope";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ value: PowerScope; label: string }> = [
  { value: "all", label: "Alles" },
  { value: "indoor", label: "Indoor" },
];

/** Een jaar onthouden, zoals de keuze watt of W/kg. */
function rememberScope(scope: PowerScope) {
  document.cookie = `${POWER_SCOPE_COOKIE}=${scope}; path=/; max-age=31536000; samesite=lax`;
}

export function PowerScopeToggle({ scope, className }: { scope: PowerScope; className?: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(scope);
  const [pending, startTransition] = useTransition();

  function choose(next: PowerScope) {
    if (next === current) return;
    setCurrent(next);
    rememberScope(next);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="radiogroup"
      aria-label="Vermogenscurve"
      aria-busy={pending || undefined}
      className={cn("inline-flex rounded-md border bg-background p-0.5", pending && "opacity-70", className)}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={current === option.value}
          onClick={() => choose(option.value)}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition",
            current === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
