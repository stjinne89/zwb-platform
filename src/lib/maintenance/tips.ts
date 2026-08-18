import type { SupabaseClient } from "@supabase/supabase-js";
import type { Discipline } from "./component-types";

export type MaintenanceTip = {
  id: string;
  component_type: string;
  discipline: Discipline | null;
  body: string;
  source_type: "pro" | "lid" | "algemeen";
  source_name: string | null;
  source_url: string | null;
  profile_id: string | null;
};

export const TIP_COLUMNS =
  "id, component_type, discipline, body, source_type, source_name, source_url, profile_id";

/**
 * Eén tip per onderdeel, wisselend per paginabezoek. Bewust random en niet
 * "de nieuwste": anders ziet iemand die zijn ketting elke week bekijkt altijd
 * dezelfde zin en leest hij hem na twee keer niet meer.
 */
export function pickTip(
  tips: MaintenanceTip[],
  componentType: string,
  discipline: Discipline,
): MaintenanceTip | null {
  const matching = tips.filter(
    (tip) =>
      tip.component_type === componentType &&
      (tip.discipline === null || tip.discipline === discipline),
  );
  if (matching.length === 0) return null;
  return matching[Math.floor(Math.random() * matching.length)];
}

/** Alle gepubliceerde tips voor de onderdelen die op deze pagina staan. */
export async function loadTips(
  supabase: SupabaseClient,
  componentTypes: string[],
): Promise<MaintenanceTip[]> {
  if (componentTypes.length === 0) return [];
  const { data } = await supabase
    .from("maintenance_tips")
    .select(TIP_COLUMNS)
    .eq("status", "published")
    .in("component_type", [...new Set(componentTypes)]);
  return (data ?? []) as MaintenanceTip[];
}
