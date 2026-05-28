// Gedeelde naam-normalisatie. Strips bracket-annotaties zoals "[ZWB]" / "(ZWB)",
// haalt diacritieken weg en lowercased voor losse vergelijking.

const DIACRITICS = /[̀-ͯ]/g;

export function normalize(s: string): string {
  return s
    .replace(/\[[^\]]*\]|\([^)]*\)/g, "")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Losse, brede match (zoals roster-claim): exact of contains-beide-kanten.
export function looksLikeMe(rosterName: string, myName: string): boolean {
  const a = normalize(rosterName);
  const b = normalize(myName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

// Naam-tokens (woorden ≥2 tekens) voor strikte all-tokens matching in lange
// uitslagenlijsten — voorkomt false-positives op losse voornamen.
export function nameTokens(s: string): string[] {
  return normalize(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}
