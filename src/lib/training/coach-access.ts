// Wie mag er bij de trainingsgegevens van wie.
//
// canCoach() stond privé in zwbeter-worden/_actions.ts. Sinds de coachchat is
// dezelfde vraag ook nodig in /api/training/chat, en een tweede kopie van een
// toegangscontrole is precies het soort duplicaat dat een keer uit elkaar gaat
// lopen. Vandaar hier, met de chatdeelnemers ernaast.

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Mag deze trainer bij deze renner? Een lid mag altijd bij zichzelf — dat is
 * geen uitzondering maar het normale geval: sinds 0039 kan een lid met de
 * trainer-rol zichzelf aanwijzen.
 */
export async function canCoach(admin: Admin, trainerId: string, athleteId: string) {
  if (trainerId === athleteId) return true;
  const { data } = await admin
    .from("training_coach_assignments")
    .select("id")
    .eq("trainer_id", trainerId)
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data);
}

/**
 * De trainers die dit lid heeft aangewezen. Het is een veel-op-veel-relatie:
 * er is geen kolom "de" aangewezen trainer, een lid kan er meerdere hebben en
 * ze lezen allemaal mee. Gebruikt voor de toegangsregel boven het gesprek en om
 * te weten wie een melding krijgt.
 *
 * Het lid zelf valt eruit, ook als het zichzelf heeft aangewezen: de vraag is
 * hier wie er méékijkt, en je eigen gesprek hoeft niemand je te melden.
 */
export async function activeTrainersOf(
  admin: Admin,
  profileId: string,
): Promise<Array<{ id: string; name: string }>> {
  const { data: assignments } = await admin
    .from("training_coach_assignments")
    .select("trainer_id")
    .eq("athlete_id", profileId)
    .eq("status", "active");

  const trainerIds = [
    ...new Set(((assignments ?? []) as Array<{ trainer_id: string }>).map((row) => row.trainer_id)),
  ].filter((id) => id !== profileId);
  if (trainerIds.length === 0) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", trainerIds);

  const names = new Map(
    ((profiles ?? []) as Array<{ id: string; display_name: string | null }>).map((row) => [
      row.id,
      row.display_name,
    ]),
  );
  return trainerIds.map((id) => ({ id, name: names.get(id) ?? "Trainer" }));
}
