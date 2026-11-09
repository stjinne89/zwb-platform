// De inrichting van een installatie (fase 6, docs/multi-club-ontwerp.md §5): de
// stappen, het controleren van wat een beheerder invult, en welke env-sleutels
// per installatie gezet moeten zijn. Puur, zodat het te testen is; de schermen
// staan onder /beheer/inrichting en schrijven via lib/club-settings-write.ts.

import { MODULES, isModuleKey, type ModuleKey } from "@/lib/modules";

export type SetupStepKey = "club" | "huisstijl" | "modules" | "namen" | "herkenning";

export type SetupStep = { key: SetupStepKey; label: string; href: string };

/** De stappen op volgorde. Huisstijl en modules hebben al een eigen scherm. */
export const SETUP_STEPS: readonly SetupStep[] = [
  { key: "club", label: "Club", href: "/beheer/inrichting/club" },
  { key: "huisstijl", label: "Huisstijl", href: "/beheer/huisstijl" },
  { key: "modules", label: "Modules", href: "/beheer/modules" },
  { key: "namen", label: "Namen en woorden", href: "/beheer/inrichting/namen" },
  { key: "herkenning", label: "Herkenning en koppelingen", href: "/beheer/inrichting/herkenning" },
];

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** Getrimd, en leeg wordt null: dan geldt de neutrale standaard. */
export function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed : null;
}

function tooLong(value: string | null, max: number) {
  return value != null && value.length > max;
}

// ----------------------------------------------------------------- club

export type ClubIdentityInput = {
  name?: string;
  shortName?: string;
  memberNoun?: string;
  memberNounPlural?: string;
  contactEmail?: string;
  websiteUrl?: string;
};

export type ClubIdentityColumns = {
  name: string;
  short_name: string;
  member_noun: string | null;
  member_noun_plural: string | null;
  contact_email: string | null;
  website_url: string | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Naam en korte naam zijn verplicht; de rest mag leeg. */
export function parseClubIdentity(input: ClubIdentityInput): Parsed<ClubIdentityColumns> {
  const name = cleanText(input.name);
  const shortName = cleanText(input.shortName);
  const memberNoun = cleanText(input.memberNoun);
  const memberNounPlural = cleanText(input.memberNounPlural);
  const contactEmail = cleanText(input.contactEmail)?.toLowerCase() ?? null;
  let websiteUrl = cleanText(input.websiteUrl);

  if (!name) return { ok: false, error: "Vul de naam in." };
  if (!shortName) return { ok: false, error: "Vul de korte naam in." };
  if (tooLong(name, 80)) return { ok: false, error: "De naam is te lang (max 80 tekens)." };
  if (tooLong(shortName, 20)) return { ok: false, error: "De korte naam is te lang (max 20 tekens)." };
  if (tooLong(memberNoun, 40) || tooLong(memberNounPlural, 40)) {
    return { ok: false, error: "De leden-aanduiding is te lang (max 40 tekens)." };
  }
  if (contactEmail && (!EMAIL.test(contactEmail) || contactEmail.length > 200)) {
    return { ok: false, error: "Geen geldig e-mailadres." };
  }
  if (websiteUrl) {
    if (!/^https?:\/\//i.test(websiteUrl)) websiteUrl = `https://${websiteUrl}`;
    let url: URL;
    try {
      url = new URL(websiteUrl);
    } catch {
      return { ok: false, error: "Geen geldige website." };
    }
    if (!url.hostname.includes(".") || websiteUrl.length > 200) {
      return { ok: false, error: "Geen geldige website." };
    }
    websiteUrl = url.toString().replace(/\/$/, "");
  }

  return {
    ok: true,
    value: {
      name,
      short_name: shortName,
      member_noun: memberNoun,
      member_noun_plural: memberNounPlural,
      contact_email: contactEmail,
      website_url: websiteUrl,
    },
  };
}

// ------------------------------------------------------- namen en woorden

/** De eigen woorden (0319) met hun kolom en hun neutrale woord. */
export const WORD_FIELDS = [
  { key: "appName", column: "app_name", label: "Appnaam" },
  { key: "adviceName", column: "advice_name", label: "Dagadvies" },
  { key: "currencyNoun", column: "currency_noun", label: "Betaalmiddel" },
  { key: "currencyNounPlural", column: "currency_noun_plural", label: "Betaalmiddel, meervoud" },
  { key: "cupNoun", column: "cup_noun", label: "Beker" },
  { key: "betterWord", column: "better_word", label: "Beter-woord" },
] as const;

export type WordFieldKey = (typeof WORD_FIELDS)[number]["key"];
export type WordColumns = Record<(typeof WORD_FIELDS)[number]["column"], string | null>;

export type ClubNamesInput = {
  labels?: Partial<Record<string, string>>;
  words?: Partial<Record<WordFieldKey, string>>;
};

export type ClubNamesParsed = {
  /** Per module de eigen naam, of null: dan de neutrale naam. */
  labels: { module_key: ModuleKey; label: string | null }[];
  words: WordColumns;
};

/**
 * Modulenamen en eigen woorden. Een naam die gelijk is aan de neutrale slaat op
 * als leeg, zodat een latere neutrale naam in de code vanzelf doorkomt.
 * Alleen de modules die in de invoer staan, worden geschreven.
 */
export function parseClubNames(input: ClubNamesInput): Parsed<ClubNamesParsed> {
  const labels: ClubNamesParsed["labels"] = [];
  for (const [key, raw] of Object.entries(input.labels ?? {})) {
    if (!isModuleKey(key)) return { ok: false, error: `Onbekende module: ${key}` };
    const label = cleanText(raw);
    if (tooLong(label, 40)) return { ok: false, error: "Een modulenaam is te lang (max 40 tekens)." };
    const neutral = MODULES.find((m) => m.key === key)!.label;
    labels.push({ module_key: key, label: label === neutral ? null : label });
  }

  const words = {} as WordColumns;
  for (const field of WORD_FIELDS) {
    const word = cleanText(input.words?.[field.key]);
    if (tooLong(word, 40)) return { ok: false, error: `${field.label} is te lang (max 40 tekens).` };
    words[field.column] = word;
  }
  return { ok: true, value: { labels, words } };
}

// ------------------------------------------------------------- herkenning

export type RecognitionInput = {
  eventMarkers?: string;
  teamTag?: string;
  instagramHandle?: string;
  youtubeHandle?: string;
};

export type RecognitionColumns = {
  event_markers: string[] | null;
  team_tag: string | null;
  instagram_handle: string | null;
  youtube_handle: string | null;
};

/** Een handle zonder @ en zonder de link eromheen. */
export function cleanHandle(value: unknown, host: "instagram.com" | "youtube.com"): string | null {
  let text = cleanText(value);
  if (!text) return null;
  const link = text.match(new RegExp(`${host.replace(".", "\\.")}/(?:@)?([^/?#\\s]+)`, "i"));
  if (link) text = link[1];
  text = text.replace(/^@/, "").trim();
  return text || null;
}

/** Komma's of regels scheiden de markers; dubbele vallen weg. */
export function parseMarkers(value: unknown): string[] | null {
  if (typeof value !== "string") return null;
  const seen = new Set<string>();
  const markers: string[] = [];
  for (const part of value.split(/[,\n]/)) {
    const marker = part.trim();
    if (!marker || seen.has(marker.toLowerCase())) continue;
    seen.add(marker.toLowerCase());
    markers.push(marker);
  }
  return markers.length ? markers : null;
}

export function parseRecognition(input: RecognitionInput): Parsed<RecognitionColumns> {
  const eventMarkers = parseMarkers(input.eventMarkers);
  const teamTag = cleanText(input.teamTag)?.replace(/^\[(.*)\]$/, "$1").trim() || null;
  const instagram = cleanHandle(input.instagramHandle, "instagram.com");
  const youtube = cleanHandle(input.youtubeHandle, "youtube.com");

  if (eventMarkers && eventMarkers.length > 10) return { ok: false, error: "Maximaal 10 markers." };
  if (eventMarkers?.some((marker) => marker.length > 40)) {
    return { ok: false, error: "Een marker is te lang (max 40 tekens)." };
  }
  if (tooLong(teamTag, 20)) return { ok: false, error: "De teamtag is te lang (max 20 tekens)." };
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) {
    return { ok: false, error: "Geen geldige Instagram-naam." };
  }
  if (youtube && !/^[A-Za-z0-9._-]{1,100}$/.test(youtube)) {
    return { ok: false, error: "Geen geldige YouTube-naam." };
  }
  return {
    ok: true,
    value: { event_markers: eventMarkers, team_tag: teamTag, instagram_handle: instagram, youtube_handle: youtube },
  };
}

// --------------------------------------------------------------- stand

export type SetupSnapshot = {
  name: string;
  shortName: string;
  memberNoun: string | null;
  contactEmail: string | null;
  hasBrand: boolean;
  switchedOff: number;
  labels: number;
  words: number;
  eventMarkers: string[] | null;
  teamTag: string | null;
  instagramHandle: string | null;
  youtubeHandle: string | null;
};

/** De neutrale naam van een lege installatie (EMPTY_CLUB_SETTINGS, de seed). */
export const NEUTRAL_CLUB_NAME = "Club";

/**
 * Per stap of er iets eigens staat. "Standaard" is geen fout: een club mag de
 * neutrale namen en kleuren houden. Alleen de clubnaam moet echt ingevuld.
 */
export function setupStatus(s: SetupSnapshot): Record<SetupStepKey, "eigen" | "standaard" | "open"> {
  const named = s.name !== NEUTRAL_CLUB_NAME && s.shortName !== NEUTRAL_CLUB_NAME;
  return {
    club: named ? "eigen" : "open",
    huisstijl: s.hasBrand ? "eigen" : "standaard",
    modules: s.switchedOff > 0 ? "eigen" : "standaard",
    namen: s.labels + s.words > 0 ? "eigen" : "standaard",
    herkenning:
      s.eventMarkers?.length || s.teamTag || s.instagramHandle || s.youtubeHandle ? "eigen" : "standaard",
  };
}

/** Kan de inrichting af? Alleen de clubnaam is verplicht. */
export function canCompleteSetup(s: SetupSnapshot): boolean {
  return setupStatus(s).club !== "open";
}

// ------------------------------------------------------------ env-sleutels

export type EnvGroup = {
  label: string;
  keys: readonly string[];
  /** Eén van de sleutels volstaat (bijvoorbeeld OpenAI of Anthropic). */
  anyOf?: boolean;
  /** Alleen nodig als deze module aan staat. */
  module?: ModuleKey;
};

/**
 * De geheimen en waarden die per installatie in de env van Netlify staan
 * (docs/installatie.md §3). Alleen de namen: de waarden komen nooit in beeld.
 */
export const ENV_GROUPS: readonly EnvGroup[] = [
  { label: "Zwift-club", keys: ["ZWIFT_CLUB_ID"] },
  { label: "Zwift-account", keys: ["ZWIFT_USERNAME", "ZWIFT_PASSWORD"] },
  { label: "WTRL", keys: ["WTRL_COOKIE"], module: "teams" },
  { label: "Ladder", keys: ["LADDER_COOKIE"], module: "teams" },
  { label: "ZwiftRacing", keys: ["ZWIFTRACING_API_KEY"], module: "rennersniveau" },
  { label: "Strava", keys: ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "STRAVA_WEBHOOK_VERIFY_TOKEN"] },
  { label: "Telegram", keys: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_USERNAME"], module: "samen_fietsen" },
  { label: "LiveTrack-mail", keys: ["RESEND_API_KEY", "LIVE_INBOUND_DOMAIN"], module: "samen_fietsen" },
  { label: "Pushmeldingen", keys: ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"] },
  { label: "AI", keys: ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"], anyOf: true, module: "training" },
  { label: "Instagram", keys: ["INSTAGRAM_ACCESS_TOKEN"], module: "media" },
  { label: "YouTube", keys: ["YOUTUBE_API_KEY"], module: "media" },
  { label: "Podcast", keys: ["PODCAST_RSS_URL"], module: "media" },
];

export type EnvState = "ingesteld" | "deels" | "niet ingesteld";

/** Per groep of de sleutels gezet zijn. Leest alleen of er een waarde is. */
export function envStatus(
  env: Record<string, string | undefined>,
  isEnabled: (key: ModuleKey) => boolean = () => true,
): { label: string; state: EnvState; missing: string[] }[] {
  return ENV_GROUPS.filter((group) => !group.module || isEnabled(group.module)).map((group) => {
    const missing = group.keys.filter((key) => !env[key]?.trim());
    const set = group.keys.length - missing.length;
    const state: EnvState = group.anyOf
      ? set > 0
        ? "ingesteld"
        : "niet ingesteld"
      : missing.length === 0
        ? "ingesteld"
        : set > 0
          ? "deels"
          : "niet ingesteld";
    return { label: group.label, state, missing: group.anyOf && set > 0 ? [] : missing };
  });
}
