"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Voortgangsbalk bovenaan zodra een lid op een interne link klikt.
//
// Een pagina doet er op de server 1 tot 3 seconden over (functies in Ohio,
// database in Ierland; gemeten 2026-10-01), en in die tijd veranderde er niets op
// het scherm. Een loading.tsx zou het kader direct tonen, maar laat Next alle
// zichtbare links voorladen: elke voorlading is een functieaanroep, en de
// Netlify-credits zijn beperkt. Deze balk kost de server niets.

/** Na zoveel tijd gaat de balk hoe dan ook weg, ook als de navigatie is afgebroken. */
const GIVE_UP_MS = 12_000;

function internalTarget(event: MouseEvent): URL | null {
  if (event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  // Alleen een ander anker op dezelfde pagina: geen serververzoek.
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  return url;
}

export function NavProgress() {
  const pathname = usePathname();
  // De pagina waarop geklikt is. Zodra de route wisselt, klopt dit niet meer met
  // pathname en verdwijnt de balk vanzelf, zonder state in een effect te zetten.
  const [clickedOn, setClickedOn] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onClick = (event: MouseEvent) => {
      if (!internalTarget(event)) return;
      setClickedOn(window.location.pathname);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setClickedOn(null), GIVE_UP_MS);
    };
    // In de capture-fase: next/link roept preventDefault aan op zijn eigen klik, en
    // een gewone listener ziet die klik dus pas als "al afgehandeld".
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (clickedOn !== pathname) return null;
  return (
    <div
      role="progressbar"
      aria-label="Pagina laden"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden"
    >
      <div className="nav-progress-bar h-full w-1/3 bg-primary" />
    </div>
  );
}
