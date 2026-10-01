// Meedoen aan een SRC-maand zonder aparte stap (wens van de eigenaar,
// 2026-10-01). Wie op een zondag aanklikt of hij kan, wordt zo nodig vanzelf
// ingeschreven voor die maand:
//   - is er één SRC-team, dan bij dat team;
//   - is er nog geen, dan komt er een standaardteam "ZWB SRC" (de MyWhoosh-
//     teamnaam vult een beheerder later in op /beheer/src);
//   - zijn er meer, dan moet het lid zelf kiezen op /src.
// Heren of dames volgt het profiel (vrouw → dames, anders heren), de categorie
// de laatst gereden race. Beide zijn op /src aan te passen.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SrcGender } from "@/lib/src/feed";

export const SRC_DEFAULT_TEAM_NAME = "ZWB SRC";

export type SrcMonthEntry = { team_id: string; race: SrcGender };

export async function ensureSrcMonthEntry(
  admin: SupabaseClient,
  profileId: string,
  month: string,
): Promise<{ ok: true; entry: SrcMonthEntry; joined: boolean } | { ok: false; error: string }> {
  const { data: known } = await admin
    .from("src_month_entries")
    .select("team_id, race")
    .eq("month", month)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (known) return { ok: true, entry: known as SrcMonthEntry, joined: false };

  const { data: teamRows, error: teamError } = await admin
    .from("teams")
    .select("id")
    .eq("type", "src")
    .eq("is_graveyard", false);
  if (teamError) return { ok: false, error: teamError.message };
  const teams = (teamRows ?? []) as Array<{ id: string }>;
  if (teams.length > 1) return { ok: false, error: "Kies eerst je team op Sunday Race Club." };

  let teamId = teams[0]?.id;
  if (!teamId) {
    const { data: created, error } = await admin
      .from("teams")
      .insert({ name: SRC_DEFAULT_TEAM_NAME, type: "src" })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    teamId = created.id as string;
  }

  const [{ data: profile }, { data: results }] = await Promise.all([
    admin.from("profiles").select("sex").eq("id", profileId).maybeSingle(),
    admin.from("src_results").select("race_event_id, category").eq("profile_id", profileId),
  ]);
  const race: SrcGender = profile?.sex === "vrouw" ? "women" : "men";

  // Laatst gereden categorie: de race met de laatste zondag.
  let category: number | null = null;
  const ridden = ((results ?? []) as Array<{ race_event_id: string; category: number | null }>).filter(
    (row) => row.category !== null,
  );
  if (ridden.length > 0) {
    const { data: races } = await admin
      .from("src_races")
      .select("event_id, sunday")
      .in(
        "event_id",
        ridden.map((row) => row.race_event_id),
      );
    const sundayOf = new Map(
      ((races ?? []) as Array<{ event_id: string; sunday: string }>).map((row) => [
        row.event_id,
        row.sunday,
      ]),
    );
    const latest = [...ridden].sort((a, b) =>
      (sundayOf.get(b.race_event_id) ?? "").localeCompare(sundayOf.get(a.race_event_id) ?? ""),
    )[0];
    category = latest.category;
  }

  const { error } = await admin.from("src_month_entries").insert({
    month,
    profile_id: profileId,
    team_id: teamId,
    race,
    category,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, entry: { team_id: teamId, race }, joined: true };
}
