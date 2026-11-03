// Racetijdmodel voor Zwift, zonder andere afhankelijkheden, zodat ook de
// Club Ladder-parcoursen (club-ladder/routes.ts) het kunnen gebruiken.

export type ZwiftRaceKind = "race" | "ttt";

/**
 * Duur en intensiteit van een Zwift-race, gefit op de gereden races van
 * ZWB'ers (strava_activities, 30 september 2026): 608 races en tijdritten uit de
 * ZRL en de FRR, en 135 TTT's, met de afstand en hoogtemeters van de rit zelf.
 *
 * Het buitenritmodel hierboven zat op diezelfde races mediaan 42% te lang: in
 * Zwift rijd je in een groep, zonder kruisingen of wind. Een TTT gaat nog
 * sneller, met tijdritfietsen en een team dat aflost. Een FRR-iTT reed los gefit
 * even snel als een gewone race (43,5 km/h) en valt er daarom onder, net als de
 * Race of Truth — al zat die op 22 september 2026 zo'n 6% trager.
 *
 * Afwijking van dit model op die ritten: mediaan 7% in duur (5,5% bij TTT's).
 *
 * De race is op 2 november 2026 opnieuw gefit, op 1913 "Zwift - Race: …"-ritten
 * van ZWB'ers (10 tot 80 km). Het oude model (43 km/h, 0,02 min per hm) zat
 * mediaan 4,4% te ruim: een kleinste-kwadraten-fit in minuten laat zich trekken
 * door lange tijden van wie gelost raakte. Ook telde elke hoogtemeter even
 * zwaar, terwijl je glooiing in de groep bijna gratis meeneemt: op routes met
 * 10 tot 15 hm per km (de Muckle Yin) zat het 7% te ruim, op echte klimmen
 * (20+ hm per km) 5% te krap.
 *
 * Nu een fit op de relatieve fout, en de eerste 10 hm per km tellen niet als
 * klim. Gefit op de races tot juli 2025 en getoetst op de 718 daarna: mediane
 * afwijking van 6,6% naar 5,5%, en per steilheid tussen 0,97 en 1,03 van de
 * gereden tijd. Buiten de data (een Alpe du Zwift) is het niet getoetst.
 *
 * Het TTT-model zat al goed (mediaan 1,01 van de gereden tijd over 257 TTT's)
 * en is gebleven.
 */
export const ZWIFT_RACE_PACE: Record<ZwiftRaceKind, { kmh: number; minPerHm: number; freeHmPerKm: number }> = {
  race: { kmh: 40.6, minPerHm: 0.028, freeHmPerKm: 10 },
  ttt: { kmh: 46.5, minPerHm: 0.021, freeHmPerKm: 0 },
};

/** Modeltijd van een Zwift-race in minuten, niet afgerond. */
export function zwiftRaceModelMinutes(distanceKm: number, elevationM: number, kind: ZwiftRaceKind): number {
  const pace = ZWIFT_RACE_PACE[kind];
  const climbM = Math.max(0, elevationM - pace.freeHmPerKm * distanceKm);
  return (distanceKm / pace.kmh) * 60 + climbM * pace.minPerHm;
}
