// De avatar van een lid (0349, 2026-11-20): een foto, of de getekende kopman.
//
// - Een lid zonder foto krijgt overal de kopman: de eigen, of zonder eigen
//   kopman een standaardkopman (een vrouw bij geslacht vrouw, anders een man).
//   Dat gebeurt bij het tonen (`memberAvatar`), niet in de database.
// - Kiest een lid met een foto voor de kopman, dan staat in avatar_url het
//   adres van de kopman (met een versie, zodat een nieuwe kopman meteen
//   zichtbaar is) en bewaart avatar_photo_url de foto voor wie terugkiest.
//
// Puur, voor de tests.

const PREFIX = "/live/kopman/";

/** Het plaatje van de kopman van een lid; met `version` mag het eeuwig in de cache. */
export function kopmanAvatarUrl(profileId: string, version?: number): string {
  return version ? `${PREFIX}${profileId}?v=${version}` : `${PREFIX}${profileId}`;
}

export function isKopmanAvatar(url: string | null | undefined): boolean {
  return typeof url === "string" && url.startsWith(PREFIX);
}

/** Wat er als avatar staat: de opgeslagen avatar, anders de kopman. */
export function memberAvatar(profileId: string | null | undefined, url: string | null | undefined): string | null {
  if (url) return url;
  return profileId ? kopmanAvatarUrl(profileId) : null;
}

/** De foto van een lid, ook als de kopman de avatar is. */
export function avatarPhoto(row: { avatar_url?: string | null; avatar_photo_url?: string | null } | null | undefined): string | null {
  if (!row) return null;
  return isKopmanAvatar(row.avatar_url) ? (row.avatar_photo_url ?? null) : (row.avatar_url ?? null);
}

const STRAVA_AVATAR = /strava|cloudfront\.net\/(avatar|pictures)/i;

/**
 * De wijziging voor een foto van Strava: alleen over een lege of een eerdere
 * Strava-foto heen, nooit over een eigen upload. Is de kopman de avatar, dan
 * gaat de foto naar avatar_photo_url en blijft de kopman staan.
 */
export function stravaAvatarPatch(
  row: { avatar_url?: string | null; avatar_photo_url?: string | null } | null | undefined,
  strava: string,
): { avatar_url?: string; avatar_photo_url?: string } {
  const replaceable = (url: string | null | undefined) => !url || STRAVA_AVATAR.test(url);
  if (isKopmanAvatar(row?.avatar_url)) return replaceable(row?.avatar_photo_url) ? { avatar_photo_url: strava } : {};
  return replaceable(row?.avatar_url) ? { avatar_url: strava } : {};
}
