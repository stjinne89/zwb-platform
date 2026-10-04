// Renners om in de gaten te houden in een FRR-etappe.
//
// Voor één lid: de renners die in zijn klasse vlak voor of achter hem staan in
// het klassement, plus de renners die het lid zelf volgt. Per renner het
// tijdslot waarvoor hij in deze etappe is ingeschreven. Puur.

export type GcStanding = {
  zwiftId: string;
  name: string;
  club: string | null;
  genderClass: string;
  classCode: string;
  position: number;
  /** Achterstand op de leider van de klasse, met straf. */
  egapS: number | null;
  /** Straf voor een upgrade, in seconden. */
  penaltyS?: number;
};

/** De FRR-klassen van hoog naar laag (flammerougeracing.com/tour-rules, FRHC naar vELO). */
export const FRR_CLASS_ORDER = ["CAP", "DRA", "CRP", "GHT", "HAB", "BON", "CAY", "JLP", "PEP", "BEL"];

/** Hoogste klasse eerst; een onbekende klasse achteraan. */
export function compareFrrClass(a: string, b: string) {
  const rank = (code: string) => {
    const index = FRR_CLASS_ORDER.indexOf(code);
    return index === -1 ? FRR_CLASS_ORDER.length : index;
  };
  return rank(a) - rank(b);
}

export type WatchWindow ={ places: number; seconds: number };

export const DEFAULT_WATCH_WINDOW: WatchWindow = { places: 5, seconds: 60 };

export type WatchRider = {
  zwiftId: string;
  name: string;
  club: string | null;
  classCode: string | null;
  position: number | null;
  /** Positie van de renner min die van het lid; negatief = staat voor. */
  placesDiff: number | null;
  /** eGAP van de renner min die van het lid, in seconden. */
  gapS: number | null;
  /** Straf voor een upgrade, in seconden; zit al in de eGAP. */
  penaltyS: number;
  neighbour: boolean;
  favourite: boolean;
  /** Tijdslot-events waarvoor hij in deze etappe is ingeschreven. */
  slotIds: string[];
};

export function computeWatchList(input: {
  myZwiftId: string | null;
  standings: GcStanding[];
  favourites: Array<{ zwiftId: string; name: string }>;
  /** Zwift-ID → tijdslot-event-ids van deze etappe. */
  entrantSlots: Map<string, string[]>;
  window?: WatchWindow;
}): { me: GcStanding | null; riders: WatchRider[] } {
  const window = input.window ?? DEFAULT_WATCH_WINDOW;
  const me = input.myZwiftId
    ? input.standings.find((row) => row.zwiftId === input.myZwiftId) ?? null
    : null;

  const byId = new Map<string, WatchRider>();
  const toRider = (row: GcStanding, neighbour: boolean): WatchRider => ({
    zwiftId: row.zwiftId,
    name: row.name,
    club: row.club,
    classCode: row.classCode,
    position: row.position,
    placesDiff:
      me && me.genderClass === row.genderClass ? row.position - me.position : null,
    gapS:
      me && me.genderClass === row.genderClass && me.egapS !== null && row.egapS !== null
        ? Math.round((row.egapS - me.egapS) * 100) / 100
        : null,
    penaltyS: row.penaltyS ?? 0,
    neighbour,
    favourite: false,
    slotIds: input.entrantSlots.get(row.zwiftId) ?? [],
  });

  if (me) {
    for (const row of input.standings) {
      if (row.genderClass !== me.genderClass || row.zwiftId === me.zwiftId) continue;
      const places = Math.abs(row.position - me.position);
      const seconds =
        me.egapS !== null && row.egapS !== null ? Math.abs(row.egapS - me.egapS) : Infinity;
      if (places <= window.places || seconds <= window.seconds) {
        byId.set(row.zwiftId, toRider(row, true));
      }
    }
  }

  for (const favourite of input.favourites) {
    if (favourite.zwiftId === input.myZwiftId) continue;
    const known = byId.get(favourite.zwiftId);
    if (known) {
      known.favourite = true;
      continue;
    }
    const standing = input.standings.find((row) => row.zwiftId === favourite.zwiftId);
    const rider: WatchRider = standing
      ? toRider(standing, false)
      : {
          zwiftId: favourite.zwiftId,
          name: favourite.name,
          club: null,
          classCode: null,
          position: null,
          placesDiff: null,
          gapS: null,
          penaltyS: 0,
          neighbour: false,
          favourite: true,
          slotIds: input.entrantSlots.get(favourite.zwiftId) ?? [],
        };
    rider.favourite = true;
    byId.set(favourite.zwiftId, rider);
  }

  const riders = [...byId.values()].sort((a, b) => {
    // Eerst de buren op positie, dan de favorieten van buiten de klasse.
    if (a.neighbour !== b.neighbour) return a.neighbour ? -1 : 1;
    return (a.position ?? Infinity) - (b.position ?? Infinity) || a.name.localeCompare(b.name);
  });
  return { me, riders };
}

/** 30 → "30 s straf"; null zonder straf. */
export function formatFrrPenalty(seconds: number | null | undefined) {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null;
  return `${Math.round(seconds * 10) / 10} s straf`.replace(".", ",");
}

/** 3725.4 → "1:02:05"; met teken voor een verschil. */
export function formatFrrDuration(seconds: number | null, signed = false) {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  const sign = signed ? (seconds > 0 ? "+" : seconds < 0 ? "−" : "±") : "";
  const total = Math.round(Math.abs(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${sign}${h}:${String(m).padStart(2, "0")}:${s}` : `${sign}${m}:${s}`;
}
