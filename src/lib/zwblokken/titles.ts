// ZWBlokken-titels: wie heeft in een land of provincie de meeste blokken?
//
// Het lid met de meeste blokken in een land is Koning of Koningin, in een
// provincie Gouverneur. Bij een gelijk aantal blijft de titel bij wie dat
// aantal het eerst bereikte: je moet er strikt overheen om hem over te nemen.

/** De landcode van een provinciecode: NL-LI → NL. */
export function countryOfProvince(code: string): string {
  return code.split("-")[0];
}

/** Per lid in één regio: aantal blokken en wanneer dat aantal bereikt werd. */
export type Standing = { blocks: number; reachedAt: number };

/** Regiocode → lid → stand. */
export type RegionStandings = Map<string, Map<string, Standing>>;

export type StandingRow = {
  profile_id: string;
  country: string | null;
  province: string | null;
  first_seen_at: string;
};

function add(
  standings: RegionStandings,
  code: string,
  profileId: string,
  seenAt: number,
) {
  let region = standings.get(code);
  if (!region) standings.set(code, (region = new Map()));
  const current = region.get(profileId);
  if (current) {
    current.blocks++;
    // Het huidige aantal is bereikt met het laatst ontdekte blok.
    if (seenAt > current.reachedAt) current.reachedAt = seenAt;
  } else {
    region.set(profileId, { blocks: 1, reachedAt: seenAt });
  }
}

export function addBlock(standings: RegionStandings, row: StandingRow): void {
  const seenAt = Date.parse(row.first_seen_at);
  if (row.country) add(standings, row.country, row.profile_id, seenAt);
  if (row.province) add(standings, row.province, row.profile_id, seenAt);
}

export type Ruler = { profileId: string; blocks: number };

/**
 * De titelhouder per regio. Alleen leden in `eligible` dingen mee, zodat een
 * niet-goedgekeurd of verwijderd profiel nooit een titel wegkaapt.
 */
export function pickRulers(
  standings: RegionStandings,
  eligible: Set<string>,
): Map<string, Ruler> {
  const rulers = new Map<string, Ruler>();
  for (const [code, members] of standings) {
    let best: (Standing & { profileId: string }) | null = null;
    for (const [profileId, standing] of members) {
      if (!eligible.has(profileId)) continue;
      if (
        !best ||
        standing.blocks > best.blocks ||
        (standing.blocks === best.blocks && standing.reachedAt < best.reachedAt)
      ) {
        best = { profileId, ...standing };
      }
    }
    if (best) rulers.set(code, { profileId: best.profileId, blocks: best.blocks });
  }
  return rulers;
}

/**
 * Vanaf deze privacyversie staat in de verklaring dat de titel het geslacht
 * laat zien. Wie die nog niet tekende, blijft Vorst.
 */
export const TITLE_SEX_CONSENT_VERSION = "2026-09-15";

/** Het geslacht dat de titel mag gebruiken, of null zonder toestemming. */
export function sexForTitle(
  sex: string | null | undefined,
  privacyAcceptedVersion: string | null | undefined,
): string | null {
  if (!privacyAcceptedVersion) return null;
  return privacyAcceptedVersion >= TITLE_SEX_CONSENT_VERSION ? (sex ?? null) : null;
}

/**
 * De titel bij een regio. Koning of Koningin volgt het geslacht dat het lid in
 * het profiel heeft opgegeven; zonder opgave wordt het Vorst.
 */
export function rulerTitle(
  level: "country" | "province",
  sex: string | null | undefined,
): string {
  if (level === "province") return "Gouverneur";
  if (sex === "man") return "Koning";
  if (sex === "vrouw") return "Koningin";
  return "Vorst";
}
