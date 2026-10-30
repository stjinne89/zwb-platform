// Ladderrenners voor de verdeling over de ladderteams: wie "Ladder" bij zijn
// interesses aanvinkte, wie in een ladderteam zit en wie een captain aan de
// ladderpool toevoegde (0285). Mannen en
// vrouwen racen in de ladder apart, dus de lijst komt per geslacht.

export type LadderRiderProfile = {
  id: string;
  display_name: string | null;
  sex: string | null;
  zwift_id: string | null;
  event_type_interests?: string[] | null;
  zrl_category: string | null;
  ftp_watts: number | null;
  weight_kg: number | string | null;
};

export type LadderRiderPower = {
  profile_id: string;
  ftp_watts: number | null;
  ftp_wkg: number | string | null;
  wkg_1m: number | string | null;
  wkg_5m: number | string | null;
  wkg_20m: number | string | null;
  rider_type: string | null;
};

export type LadderRiderMembership = {
  profile_id: string;
  team_id: string;
  team_name: string;
};

export type LadderSex = "man" | "vrouw" | null;

export type LadderRider = {
  id: string;
  name: string;
  sex: LadderSex;
  zwiftId: number | null;
  /** ZRS, of vELO 2 zodra ZwiftRacing gekoppeld is; nooit door elkaar. */
  score: number | null;
  teams: string[];
  teamIds: string[];
  /** Vinkte zelf Ladder aan bij Interesses. */
  interested: boolean;
  /** Door een captain aan de lijst toegevoegd (ladder_pool). */
  inPool: boolean;
  category: string | null;
  riderType: string | null;
  ftpWatts: number | null;
  ftpWkg: number | null;
  wkg1m: number | null;
  wkg5m: number | null;
  wkg20m: number | null;
};

export const LADDER_RIDER_SORTS = [
  "name",
  "team",
  "cat",
  "score",
  "ftp",
  "wkg",
  "w1m",
  "w5m",
  "w20m",
] as const;

export type LadderRiderSort = (typeof LADDER_RIDER_SORTS)[number];

export const DEFAULT_LADDER_RIDER_SORT: LadderRiderSort = "wkg";

export function parseLadderRiderSort(value: string | undefined): LadderRiderSort {
  return LADDER_RIDER_SORTS.find((sort) => sort === value) ?? DEFAULT_LADDER_RIDER_SORT;
}

function zwiftIdOf(value: string | null) {
  const id = Number(value?.trim());
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function num(value: number | string | null | undefined) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function buildLadderRiders(
  profiles: LadderRiderProfile[],
  powers: LadderRiderPower[],
  memberships: LadderRiderMembership[],
  scores: Map<number, number | null> = new Map(),
  poolIds: ReadonlySet<string> = new Set(),
): LadderRider[] {
  const powerByProfile = new Map(powers.map((power) => [power.profile_id, power]));
  const teamsByProfile = new Map<string, Map<string, string>>();
  for (const membership of memberships) {
    const teams = teamsByProfile.get(membership.profile_id) ?? new Map<string, string>();
    teams.set(membership.team_id, membership.team_name);
    teamsByProfile.set(membership.profile_id, teams);
  }

  return profiles.map((profile) => {
    const power = powerByProfile.get(profile.id);
    const ftp = num(power?.ftp_watts) ?? num(profile.ftp_watts);
    const weight = num(profile.weight_kg);
    const zwiftId = zwiftIdOf(profile.zwift_id);
    const teams = teamsByProfile.get(profile.id) ?? new Map<string, string>();
    return {
      id: profile.id,
      name: profile.display_name?.trim() || "Onbekend",
      sex: profile.sex === "man" || profile.sex === "vrouw" ? profile.sex : null,
      zwiftId,
      score: zwiftId == null ? null : num(scores.get(zwiftId)),
      teams: Array.from(new Set(teams.values())).sort((a, b) => a.localeCompare(b, "nl")),
      teamIds: Array.from(teams.keys()),
      interested: profile.event_type_interests?.includes("ladder") ?? false,
      inPool: poolIds.has(profile.id),
      category: profile.zrl_category?.trim() || null,
      riderType: power?.rider_type ?? null,
      ftpWatts: ftp,
      ftpWkg: num(power?.ftp_wkg) ?? (ftp && weight ? ftp / weight : null),
      wkg1m: num(power?.wkg_1m),
      wkg5m: num(power?.wkg_5m),
      wkg20m: num(power?.wkg_20m),
    };
  });
}

const NUMERIC: Partial<Record<LadderRiderSort, (rider: LadderRider) => number | null>> = {
  score: (rider) => rider.score,
  ftp: (rider) => rider.ftpWatts,
  wkg: (rider) => rider.ftpWkg,
  w1m: (rider) => rider.wkg1m,
  w5m: (rider) => rider.wkg5m,
  w20m: (rider) => rider.wkg20m,
};

const TEXT: Partial<Record<LadderRiderSort, (rider: LadderRider) => string | null>> = {
  team: (rider) => rider.teams[0] ?? null,
  cat: (rider) => rider.category,
};

const byName = (a: LadderRider, b: LadderRider) => a.name.localeCompare(b.name, "nl");

function byNumber(get: (rider: LadderRider) => number | null) {
  return (a: LadderRider, b: LadderRider) => {
    const x = get(a);
    const y = get(b);
    if (x == null || y == null) return x == null && y == null ? 0 : x == null ? 1 : -1;
    return y - x;
  };
}

/**
 * Waardes van hoog naar laag, tekst van A naar Z; lege waardes onderaan.
 * Binnen een categorie of team staat de sterkste (W/kg) bovenaan.
 */
export function sortLadderRiders<T extends LadderRider>(riders: T[], sort: LadderRiderSort): T[] {
  const numeric = NUMERIC[sort];
  const text = TEXT[sort];
  const byWkg = byNumber((rider) => rider.ftpWkg);
  return [...riders].sort((a, b) => {
    if (numeric) return byNumber(numeric)(a, b) || byName(a, b);
    if (text) {
      const x = text(a);
      const y = text(b);
      if (x == null || y == null) {
        if (x != null || y != null) return x == null ? 1 : -1;
      } else if (x !== y) {
        return x.localeCompare(y, "nl");
      }
      return byWkg(a, b) || byName(a, b);
    }
    return byName(a, b);
  });
}
