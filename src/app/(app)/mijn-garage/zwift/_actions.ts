"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBikeParts } from "@/lib/pacing/ride-context";
import { loadGarageRows } from "@/lib/pacing/zwift-garage";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Zet de Zwift-garage van het lid op deze lijst: wat erbij komt of een ander
 * niveau krijgt wordt opgeslagen, wat er niet meer in staat gaat eruit. Alleen
 * namen die de fietslijst kent.
 */
export async function saveZwiftGarage(input: {
  frames: Array<{ name: string; stage: number }>;
  wheels: string[];
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd." };

  const parts = await loadBikeParts(createAdminClient());
  const frameNames = new Set(parts.filter((part) => part.part === "frame").map((part) => part.name));
  const wheelNames = new Set(parts.filter((part) => part.part === "wheel").map((part) => part.name));

  const frames = new Map<string, number>();
  for (const item of Array.isArray(input?.frames) ? input.frames : []) {
    const name = String(item?.name ?? "");
    const stage = Math.round(Number(item?.stage));
    if (frameNames.has(name)) frames.set(name, Number.isFinite(stage) ? Math.min(5, Math.max(0, stage)) : 0);
  }
  const wheels = new Set(
    (Array.isArray(input?.wheels) ? input.wheels : []).map(String).filter((name) => wheelNames.has(name)),
  );

  const now = new Date().toISOString();
  const rows = [
    ...[...frames].map(([name, stage]) => ({ profile_id: user.id, part: "frame", name, stage, updated_at: now })),
    ...[...wheels].map((name) => ({ profile_id: user.id, part: "wheel", name, stage: 0, updated_at: now })),
  ];
  if (rows.length > 0) {
    const { error } = await supabase.from("member_zwift_bikes").upsert(rows, { onConflict: "profile_id,part,name" });
    if (error) return { ok: false, error: "Opslaan lukte niet." };
  }

  const existing = await loadGarageRows(supabase, user.id);
  for (const part of ["frame", "wheel"] as const) {
    const keep = part === "frame" ? new Set(frames.keys()) : wheels;
    const removed = existing.filter((row) => row.part === part && !keep.has(row.name)).map((row) => row.name);
    if (removed.length === 0) continue;
    const { error } = await supabase
      .from("member_zwift_bikes")
      .delete()
      .eq("profile_id", user.id)
      .eq("part", part)
      .in("name", removed);
    if (error) return { ok: false, error: "Opslaan lukte niet." };
  }

  revalidatePath("/mijn-garage/zwift");
  return { ok: true };
}
