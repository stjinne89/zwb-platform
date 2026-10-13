// Eén ploegentijdrit: het plan, de rotatie op de klok en de coach op Sauce.
// Weet niets van Discord; spreken en tonen gaan via `SessionIo`.

import { Coach, type Sample } from "./coach.ts";
import { advicePhrase, eventPhrase } from "./phrases.ts";
import type { Plan } from "./plan.ts";
import {
  createRotation,
  nextIndex,
  plus,
  setOut,
  skip,
  syncLeader,
  tick,
  type Rotation,
  type RotationEvent,
} from "./rotation.ts";
import type { Priority } from "./speech.ts";

const TICK_MS = 250;
/** Zonder meting in deze tijd geldt Sauce als weg. */
const SAUCE_STALE_MS = 10_000;

export type SessionIo = {
  say(text: string, priority: Priority): void;
  /** Het statusbericht is verouderd. */
  changed(): void;
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

  constructor(
    readonly plan: Plan,
    private readonly io: SessionIo,
    private readonly now: () => number = Date.now,
    private readonly coachMode: CoachMode = "speak",
  ) {
    this.rotation = createRotation(plan.riders, Infinity);
    this.coach = new Coach(plan);
  }

  start(delaySeconds: number) {
    this.stop();
    this.manualOut.clear();
    this.rotation = createRotation(this.plan.riders, this.now() + delaySeconds * 1000);
    this.coach = new Coach(this.plan);
    this.running = true;
    this.timer = setInterval(() => this.apply(tick(this.rotation, this.now())), TICK_MS);
    this.io.changed();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
  }

  skip() {
    if (this.running) this.apply(skip(this.rotation, this.now()));
  }

  plus(seconds: number) {
    if (!this.running) return;
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
    if (!this.running || this.rotation.current === -1) return;

    const riders = this.rotation.riders;
    const byZwiftId = (zwiftId: string) => riders.findIndex((rider) => rider.zwiftId === zwiftId);
    const advice = this.coach.observe(sample, {
      leaderZwiftId: riders[this.rotation.current].zwiftId,
      pullStartedAt: this.rotation.startedAt,
      out: [...this.manualOut].flatMap((index) => riders[index].zwiftId ?? []),
    });

    for (const item of advice) {
      this.io.log(`coach ${JSON.stringify(item)}`);
      if (this.coachMode === "log") continue;
      if (item.kind === "leader") {
        this.apply(syncLeader(this.rotation, byZwiftId(item.zwiftId), sample.at));
        continue;
      }
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
    const lines = [`**${this.plan.name}**`];
    const describe = (index: number) => {
      const rider = riders[index];
      return `${rider.name}${rider.pullWatts ? ` · ${rider.pullWatts} W` : ""}`;
    };

    if (!this.running) {
      lines.push("Gestopt");
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
      const phrase = eventPhrase(event, this.rotation);
      this.io.log(`klok ${phrase}`);
      this.io.say(phrase, "clock");
    }
    if (step.events.length > 0) this.io.changed();
  }
}
