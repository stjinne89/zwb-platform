"use client";

import { useEffect } from "react";

// iOS (vooral de app op het beginscherm) zet na het sluiten van het
// toetsenbord soms het beeld niet terug: het blijft rekenen alsof het
// toetsenbord er nog is. Alles wat onderaan vastzit, zoals de tabbalk, hangt
// dan een toetsenbordhoogte boven de onderrand, tot de app wordt afgesloten.
// Een sprong van de body van display: none naar terug dwingt WebKit het beeld
// opnieuw op te meten. Dat doen we alleen als het beeld aantoonbaar te klein
// is gebleven en er geen veld meer de focus heeft.

const MARGE = 4;

// Alleen de app op het beginscherm: in Safari zelf verandert de hoogte ook
// terecht als de adresbalk in- en uitklapt.
function isIosApp() {
  const ua = navigator.userAgent;
  const ios = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && standalone;
}

function toetsenbordNodig(el: Element | null) {
  if (!el || el === document.body) return false;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) {
    return !["button", "checkbox", "radio", "range", "reset", "submit", "color", "file", "image"].includes(
      el.type,
    );
  }
  return el instanceof HTMLElement && el.isContentEditable;
}

export function IosViewportHerstel() {
  useEffect(() => {
    if (!isIosApp()) return;
    const vv = window.visualViewport;
    // Grootste hoogte per breedte, zodat draaien geen vals alarm geeft.
    const grootste = new Map<number, number>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let laatsteHerstel = 0;

    const meet = () => {
      const breedte = window.innerWidth;
      const hoogte = Math.max(window.innerHeight, vv && vv.scale < 1.01 ? vv.height : 0);
      if (!toetsenbordNodig(document.activeElement)) {
        grootste.set(breedte, Math.max(grootste.get(breedte) ?? 0, hoogte));
      }
    };

    const blijftHangen = () => {
      const max = grootste.get(window.innerWidth);
      if (!max) return false;
      if (window.innerHeight < max - MARGE) return true;
      // Ingezoomd is het zichtbare deel terecht kleiner.
      if (vv && vv.scale < 1.01 && (vv.height < max - MARGE || vv.offsetTop > MARGE)) return true;
      return false;
    };

    const herstel = () => {
      if (toetsenbordNodig(document.activeElement)) return;
      if (!blijftHangen()) {
        meet();
        return;
      }
      const nu = Date.now();
      if (nu - laatsteHerstel < 1000) return;
      laatsteHerstel = nu;
      const { body } = document;
      const x = window.scrollX;
      const y = window.scrollY;
      const vorige = body.style.display;
      body.style.display = "none";
      void body.offsetHeight;
      body.style.display = vorige;
      window.scrollTo(x, y);
    };

    const later = (ms: number) => {
      clearTimeout(timer);
      timer = setTimeout(herstel, ms);
    };
    const naFocus = () => later(150);
    const naResize = () => {
      meet();
      later(250);
    };
    const naTerugkeer = () => {
      if (document.visibilityState === "visible") later(250);
    };

    meet();
    document.addEventListener("focusout", naFocus);
    window.addEventListener("resize", naResize);
    vv?.addEventListener("resize", naResize);
    window.addEventListener("pageshow", naTerugkeer);
    document.addEventListener("visibilitychange", naTerugkeer);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("focusout", naFocus);
      window.removeEventListener("resize", naResize);
      vv?.removeEventListener("resize", naResize);
      window.removeEventListener("pageshow", naTerugkeer);
      document.removeEventListener("visibilitychange", naTerugkeer);
    };
  }, []);
  return null;
}
