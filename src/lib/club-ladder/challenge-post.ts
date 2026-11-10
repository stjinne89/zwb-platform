import { normalizeTeamName } from "@/lib/ladder";

// Een uitdaging in het race-organisation-kanaal van de Club Ladder-Discord:
// titel "<ploeg> vs ?? On the 18th or 19th" en een tekst met de captains van de
// ploegen die je mag uitdagen, zoals captains dat daar zelf posten (2026-11-11).
// Puur, want de dialoog bouwt de tekst in de browser terwijl je kiest.

/** Discord-server van de Club Ladder (uit de links op het ladderdashboard). */
export const CLUB_LADDER_DISCORD_SERVER_URL = "https://discord.com/channels/928942633844355122";

/**
 * Race-organisation-kanaal per ladderregio (EMEA: `emea-race-organisation`,
 * link van de eigenaar 2026-11-11). Zonder kanaal opent de knop de server.
 */
export const RACE_ORGANISATION_CHANNELS: Partial<Record<string, string>> = {
  EMEA: `${CLUB_LADDER_DISCORD_SERVER_URL}/1075443165928103966`,
};

export function raceOrganisationUrl(region: string | null | undefined) {
  return (region && RACE_ORGANISATION_CHANNELS[region.toUpperCase()]) || CLUB_LADDER_DISCORD_SERVER_URL;
}

export type LadderCaptain = {
  name: string;
  role: "captain" | "vice-captain";
  /** Discord-gebruikersnaam uit de captain-directory van de ladder. */
  discordName: string | null;
};

export type ChallengeOpponent = {
  name: string;
  ladderTeamId: number | null;
  position: number;
  captains: LadderCaptain[];
};

function text(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/**
 * Captain en vice-captain van één ploeg uit `/directory/search?q=<naam>`. De
 * zoekfunctie geeft ook andere ploegen met die naam erin, dus het telt alleen
 * bij hetzelfde ladder-ID (of, zonder ID, dezelfde naam).
 */
export function parseDirectoryCaptains(
  json: unknown,
  team: { name: string; ladderTeamId: number | null },
): LadderCaptain[] {
  if (!Array.isArray(json)) return [];
  const wanted = normalizeTeamName(team.name);
  const captains: LadderCaptain[] = [];
  for (const row of json) {
    if (!row || typeof row !== "object") continue;
    const person = row as Record<string, unknown>;
    const rowTeam = (person.team ?? {}) as Record<string, unknown>;
    const sameTeam =
      team.ladderTeamId != null
        ? Number(rowTeam.id) === team.ladderTeamId
        : normalizeTeamName(text(rowTeam.name)) === wanted;
    if (!sameTeam) continue;
    const role = /vice/i.test(text(person.role)) ? "vice-captain" : /captain/i.test(text(person.role)) ? "captain" : null;
    if (!role) continue;
    const name = [text(person.firstname), text(person.lastname)].filter(Boolean).join(" ");
    const discordName = text(person.discordName).replace(/^@/, "") || null;
    if (!name && !discordName) continue;
    if (captains.some((c) => c.role === role && c.name === name && c.discordName === discordName)) continue;
    captains.push({ name, role, discordName });
  }
  return captains.sort((a, b) => (a.role === b.role ? 0 : a.role === "captain" ? -1 : 1));
}

/** Wie je tagt: de captain, of de vice-captain als de captain geen Discord-naam heeft. */
export function challengeContact(captains: LadderCaptain[]): LadderCaptain | null {
  return captains.find((c) => c.discordName) ?? captains[0] ?? null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ordinal(day: number) {
  const tens = day % 100;
  if (tens >= 11 && tens <= 13) return `${day}th`;
  return `${day}${{ 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th"}`;
}

function joinOr(parts: string[]) {
  return parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}`;
}

function validDates(dates: string[]) {
  return [...new Set(dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
}

/** "the 18th or 19th"; over een maandgrens "30 Nov or 1 Dec". */
export function formatChallengeDays(dates: string[]) {
  const days = validDates(dates);
  if (days.length === 0) return "??";
  const months = new Set(days.map((d) => d.slice(0, 7)));
  if (months.size === 1) return `the ${joinOr(days.map((d) => ordinal(Number(d.slice(8)))))}`;
  return joinOr(days.map((d) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`));
}

/** CET of CEST op die dag, voor een tijd in Nederland. */
export function amsterdamZone(date: string | undefined, time: string) {
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
  const at = new Date(`${day}T${/^\d{2}:\d{2}$/.test(time) ? time : "12:00"}:00Z`);
  const offset = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((part) => part.type === "timeZoneName")?.value;
  return offset === "GMT+02:00" ? "CEST" : "CET";
}

export function buildChallengePost(input: {
  teamName: string;
  dates: string[];
  /** HH:MM in Nederlandse tijd. */
  time: string;
  opponents: ChallengeOpponent[];
}) {
  const days = formatChallengeDays(input.dates);
  const time = /^\d{2}:\d{2}$/.test(input.time) ? input.time : null;
  const when = time ? ` approx ${time} ${amsterdamZone(validDates(input.dates)[0], time)}` : "";
  const tags = input.opponents.map((opponent) => {
    const contact = challengeContact(opponent.captains);
    if (!contact) return opponent.name;
    return `${contact.discordName ? `@${contact.discordName}` : contact.name} (${opponent.name})`;
  });
  return {
    title: `${input.teamName} vs ?? On ${days}`,
    body: [`We are looking for a race on ${days}${when}`, ...tags].join("\n"),
  };
}
