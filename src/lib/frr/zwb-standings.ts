// De ZWB'ers in het klassement van een FRR-tour (migr. 0195). Gedeeld door de
// etappepagina en het dashboard.

import type { SupabaseClient } from "@supabase/supabase-js";
import { compareFrrClass } from "@/lib/frr/watch";

export type FrrStandingRow = {
  zwift_id: string;
  name: string;
  club: string | null;
  gender_class: string;
  class_code: string;
  position: number;
  egap_s: number | string | null;
  tour_time_s: number | string | null;
  after_stage: number;
};

export const FRR_STANDING_COLUMNS =
  "zwift_id, name, club, gender_class, class_code, position, egap_s, tour_time_s, after_stage";

export type ZwbFrrStandings = {
  /** Zwift-ID → naam bij ZWB (profiel gaat voor het roster). */
  zwbNames: Map<string, string | null>;
  members: Array<{ id: string; zwiftId: string }>;
  /** Op klasse van hoog naar laag, daarna op positie. */
  standings: FrrStandingRow[];
};

export async function loadZwbFrrStandings(
  supabase: SupabaseClient,
  tourId: string,
): Promise<ZwbFrrStandings> {
  const [{ data: memberRows }, { data: rosterRows }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, zwift_id").not("zwift_id", "is", null),
    supabase.from("roster_entries").select("name, zwift_id").not("zwift_id", "is", null),
  ]);
  const zwbNames = new Map<string, string | null>();
  // Ook wie nog geen profiel heeft maar wel op het roster staat.
  for (const row of (rosterRows ?? []) as Array<{ name: string; zwift_id: string | null }>) {
    const id = row.zwift_id?.trim() ?? "";
    if (/^\d+$/.test(id)) zwbNames.set(id, row.name);
  }
  const members: ZwbFrrStandings["members"] = [];
  for (const row of (memberRows ?? []) as Array<{
    id: string;
    display_name: string | null;
    zwift_id: string | null;
  }>) {
    const id = row.zwift_id?.trim() ?? "";
    if (!/^\d+$/.test(id)) continue;
    members.push({ id: row.id, zwiftId: id });
    zwbNames.set(id, row.display_name);
  }

  const { data: rows } =
    zwbNames.size > 0
      ? await supabase
          .from("frr_gc_standings")
          .select(FRR_STANDING_COLUMNS)
          .eq("tour_id", tourId)
          .in("zwift_id", [...zwbNames.keys()])
      : { data: [] };
  const standings = ((rows ?? []) as FrrStandingRow[]).sort(
    (a, b) =>
      compareFrrClass(a.class_code, b.class_code) ||
      a.gender_class.localeCompare(b.gender_class) ||
      a.position - b.position,
  );
  return { zwbNames, members, standings };
}
