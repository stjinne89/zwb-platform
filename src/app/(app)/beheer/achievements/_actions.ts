"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function requireAchievementAccess() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) {
    return { ok: false as const, error: "Niet ingelogd." };
  }
  if (!access.has("achievements.finalize")) {
    return {
      ok: false as const,
      error: "Geen recht om achievements te beheren.",
    };
  }

  return { ok: true as const, supabase };
}

export async function awardMilestoneBadge(input: {
  profileId: string;
  badgeId: string;
}) {
  const access = await requireAchievementAccess();
  if (!access.ok) return access;

  const profileId = input.profileId.trim();
  const badgeId = input.badgeId.trim();
  if (!profileId || !badgeId) {
    return { ok: false as const, error: "Kies een lid en een badge." };
  }

  const [{ data: badge }, { data: existing }] = await Promise.all([
    access.supabase
      .from("achievement_badges")
      .select("id, kind, title")
      .eq("id", badgeId)
      .maybeSingle(),
    access.supabase
      .from("achievement_awards")
      .select("id")
      .eq("profile_id", profileId)
      .eq("badge_id", badgeId)
      .eq("award_scope", "milestone")
      .maybeSingle(),
  ]);

  if (!badge || badge.kind !== "milestone") {
    return { ok: false as const, error: "Onbekende milestonebadge." };
  }
  if (existing) {
    return { ok: false as const, error: "Deze badge is al toegekend." };
  }

  const date = today();
  const { error } = await access.supabase.from("achievement_awards").insert({
    badge_id: badgeId,
    profile_id: profileId,
    award_scope: "milestone",
    period_start: date,
    period_end: date,
    value: 1,
    rank: 1,
    metadata: {
      unit: "badge",
      note: "Handmatig toegekend",
    },
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/beheer/achievements");
  revalidatePath("/profiel");
  revalidatePath("/leden");
  return { ok: true as const };
}

export async function revokeMilestoneBadge(input: {
  profileId: string;
  badgeId: string;
}) {
  const access = await requireAchievementAccess();
  if (!access.ok) return access;

  const profileId = input.profileId.trim();
  const badgeId = input.badgeId.trim();
  if (!profileId || !badgeId) {
    return { ok: false as const, error: "Kies een lid en een badge." };
  }

  const { error } = await access.supabase
    .from("achievement_awards")
    .delete()
    .eq("profile_id", profileId)
    .eq("badge_id", badgeId)
    .eq("award_scope", "milestone");

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/beheer/achievements");
  revalidatePath("/profiel");
  revalidatePath("/leden");
  return { ok: true as const };
}
