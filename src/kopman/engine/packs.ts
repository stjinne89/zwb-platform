import { pool } from "./cards";
import { ITEMS, type ItemGroup } from "./items";
import { hashSeed, rng } from "./rng";
import type { PackType, Tier } from "./types";

export const PACK_SIZE = 3;

/** Odds per card. Always shown in the shop, as app stores require for random items. */
export const PACK_ODDS: Record<PackType, Record<Tier, number>> = {
  brons: { brons: 0.78, zilver: 0.2, goud: 0.02 },
  zilver: { brons: 0.25, zilver: 0.65, goud: 0.1 },
  goud: { brons: 0, zilver: 0.6, goud: 0.4 },
};

export type CardKind = "renner" | ItemGroup;

/** What each card in a pack is: mostly riders, then equipment, a few staff. */
export const KIND_ODDS: Record<CardKind, number> = { renner: 0.6, materiaal: 0.3, personeel: 0.1 };

function drawKind(r: number): CardKind {
  if ((r -= KIND_ODDS.renner) < 0) return "renner";
  if ((r -= KIND_ODDS.materiaal) < 0) return "materiaal";
  return "personeel";
}

/** Packs in a row without a gold card before the next one guarantees one. */
export const PITY_PACKS = 8;

/** Packs for sale, in coins. Gold packs are only won. */
export const PACK_PRICE: Partial<Record<PackType, number>> = { brons: 1000, zilver: 3000 };

export const PACK_LABELS: Record<PackType, string> = { brons: "Bronzen pakket", zilver: "Zilveren pakket", goud: "Gouden pakket" };

function drawTier(odds: Record<Tier, number>, r: number): Tier {
  if ((r -= odds.brons) < 0) return "brons";
  if ((r -= odds.zilver) < 0) return "zilver";
  return "goud";
}

/**
 * Opens a pack. Deterministic in (player seed, pack number), so a reload cannot
 * reroll it. `pity` is the number of packs since the last gold card.
 */
export function openPack(type: PackType, seed: number, packNumber: number, pity: number) {
  const random = rng(hashSeed(seed, "pakket", packNumber));
  const odds = PACK_ODDS[type];
  const tiers: Tier[] = Array.from({ length: PACK_SIZE }, () => drawTier(odds, random()));
  const guaranteed = pity >= PITY_PACKS - 1;
  if (guaranteed && !tiers.includes("goud")) tiers[0] = "goud";
  if (type === "goud" && !tiers.includes("goud")) tiers[PACK_SIZE - 1] = "goud";
  const chosen = new Set<string>();
  const cards = tiers.map((tier) => {
    const kind = drawKind(random());
    const options = (kind === "renner" ? pool().pool.filter((c) => c.tier === tier) : ITEMS.filter((x) => x.group === kind && x.tier === tier)).filter((c) => !chosen.has(c.id));
    const card = options[Math.floor(random() * options.length)];
    chosen.add(card.id);
    return card.id;
  });
  const gold = tiers.includes("goud");
  return { cards, pity: gold ? 0 : pity + 1, guaranteed };
}
