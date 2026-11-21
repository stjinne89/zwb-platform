// De bandendruk op de Vandaag-pagina (2026-11-21). Async server component,
// net als NutritionTodayCard: haalt de fietsen, hun wielen en banden en het
// gewicht op; het rekenen gebeurt in de browser (BandendrukCard).

import {
  TIRE_SETUP_COLUMNS,
  setupFromRow,
  type TireSetupRow,
} from "@/lib/materiaal/bandendruk";
import { getMemberModules } from "@/lib/member-modules";
import type { Viewer } from "../../_data";
import { BandendrukCard, type BandendrukFiets } from "./bandendruk-card";

type BikeRow = {
  id: string;
  name: string | null;
  brand_model: string | null;
  discipline: string | null;
  is_primary: boolean;
};

export async function BandendrukTodayCard({ viewer }: { viewer: Viewer }) {
  // De wielen vul je in Mijn garage in; staat die module uit, dan heeft de kaart
  // geen bron en geen link.
  if (!(await getMemberModules()).shows("garage")) return null;

  const [{ data: bikes }, { data: setups }, { data: profile }] = await Promise.all([
    viewer.supabase
      .from("strava_bikes")
      .select("id, name, brand_model, discipline, is_primary")
      .eq("profile_id", viewer.user.id)
      .eq("retired", false)
      .neq("discipline", "indoor")
      .order("is_primary", { ascending: false }),
    viewer.supabase.from("bike_tire_setups").select(TIRE_SETUP_COLUMNS).eq("profile_id", viewer.user.id),
    viewer.supabase.from("profiles").select("weight_kg").eq("id", viewer.user.id).maybeSingle(),
  ]);

  const rows = (bikes ?? []) as BikeRow[];
  if (rows.length === 0) return null;

  const byBike = new Map(((setups ?? []) as TireSetupRow[]).map((row) => [row.bike_id, setupFromRow(row)]));
  const fietsen: BandendrukFiets[] = rows.map((bike) => ({
    id: bike.id,
    label: bike.name?.trim() || bike.brand_model?.trim() || "Fiets",
    discipline: bike.discipline,
    setup: byBike.get(bike.id) ?? null,
  }));
  const weight = profile?.weight_kg == null ? null : Number(profile.weight_kg);

  return <BandendrukCard fietsen={fietsen} renKg={weight && weight > 0 ? weight : null} />;
}
