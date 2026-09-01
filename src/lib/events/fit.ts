/**
 * "Past dit event bij mij?" — de logica achter het Voor mij-filter op de
 * kalender.
 *
 * Drie soorten signalen, en ze doen bewust iets anders:
 *
 * - **Een "nee" op de RSVP** is het meest expliciete signaal dat er is: het lid
 *   heeft over dit ene event al gezegd dat het niet meerijdt. Onder Alles blijft
 *   zo'n event gewoon staan, zodat je van gedachten kunt veranderen.
 * - **Interesse** is wat het lid zelf aanvinkt op zijn profiel. Niets
 *   aangevinkt betekent "alles interessant"; we raden interesse nooit.
 * - **Geschiktheid** leidt ZWB af: hoort het event bij een team waar je in
 *   zit, en past de omvang van de rit bij wat je rijdt. Het plafond komt uit
 *   het profiel, en anders uit je langste rit van het afgelopen jaar.
 *
 * Eén regel houdt het eerlijk: onbekend telt nooit als "past niet". Een lid
 * zonder Strava en zonder ingevulde grenzen wordt dus nergens door
 * weggefilterd behalve door zijn eigen nee en zijn eigen interesses. Niet elk lid kan Strava
 * koppelen (de app zit tegen de atletenlimiet aan), en die leden mogen geen
 * halve kalender krijgen.
 */

/**
 * Marge op een afgeleid plafond. Je langste rit is een ondergrens van wat je
 * aankunt, geen bovengrens: wie 100 km reed schrijft zich prima in voor 120.
 * Een handmatig ingevuld plafond krijgt deze marge níét — dat is een keuze,
 * geen schatting.
 */
export const FIT_HEADROOM = 1.2;

/** Onder dit aantal ritten zegt de geschiedenis te weinig. */
export const MIN_RIDES_FOR_CEILING = 5;

export type FitReason =
  | "declined"
  | "team"
  | "interest"
  | "distance"
  | "elevation";

export const FIT_REASON_LABELS: Record<FitReason, string> = {
  declined: "Je zei nee",
  team: "Voor een ander team",
  interest: "Buiten je interesses",
  distance: "Langer dan je grens",
  elevation: "Meer klimwerk dan je grens",
};

export type MemberFit = {
  /** Leeg = geen voorkeur opgegeven, dus alles is interessant. */
  interests: string[];
  teamIds: string[];
  /** Events waar het lid al "nee" op heeft geantwoord. */
  declinedEventIds: Set<string>;
  /** Al inclusief marge als hij is afgeleid. Null = geen plafond bekend. */
  maxDistanceKm: number | null;
  maxElevationM: number | null;
  /** Waar de plafonds vandaan komen; de kalender legt dat uit noch verbergt het. */
  ceilingSource: "profiel" | "ritten" | "onbekend";
};

export type FitEvent = {
  id?: string | null;
  type: string | null;
  team_id?: string | null;
  distance_km?: number | string | null;
  elevation_m?: number | null;
};

export type FitResult =
  | { fits: true }
  | { fits: false; reason: FitReason };

const FITS: FitResult = { fits: true };

function numberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Volgorde is niet willekeurig: de hardste reden wint. Een "nee" op de RSVP is
 * het meest expliciete signaal dat er is — het lid heeft het letterlijk gezegd,
 * over dit ene event. Daarna een feit ("voor een ander team"), dan een keuze
 * ("buiten je interesses"), en als laatste een schatting (de omvang).
 */
export function eventFitsMember(event: FitEvent, member: MemberFit): FitResult {
  if (event.id && member.declinedEventIds.has(event.id)) {
    return { fits: false, reason: "declined" };
  }
  if (event.team_id && !member.teamIds.includes(event.team_id)) {
    return { fits: false, reason: "team" };
  }
  if (
    member.interests.length > 0 &&
    (!event.type || !member.interests.includes(event.type))
  ) {
    return { fits: false, reason: "interest" };
  }
  const distance = numberOrNull(event.distance_km);
  if (
    member.maxDistanceKm !== null &&
    distance !== null &&
    distance > member.maxDistanceKm
  ) {
    return { fits: false, reason: "distance" };
  }
  const elevation = numberOrNull(event.elevation_m);
  if (
    member.maxElevationM !== null &&
    elevation !== null &&
    elevation > member.maxElevationM
  ) {
    return { fits: false, reason: "elevation" };
  }
  return FITS;
}

export type RideHistory = {
  /** Aantal ritten in het venster; onder MIN_RIDES_FOR_CEILING negeren we het. */
  rideCount: number;
  longestKm: number | null;
  biggestClimbM: number | null;
};

export type MemberFitInput = {
  interests: string[] | null;
  teamIds: string[];
  declinedEventIds: string[];
  /** Uit het profiel; null betekent "leid maar af". */
  maxDistanceKm: number | null;
  maxElevationM: number | null;
  history: RideHistory | null;
};

/**
 * Zet profielvelden en ritgeschiedenis om in één plafond per as. Het profiel
 * wint altijd van de afleiding: wie een grens invult wil die grens.
 */
export function resolveMemberFit(input: MemberFitInput): MemberFit {
  const history =
    input.history && input.history.rideCount >= MIN_RIDES_FOR_CEILING
      ? input.history
      : null;

  const derivedDistance =
    history?.longestKm != null && history.longestKm > 0
      ? Math.round(history.longestKm * FIT_HEADROOM)
      : null;
  const derivedElevation =
    history?.biggestClimbM != null && history.biggestClimbM > 0
      ? Math.round(history.biggestClimbM * FIT_HEADROOM)
      : null;

  const maxDistanceKm = input.maxDistanceKm ?? derivedDistance;
  const maxElevationM = input.maxElevationM ?? derivedElevation;

  const fromProfile =
    input.maxDistanceKm !== null || input.maxElevationM !== null;
  const ceilingSource = fromProfile
    ? ("profiel" as const)
    : maxDistanceKm !== null || maxElevationM !== null
      ? ("ritten" as const)
      : ("onbekend" as const);

  return {
    interests: (input.interests ?? []).filter(Boolean),
    teamIds: input.teamIds,
    declinedEventIds: new Set(input.declinedEventIds),
    maxDistanceKm,
    maxElevationM,
    ceilingSource,
  };
}

/**
 * Filtert het lid ooit iets weg? Zo niet, dan heeft de Voor mij-knop geen
 * betekenis en zegt de kalender dat liever dan een identieke lijst te tonen.
 */
export function fitIsInformative(member: MemberFit): boolean {
  return (
    member.interests.length > 0 ||
    member.declinedEventIds.size > 0 ||
    member.maxDistanceKm !== null ||
    member.maxElevationM !== null
  );
}
