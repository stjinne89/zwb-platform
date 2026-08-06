// Strava sport_types die als fietsen tellen.
//
// Stond eerder vijf keer los gekopieerd (stats, dashboard, club-stats,
// rider-stats, beheer/strava); één bron voorkomt dat die lijsten uit elkaar
// gaan lopen als Strava een discipline toevoegt.

export const CYCLING_SPORTS = [
  "Ride",
  "VirtualRide",
  "MountainBikeRide",
  "EBikeRide",
  "GravelRide",
  "EMountainBikeRide",
  "Velomobile",
  "Handcycle",
];

/**
 * Fietsen mét echte GPS. Zwift en MyWhoosh komen binnen als VirtualRide met
 * de coördinaten van de virtuele wereld (Watopia ligt in de Salomonzee), dus
 * alles wat op de kaart terechtkomt moet deze lijst gebruiken.
 */
export const OUTDOOR_CYCLING_SPORTS = CYCLING_SPORTS.filter(
  (sport) => sport !== "VirtualRide",
);

/**
 * Herkent een virtuele rit die Strava níét als VirtualRide heeft opgeslagen.
 *
 * Dat komt echt voor: een Zwift-rit die via een FIT-tool geüpload is, komt
 * binnen als `sport_type: "Ride"` met `trainer: false` en zonder device_name —
 * niets in de metadata verraadt hem, alleen de naam. Strava's eigen import
 * noemt Zwift-ritten standaard "Zwift - <wereld>".
 *
 * Geen waterdichte test (een echte rit die iemand "Zwift-tempo" noemt valt
 * hier ook onder), maar wel de enige aanwijzing die deze ritten hebben.
 */
export function looksVirtual(activity: {
  name?: string | null;
  deviceName?: string | null;
  externalId?: string | null;
}): boolean {
  const haystack = [activity.name, activity.deviceName, activity.externalId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /\b(zwift|watopia|makuri|mywhoosh|rouvy|indievelo|trainerroad|wahoo\s*rgt)\b/.test(
    haystack,
  );
}
