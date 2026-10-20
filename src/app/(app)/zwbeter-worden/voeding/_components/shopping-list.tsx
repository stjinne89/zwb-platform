"use client";

// Het boodschappenlijstje: aanvinken wat mee moet, dan delen, kopiëren of
// afdrukken. Wat al in de kast staat (zout, olie, kruiden) staat standaard uit.
// Niets hiervan wordt bewaard.

import { useMemo, useState, useSyncExternalStore } from "react";
import { Check, Copy, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEPARTMENT_LABELS, shoppingText, type Department } from "@/lib/nutrition/shopping";

type Item = { id: string; name: string; amount: string; department: Department; pantry: boolean };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function groups(items: Item[]) {
  const byDepartment = new Map<Department, Item[]>();
  for (const item of items) byDepartment.set(item.department, [...(byDepartment.get(item.department) ?? []), item]);
  return [...byDepartment.entries()];
}

/** Drukt alleen het lijstje af, via een onzichtbaar frame, zonder de rest van de app. */
function printList(title: string, items: Item[]) {
  const body = groups(items)
    .map(
      ([department, list]) =>
        `<h2>${escapeHtml(DEPARTMENT_LABELS[department])}</h2><ul>${list
          .map((item) => `<li><span>☐ ${escapeHtml(item.name)}</span><span>${escapeHtml(item.amount)}</span></li>`)
          .join("")}</ul>`,
    )
    .join("");
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    body{font:14px/1.4 system-ui,sans-serif;color:#000;margin:16mm}
    h1{font-size:18px;margin:0 0 12px}
    h2{font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin:14px 0 4px}
    ul{list-style:none;margin:0;padding:0;columns:2;column-gap:24px}
    li{display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-bottom:1px solid #ddd;break-inside:avoid}
  </style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`);
  doc.close();
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 1000);
}

const noSubscription = () => () => {};

export function ShoppingList({ title, items }: { title: string; items: Item[] }) {
  const [checked, setChecked] = useState(() => new Set(items.filter((item) => !item.pantry).map((item) => item.id)));
  const [copied, setCopied] = useState(false);
  // Alleen in de browser bekend; op de server nooit een deelknop.
  const canShare = useSyncExternalStore(
    noSubscription,
    () => typeof navigator.share === "function",
    () => false,
  );

  const selected = useMemo(() => items.filter((item) => checked.has(item.id)), [items, checked]);
  const text = shoppingText(selected);

  const toggle = (id: string) =>
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function share() {
    try {
      await navigator.share({ title, text });
    } catch {
      // Geannuleerd: niets te doen.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Boodschappen</h2>
        <div className="flex flex-wrap gap-2">
          {canShare && (
            <Button type="button" size="sm" onClick={share} disabled={selected.length === 0}>
              <Share2 className="size-4" />
              Delen
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={copy} disabled={selected.length === 0}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Gekopieerd" : "Kopiëren"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => printList(title, selected)}
            disabled={selected.length === 0}
          >
            <Printer className="size-4" />
            Afdrukken
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Geen recepten, dus niets te halen.</p>
      ) : (
        groups(items).map(([department, list]) => (
          <div key={department} className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {DEPARTMENT_LABELS[department]}
            </h3>
            <ul>
              {list.map((item) => (
                <li key={item.id}>
                  <label className="flex min-h-[40px] cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={checked.has(item.id)}
                      onChange={() => toggle(item.id)}
                      className="size-4 shrink-0 accent-primary"
                    />
                    <span className={`flex-1 ${checked.has(item.id) ? "" : "text-muted-foreground"}`}>{item.name}</span>
                    <span className="tabular-nums text-muted-foreground">{item.amount}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
