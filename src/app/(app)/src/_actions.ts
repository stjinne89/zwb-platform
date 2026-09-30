"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { requestReplan } from "@/lib/training/replan";
import { setSrcRaceRsvp, srcRaceOfSunday } from "@/lib/src/availability";
import {
  isSrcMonthKey,
  nextSrcMonth,
  srcMonthKey,
  srcTeamLocked,
  type SrcAvailabilityStatus,
} from "@/lib/src/month";
import type { SrcGender } from "@/lib/src/feed";
import { SRC_MANAGERS } from "@/lib/src/access";

type Admin = ReturnType<typeof createAdminClient>;

function revalidate() {
  revalidatePath("/src");
  revalidatePath("/kalender");
  revalidatePath("/events/[id]", "page");
}

/** Mag het team van dit lid voor deze maand nog wisselen? */
async function firstRaceOfMonth(admin: Admin, month: string) {
  const { data } = await admin
    .from("events")
    .select("start_at")
    .gte("src_sunday", month)
    .lt("src_sunday", nextSrcMonth(month))
    .is("parent_event_id", null)
    .order("start_at")
    .limit(1)
    .maybeSingle();
  return (data?.start_at as string | undefined) ?? null;
}

async function isSrcTeam(admin: Admin, teamId: string) {
  const { data } = await admin
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("type", "src")
    .maybeSingle();
  return Boolean(data);
}

/** Deze of volgende maand; verder vooruit plannen heeft geen zin. */
function plannableMonth(month: string) {
  const current = srcMonthKey(new Date());
  return isSrcMonthKey(month) && (month === current || month === nextSrcMonth(current));
}

async function canManage(teamId: string | null) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (access.hasAny([...SRC_MANAGERS, "teams.manage_roster"])) {
    return { ok: true as const, userId: access.user.id };
  }
  if (teamId) {
    const { data } = await createAdminClient()
      .from("team_members")
      .select("team_id")
      .eq("team_id", teamId)
      .eq("profile_id", access.user.id)
      .in("role", ["captain", "co-captain"])
      .maybeSingle();
    if (data) return { ok: true as const, userId: access.user.id };
  }
  return { ok: false as const, error: "Geen recht om dit team te beheren." };
}

async function saveEntry(
  admin: Admin,
  input: {
    month: string;
    profileId: string;
    teamId: string;
    race: SrcGender;
    category: number | null;
    override: boolean;
  },
) {
  if (!plannableMonth(input.month)) return "Kies deze of volgende maand.";
  if (input.race !== "men" && input.race !== "women") return "Kies heren of dames.";
  if (input.category !== null && !(input.category >= 1 && input.category <= 6)) {
    return "Ongeldige categorie.";
  }
  if (!(await isSrcTeam(admin, input.teamId))) return "Onbekend SRC-team.";

  const { data: known } = await admin
    .from("src_month_entries")
    .select("team_id")
    .eq("month", input.month)
    .eq("profile_id", input.profileId)
    .maybeSingle();
  if (known && known.team_id !== input.teamId && !input.override) {
    const first = await firstRaceOfMonth(admin, input.month);
    if (srcTeamLocked(first, new Date())) return "Wisselen van team kan pas volgende maand.";
  }

  const { error } = await admin.from("src_month_entries").upsert(
    {
      month: input.month,
      profile_id: input.profileId,
      team_id: input.teamId,
      race: input.race,
      category: input.category,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "month,profile_id" },
  );
  return error ? error.message : null;
}

/** Het lid rijdt deze maand onder de teamnaam mee, of past race en categorie aan. */
export async function joinSrcMonth(input: {
  month: string;
  teamId: string;
  race: SrcGender;
  category: number | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const error = await saveEntry(createAdminClient(), {
    ...input,
    profileId: user.id,
    override: false,
  });
  if (error) return { ok: false as const, error };
  revalidate();
  return { ok: true as const };
}

export async function leaveSrcMonth(month: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  if (!isSrcMonthKey(month)) return { ok: false as const, error: "Ongeldige maand." };

  const { error } = await createAdminClient()
    .from("src_month_entries")
    .delete()
    .eq("month", month)
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidate();
  return { ok: true as const };
}

/**
 * Kan het lid deze zondag? Staat de race van zijn geslacht al in de kalender,
 * dan wordt dat meteen zijn antwoord op die race.
 */
export async function setSrcAvailability(sundayEventId: string, status: SrcAvailabilityStatus) {
  if (!["available", "maybe", "unavailable"].includes(status)) {
    return { ok: false as const, error: "Ongeldige keuze." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const admin = createAdminClient();
  const { data: sunday } = await admin
    .from("events")
    .select("id, title, src_sunday")
    .eq("id", sundayEventId)
    .is("parent_event_id", null)
    .maybeSingle();
  if (!sunday?.src_sunday) return { ok: false as const, error: "Geen SRC-zondag." };

  const { data: entry } = await admin
    .from("src_month_entries")
    .select("team_id, race")
    .eq("month", srcMonthKey(sunday.src_sunday as string))
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!entry) return { ok: false as const, error: "Doe eerst mee deze maand." };

  const { error } = await supabase.from("team_event_availability").upsert(
    {
      team_id: entry.team_id,
      event_id: sundayEventId,
      profile_id: user.id,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_id,team_id,profile_id" },
  );
  if (error) return { ok: false as const, error: error.message };

  const raceId = await srcRaceOfSunday(admin, sundayEventId, entry.race as SrcGender);
  if (raceId) {
    const changed = await setSrcRaceRsvp(admin, user.id, raceId, status).catch(() => false);
    if (changed) {
      await requestReplan(admin, user.id, `${sunday.title} aangepast; schema eromheen.`).catch(
        () => null,
      );
    }
    revalidatePath(`/events/${raceId}`);
    revalidatePath("/zwbeter-worden", "layout");
  }
  revalidate();
  return { ok: true as const };
}

/** Beheer: een lid in een team zetten, ook na de eerste race (correctie). */
export async function setSrcMemberEntry(input: {
  month: string;
  profileId: string;
  teamId: string;
  race: SrcGender;
  category: number | null;
}) {
  const guard = await canManage(input.teamId);
  if (!guard.ok) return guard;
  const error = await saveEntry(createAdminClient(), { ...input, override: true });
  if (error) return { ok: false as const, error };
  revalidate();
  return { ok: true as const };
}

export async function removeSrcMemberEntry(month: string, profileId: string) {
  const admin = createAdminClient();
  const { data: entry } = await admin
    .from("src_month_entries")
    .select("team_id")
    .eq("month", month)
    .eq("profile_id", profileId)
    .maybeSingle();
  const guard = await canManage((entry?.team_id as string | undefined) ?? null);
  if (!guard.ok) return guard;
  const { error } = await admin
    .from("src_month_entries")
    .delete()
    .eq("month", month)
    .eq("profile_id", profileId);
  if (error) return { ok: false as const, error: error.message };
  revalidate();
  return { ok: true as const };
}
