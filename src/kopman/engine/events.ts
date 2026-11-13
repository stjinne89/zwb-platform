// Between two races (round C of docs/kopman-breder.md, built 2026-11-13):
// sometimes a choice with two answers, and three tasks a season.
import { cardById, pool, TYPE_LABELS } from "./cards";
import { hashSeed, rng } from "./rng";
import type { RiderType, StatKey, Tier } from "./types";

/** A choice after a race. `rider` is one of yours. */
export type GameEvent =
  | { kind: "kopman"; rider: string }
  | { kind: "bod"; rider: string; team: string; coins: number }
  | { kind: "val"; rider: string }
  | { kind: "pers" };

export const EVENT_CHANCE = 0.4;
/** The press challenge: a podium in the next race. */
export const PERS = { place: 3, win: 6, lose: -4, refuse: -1 };
export const EVENT_FORM = { yes: 10, no: -20, rest: -30, crash: -60 };

/** The answers of an event, in the order of the buttons. */
export const EVENT_ANSWERS: Record<GameEvent["kind"], [string, string]> = {
  kopman: ["Kopman maken", "Nee"],
  bod: ["Verkopen", "Houden"],
  val: ["Rust nemen", "Doorrijden"],
  pers: ["Uitdaging aan", "Nee"],
};

/** A task of the season: hand in riders, or ride with one. */
export type Task =
  | { kind: "soort"; type: RiderType; tier: Tier; n: number; done: boolean }
  | { kind: "land"; country: string; n: number; done: boolean }
  | { kind: "groei"; rider: string; soort: string; n: number; progress: number; done: boolean };

/** The kind of course a growth task asks for, and the stat it grows. */
export const GROWTH_STAT: Record<string, StatKey> = { Kasseien: "kasseien", Bergop: "klim", Heuvels: "klim", Tijdrit: "tijdrit", Vlak: "sprint" };
export const GROWTH_POINTS = 2;
export const HAND_IN = { soort: 3, land: 4 };

/** The tier a level hands in for a stronger rider of the same kind. */
const TASK_TIER: Tier[] = ["brons", "brons", "zilver", "zilver", "goud"];

/**
 * Three tasks for a season, from your seed and the riders you have at its
 * start: a kind to hand in, a country to hand in, and one rider to grow.
 */
export function tasksFor(seed: number, season: number, level: number, collection: Record<string, number>, kinds: string[]): Task[] {
  const random = rng(hashSeed(seed, season, level, "opdracht"));
  const types: RiderType[] = ["sprinter", "klimmer", "klassieker", "tijdrijder", "allrounder"];
  const type = types[Math.floor(random() * types.length)];
  const countries = [...new Set(pool().pool.map((c) => c.country))].sort();
  // A country you have riders of, when there is one.
  const own = countries.filter((c) => Object.keys(collection).some((id) => cardById(id).country === c));
  const from = own.length ? own : countries;
  const country = from[Math.floor(random() * from.length)];
  const ids = Object.keys(collection).sort();
  const rider = ids[Math.floor(random() * ids.length)];
  const soorten = kinds.filter((k) => GROWTH_STAT[k]);
  const soort = soorten[Math.floor(random() * soorten.length)] ?? "Vlak";
  return [
    { kind: "soort", type, tier: TASK_TIER[level], n: HAND_IN.soort, done: false },
    { kind: "land", country, n: HAND_IN.land, done: false },
    { kind: "groei", rider, soort, n: 3, progress: 0, done: false },
  ];
}

export function taskText(task: Task) {
  if (task.kind === "soort") return `Lever ${task.n} ${TYPE_LABELS[task.type].toLowerCase()}s in, ${task.tier}`;
  if (task.kind === "land") return `Lever ${task.n} renners uit ${task.country} in`;
  const c = cardById(task.rider);
  return `${c.first[0]}. ${c.last}: ${task.n} keer top 10, ${task.soort.toLowerCase()}`;
}

/** Draws the event after a race, or none. */
export function drawEvent(seed: number, key: (number | string)[], lineup: string[], kopman: string | null, spare: string[], teams: string[], value: (id: string) => number): GameEvent | null {
  const random = rng(hashSeed(seed, ...key, "gebeurtenis"));
  if (random() >= EVENT_CHANCE) return null;
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const helpers = lineup.filter((id) => id !== kopman);
  const options: GameEvent[] = [{ kind: "pers" }];
  if (helpers.length) options.push({ kind: "kopman", rider: pick(helpers) });
  if (lineup.length) options.push({ kind: "val", rider: pick(lineup) });
  if (spare.length && teams.length) {
    const rider = pick(spare);
    options.push({ kind: "bod", rider, team: pick(teams), coins: value(rider) * 2 });
  }
  return pick(options);
}

/** A crash ridden through: half the time nothing, otherwise a big loss of form. */
export const crashHurts = (seed: number, key: (number | string)[]) => rng(hashSeed(seed, ...key, "val"))() < 0.5;
