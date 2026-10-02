import type { SupabaseClient } from "@supabase/supabase-js";

/** Wat de app van de ingelogde gebruiker nodig heeft; beide staan in het inlogbewijs. */
export type SessionUser = { id: string; email?: string };

/**
 * Wie is er ingelogd, zonder rondje naar Supabase Auth.
 *
 * `getUser()` vraagt het bij elke aanroep aan de Auth-server. De functies van
 * deze site draaien in Ohio en Supabase staat in Ierland, dus dat was per klik
 * een oversteek (gemeten 2026-10-01: pagina's van 1 tot 3 s terwijl de queries
 * zelf milliseconden duren). `getClaims()` controleert de handtekening van het
 * JWT lokaal; het project tekent met een asymmetrische sleutel (ES256), en de
 * publieke sleutel wordt per serverinstantie tien minuten onthouden. Een bijna
 * verlopen sessie wordt eerst ververst, net als voorheen.
 *
 * Gevolg om te kennen: een ingetrokken sessie of verwijderd account blijft
 * geldig tot het JWT verloopt (standaard een uur). De goedkeuring van een lid
 * wordt los daarvan bij elk verzoek in de database nagekeken (middleware), en
 * de database controleert het JWT bij elke query zelf.
 *
 * Lukt de lokale controle niet (bijvoorbeeld de sleutel is niet op te halen),
 * dan valt dit terug op `getUser()`.
 */
export async function getSessionUser(supabase: SupabaseClient): Promise<SessionUser | null> {
  try {
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (claims?.sub) {
      return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
    }
    if (!error) return null;
  } catch {
    // Deze controle draait bij elk verzoek, ook in de middleware: een onverwachte
    // fout hier mag niet iedereen buitensluiten. Dan de oude weg.
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email } : null;
}
