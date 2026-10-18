"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/session-user";
import { reviewPeriod } from "@/lib/weekly-review/period";
import { buildNextWeekFor } from "@/lib/weekly-review/load";
import { loadWeekReview, markWeekReviewSeen, type WeekReview } from "@/lib/weekly-review/service";
import type { NextWeek } from "@/lib/weekly-review/summary";

async function memberId(): Promise<string | null> {
  const user = await getSessionUser(await createClient());
  return user?.id ?? null;
}

/**
 * Voor de pop-up: het overzicht van de afgelopen week, alleen binnen het
 * venster (zondag 18:00 tot en met woensdag) en alleen als het nog niet gezien
 * is. Maakt het aan bij de eerste keer.
 */
export async function openWeekReview(): Promise<WeekReview | null> {
  const id = await memberId();
  if (!id) return null;
  const period = reviewPeriod();
  if (!period.inPopupWindow) return null;
  try {
    return await loadWeekReview(createAdminClient(), id, period.weekStart, period.nextWeekStart, {
      create: true,
      onlyUnseen: true,
    });
  } catch {
    // Geen tabel, geen verbinding: dan gewoon geen pop-up.
    return null;
  }
}

/** Kijkt of de coachtekst van de AI al klaar is. */
export async function refreshWeekReview(weekStart: string): Promise<WeekReview | null> {
  const id = await memberId();
  if (!id) return null;
  const period = reviewPeriod();
  if (weekStart !== period.weekStart) return null;
  try {
    return await loadWeekReview(createAdminClient(), id, weekStart, period.nextWeekStart, { create: false });
  } catch {
    return null;
  }
}

export async function markWeekReviewSeenAction(weekStart: string): Promise<void> {
  const id = await memberId();
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return;
  await markWeekReviewSeen(createAdminClient(), id, weekStart).catch(() => null);
}

/** De vooruitblik opnieuw, na het opslaan van de beschikbaarheid. */
export async function reloadNextWeek(weekStart: string): Promise<NextWeek | null> {
  const id = await memberId();
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return null;
  return buildNextWeekFor(createAdminClient(), id, weekStart).catch(() => null);
}
