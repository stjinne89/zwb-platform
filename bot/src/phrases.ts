// Wat de bot zegt. Kort: wie dit hoort, rijdt op zijn limiet.

import type { Advice } from "./coach.ts";
import { COUNTDOWN, START_COUNTDOWN, type Rotation, type RotationEvent } from "./rotation.ts";

function target(rotation: Rotation, index: number) {
  const rider = rotation.riders[index];
  // Op 5 watt: "315" zegt en onthoudt makkelijker dan "317".
  return rider.pullWatts ? `${rider.name}, ${Math.round(rider.pullWatts / 5) * 5} watt` : rider.name;
}

export function eventPhrase(event: RotationEvent, rotation: Rotation): string {
  if (event.type === "start-countdown") {
    const first = rotation.riders[event.first].name;
    if (event.seconds === 60) return `Start over één minuut. ${first} begint op kop.`;
    if (event.seconds === 30) return `Nog 30 seconden. ${first} begint op kop.`;
    return event.seconds === 5 ? "Vijf." : `Nog ${event.seconds}.`;
  }
  if (event.type === "countdown") {
    const next = rotation.riders[event.next].name;
    if (event.seconds === 30) return `Nog 30 seconden. Daarna ${next}.`;
    if (event.seconds === 10) return `${next} klaarmaken. Nog 10.`;
    return event.seconds === 5 ? "Vijf." : `Nog ${event.seconds}.`;
  }
  // De ploeg wisselde zelf al: alleen nog het doel.
  if (event.synced) return `${target(rotation, event.rider)}.`;
  const seconds = rotation.riders[event.rider].pullSeconds;
  const lead = `${target(rotation, event.rider)}, ${seconds} seconden.`;
  return event.previous === -1 ? `Start. ${lead}` : `Wissel. ${lead}`;
}

export const FREE_PHRASE = "Klim. Eigen tempo.";

/** Na vrij rijden: wie de rotatie weer oppakt. */
export function resumePhrase(rotation: Rotation): string {
  const seconds = rotation.riders[rotation.current].pullSeconds;
  return `Rotatie. ${target(rotation, rotation.current)}, ${seconds} seconden.`;
}

/** Decimalen uitgeschreven, zodat de stem "43 komma 2" zegt. */
function spoken(kmh: number) {
  return kmh.toFixed(1).replace(".", " komma ").replace(" komma 0", "");
}

export function advicePhrase(advice: Advice, name: (zwiftId: string) => string): string | null {
  switch (advice.kind) {
    case "power":
      return `${name(advice.zwiftId)}, ${Math.abs(advice.delta)} watt ${advice.delta > 0 ? "eraf" : "erbij"}.`;
    case "dropped":
      return `${name(advice.zwiftId)} lost.`;
    case "back":
      return `${name(advice.zwiftId)} is terug.`;
    case "four-left":
      return "Nog vier renners. Niemand mag meer lossen.";
    case "pace":
      return `Gemiddeld ${spoken(advice.avgKmh)}. Het plan is ${spoken(advice.planKmh)}.`;
    case "leader":
      return null;
  }
}

/** Alles wat de klok kan zeggen, om vooraf klaar te zetten. */
export function clockPhrases(rotation: Rotation): string[] {
  const phrases = new Set<string>([FREE_PHRASE]);
  rotation.riders.forEach((rider, index) => {
    if (rider.pullSeconds === 0) return;
    phrases.add(resumePhrase({ ...rotation, current: index }));
    for (const seconds of START_COUNTDOWN) {
      phrases.add(eventPhrase({ type: "start-countdown", seconds, first: index }, rotation));
    }
    for (const seconds of COUNTDOWN) {
      phrases.add(eventPhrase({ type: "countdown", seconds, current: -1, next: index }, rotation));
    }
    for (const [previous, synced] of [[-1, false], [0, false], [0, true]] as const) {
      phrases.add(eventPhrase({ type: "change", rider: index, previous, synced }, rotation));
    }
  });
  return [...phrases];
}
