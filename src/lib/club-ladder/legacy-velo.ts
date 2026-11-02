// Legacy vELO (vELO1) van ZwiftRacing.app voor de Club Ladder (0301).
//
// Race Book, sinds 23 oktober 2026: vELO betekent vELO1 (legacy), en de rank is
// de open/mixed klasse van de hoogste rating over 30 dagen; zonder 30-dagenwaarde
// die over 90 dagen. Ook in de damesladder de open schaal (de damesregel voegt
// alleen Emerald–Diamond samen). De grenzen zijn die van zwiftracing.app
// (legacy, open), gelezen op 2026-11-02.

export type LegacyVeloRow = {
  zwift_id: number | string;
  velo_live: number | string | null;
  velo_max30: number | string | null;
  velo_max90: number | string | null;
  fetched_at?: string | null;
};

/** Ondergrens per rank: 1 = Diamond (2200+), 10 = Copper. */
export const LEGACY_VELO_RANK_MIN: Record<number, number> = {
  1: 2200,
  2: 1900,
  3: 1650,
  4: 1450,
  5: 1300,
  6: 1150,
  7: 1000,
  8: 850,
  9: 650,
  10: 0,
};

function positive(value: number | string | null | undefined) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** De rating waar de ladder mee rekent: max 30 dagen, anders max 90 dagen. */
export function ladderVelo(row: LegacyVeloRow | null | undefined): number | null {
  if (!row) return null;
  return positive(row.velo_max30) ?? positive(row.velo_max90);
}

export function rankFromLegacyVelo(velo: number | null): number | null {
  if (velo == null || !Number.isFinite(velo) || velo <= 0) return null;
  for (let rank = 1; rank <= 10; rank++) {
    if (velo >= LEGACY_VELO_RANK_MIN[rank]) return rank;
  }
  return null;
}

/** Ladder-vELO per Zwift-ID; rijen zonder bruikbare rating vallen weg. */
export function ladderVeloByZwiftId(rows: LegacyVeloRow[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const row of rows) {
    const id = Number(row.zwift_id);
    const velo = ladderVelo(row);
    if (Number.isSafeInteger(id) && id > 0 && velo != null) out.set(id, velo);
  }
  return out;
}
