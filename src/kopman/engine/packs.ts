import { pool } from "./cards";
import { ITEMS, type ItemGroup } from "./items";
import { hashSeed, rng } from "./rng";
import type { PackType, Tier } from "./types";

export const PACK_SIZE = 3;

/**
 * Odds per card. Always shown in the shop, as app stores require for random
 * items. A bronze pack holds no gold: in the lower levels of the pyramid you
 * build with bronze and silver.
 */
export const PACK_ODDS: Record<PackType, Record<Tier, number>> = {
  brons: { brons: 0.94, zilver: 0.06, goud: 0, diamant: 0 },
  zilver: { brons: 0.25, zilver: 0.65, goud: 0.1, diamant: 0 },
  goud: { brons: 0, zilver: 0.58, goud: 0.38, diamant: 0.04 },
  // Only for the top two of the Wereldtour: always at least one diamond.
  diamant: { brons: 0, zilver: 0, goud: 0.7, diamant: 0.3 },
};

export type CardKind = "renner" | ItemGroup;

/** What each card in a pack is: mostly riders, then equipment, a few staff. */
export const KIND_ODDS: Record<CardKind, number> = { renner: 0.6, materiaal: 0.3, personeel: 0.1 };

function drawKind(r: number): CardKind {
  if ((r -= KIND_ODDS.renner) < 0) return "renner";
  if ((r -= KIND_ODDS.materiaal) < 0) return "materiaal";
  return "personeel";
}

/** Silver and gold packs in a row without a gold (or diamond) card before the next one guarantees one. Bronze packs do not count. */
export const PITY_PACKS = 8;

/** Packs for sale, in coins. Gold packs are only won. */
export const PACK_PRICE: Partial<Record<PackType, number>> = { brons: 1000, zilver: 3000 };

export const PACK_LABELS: Record<PackType, string> = { brons: "Bronzen pakket", zilver: "Zilveren pakket", goud: "Gouden pakket", diamant: "Diamanten pakket" };

function drawTier(odds: Record<Tier, number>, r: number): Tier {
  if ((r -= odds.brons) < 0) return "brons";
  if ((r -= odds.zilver) < 0) return "zilver";
  if ((r -= odds.goud) < 0) return "goud";
  return "diamant";
}

/**
 * Opens a pack. Deterministic in (player seed, pack number), so a reload cannot
 * reroll it. `pity` is the number of packs since the last gold card.
 */
export function openPack(type: PackType, seed: number, packNumber: number, pity: number) {
  const random = rng(hashSeed(seed, "pakket", packNumber));
  const odds = PACK_ODDS[type];
  const tiers: Tier[] = Array.from({ length: PACK_SIZE }, () => drawTier(odds, random()));
  const counts = type !== "brons";
  const guaranteed = counts && pity >= PITY_PACKS - 1;
  const top = (t: Tier) => t === "goud" || t === "diamant";
  if (guaranteed && !tiers.some(top)) tiers[0] = "goud";
  if (type === "goud" && !tiers.some(top)) tiers[PACK_SIZE - 1] = "goud";
  if (type === "diamant" && !tiers.includes("diamant")) tiers[PACK_SIZE - 1] = "diamant";
  const chosen = new Set<string>();
  const cards = tiers.map((tier) => {
    const kind = drawKind(random());
    const options = (kind === "renner" ? pool().pool.filter((c) => c.tier === tier) : ITEMS.filter((x) => x.group === kind && x.tier === tier)).filter((c) => !chosen.has(c.id));
    const card = options[Math.floor(random() * options.length)];
    chosen.add(card.id);
    return card.id;
  });
  const gold = tiers.some(top);
  return { cards, pity: gold ? 0 : counts ? pity + 1 : pity, guaranteed };
}
