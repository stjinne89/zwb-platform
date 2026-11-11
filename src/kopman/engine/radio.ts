import { groupsOf, kopmanOf, riding, uphillFinish, type RaceState, type Rider } from "./race";
import { hashSeed, rng } from "./rng";
import { PLAYER_TEAM } from "./types";

/**
 * Radio cards: the player is the directeur sportif. Every few seconds of play a
 * hand of three is dealt from the orders that make sense right now; one can be
 * played. Without orders the team rides like any other team.
 */
export const RADIO_IDS = ["aanval", "tempo", "sparen", "springmee", "terughalen", "naarvoren", "leadout", "vroegesprint"] as const;
export type RadioId = (typeof RADIO_IDS)[number];

export const RADIO_LABELS: Record<RadioId, { title: string; text: string }> = {
  aanval: { title: "Kopman, val aan", text: "30 seconden vol" },
  tempo: { title: "Tempo op kop", text: "Knechten 4 km op kop" },
  sparen: { title: "In het wiel", text: "Ploeg spaart 5 km" },
  springmee: { title: "Spring mee", text: "Knecht naar de groep vooruit" },
  terughalen: { title: "Kopman terugbrengen", text: "Knecht wacht en sleept" },
  naarvoren: { title: "Naar voren", text: "Vooraan voor de klim of kasseien" },
  leadout: { title: "Lead-out", text: "Treintje voor de sprint" },
  vroegesprint: { title: "Vroeg aangaan", text: "Sprint vanaf 450 m" },
};

export const HAND_SIZE = 3;
/** Real seconds between two hands. */
export const HAND_SECONDS = 20;

const team = (state: RaceState) => state.riders.filter((r) => r.team === PLAYER_TEAM && riding(r));

function situation(state: RaceState) {
  const groups = groupsOf(state);
  const kopman = kopmanOf(state, PLAYER_TEAM);
  const gi = kopman ? groups.findIndex((g) => g.includes(kopman)) : -1;
  return { groups, kopman: kopman && riding(kopman) ? kopman : undefined, gi };
}

const nextFeature = (state: RaceState, from: number) => state.course.features.find((f) => f.start > from && f.start - from < 3000);

/** The orders that make sense now. */
export function availableRadio(state: RaceState): RadioId[] {
  if (state.course.tt || state.finished) return [];
  const { groups, kopman, gi } = situation(state);
  if (!kopman || gi < 0) return [];
  const remaining = state.course.length - kopman.distance;
  const mine = team(state);
  const helpersHere = mine.filter((r) => !r.kopman && groups[gi].includes(r));
  const out: RadioId[] = [];
  if (remaining > 400 && kopman.wbal > 0.3 * kopman.wprime) out.push("aanval");
  if (helpersHere.length && remaining > 1500) out.push("tempo");
  if (remaining > 3000) out.push("sparen");
  if (gi > 0 && helpersHere.length && !groups[gi - 1].some((r) => r.team === PLAYER_TEAM) && groups[gi - 1][groups[gi - 1].length - 1].distance - kopman.distance < 400) out.push("springmee");
  if (gi > 0 && groups.slice(0, gi).some((g) => g.some((r) => r.team === PLAYER_TEAM && !r.kopman))) out.push("terughalen");
  if (nextFeature(state, kopman.distance)) out.push("naarvoren");
  if (remaining < 4000 && remaining > 800 && helpersHere.length && !uphillFinish(state.course)) out.push("leadout");
  if (remaining < 3000 && remaining > 500) out.push("vroegesprint");
  return out;
}

/** Deals a hand: a fixed draw per hand number, so the same race deals the same cards. */
export function dealHand(state: RaceState, handNumber: number): RadioId[] {
  const options = availableRadio(state);
  const random = rng(hashSeed(state.seed, "radio", handNumber));
  const shuffled = options.map((id) => ({ id, key: random() })).sort((a, b) => a.key - b.key).map((x) => x.id);
  return shuffled.slice(0, HAND_SIZE);
}

const log = (state: RaceState, r: Rider, id: RadioId) => {
  state.events.push({ t: state.time, km: Math.round(r.distance / 100) / 10, kind: "radio", rider: r.id, text: id });
};

/** Plays an order. Returns false when it no longer applies. */
export function playRadio(state: RaceState, id: RadioId): boolean {
  if (!availableRadio(state).includes(id)) return false;
  const { groups, kopman, gi } = situation(state);
  if (!kopman) return false;
  const mine = team(state);
  const helpersHere = mine.filter((r) => !r.kopman && groups[gi].includes(r));
  const t = state.time;
  switch (id) {
    case "aanval":
      kopman.override = { mode: "aanval", untilTime: t + 30 };
      break;
    case "tempo":
      for (const r of helpersHere) r.override = { mode: "kop", pull: 1, untilDistance: r.distance + 4000 };
      break;
    case "sparen":
      for (const r of mine) r.override = { mode: "sparen", untilDistance: r.distance + 5000 };
      break;
    case "springmee": {
      const ahead = groups[gi - 1];
      const helper = [...helpersHere].sort((a, b) => b.wbal - a.wbal)[0];
      helper.override = { mode: "volgen", target: ahead[ahead.length - 1].id, untilTime: t + 90 };
      break;
    }
    case "terughalen": {
      const helper = groups.slice(0, gi).flat().filter((r) => r.team === PLAYER_TEAM && !r.kopman).sort((a, b) => a.distance - b.distance)[0];
      helper.override = { mode: "wachten", target: kopman.id, untilTime: t + 240 };
      break;
    }
    case "naarvoren": {
      const feature = nextFeature(state, kopman.distance)!;
      for (const r of [kopman, ...helpersHere]) r.override = { mode: "kop", pull: r.kopman ? 0.95 : 1, untilDistance: feature.start };
      break;
    }
    case "leadout":
      for (const r of helpersHere) r.override = { mode: "kop", pull: 1.15, untilDistance: state.course.length };
      kopman.override = { mode: "volgen", target: helpersHere[0].id, untilDistance: state.course.length - 300 };
      break;
    case "vroegesprint":
      kopman.sprintAt = 450;
      break;
  }
  log(state, kopman, id);
  return true;
}
