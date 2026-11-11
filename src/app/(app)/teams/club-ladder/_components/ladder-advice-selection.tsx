"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { adviceSelectionQuery } from "@/lib/club-ladder/advice-selection";

export type AdviceSelectionOption = { key: string; name: string };

/**
 * Een teamleider vinkt aan met wie het advies rekent, in plaats van de beste
 * vijf per parcours. Alleen in de URL: de pagina rekent opnieuw, er wordt niets
 * bewaard. `href` is de pagina met `?tegen=` en zonder `met=`.
 */
export function LadderAdviceSelection({
  href,
  options,
  selected,
  custom,
  resetLabel,
}: {
  href: string;
  options: AdviceSelectionOption[];
  /** Met wie het advies nu rekent; leeg is de beste vijf. */
  selected: string[];
  /** Er staat een eigen selectie in de URL. */
  custom: boolean;
  resetLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(selected));
  const [pending, startTransition] = useTransition();

  function toggle(key: string) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function go(keys: string[]) {
    // Niets veranderd: dan rekent de pagina niet opnieuw (en hangt het blok niet open).
    const current = custom ? [...selected].sort().join(",") : "";
    if ([...keys].sort().join(",") === current) {
      setOpen(false);
      return;
    }
    startTransition(() => {
      router.push(`${href}${adviceSelectionQuery(keys)}#advies`, { scroll: false });
    });
  }

  const names = custom ? options.filter((option) => selected.includes(option.key)).map((option) => option.name) : [];

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          Eigen selectie
        </Button>
        {names.length > 0 && <span className="text-xs">{names.join(", ")}</span>}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-2">
      <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <li key={option.key}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={chosen.has(option.key)}
                onChange={() => toggle(option.key)}
                disabled={pending}
              />
              <span className="truncate">{option.name}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || chosen.size === 0}
          onClick={() => go(options.filter((option) => chosen.has(option.key)).map((option) => option.key))}
        >
          Toepassen
        </Button>
        {custom && (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => go([])}>
            {resetLabel}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setChosen(new Set(selected));
            setOpen(false);
          }}
        >
          Annuleren
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">{chosen.size} gekozen</span>
      </div>
    </div>
  );
}
