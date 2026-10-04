"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { zwiftId } from "@/lib/profile/ids";

/**
 * Volg een renner in de FRR-rivalenlijst (migr. 0195). Een Zwift-ID of een
 * ZwiftPower-/ZwiftRacing-link; de naam komt uit het klassement of de
 * inschrijvingen als we hem kennen.
 */
export async function followFrrRider(input: { rider: string; name?: string | null }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const id = zwiftId(input.rider);
  if (!id) return { ok: false as const, error: "Geen Zwift-ID of profiellink." };

  let name = (input.name ?? "").trim();
  if (!name) {
    const [{ data: standing }, { data: entrant }] = await Promise.all([
      supabase.from("frr_gc_standings").select("name").eq("zwift_id", id).limit(1).maybeSingle(),
      supabase.from("frr_slot_entrants").select("name").eq("zwift_id", id).limit(1).maybeSingle(),
    ]);
    name = (standing?.name ?? entrant?.name ?? "").trim() || `Zwift ${id}`;
  }

  const { error } = await supabase
    .from("frr_watch_riders")
    .upsert(
      { profile_id: user.id, zwift_id: id, name: name.slice(0, 120) },
      { onConflict: "profile_id,zwift_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/events/[id]", "page");
  return { ok: true as const };
}

export async function unfollowFrrRider(zwiftIdValue: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  const id = zwiftId(zwiftIdValue);
  if (!id) return { ok: false as const, error: "Ongeldig Zwift-ID." };

  const { error } = await supabase
    .from("frr_watch_riders")
    .delete()
    .eq("profile_id", user.id)
    .eq("zwift_id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/events/[id]", "page");
  return { ok: true as const };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Haal een renner uit je eigen voorlopige klassement (migr. 0215): wie
 * gepromoveerd is of in een verkeerde startgroep reed. Alleen voor jezelf.
 */
export async function excludeFrrRider(input: { tourId: string; zwiftId: string; name: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  const id = zwiftId(input.zwiftId);
  if (!id || !UUID.test(input.tourId)) return { ok: false as const, error: "Ongeldige renner." };

  const { error } = await supabase.from("frr_gc_exclusions").upsert(
    {
      profile_id: user.id,
      tour_id: input.tourId,
      zwift_id: id,
      name: (input.name.trim() || `Zwift ${id}`).slice(0, 120),
    },
    { onConflict: "profile_id,tour_id,zwift_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/events/[id]", "page");
  return { ok: true as const };
}

export async function restoreFrrRider(input: { tourId: string; zwiftId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  const id = zwiftId(input.zwiftId);
  if (!id || !UUID.test(input.tourId)) return { ok: false as const, error: "Ongeldige renner." };

  const { error } = await supabase
    .from("frr_gc_exclusions")
    .delete()
    .eq("profile_id", user.id)
    .eq("tour_id", input.tourId)
    .eq("zwift_id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/events/[id]", "page");
  return { ok: true as const };
}
