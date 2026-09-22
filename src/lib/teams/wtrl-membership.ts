// Wat een WTRL-import aan één ZWB-team verandert (migr. 0181).
//
// Puur: de serveractie haalt de rijen op en voert het plan uit. Regels:
// - Alleen renners met status "lid" bij WTRL tellen; een uitnodiging is nog geen
//   teamlid.
// - Met ZWB-account (Zwift-ID op het profiel, of een geclaimde rosternaam met dat
//   Zwift-ID): lid van het team, herkomst 'wtrl'. Wie een captain eerder uit dit
//   team haalde (seed-override), blijft eruit.
// - Zonder account: een rosternaam bij dit team, herkomst 'wtrl'. Een bestaande
//   naam wordt hergebruikt (op Zwift-ID, anders op naam), behalve als een
//   beheerder hem bewust buiten een team zette ('manual_excluded').
// - Opruimen: alleen wat de import zelf neerzette. Een lid met herkomst 'wtrl' dat
//   niet meer bij WTRL in het team staat gaat eruit; een ongeclaimde WTRL-rosternaam
//   wordt losgekoppeld van het team (niet verwijderd).
// - Geen renners gelezen voor dit team? Dan niets opruimen: een mislukte plak mag
//   een team niet leegmaken.

import type { WtrlRider } from "@/lib/teams/wtrl-roster";

export type RosterEntryRow = {
  id: string;
  name: string;
  zwift_id: string | null;
  claimed_by: string | null;
  team_id: string | null;
  team_assignment_source: string | null;
};

export type MembershipRow = { profile_id: string; assignment_source: string | null };

export type WtrlMembershipPlan = {
  addMembers: string[];
  removeMembers: string[];
  upsertRoster: Array<{
    id: string | null;
    name: string;
    zwiftId: string;
    category: string | null;
  }>;
  detachRoster: string[];
};

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function planWtrlMembership(input: {
  teamId: string;
  riders: WtrlRider[];
  /** Zwift-ID → profiel-ID. */
  profileByZwiftId: Map<string, string>;
  roster: RosterEntryRow[];
  members: MembershipRow[];
  /** Profielen die een captain uit dit team haalde. */
  excluded: Set<string>;
}): WtrlMembershipPlan {
  const plan: WtrlMembershipPlan = {
    addMembers: [],
    removeMembers: [],
    upsertRoster: [],
    detachRoster: [],
  };
  const current = input.riders.filter((rider) => rider.status === "member");
  const memberIds = new Set(input.members.map((row) => row.profile_id));
  const keepProfiles = new Set<string>();
  const keepRoster = new Set<string>();

  for (const rider of current) {
    const byZwift = input.roster.find((entry) => entry.zwift_id?.trim() === rider.zwiftId);
    const entry = byZwift ?? input.roster.find((row) => sameName(row.name, rider.name));
    const profileId =
      input.profileByZwiftId.get(rider.zwiftId) ?? (byZwift?.claimed_by ?? null);

    if (profileId) {
      keepProfiles.add(profileId);
      if (!memberIds.has(profileId) && !input.excluded.has(profileId)) {
        plan.addMembers.push(profileId);
        memberIds.add(profileId);
      }
      continue;
    }

    if (entry?.claimed_by) {
      // Naam geclaimd door iemand zonder dit Zwift-ID op zijn profiel: niet raden.
      continue;
    }
    if (entry?.team_assignment_source === "manual_excluded") continue;
    if (entry) keepRoster.add(entry.id);
    plan.upsertRoster.push({
      id: entry?.id ?? null,
      name: rider.name,
      zwiftId: rider.zwiftId,
      category: rider.category,
    });
  }

  if (input.riders.length === 0) return plan;

  for (const row of input.members) {
    if (row.assignment_source === "wtrl" && !keepProfiles.has(row.profile_id)) {
      plan.removeMembers.push(row.profile_id);
    }
  }
  for (const entry of input.roster) {
    if (
      entry.team_id === input.teamId &&
      !entry.claimed_by &&
      entry.team_assignment_source === "wtrl" &&
      !keepRoster.has(entry.id)
    ) {
      plan.detachRoster.push(entry.id);
    }
  }
  return plan;
}
