// Neemt elke scène uit scenes.mjs op als losse clip, in telefoonformaat.
//
//   node scripts/instructievideo/serve.mjs          (in een ander venster)
//   node scripts/instructievideo/opname.mjs         (alle scènes)
//   node scripts/instructievideo/opname.mjs 07 10   (alleen deze)
//
// Per scène: de nep-Supabase op de juiste beginstand zetten, een verse browser
// openen, eventuele voorbereiding buiten beeld doen en dan de klikken op het
// ritme van de tekst afspelen. Het stuk vóór de echte start knipt bouw.mjs weg.

import { chromium } from "@playwright/test";
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { SCENES, VIDEO } from "./scenes.mjs";
import { OUT, makeCues, sceneSeconds, speechSeconds, LEAD_IN, TAIL } from "./lib.mjs";

const APP = process.env.DEMO_APP_URL ?? "http://localhost:3456";
const MOCK = process.env.DEMO_MOCK_URL ?? "http://127.0.0.1:54399";
const COOKIE = "sb-127-auth-token";

export const VIEWPORT = { width: 390, height: 590 };

const FRAMES = path.join(OUT, "frames");
const MANIFEST = path.join(OUT, "manifest.json");

// Geen Next-ontwikkelknop, geen scrollbalken, en een laag voor tikken en
// markeringen die in de video zichtbaar zijn (een opname toont geen muis).
const INIT_SCRIPT = `
  addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = \`
      nextjs-portal { display: none !important; }
      ::-webkit-scrollbar { display: none; }
      html { scrollbar-width: none; }
      .demo-tap { position: fixed; z-index: 2147483647; width: 46px; height: 46px; margin: -23px 0 0 -23px;
        border-radius: 50%; background: rgba(184,135,61,.45); border: 2px solid rgba(255,255,255,.9);
        pointer-events: none; animation: demo-tap .6s ease-out forwards; }
      @keyframes demo-tap { from { transform: scale(.4); opacity: 1 } to { transform: scale(1.5); opacity: 0 } }
      .demo-mark { position: fixed; z-index: 2147483646; border: 3px solid #b8873d; border-radius: 12px;
        box-shadow: 0 0 0 4px rgba(184,135,61,.25), 0 0 24px rgba(184,135,61,.45); pointer-events: none;
        animation: demo-mark-in .35s ease-out; transition: opacity .4s; }
      @keyframes demo-mark-in { from { opacity: 0; transform: scale(1.06) } to { opacity: 1; transform: scale(1) } }
    \`;
    document.head.appendChild(style);
    // Geen rode spellingstreep onder getypte tekst.
    document.documentElement.spellcheck = false;
    // Het nieuwe design vraagt in de demo een beheerrecht (zie fixtures.mjs).
    // Wat dat recht extra toont, hoort niet in beeld: de designknop en het
    // beheerblok in het persoonlijke menu.
    // Alleen verbergen, niet weghalen: React beheert deze elementen en loopt
    // vast als ze onder zijn handen verdwijnen.
    const hide = (el) => el && (el.style.display = "none");
    const hideAdmin = () => {
      document.querySelectorAll('form:has(> input[name="design"])').forEach(hide);
      document.querySelectorAll('[role="menu"]').forEach((menu) => {
        menu.querySelectorAll('a[href^="/beheer"]').forEach(hide);
        [...menu.children].forEach((el) => {
          if (el.textContent?.trim() === "Beheer" && !el.querySelector("a")) {
            const sep = el.previousElementSibling;
            if (sep?.getAttribute("role") === "separator") hide(sep);
            hide(el);
          }
        });
      });
    };
    hideAdmin();
    new MutationObserver(hideAdmin).observe(document.body, { childList: true, subtree: true });
  });
  window.__demoTap = (x, y) => {
    const dot = document.createElement("div");
    dot.className = "demo-tap";
    dot.style.left = x + "px";
    dot.style.top = y + "px";
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 700);
  };
  window.__demoMark = (el, ms) => {
    const mark = document.createElement("div");
    mark.className = "demo-mark";
    document.body.appendChild(mark);
    const place = () => {
      const r = el.getBoundingClientRect();
      mark.style.left = r.left - 6 + "px";
      mark.style.top = r.top - 6 + "px";
      mark.style.width = r.width + 12 + "px";
      mark.style.height = r.height + 12 + "px";
    };
    place();
    const timer = setInterval(place, 30);
    setTimeout(() => { mark.style.opacity = "0"; }, ms);
    setTimeout(() => { clearInterval(timer); mark.remove(); }, ms + 450);
  };
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

function stage(page, scene, speech) {
  const cue = makeCues(scene, speech);
  let t0 = Date.now();
  const s = {
    page,
    begin() {
      t0 = Date.now();
    },
    elapsed: () => (Date.now() - t0) / 1000,
    pause: (ms) => sleep(ms),
    /** Wacht tot het woord in de tekst aan de beurt is. */
    async at(word) {
      await sleep(cue(word) * 1000 - (Date.now() - t0));
    },
    async tap(locator) {
      await locator.scrollIntoViewIfNeeded();
      const box = await locator.boundingBox();
      if (box) await page.evaluate(([x, y]) => window.__demoTap(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
      await sleep(280);
      await locator.click();
      await sleep(350);
    },
    async type(locator, text, delay = 75) {
      await s.tap(locator);
      await locator.pressSequentially(text, { delay });
    },
    async highlight(locator, ms = 2000) {
      await locator.scrollIntoViewIfNeeded();
      await locator.evaluate((el, duration) => window.__demoMark(el, duration), ms);
    },
    async scrollTo(locator, block = "center") {
      await locator.evaluate((el, b) => el.scrollIntoView({ behavior: "smooth", block: b }), block);
      await sleep(900);
    },
    async scrollBy(px, ms = 1200) {
      await page.evaluate(
        ([distance, duration]) =>
          new Promise((resolve) => {
            const from = scrollY;
            const start = performance.now();
            const step = (now) => {
              const k = Math.min(1, (now - start) / duration);
              const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
              scrollTo(0, from + distance * eased);
              if (k < 1) requestAnimationFrame(step);
              else resolve();
            };
            requestAnimationFrame(step);
          }),
        [px, ms],
      );
    },
    /** Scrollen binnen een eigen scrollvlak, zoals het uitgeklapte menu. */
    async scrollWithin(locator, px, ms = 1200) {
      await locator.evaluate(
        (root, [distance, duration]) =>
          new Promise((resolve) => {
            let el = root;
            const scrollable = (node) => node && node.scrollHeight > node.clientHeight + 4 &&
              /(auto|scroll)/.test(getComputedStyle(node).overflowY);
            if (!scrollable(el)) el = [...root.querySelectorAll("*")].find(scrollable) ?? root;
            const from = el.scrollTop;
            const start = performance.now();
            const step = (now) => {
              const k = Math.min(1, (now - start) / duration);
              const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
              el.scrollTop = from + distance * eased;
              if (k < 1) requestAnimationFrame(step);
              else resolve();
            };
            requestAnimationFrame(step);
          }),
        [px, ms],
      );
    },
  };
  return s;
}

const DESIGN = VIDEO.design ?? "klassiek";

async function setPreset(preset) {
  const res = await fetch(`${MOCK}/__demo/preset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preset, design: DESIGN }),
  });
  if (!res.ok) throw new Error(`preset ${preset} mislukt: ${res.status}`);
}

async function sessionCookies() {
  const session = await fetch(`${MOCK}/__demo/session`).then((r) => r.json());
  const cookies = [
    {
      name: COOKIE,
      value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
      domain: "localhost",
      path: "/",
    },
  ];
  if (DESIGN === "tegels") cookies.push({ name: "zwb-design", value: "tegels", domain: "localhost", path: "/" });
  return cookies;
}

function contextOptions() {
  return {
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
    locale: "nl-NL",
    timezoneId: "Europe/Amsterdam",
    // Zonder toestemming meldt de app "Geblokkeerd in browser-instellingen".
    permissions: ["notifications"],
  };
}

/** De devserver compileert een route pas bij het eerste bezoek; dat hoort niet in beeld. */
async function warmUp(browser, scenes) {
  const context = await browser.newContext(contextOptions());
  await setPreset("compleet");
  await context.addCookies(await sessionCookies());
  const page = await context.newPage();
  for (const start of new Set([...scenes.map((scene) => scene.start), "/events/e0000000-0000-4000-8000-000000000002", "/zwbeter-worden", "/club", "/profiel", "/hulp"])) {
    await page.goto(APP + start, { waitUntil: "load", timeout: 120_000 }).catch(() => {});
  }
  await context.close();
}

/**
 * Legt het scherm vast op dubbele resolutie. De video-opname van Playwright en
 * de screencast van Chromium leveren bij een pixeldichtheid van 2 alleen
 * 1x-beelden (of zetten het beeld in een hoek); een schermafdruk met
 * `scale: 2` is wel scherp. Dat haalt zo'n 16 beelden per seconde, genoeg voor
 * rustig scrollen en tikken. Elk beeld krijgt zijn tijd mee voor bouw.mjs.
 */
function startCapture(cdp, dir, created) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const frames = [];
  let running = true;
  const loop = (async () => {
    while (running) {
      try {
        const { cssVisualViewport: v } = await cdp.send("Page.getLayoutMetrics");
        const shot = await cdp.send("Page.captureScreenshot", {
          format: "jpeg",
          quality: 88,
          optimizeForSpeed: true,
          clip: { x: v.pageX, y: v.pageY, width: v.clientWidth, height: v.clientHeight, scale: 2 },
        });
        const t = (Date.now() - created) / 1000;
        const name = `${String(frames.length).padStart(5, "0")}.jpg`;
        await writeFile(path.join(dir, name), Buffer.from(shot.data, "base64"));
        frames.push({ t, name });
      } catch {
        // Tijdens een paginawissel lukt een schermafdruk soms niet; dan de volgende.
        await sleep(30);
      }
    }
  })();
  return async () => {
    running = false;
    await loop;
    return frames;
  };
}

async function recordScene(browser, scene) {
  const { seconds: speech } = speechSeconds(scene);
  const total = sceneSeconds(scene);
  await setPreset(scene.preset);

  const context = await browser.newContext(contextOptions());
  await context.addInitScript(INIT_SCRIPT);
  if (scene.ingelogd) await context.addCookies(await sessionCookies());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const created = Date.now();
  const dir = path.join(FRAMES, scene.id);
  const stopCapture = startCapture(cdp, dir, created);

  await page.goto(APP + scene.start, { waitUntil: "load" });
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  const s = stage(page, scene, speech);
  if (scene.voorbereiding) await scene.voorbereiding(s);
  await sleep(500);

  const trimStart = (Date.now() - created) / 1000;
  s.begin();
  let error = null;
  try {
    await scene.speel(s);
  } catch (err) {
    error = String(err?.message ?? err).split("\n")[0];
    await page.screenshot({ path: path.join(OUT, `fout-${scene.id}.png`) }).catch(() => {});
  }
  await sleep(total * 1000 - (Date.now() - created - trimStart * 1000));
  const duration = Math.max(total, s.elapsed());

  const frames = await stopCapture();
  await context.close();
  writeFileSync(path.join(dir, "frames.json"), JSON.stringify(frames));
  return { id: scene.id, trimStart, duration, speech, leadIn: LEAD_IN, tail: TAIL, frames: frames.length, error };
}

const only = process.argv.slice(2);
const scenes = only.length ? SCENES.filter((scene) => only.some((prefix) => scene.id.startsWith(prefix))) : SCENES;

mkdirSync(FRAMES, { recursive: true });
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};

// Nederlandse browsertaal, anders staat er "Choose Files" bij het importveld.
const browser = await chromium.launch({ channel: "chromium", args: ["--lang=nl-NL"] });
await warmUp(browser, scenes);
for (const scene of scenes) {
  const result = await recordScene(browser, scene);
  manifest[scene.id] = result;
  console.log(
    `${scene.id}: ${result.duration.toFixed(1)} s, ${(result.frames / result.duration).toFixed(0)} beelden/s${result.error ? `  FOUT: ${result.error}` : ""}`,
  );
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
}
await browser.close();
