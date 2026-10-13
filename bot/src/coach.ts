// Coachregels op de live metingen uit Sauce. Geen I/O: elke meting draagt zijn
// eigen tijd, dus hetzelfde verloop geeft altijd hetzelfde advies.
//
// De drempels hieronder zijn een eerste inschatting. Ze zijn niet aan een echte
// ploegentijdrit getoetst; zie docs/ttt-discord-bot.md in de hoofdrepo.

import type { Plan } from "./plan.ts";

/** Zo lang moet een renner vooraan liggen voor hij als koprijder telt. */
export const LEADER_STABLE_MS = 3_000;
/** Venster waarover het vermogen op kop gemiddeld wordt. */
export const POWER_WINDOW_MS = 10_000;
/** De eerste seconden van een kopbeurt tellen niet mee: de renner komt nog op gang. */
export const POWER_SETTLE_MS = 5_000;
/** Kleinste afwijking die een melding waard is: dit aantal watt of dit deel van het doel. */
export const POWER_MIN_WATTS = 15;
export const POWER_MIN_SHARE = 0.06;
export const POWER_COOLDOWN_MS = 20_000;
/** Verder dan dit achter de voorste renner is een renner aan het lossen (seconden). */
export const DROP_GAP_S = 3;
export const DROP_HOLD_MS = 10_000;
/** Zo lang uit beeld telt als lossen. */
export const LOST_MS = 10_000;
/** Binnen dit gat, zo lang, is een geloste renner terug. */
export const BACK_GAP_S = 1.5;
export const BACK_HOLD_MS = 5_000;
export const PACE_INTERVAL_MS = 5 * 60_000;
/** Een ploegentijd is de tijd van de vierde renner. */
const FINISHERS = 4;

export type RiderSample = {
  zwiftId: string;
  power: number;
  speedKmh: number;
  /** Seconden achter de gevolgde renner; negatief is ervoor. */
  gap: number;
};

export type Sample = { at: number; riders: RiderSample[] };

export type Advice =
  | { kind: "leader"; zwiftId: string }
  /** `delta` is gereden min doel, afgerond op 5 watt. */
  | { kind: "power"; zwiftId: string; delta: number }
  | { kind: "dropped"; zwiftId: string }
  | { kind: "back"; zwiftId: string }
  | { kind: "four-left" }
  | { kind: "pace"; avgKmh: number; planKmh: number };

/** Wat de rotatie op dit moment denkt. */
export type CoachContext = {
  leaderZwiftId: string | null;
  pullStartedAt: number;
  /** Renners die met de hand als gelost zijn gezet. */
  out: string[];
};

type Track = {
  seenAt: number;
  power: { at: number; watts: number }[];
  /** Sinds wanneer te ver achter of uit beeld. */
  behindSince: number | null;
  closeSince: number | null;
  dropped: boolean;
  lastPowerAdviceAt: number;
};

export class Coach {
  private readonly targets = new Map<string, number | null>();
  private readonly tracks = new Map<string, Track>();
  private leader: string | null = null;
  private leaderSince = 0;
  private candidate: { zwiftId: string; since: number } | null = null;
  private fourLeftSaid = false;
  private speed = { sum: 0, count: 0 };
  private lastPaceAt = 0;

  constructor(private plan: Plan) {
    this.setPlan(plan);
  }

  /** Ander plan voor het volgende deel: nieuwe doelen, wat al gezien is blijft. */
  setPlan(plan: Plan) {
    this.plan = plan;
    this.targets.clear();
    for (const rider of plan.riders) {
      if (rider.zwiftId) this.targets.set(rider.zwiftId, rider.pullWatts);
    }
  }

  /** Renners uit het plan die Sauce in de laatste meting zag. */
  visible(sample: Sample) {
    return sample.riders.filter((rider) => this.targets.has(rider.zwiftId)).length;
  }

  observe(sample: Sample, context: CoachContext): Advice[] {
    const advice: Advice[] = [];
    const { at } = sample;
    const team = sample.riders.filter((rider) => this.targets.has(rider.zwiftId));
    if (team.length === 0) return advice;

    const front = team.reduce((a, b) => (b.gap < a.gap ? b : a));
    for (const rider of team) {
      const track = this.track(rider.zwiftId, at);
      track.seenAt = at;
      track.power.push({ at, watts: rider.power });
      while (track.power.length > 0 && track.power[0].at < at - POWER_WINDOW_MS) track.power.shift();
    }

    // Wie lost, wie is terug.
    for (const [zwiftId, track] of this.tracks) {
      if (context.out.includes(zwiftId)) continue;
      const seen = team.find((rider) => rider.zwiftId === zwiftId);
      const behind = seen ? seen.gap - front.gap : null;
      const away = behind === null ? at - track.seenAt >= LOST_MS : behind > DROP_GAP_S;
      if (!track.dropped) {
        track.behindSince = away ? (track.behindSince ?? at) : null;
        // Uit beeld heeft zijn wachttijd al gehad in LOST_MS.
        const hold = behind === null ? 0 : DROP_HOLD_MS;
        if (track.behindSince !== null && at - track.behindSince >= hold) {
          track.dropped = true;
          track.closeSince = null;
          advice.push({ kind: "dropped", zwiftId });
        }
      } else {
        const close = behind !== null && behind <= BACK_GAP_S;
        track.closeSince = close ? (track.closeSince ?? at) : null;
        if (track.closeSince !== null && at - track.closeSince >= BACK_HOLD_MS) {
          track.dropped = false;
          track.behindSince = null;
          advice.push({ kind: "back", zwiftId });
        }
      }
    }

    const gone = new Set(context.out);
    for (const [zwiftId, track] of this.tracks) if (track.dropped) gone.add(zwiftId);
    const left = this.plan.riders.filter((rider) => !rider.zwiftId || !gone.has(rider.zwiftId)).length;
    if (left > FINISHERS) this.fourLeftSaid = false;
    if (this.plan.riders.length > FINISHERS && left === FINISHERS && !this.fourLeftSaid) {
      this.fourLeftSaid = true;
      advice.push({ kind: "four-left" });
    }

    // Koprijder: de voorste, zodra hij daar even ligt.
    if (this.candidate?.zwiftId !== front.zwiftId) {
      this.candidate = { zwiftId: front.zwiftId, since: at };
    }
    if (this.candidate.zwiftId !== this.leader && at - this.candidate.since >= LEADER_STABLE_MS) {
      this.leader = this.candidate.zwiftId;
      this.leaderSince = at;
      advice.push({ kind: "leader", zwiftId: this.leader });
    }

    // Vermogen op kop, alleen als klok en Sauce het over de koprijder eens zijn.
    const target = this.leader ? this.targets.get(this.leader) : null;
    if (this.leader && target && this.leader === context.leaderZwiftId) {
      const track = this.track(this.leader, at);
      const from = Math.max(context.pullStartedAt, this.leaderSince) + POWER_SETTLE_MS;
      const window = track.power.filter((point) => point.at >= from);
      const full = window.length > 0 && at - window[0].at >= POWER_WINDOW_MS - POWER_SETTLE_MS;
      if (full && at - track.lastPowerAdviceAt >= POWER_COOLDOWN_MS) {
        const avg = window.reduce((sum, point) => sum + point.watts, 0) / window.length;
        const delta = avg - target;
        if (Math.abs(delta) >= Math.max(POWER_MIN_WATTS, target * POWER_MIN_SHARE)) {
          track.lastPowerAdviceAt = at;
          advice.push({ kind: "power", zwiftId: this.leader, delta: Math.round(delta / 5) * 5 });
        }
      }
    }

    // Tempo: het gemiddelde van de voorste renner sinds de eerste meting.
    if (this.plan.estimatedSpeedKmh) {
      if (this.speed.count === 0) this.lastPaceAt = at;
      this.speed.sum += front.speedKmh;
      this.speed.count += 1;
      if (at - this.lastPaceAt >= PACE_INTERVAL_MS) {
        this.lastPaceAt = at;
        advice.push({
          kind: "pace",
          avgKmh: Math.round((this.speed.sum / this.speed.count) * 10) / 10,
          planKmh: this.plan.estimatedSpeedKmh,
        });
      }
    }

    return advice;
  }

  private track(zwiftId: string, at: number): Track {
    let track = this.tracks.get(zwiftId);
    if (!track) {
      track = {
        seenAt: at,
        power: [],
        behindSince: null,
        closeSince: null,
        dropped: false,
        lastPowerAdviceAt: -Infinity,
      };
      this.tracks.set(zwiftId, track);
    }
    return track;
  }
}
