import type { SupabaseClient } from "@supabase/supabase-js";
import { amsterdamDateKey } from "@/lib/birthdays";

// Ledenvoordeel als pop-up (wens eigenaar, 2026-11-09): elk voordeel dat een lid
// op dit apparaat nog niet zag, één keer bij binnenkomst. Een nieuw lid ziet zo
// meteen alles wat er is, een bestaand lid alleen wat er later bijkomt.

export type PopupBenefit = {
  id: string;
  title: string;
  discountCode: string | null;
  sponsorName: string | null;
};

/** Hoeveel voordelen de pop-up zelf toont; de rest staat op /sponsors. */
export const POPUP_MAX = 3;

type Row = {
  id: string;
  title: string;
  discount_code: string | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  sponsors: { name: string } | { name: string }[] | null;
};

/** Voordelen die vandaag gelden (actief, begonnen en niet verlopen), nieuwste eerst. */
export function currentBenefits(rows: Row[], today: string): PopupBenefit[] {
  return rows
    .filter((row) => (!row.valid_from || row.valid_from <= today) && (!row.valid_until || row.valid_until >= today))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((row) => {
      const sponsor = Array.isArray(row.sponsors) ? row.sponsors[0] ?? null : row.sponsors;
      return {
        id: row.id,
        title: row.title,
        discountCode: row.discount_code,
        sponsorName: sponsor?.name ?? null,
      };
    });
}

/** Wat dit apparaat nog niet zag, nieuwste eerst. */
export function unseenBenefits(benefits: PopupBenefit[], seenIds: readonly string[]): PopupBenefit[] {
  const seen = new Set(seenIds);
  return benefits.filter((benefit) => !seen.has(benefit.id));
}

/** Leest de opgeslagen lijst; alles wat geen lijst met teksten is, telt als leeg. */
export function parseSeenIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function loadPopupBenefits(supabase: SupabaseClient, now = new Date()): Promise<PopupBenefit[]> {
  const { data } = await supabase
    .from("member_benefits")
    .select("id, title, discount_code, valid_from, valid_until, created_at, sponsors(name)")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(50);
  return currentBenefits((data ?? []) as unknown as Row[], amsterdamDateKey(now));
}
