// Eén ploegentijdrit: het plan, de rotatie op de klok en de coach op Sauce.
// Weet niets van Discord; spreken en tonen gaan via `SessionIo`.

import { Coach, type Sample } from "./coach.ts";
import { advicePhrase, eventPhrase, FREE_PHRASE, resumePhrase } from "./phrases.ts";
import type { Plan } from "./plan.ts";
import {
  createRotation,
  nextIndex,
  plus,
  replan,
  resume,
  sameRider,
  setOut,
  skip,
  syncLeader,
  tick,
  type Rotation,
  type RotationEvent,
} from "./rotation.ts";
import type { Priority } from "./speech.ts";

const TICK_MS = 250;
/** Zo lang na de start of na een klim verlegt Sauce de rotatie niet: de ploeg zoekt elkaar nog. */
const SETTLE_MS = 30_000;
/** In de laatste seconden van een kopbeurt heeft een wattmelding geen zin en zit hij het aftellen in de weg. */
const QUIET_BEFORE_CHANGE_MS = 12_000;
/** Zo lang stilvallen (geen vermogen, geen snelheid) telt als gefinisht. */
const IDLE_MS = 15_000;
const IDLE_WATTS = 50;
const IDLE_KMH = 20;
/** Zo vers moet een meting zijn om er de koprijder uit af te lezen. */
const FRONT_FRESH_MS = 5_000;
/** Zonder meting in deze tijd geldt Sauce als weg. */
const SAUCE_STALE_MS = 10_000;

export type SessionIo = {
  say(text: string, priority: Priority): void;
  /** Het statusbericht is verouderd. */
  changed(): void;
  /** De renners zijn binnen; de sessie heeft zichzelf gestopt. */
  finished(): void;
  /** Voor het logboek: wat de bot zei en wat de coach zag. */
  log(line: string): void;
};

/** `log`: de coach schrijft alleen op wat hij zou doen, zonder te spreken of in te grijpen. */
export type CoachMode = "speak" | "log";

function clock(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export class Session {
  rotation: Rotation;
  running = false;
  private coach: Coach;
  private timer: NodeJS.Timeout | null = null;
  /** Met de hand gelost gezet; de coach beslist daar niet meer over. */
  private readonly manualOut = new Set<number>();
  private sauce = { at: 0, visible: 0 };
  private lastSample: Sample | null = null;
  private settleUntil = 0;
  private idleSince: number | null = null;
  /** Vrij rijden, bijvoorbeeld op een klim: klok en coach zwijgen. */
  free = false;
  /** Het plan per deel van de race; deel 1 staat op plek 0. */
  private readonly parts: Plan[];
  private part = 0;

  constructor(
    plan: Plan,
    private readonly io: SessionIo,
    private readonly now: () => number = Date.now,
    private readonly coachMode: CoachMode = "speak",
  ) {
    this.parts = [plan];
    this.rotation = createRotation(plan.riders, Infinity);
    this.coach = new Coach(plan);
  }

  /** Het plan van het deel dat nu geldt. */
  get plan(): Plan {
    return this.parts[this.part];
  }

  /** Het nummer van het deel dat nu geldt, vanaf 1. */
  get partNumber() {
    return this.part + 1;
  }

  /** De nummers van de delen waarvoor een plan klaarstaat. */
  get partNumbers() {
    return this.parts.flatMap((plan, index) => (plan ? [index + 1] : []));
  }

  /** Zet een plan klaar voor een later deel van de race. */
  addPart(number: number, plan: Plan) {
    this.parts[number - 1] = plan;
    this.io.changed();
  }

  /**
   * Ga over op het plan van een ander deel. De koprijder maakt zijn kopbeurt
   * af; daarna gelden volgorde, watt en duur van het nieuwe plan.
   */
  usePart(number: number) {
    const plan = this.parts[number - 1];
    if (!plan || number === this.partNumber) return false;
    const manual = [...this.manualOut].map((index) => this.rotation.riders[index]);
    this.part = number - 1;
    this.coach.setPlan(plan);
    const step = replan(this.rotation, plan.riders, this.now());
    this.manualOut.clear();
    step.rotation.riders.forEach((rider, index) => {
      if (manual.some((old) => old && sameRider(old, rider))) this.manualOut.add(index);
    });
    this.io.log(`deel ${number}: ${plan.name}`);
    if (this.running) this.io.say(`Deel ${number}.`, "clock");
    this.apply(step);
    this.io.changed();
    return true;
  }

  start(delaySeconds: number) {
    this.stop();
    this.manualOut.clear();
    this.part = 0;
    this.free = false;
    this.idleSince = null;
    this.settleUntil = 0;
    this.rotation = createRotation(this.plan.riders, this.now() + delaySeconds * 1000);
    this.coach = new Coach(this.plan);
    this.running = true;
    this.timer = setInterval(() => {
      if (!this.free) this.apply(tick(this.rotation, this.now()));
    }, TICK_MS);
    this.io.changed();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
  }

  skip() {
    if (this.free) this.setFree(false);
    else if (this.running) this.apply(skip(this.rotation, this.now()));
  }

  /**
   * Vrij rijden aan of uit. Aan: klok en coach zwijgen, iedereen rijdt zijn
   * eigen tempo. Uit: de rotatie begint opnieuw met wie Sauce nu vooraan ziet,
   * of anders met de volgende in het plan.
   */
  setFree(on: boolean) {
    if (!this.running || this.rotation.current === -1 || on === this.free) return false;
    this.free = on;
    if (on) {
      this.io.log("vrij rijden aan");
      this.io.say(FREE_PHRASE, "clock");
    } else {
      this.rotation = resume(this.rotation, this.frontIndex(), this.now());
      this.settleUntil = this.now() + SETTLE_MS;
      const phrase = resumePhrase(this.rotation);
      this.io.log(`vrij rijden uit: ${phrase}`);
      this.io.say(phrase, "clock");
    }
    this.io.changed();
    return true;
  }

  /** De voorste renner van de ploeg volgens de laatste meting, of -1. */
  private frontIndex() {
    const sample = this.lastSample;
    if (!sample || this.now() - sample.at > FRONT_FRESH_MS) return -1;
    const seen = sample.riders
      .map((rider) => ({
        gap: rider.gap,
        index: this.rotation.riders.findIndex((r) => r.zwiftId === rider.zwiftId && !r.out),
      }))
      .filter((rider) => rider.index !== -1);
    return seen.length === 0 ? -1 : seen.reduce((a, b) => (b.gap < a.gap ? b : a)).index;
  }

  plus(seconds: number) {
    if (!this.running || this.free) return;
    this.rotation = plus(this.rotation, seconds, this.now());
    this.io.changed();
  }

  /** Renner met de hand gelost of terug zetten. */
  setOut(index: number, out: boolean) {
    if (out) this.manualOut.add(index);
    else this.manualOut.delete(index);
    this.apply(setOut(this.rotation, index, out, this.now()));
    this.io.changed();
  }

  riderIndex(name: string) {
    const wanted = name.trim().toLowerCase();
    return this.rotation.riders.findIndex((rider) => rider.name.toLowerCase() === wanted);
  }

  onSample(sample: Sample) {
    this.sauce = { at: sample.at, visible: this.coach.visible(sample) };
    this.lastSample = sample;
    if (!this.running || this.free || this.rotation.current === -1) return;

    const riders = this.rotation.riders;
    const byZwiftId = (zwiftId: string) => riders.findIndex((rider) => rider.zwiftId === zwiftId);

    // Iedereen in beeld valt stil: de ploeg is binnen.
    const team = sample.riders.filter((rider) => byZwiftId(rider.zwiftId) !== -1);
    const idle = team.length > 0 && team.every((r) => r.power < IDLE_WATTS && r.speedKmh < IDLE_KMH);
    this.idleSince = idle ? (this.idleSince ?? sample.at) : null;
    if (this.idleSince !== null && sample.at - this.idleSince >= IDLE_MS) {
      this.io.log("gestopt: de renners staan stil");
      this.stop();
      this.io.finished();
      return;
    }

    const next = nextIndex(this.rotation);
    const advice = this.coach.observe(sample, {
      leaderZwiftId: riders[this.rotation.current].zwiftId,
      nextZwiftId: next === -1 ? null : riders[next].zwiftId,
      pullStartedAt: this.rotation.startedAt,
      out: [...this.manualOut].flatMap((index) => riders[index].zwiftId ?? []),
    });

    for (const item of advice) {
      this.io.log(`coach ${JSON.stringify(item)}`);
      if (this.coachMode === "log") continue;
      if (item.kind === "leader") {
        const index = byZwiftId(item.zwiftId);
        if (index !== this.rotation.current && sample.at < this.settleUntil) continue;
        this.apply(syncLeader(this.rotation, index, sample.at));
        continue;
      }
      if (item.kind === "power" && this.rotation.endsAt - sample.at < QUIET_BEFORE_CHANGE_MS) continue;
      if (item.kind === "dropped" || item.kind === "back") {
        this.apply(setOut(this.rotation, byZwiftId(item.zwiftId), item.kind === "dropped", sample.at));
        this.io.changed();
      }
      const phrase = advicePhrase(item, (zwiftId) => riders[byZwiftId(zwiftId)]?.name ?? "");
      if (phrase) this.io.say(phrase, "coach");
      if (phrase) this.io.log(`zegt ${phrase}`);
    }
  }

  /** Tekst van het statusbericht. */
  status(): string {
    const { riders, current, endsAt } = this.rotation;
    const part = this.partNumbers.length > 1 ? ` · deel ${this.partNumber}` : "";
    const lines = [`**${this.plan.name}**${part}`];
    const describe = (index: number) => {
      const rider = riders[index];
      return `${rider.name}${rider.pullWatts ? ` · ${rider.pullWatts} W` : ""}`;
    };

    if (!this.running) {
      lines.push("Gestopt");
    } else if (this.free) {
      lines.push("Vrij rijden · de klok staat stil");
    } else if (current === -1) {
      const first = nextIndex(this.rotation, -1);
      lines.push(`Start over ${clock(endsAt - this.now())}`);
      if (first !== -1) lines.push(`Eerste op kop: **${describe(first)}**`);
    } else {
      const next = nextIndex(this.rotation);
      lines.push(`Op kop: **${describe(current)}** · nog ${clock(endsAt - this.now())}`);
      if (next !== -1) lines.push(`Daarna: ${describe(next)} · ${riders[next].pullSeconds} s`);
    }

    const out = riders.filter((rider) => rider.out).map((rider) => rider.name);
    if (out.length > 0) lines.push(`Gelost: ${out.join(", ")}`);
    if (this.sauce.at > 0) {
      const tracked = riders.filter((rider) => rider.zwiftId).length;
      lines.push(
        this.now() - this.sauce.at > SAUCE_STALE_MS
          ? "Sauce: geen data"
          : `Sauce: ${this.sauce.visible} van ${tracked} renners in beeld`,
      );
    }
    return lines.join("\n");
  }

  private apply(step: { rotation: Rotation; events: RotationEvent[] }) {
    this.rotation = step.rotation;
    for (const event of step.events) {
      if (event.type === "change" && event.previous === -1) this.settleUntil = this.now() + SETTLE_MS;
      const phrase = eventPhrase(event, this.rotation);
      this.io.log(`klok ${phrase}`);
      this.io.say(phrase, "clock");
    }
    if (step.events.length > 0) this.io.changed();
  }
}
