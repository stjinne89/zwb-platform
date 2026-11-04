"use client";

import { useId, useState, type ReactNode } from "react";

export type ChoiceTab = { key: string; label: string; content: ReactNode };

/**
 * Een rij knoppen die tussen kant-en-klare weergaven wisselt, zonder de pagina
 * opnieuw te laden. De server rendert elke weergave; hier wordt alleen gekozen.
 */
export function ChoiceTabs({ tabs, label, initial }: { tabs: ChoiceTab[]; label: string; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);
  const id = useId();
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label={label} className="inline-flex flex-wrap rounded-md border border-border bg-card p-0.5 text-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            id={`${id}-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            aria-controls={`${id}-${tab.key}-panel`}
            onClick={() => setActive(tab.key)}
            className={
              active === tab.key
                ? "rounded px-3 py-1.5 font-medium bg-primary text-primary-foreground"
                : "rounded px-3 py-1.5 text-muted-foreground"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.key}
          id={`${id}-${tab.key}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-${tab.key}`}
          hidden={active !== tab.key}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
