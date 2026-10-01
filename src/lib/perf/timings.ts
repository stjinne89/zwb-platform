import { cache } from "react";
import { after } from "next/server";

// TIJDELIJK (2026-10-01): tijden per stap op de trainingspagina's.
//
// /zwbeter-worden deed er 2,5 s over en /zwbeter-worden/schema 3,6-4,7 s, en het
// weghalen van vijf databaserondes maakte geen verschil. Voordat er verder
// gesneden wordt, moet eerst gemeten zijn waar de tijd zit. Elke weergave schrijft
// één regel naar de functielog van Netlify:
//
//   [perf] /zwbeter-worden total=2534ms viewer@0+118 snapshot@120+1410 ...
//
// `naam@start+duur` in milliseconden sinds het begin van de weergave. Overlappende
// stappen liepen tegelijk. Weghalen zodra de meting gebruikt is (PLAN.md).

type Collector = { page: string | null; startedAt: number; marks: string[]; flushed: boolean };

/** Eén verzamelaar per weergave; buiten een render gewoon een losse. */
const collector = cache((): Collector => ({ page: null, startedAt: performance.now(), marks: [], flushed: false }));

/** Zet de meting aan voor deze weergave en logt het resultaat na het antwoord. */
export function startTimings(page: string) {
  const current = collector();
  current.page = page;
  current.startedAt = performance.now();
  if (current.flushed) return;
  current.flushed = true;
  try {
    after(() => {
      const total = Math.round(performance.now() - current.startedAt);
      console.log(`[perf] ${page} total=${total}ms ${current.marks.join(" ")}`);
    });
  } catch {
    // Buiten een verzoek (tests): geen log.
  }
}

/** Meet één stap. Doet niets als de weergave geen meting heeft gestart. */
export async function timed<T>(label: string, work: PromiseLike<T> | (() => PromiseLike<T>)): Promise<T> {
  const current = collector();
  const started = performance.now();
  try {
    return await (typeof work === "function" ? work() : work);
  } finally {
    if (current.page) {
      current.marks.push(
        `${label}@${Math.round(started - current.startedAt)}+${Math.round(performance.now() - started)}`,
      );
    }
  }
}
