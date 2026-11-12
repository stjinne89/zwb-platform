import type { Tier } from "./types";

/**
 * Equipment and staff: cards that make the whole team better by a percentage.
 * Per slot only your best card counts. Equipment acts on the physics of the race
 * (weight, drag, rolling resistance, drivetrain, descending, reserve); staff scale
 * the team or the equipment. Rival teams ride with a full set of their level's
 * equipment (teams.ts, `rivalBonus`); staff only you have.
 */
export const GEAR_SLOTS = ["frame", "wielen", "banden", "aandrijving", "remmen", "kleding", "voeding"] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];
export const STAFF_ROLES = ["trainer", "mechanieker", "fysio", "ploegleider", "chauffeur"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type ItemSlot = GearSlot | StaffRole;
export type ItemGroup = "materiaal" | "personeel";

export type ItemCard = {
  id: string;
  group: ItemGroup;
  slot: ItemSlot;
  tier: Tier;
  name: string;
  /** The bonus as a fraction: 0.06 is 6 %. */
  value: number;
  effect: string;
};

type Spec = { label: string; names: [string, string, string, string]; values: [number, number, number, number]; effect: (pct: string) => string };

/** Per slot: the four cards (brons, zilver, goud, diamant) and what they do. */
export const GEAR: Record<GearSlot, Spec> = {
  frame: { label: "Frame", names: ["Aluminium frame", "Carbon frame", "Klimframe", "Superlicht frame"], values: [0.03, 0.06, 0.09, 0.12], effect: (p) => `−${p} gewicht fiets` },
  wielen: { label: "Wielen", names: ["Alu wielen", "Carbon 45 mm", "Carbon 60 mm", "Windtunnelwielen"], values: [0.01, 0.02, 0.03, 0.04], effect: (p) => `−${p} luchtweerstand` },
  banden: { label: "Banden", names: ["Basisbanden", "Racebanden", "Tubeless 30 mm", "Handgemaakte tubes"], values: [0.04, 0.08, 0.12, 0.16], effect: (p) => `−${p} rolweerstand` },
  aandrijving: { label: "Aandrijving", names: ["Mechanische groep", "Elektronische groep", "Keramische lagers", "Maatwerkgroep"], values: [0.003, 0.006, 0.01, 0.014], effect: (p) => `+${p} vermogen` },
  remmen: { label: "Remmen", names: ["Kabelremmen", "Hydraulische remmen", "Schijven 160 mm", "Keramische schijven"], values: [0.02, 0.04, 0.06, 0.08], effect: (p) => `+${p} afdaalsnelheid` },
  kleding: { label: "Kleding", names: ["Clubtenue", "Aerotenue", "Aeropak en -helm", "Windtunnelpak"], values: [0.01, 0.015, 0.02, 0.025], effect: (p) => `−${p} luchtweerstand` },
  voeding: { label: "Voeding", names: ["Repen en bidons", "Gels", "Koolhydraatplan", "Voeding op maat"], values: [0.03, 0.06, 0.09, 0.12], effect: (p) => `+${p} reserve` },
};

export const STAFF: Record<StaffRole, Spec> = {
  trainer: { label: "Trainer", names: ["Jeugdtrainer", "Trainer", "Hoofdtrainer", "Topcoach"], values: [0.01, 0.02, 0.03, 0.04], effect: (p) => `+${p} vermogen ploeg` },
  mechanieker: { label: "Mechanieker", names: ["Hulpmechanieker", "Mechanieker", "Chef-mechanieker", "Werkplaatschef"], values: [0.1, 0.2, 0.3, 0.4], effect: (p) => `+${p} effect materiaal` },
  fysio: { label: "Fysio", names: ["Masseur", "Fysiotherapeut", "Medische staf", "Medisch team"], values: [0.1, 0.2, 0.3, 0.4], effect: (p) => `+${p} sneller herstel` },
  ploegleider: { label: "Ploegleider", names: ["Stagiair", "Assistent-ploegleider", "Ervaren ploegleider", "Sportief directeur"], values: [0.1, 0.2, 0.3, 0.4], effect: (p) => `+${p} langere orders` },
  chauffeur: { label: "Buschauffeur", names: ["Busje", "Buschauffeur", "Teambus", "Luxe teambus"], values: [0.1, 0.2, 0.3, 0.4], effect: (p) => `+${p} startgeld` },
};

const TIER_ORDER: Tier[] = ["brons", "zilver", "goud", "diamant"];
const pct = (n: number) => `${(Math.round(n * 1000) / 10).toLocaleString("nl-NL")}%`;

function build(): ItemCard[] {
  const out: ItemCard[] = [];
  const add = (group: ItemGroup, slot: ItemSlot, spec: Spec) => TIER_ORDER.forEach((tier, i) => out.push({ id: `${group === "materiaal" ? "m" : "p"}-${slot}-${tier}`, group, slot, tier, name: spec.names[i], value: spec.values[i], effect: spec.effect(pct(spec.values[i])) }));
  for (const slot of GEAR_SLOTS) add("materiaal", slot, GEAR[slot]);
  for (const role of STAFF_ROLES) add("personeel", role, STAFF[role]);
  return out;
}

export const ITEMS: ItemCard[] = build();
export const itemById = new Map(ITEMS.map((x) => [x.id, x]));
export const isItem = (id: string) => itemById.has(id);
export const slotLabel = (slot: ItemSlot) => (slot in GEAR ? GEAR[slot as GearSlot] : STAFF[slot as StaffRole]).label;

export function itemCard(id: string) {
  const item = itemById.get(id);
  if (!item) throw new Error(`Onbekend materiaal of personeel: ${id}`);
  return item;
}

/** Your best card per slot, or none. */
export function bestItems(items: Record<string, number>): Partial<Record<ItemSlot, ItemCard>> {
  const best: Partial<Record<ItemSlot, ItemCard>> = {};
  for (const id of Object.keys(items)) {
    const item = itemById.get(id);
    if (!item) continue;
    const held = best[item.slot];
    if (!held || TIER_ORDER.indexOf(item.tier) > TIER_ORDER.indexOf(held.tier)) best[item.slot] = item;
  }
  return best;
}

/** What the race and the economy apply: every field is a fraction, 0 is nothing. */
export type TeamBonus = {
  /** Lighter bike. */
  bikeMass: number;
  /** Less air drag. */
  cda: number;
  /** Less rolling resistance. */
  crr: number;
  /** More of the power reaches the road. */
  drivetrain: number;
  /** Faster on descents. */
  descent: number;
  /** More W′. */
  wprime: number;
  /** More threshold and sprint power. */
  power: number;
  /** Faster W′ recovery. */
  recovery: number;
  /** Radio orders last longer. */
  orders: number;
  /** More start money. */
  startFee: number;
};

export const NO_BONUS: TeamBonus = { bikeMass: 0, cda: 0, crr: 0, drivetrain: 0, descent: 0, wprime: 0, power: 0, recovery: 0, orders: 0, startFee: 0 };

export function teamBonus(items: Record<string, number> | undefined): TeamBonus {
  if (!items) return NO_BONUS;
  const best = bestItems(items);
  const v = (slot: ItemSlot) => best[slot]?.value ?? 0;
  // The mechanic makes every piece of equipment work better by his share.
  const gear = (slot: GearSlot) => v(slot) * (1 + v("mechanieker"));
  return {
    bikeMass: gear("frame"),
    cda: gear("wielen") + gear("kleding"),
    crr: gear("banden"),
    drivetrain: gear("aandrijving"),
    descent: gear("remmen"),
    wprime: gear("voeding"),
    power: v("trainer"),
    recovery: v("fysio"),
    orders: v("ploegleider"),
    startFee: v("chauffeur"),
  };
}
