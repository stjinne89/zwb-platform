"use server";

// Eigen materiaal in de rekenaar bewaren en verwijderen (2026-11-27). De
// schatting zelf rekent de browser uit (eigen-materiaal.ts); hier alleen de
// invoer, gecontroleerd. RLS houdt elke rij bij het eigen profiel.

import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  invoerVoorOpslag,
  isEigenOnderdeel,
  leesInvoer,
  leesNaam,
  type EigenRij,
} from "@/lib/materiaal/eigen-materiaal";
import { createClient } from "@/lib/supabase/server";

/** Genoeg voor elk lid; houdt een tabel vol per ongeluk tegen. */
const MAX_PER_LID = 40;

type Resultaat<T> = { ok: true; waarde: T } | { ok: false; fout: string };

async function huidigLid() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  return access.user ? { supabase, user: access.user } : null;
}

export async function bewaarEigenMateriaal(input: {
  id?: string;
  onderdeel: string;
  naam: string;
  invoer: unknown;
}): Promise<Resultaat<EigenRij>> {
  const lid = await huidigLid();
  if (!lid) return { ok: false, fout: "Log opnieuw in." };
  if (!isEigenOnderdeel(input.onderdeel)) return { ok: false, fout: "Onbekend onderdeel." };
  const naam = leesNaam(input.naam);
  if (!naam) return { ok: false, fout: "Geef het een naam." };
  const invoer = leesInvoer(input.onderdeel, input.invoer);
  if (!invoer) return { ok: false, fout: "Niet alle waarden kloppen." };

  const rij = { naam, onderdeel: input.onderdeel, invoer: invoerVoorOpslag(invoer) };

  if (input.id) {
    const { data, error } = await lid.supabase
      .from("materiaal_eigen")
      .update({ ...rij, updated_at: new Date().toISOString() })
      .eq("id", input.id)
      .eq("profile_id", lid.user.id)
      .select("id")
      .maybeSingle();
    if (error || !data) return { ok: false, fout: "Opslaan lukte niet." };
    return { ok: true, waarde: { id: data.id as string, naam, invoer } };
  }

  const { count } = await lid.supabase
    .from("materiaal_eigen")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", lid.user.id);
  if ((count ?? 0) >= MAX_PER_LID) return { ok: false, fout: `Je hebt al ${MAX_PER_LID} eigen producten.` };

  const { data, error } = await lid.supabase
    .from("materiaal_eigen")
    .insert({ ...rij, profile_id: lid.user.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, fout: "Opslaan lukte niet." };
  return { ok: true, waarde: { id: data.id as string, naam, invoer } };
}

export async function verwijderEigenMateriaal(id: string): Promise<Resultaat<null>> {
  const lid = await huidigLid();
  if (!lid) return { ok: false, fout: "Log opnieuw in." };
  const { error } = await lid.supabase.from("materiaal_eigen").delete().eq("id", id).eq("profile_id", lid.user.id);
  if (error) return { ok: false, fout: "Verwijderen lukte niet." };
  return { ok: true, waarde: null };
}
