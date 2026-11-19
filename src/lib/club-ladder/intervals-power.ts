import "server-only";

// De intervals.icu-curve van onze eigen renners voor het ladderadvies: de beste
// watt over 15 s, 1, 5 en 20 minuten over 90 dagen (`rider_power_profiles`, de
// sync van Teams). Watt en geen W/kg: de W/kg in die tabel is leeg als het
// gewicht bij de sync ontbrak, en het advies deelt toch door het gewicht
// waarmee Zwift rekent. Zonder gewicht in intervals.icu het gewicht van het
// profiel, net als de sync zelf doet.

import type { createAdminClient } from "@/lib/supabase/admin";
import { withPowerScope, type PowerScope } from "@/lib/teams/power-scope";
import type { IntervalsPower } from "./rank-pairs";

type Admin = ReturnType<typeof createAdminClient>;

type PowerRow = {
  profile_id: string;
  watts_15s: number | null;
  watts_1m: number | null;
  watts_5m: number | null;
  watts_20m: number | null;
  weight_kg: number | string | null;
  indoor_profile?: unknown;
};

const positive = (value: unknown) => {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Per profiel-id de curve en het gewicht; profielen zonder watt ontbreken. Met
 * `indoor` de indoorcurve (migratie 0344): wie die niet heeft, ontbreekt, en
 * valt in het advies terug op ZwiftRacing, dat toch al binnen is.
 */
export async function loadIntervalsPower(
  admin: Admin,
  profileIds: string[],
  scope: PowerScope = "all",
): Promise<Map<string, IntervalsPower>> {
  const ids = [...new Set(profileIds)];
  if (ids.length === 0) return new Map();
  const [{ data: powerRows }, { data: profileRows }] = await Promise.all([
    admin
      .from("rider_power_profiles")
      .select(`profile_id, watts_15s, watts_1m, watts_5m, watts_20m, weight_kg${scope === "indoor" ? ", indoor_profile" : ""}`)
      .in("profile_id", ids),
    admin.from("profiles").select("id, weight_kg").in("id", ids),
  ]);
  const profileWeight = new Map(
    ((profileRows ?? []) as Array<{ id: string; weight_kg: number | string | null }>).map((row) => [row.id, positive(row.weight_kg)]),
  );
  const out = new Map<string, IntervalsPower>();
  for (const raw of (powerRows ?? []) as unknown as PowerRow[]) {
    const row = withPowerScope(raw, scope);
    const watts = { s15: positive(row.watts_15s), m1: positive(row.watts_1m), m5: positive(row.watts_5m), m20: positive(row.watts_20m) };
    if (!Object.values(watts).some((value) => value != null)) continue;
    out.set(row.profile_id, { watts, weightKg: positive(row.weight_kg) ?? profileWeight.get(row.profile_id) ?? null });
  }
  return out;
}
