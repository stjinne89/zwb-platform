import "server-only";

// De rijen voor /beheer/koppelingen: de status per koppeling, wanneer het lid
// in de app was, en de laatste pop-up per koppeling (0307).

import { createAdminClient } from "@/lib/supabase/admin";
import { lastSeenByProfile } from "@/lib/strava/sweep";
import {
  compareStates,
  memberIntegrations,
  memberRideSource,
  worstState,
  type IntegrationState,
  type IntegrationStatus,
} from "@/lib/integrations/member-overview";
import {
  loadLatestNotices,
  loadMemberIntegrationInputs,
  stravaCapIsFull,
  type NoticeSummary,
} from "@/lib/integrations/load";
import type { RideSource } from "@/lib/intervals/rides";

export type MemberIntegrationRow = {
  profileId: string;
  name: string;
  state: IntegrationState;
  lastSeen: string | null;
  lastRideAt: string | null;
  rideSource: RideSource;
  integrations: IntegrationStatus[];
  /** Laatste pop-up per koppeling. */
  notices: Partial<Record<string, NoticeSummary>>;
};

export async function loadMemberIntegrations(now = new Date()): Promise<{
  members: MemberIntegrationRow[];
  stravaCapFull: boolean;
}> {
  const admin = createAdminClient();
  const [loaded, lastSeen, notices, stravaCapFull] = await Promise.all([
    loadMemberIntegrationInputs(admin, { now }),
    lastSeenByProfile(admin),
    loadLatestNotices(admin),
    stravaCapIsFull(admin),
  ]);

  const members = loaded.map(({ profileId, name, input }): MemberIntegrationRow => {
    const integrations = memberIntegrations(input, now);
    return {
      profileId,
      name,
      state: worstState(integrations),
      lastSeen: lastSeen?.byProfile.get(profileId) ?? null,
      lastRideAt: input.lastRideAt,
      rideSource: memberRideSource(input),
      integrations,
      notices: notices.get(profileId) ?? {},
    };
  });

  members.sort((a, b) => compareStates(a.state, b.state) || a.name.localeCompare(b.name, "nl"));
  return { members, stravaCapFull };
}
