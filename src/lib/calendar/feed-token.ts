// Het token van het agenda-abonnement (migr. 0236). Het staat in het pad, dus
// de vorm wordt gecontroleerd voordat er een query op gaat.

import { randomBytes } from "node:crypto";

const PREFIX = "zwbcal_";
const TOKEN_RE = /^zwbcal_[A-Za-z0-9_-]{43}$/;

export function newCalendarFeedToken() {
  return `${PREFIX}${randomBytes(32).toString("base64url")}`;
}

/** Het token uit het padsegment; een `.ics` erachter mag (sommige apps willen dat). */
export function calendarFeedTokenFromPath(segment: string): string | null {
  const token = segment.replace(/\.ics$/i, "");
  return TOKEN_RE.test(token) ? token : null;
}
