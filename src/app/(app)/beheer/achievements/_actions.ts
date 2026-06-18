"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CUSTOM_BADGE_PREFIX,
  MILESTONE_TIERS,
  isAchievementIconOption,
  type MilestoneTier,
} from "@/lib/achievements/badge-policy";

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

function slugifyBadgeId(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function tierLabel(tier: MilestoneTier) {
  switch (tier) {
    case "bronze":
      return "Brons";
    case "silver":
      return "Zilver";
    case "gold":
      return "Goud";
    case "platinum":
      return "Platinum";
  }
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

export async function createCustomAchievement(input: {
  title: string;
  icon: string;
  tiers: Record<MilestoneTier, string>;
}) {
  const access = await requireAchievementAccess();
  if (!access.ok) return access;

  const title = input.title.trim();
  const icon = input.icon.trim();
  const slug = slugifyBadgeId(title);

  if (title.length < 2) {
    return { ok: false as const, error: "Titel is verplicht." };
  }
  if (!slug) {
    return { ok: false as const, error: "Gebruik letters of cijfers in de titel." };
  }
  if (!isAchievementIconOption(icon)) {
    return { ok: false as const, error: "Kies een geldig icoon." };
  }

  const tierTitles = Object.fromEntries(
    MILESTONE_TIERS.map((tier) => [tier, input.tiers[tier]?.trim() ?? ""]),
  ) as Record<MilestoneTier, string>;
  for (const tier of MILESTONE_TIERS) {
    if (!tierTitles[tier]) {
      return {
        ok: false as const,
        error: `Titel voor ${tierLabel(tier)} is verplicht.`,
      };
    }
  }

  const idBase = `${CUSTOM_BADGE_PREFIX}${slug}`;
  const ids = MILESTONE_TIERS.map((tier) => `${idBase}_${tier}`);

  const { data: existing } = await access.supabase
    .from("achievement_badges")
    .select("id")
    .in("id", ids)
    .limit(1);
  if ((existing ?? []).length > 0) {
    return { ok: false as const, error: "Deze achievement bestaat al." };
  }

  const { data: last } = await access.supabase
    .from("achievement_badges")
    .select("sort_order")
    .eq("kind", "milestone")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const startOrder = Number(last?.sort_order ?? 1000) + 1;

  const rows = MILESTONE_TIERS.map((tier, index) => ({
    id: `${idBase}_${tier}`,
    title: `${title} - ${tierLabel(tier)}`,
    description: tierTitles[tier],
    metric: "milestone",
    icon,
    color: tier,
    kind: "milestone",
    achievement_code: idBase.toUpperCase(),
    tier,
    visual_hint: "Bestuur",
    trigger_source: "manual",
    trigger_config: {
      achievement: title,
      visual: "Bestuur",
      threshold: { raw: tierTitles[tier] },
    },
    sort_order: startOrder + index,
  }));

  const admin = createAdminClient();
  const { error } = await admin.from("achievement_badges").insert(rows);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/beheer/achievements");
  revalidatePath("/profiel");
  revalidatePath("/leden");
  return { ok: true as const };
}
