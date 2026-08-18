// Parser voor een geëxporteerd WhatsApp-gesprek.
//
// WhatsApp heeft geen API voor groepsgeschiedenis, dus "de groepsapps scannen"
// betekent in de praktijk: een beheerder exporteert het gesprek en plakt de
// tekst hier. Deze module maakt daar losse berichten van en koppelt de
// afzendernaam aan een profiel — als voorstel, niet als waarheid. Bijnamen
// matchen vaak op niemand en voornamen soms op meerdere leden, en dan moet een
// mens kiezen.

export type WhatsappMessage = {
  author: string;
  text: string;
};

// Android: "18-08-2026 09:15 - Naam: tekst"
// iOS:     "[18-08-2026 09:15:22] Naam: tekst"
// Beide ook met / als scheidingsteken en met een komma na de datum.
const ANDROID_LINE =
  /^(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}),?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?\s+-\s+([^:]{1,60}):\s?([\s\S]*)$/i;
const IOS_LINE =
  /^\[(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}),?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?\]\s*([^:]{1,60}):\s?([\s\S]*)$/i;

/** Regels die WhatsApp zelf toevoegt, of die geen inhoud hebben. */
const SYSTEM_PATTERNS = [
  /end-to-end/i,
  /\bversleuteld\b/i,
  /<media weggelaten>/i,
  /<media omitted>/i,
  /afbeelding weggelaten/i,
  /je hebt .* toegevoegd/i,
  /heeft .* toegevoegd/i,
  /heeft de groep verlaten/i,
  /heeft het groepsonderwerp/i,
  /heeft de groepsafbeelding/i,
  /dit bericht is verwijderd/i,
  /^\s*$/,
];

function isSystemMessage(text: string): boolean {
  return SYSTEM_PATTERNS.some((re) => re.test(text));
}

/**
 * Splitst een export in berichten. Vervolgregels zonder tijdstempel horen bij
 * het vorige bericht — WhatsApp breekt lange berichten gewoon af.
 */
export function parseWhatsappExport(raw: string): WhatsappMessage[] {
  const messages: WhatsappMessage[] = [];
  // Onzichtbare tekens die WhatsApp voor de datum zet, anders matcht niets.
  const cleaned = raw.replace(/‎|‏|‪|‬/g, "");

  for (const line of cleaned.split(/\r?\n/)) {
    const match = line.match(IOS_LINE) ?? line.match(ANDROID_LINE);
    if (match) {
      messages.push({ author: match[2].trim(), text: match[3].trim() });
      continue;
    }
    const previous = messages[messages.length - 1];
    if (previous && line.trim()) {
      previous.text = `${previous.text}\n${line.trim()}`.trim();
    }
  }

  return messages.filter((m) => m.author && !isSystemMessage(m.text));
}

export type QuoteCandidate = WhatsappMessage & {
  /** Beste gok; null als de naam op niemand of op meerdere leden matcht. */
  matchedProfileId: string | null;
  /** Alle leden waarop de naam kan slaan, voor de keuzelijst. */
  possibleProfileIds: string[];
};

export type MatchableProfile = { id: string; display_name: string | null };

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * Koppelt een afzendernaam aan profielen: eerst op de volledige naam, anders op
 * de voornaam. Levert de match alleen als gok op wanneer er precies één
 * kandidaat is — "Karen" met twee Karens in de club is geen match.
 */
export function matchAuthor(
  author: string,
  profiles: MatchableProfile[],
): { matchedProfileId: string | null; possibleProfileIds: string[] } {
  const needle = normalize(author);
  if (!needle) return { matchedProfileId: null, possibleProfileIds: [] };

  const exact = profiles.filter((p) => normalize(p.display_name ?? "") === needle);
  if (exact.length === 1) {
    return { matchedProfileId: exact[0].id, possibleProfileIds: [exact[0].id] };
  }
  if (exact.length > 1) {
    return { matchedProfileId: null, possibleProfileIds: exact.map((p) => p.id) };
  }

  const firstName = needle.split(" ")[0];
  const byFirstName = profiles.filter(
    (p) => normalize(p.display_name ?? "").split(" ")[0] === firstName,
  );
  if (byFirstName.length === 1) {
    return { matchedProfileId: byFirstName[0].id, possibleProfileIds: [byFirstName[0].id] };
  }
  return { matchedProfileId: null, possibleProfileIds: byFirstName.map((p) => p.id) };
}

/** Berichten die kort genoeg zijn om een citaat te worden en lang genoeg om iets te zeggen. */
export function toCandidates(
  messages: WhatsappMessage[],
  profiles: MatchableProfile[],
  { minLength = 20, maxLength = 600, limit = 400 } = {},
): QuoteCandidate[] {
  return messages
    .filter((m) => m.text.length >= minLength && m.text.length <= maxLength)
    .slice(0, limit)
    .map((m) => ({ ...m, ...matchAuthor(m.author, profiles) }));
}
