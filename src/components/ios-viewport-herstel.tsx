"use client";

import { useEffect } from "react";
import { beoordeel, startBeurt, type ToetsenbordBeurt, type ViewportMeting } from "@/lib/ios-viewport";

// iOS (vooral de app op het beginscherm) zet na het sluiten van het
// toetsenbord soms het beeld niet terug: het blijft rekenen alsof het
// toetsenbord er nog is. Alles wat onderaan vastzit, zoals de tabbalk, hangt
// dan een toetsenbordhoogte boven de onderrand, tot de app wordt afgesloten.
// Een sprong van de body van display: none naar terug dwingt WebKit het beeld
// opnieuw op te meten. Helpt de sprong niet, dan schuift de tabbalk op de
// iPhone zelf het tekort omlaag (`--ios-viewport-fout`).
//
// Dit gebeurt alleen binnen een toetsenbordbeurt: van het moment dat een veld
// de focus krijgt tot het beeld na het sluiten weer even groot is als ervoor.
// Buiten zo'n beurt doet scrollen of een resize niets (ronde 2026-10-28).

// Sprongen per beurt; daarna alleen het schuiven.
const MAX_SPRONGEN = 3;
const SPRONG_PAUZE = 700;
// Controles na het sluiten: het toetsenbord klapt nog even dicht, en daarna
// komt er soms geen gebeurtenis meer.
const NA_SLUITEN = [600, 1200, 2000];

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
  // Een veld in een ingesloten pagina is van buitenaf niet te zien.
  if (el instanceof HTMLIFrameElement) return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) {
    return !["button", "checkbox", "radio", "range", "reset", "submit", "color", "file", "image"].includes(
      el.type,
    );
  }
  return el instanceof HTMLElement && el.isContentEditable;
}

function zetFout(px: number) {
  const root = document.documentElement;
  if (px > 0) {
    root.style.setProperty("--ios-viewport-fout", `${px}px`);
    root.dataset.viewportFout = "";
  } else if ("viewportFout" in root.dataset) {
    root.style.removeProperty("--ios-viewport-fout");
    delete root.dataset.viewportFout;
  }
}

export function IosViewportHerstel() {
  useEffect(() => {
    if (!isIosApp()) return;
    const vv = window.visualViewport;
    // Op een iPad kan het venster echt lager worden (Stage Manager); daar
    // schuift de balk niet mee, alleen de sprong.
    const schuiven = /iP(hone|od)/.test(navigator.userAgent);
    let beurt: ToetsenbordBeurt | null = null;
    let timers: ReturnType<typeof setTimeout>[] = [];
    let laatsteSprong = 0;
    let sprongen = 0;

    const meting = (): ViewportMeting => ({
      breedte: window.innerWidth,
      innerHeight: window.innerHeight,
      vvHeight: vv?.height,
      vvOffsetTop: vv?.offsetTop,
      vvScale: vv?.scale,
    });

    const stop = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    const later = (...ms: number[]) => {
      stop();
      timers = ms.map((t) => setTimeout(controleer, t));
    };

    const spring = () => {
      const { body } = document;
      const x = window.scrollX;
      const y = window.scrollY;
      const vorige = body.style.display;
      body.style.display = "none";
      void body.offsetHeight;
      body.style.display = vorige;
      window.scrollTo(x, y + 1);
      window.scrollTo(x, y);
    };

    function controleer() {
      if (!beurt) return;
      if (toetsenbordNodig(document.activeElement)) {
        zetFout(0);
        return;
      }
      const oordeel = beoordeel(beurt, meting());
      beurt = oordeel.beurt;
      zetFout(schuiven ? oordeel.verschuiving : 0);
      if (!oordeel.hangt) {
        stop();
        sprongen = 0;
        return;
      }
      if (sprongen >= MAX_SPRONGEN) return;
      // Te snel na de vorige sprong: niet overslaan maar uitstellen.
      const wacht = SPRONG_PAUZE - (Date.now() - laatsteSprong);
      if (wacht > 0) {
        later(wacht);
        return;
      }
      laatsteSprong = Date.now();
      sprongen += 1;
      spring();
      later(500);
    }

    const naFocusIn = (e: FocusEvent) => {
      if (!toetsenbordNodig(e.target as Element)) return;
      stop();
      zetFout(0);
      sprongen = 0;
      beurt = startBeurt(beurt, meting());
    };
    const naFocusUit = () => {
      if (beurt) later(...NA_SLUITEN);
    };
    // Alleen binnen een beurt; daarbuiten verandert er niets aan de balk.
    const binnenBeurt = (ms: number) => () => {
      if (beurt) later(ms);
    };
    const naResize = binnenBeurt(250);
    const naScroll = binnenBeurt(300);
    const naTerugkeer = () => {
      if (document.visibilityState === "visible" && beurt) later(250);
    };

    document.addEventListener("focusin", naFocusIn);
    document.addEventListener("focusout", naFocusUit);
    window.addEventListener("resize", naResize);
    vv?.addEventListener("resize", naResize);
    window.addEventListener("scroll", naScroll, { passive: true });
    window.addEventListener("pageshow", naTerugkeer);
    document.addEventListener("visibilitychange", naTerugkeer);
    return () => {
      stop();
      zetFout(0);
      document.removeEventListener("focusin", naFocusIn);
      document.removeEventListener("focusout", naFocusUit);
      window.removeEventListener("resize", naResize);
      vv?.removeEventListener("resize", naResize);
      window.removeEventListener("scroll", naScroll);
      window.removeEventListener("pageshow", naTerugkeer);
      document.removeEventListener("visibilitychange", naTerugkeer);
    };
  }, []);
  // Een laag ter grootte van het scherm: WebKit meet het beeld pas opnieuw als
  // zo'n laag na de sprong terugkomt.
  return <div aria-hidden className="pointer-events-none invisible fixed inset-0 -z-10" />;
}
