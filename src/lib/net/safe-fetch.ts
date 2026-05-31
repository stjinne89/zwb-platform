// SSRF-bescherming voor server-side fetches van door gebruikers aangeleverde
// URL's (uitslag-scrapers, team-sync, RSS-feeds). Blokkeert verzoeken naar
// loopback, private, link-local en metadata-adressen zodat een ingevoerde URL
// niet kan worden misbruikt om interne diensten te bereiken.
//
// Gebruik: roep `assertSafeUrl(url)` aan vóór een fetch, of gebruik `safeFetch`.

import net from "node:net";
import { lookup } from "node:dns/promises";

const BLOCKED_HOSTNAMES = new Set(["localhost", "ip6-localhost", "ip6-loopback"]);
const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost"];

/** True als het IP-adres in een interne/private/link-local range valt. */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 127) return true; // "dit netwerk" + loopback
    if (a === 10) return true; // private
    if (a === 169 && b === 254) return true; // link-local + cloud-metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT (RFC6598)
    if (a >= 224) return true; // multicast/gereserveerd
    return false;
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === "::1" || l === "::") return true; // loopback / unspecified
    if (l.startsWith("fc") || l.startsWith("fd")) return true; // unique-local fc00::/7
    if (l.startsWith("fe80")) return true; // link-local
    if (l.startsWith("::ffff:")) return isPrivateIp(l.slice("::ffff:".length)); // IPv4-mapped
    return false;
  }
  return false;
}

/**
 * Valideert dat een URL veilig is om server-side op te halen. Gooit een Error
 * met een nette NL-melding als de URL geweigerd wordt. Geeft de geparste URL
 * terug bij succes.
 */
export async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Ongeldige URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Alleen http(s)-URL's zijn toegestaan.");
  }
  if (url.username || url.password) {
    throw new Error("Een URL met inloggegevens is niet toegestaan.");
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    BLOCKED_HOSTNAMES.has(host) ||
    BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))
  ) {
    throw new Error("Interne hostnamen zijn niet toegestaan.");
  }

  // Letterlijk IP-adres: direct toetsen.
  if (net.isIP(host)) {
    if (isPrivateIp(host)) {
      throw new Error("Interne of private IP-adressen zijn niet toegestaan.");
    }
    return url;
  }

  // Hostnaam: best-effort DNS-resolutie; weiger als die naar een intern IP wijst.
  try {
    const records = await lookup(host, { all: true });
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        throw new Error("De hostnaam verwijst naar een intern IP-adres.");
      }
    }
  } catch (err) {
    // Alleen onze eigen weigering doorgooien; een echte DNS-fout laten we aan de
    // fetch over (geen false-positive blokkade bij tijdelijke resolver-issues).
    if (err instanceof Error && err.message.includes("intern")) throw err;
  }

  return url;
}

/** fetch met voorafgaande SSRF-validatie van de URL. */
export async function safeFetch(raw: string, init?: RequestInit): Promise<Response> {
  await assertSafeUrl(raw);
  return fetch(raw, init);
}
